import Foundation
import Combine
import os

@MainActor
class SyncService: ObservableObject {
    @Published var inboxItems: [Bookmark] = []
    @Published var isSyncing = false
    @Published var lastSynced: Date?
    @Published var error: String?
    @Published var bookmarkInboxCount: Int = 0
    @Published var noteInboxCount: Int = 0

    var inboxCount: Int { inboxItems.count }

    private let gh = GitHubService.shared
    private let iso = ISO8601DateFormatter()
    private let log = Logger(subsystem: "dev.hikae", category: "sync")

    init() {
        Task { await sync() }
        Timer.scheduledTimer(withTimeInterval: 300, repeats: true) { [weak self] _ in
            Task { [weak self] in await self?.sync() }
        }
    }

    func sync() async {
        guard !isSyncing else { return }
        guard !gh.token.isEmpty else {
            error = "GitHub PAT not configured. Open Settings to add it."
            return
        }
        isSyncing = true
        error = nil
        defer { isSyncing = false }

        do {
            let jsonFiles: [GitHubFile]
            do {
                let pendingFiles = try await gh.listDirectory("data/pending")
                jsonFiles = pendingFiles.filter { $0.name.hasSuffix(".json") && $0.name != ".json" }
                log.error("[Hikae] pending files found: \(jsonFiles.map(\.name))")
            } catch {
                log.error("[Hikae] data/pending listing failed (ok if dir absent): \(error)")
                jsonFiles = []
            }
            if !jsonFiles.isEmpty {
                try await mergePending(jsonFiles)
            }
            let fileContent = try await gh.getFile("data/bookmarks.json")
            let parsed = try parseInboxBookmarks(from: fileContent.content)
            log.error("[Hikae] bookmarks.json fetched, inbox count: \(parsed.count)")
            log.error("[Hikae] types: \(parsed.map { "\($0.id.prefix(8)):\($0.itemType ?? "nil")" })")
            log.error("[Hikae] notes: \(parsed.filter { $0.isNote }.map(\.title))")
            inboxItems = parsed
            bookmarkInboxCount = parsed.filter { !$0.isNote }.count
            noteInboxCount = parsed.filter { $0.isNote }.count
            log.error("[Hikae] bookmarkInboxCount=\(self.bookmarkInboxCount) noteInboxCount=\(self.noteInboxCount)")
            lastSynced = Date()
        } catch {
            log.error("[Hikae] sync error: \(error)")
            self.error = error.localizedDescription
        }
    }

    private func parseInboxBookmarks(from json: String) throws -> [Bookmark] {
        guard
            let data = json.data(using: .utf8),
            let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let rawBookmarks = root["bookmarks"] as? [[String: Any]]
        else {
            log.error("[Hikae] failed to parse bookmarks.json root structure")
            return []
        }

        log.error("[Hikae] total bookmarks in file: \(rawBookmarks.count)")
        let results = rawBookmarks.compactMap { dict -> Bookmark? in
            let deletedAt = dict["deleted_at"]
            let notDeleted = deletedAt == nil || deletedAt is NSNull || (deletedAt as? String) == ""
            guard let status = dict["status"] as? String, status == "inbox", notDeleted else { return nil }
            guard let id = dict["id"] as? String else { return nil }
            return Bookmark(
                id: id,
                itemType: dict["type"] as? String,
                url: (dict["url"] as? String) ?? "",
                title: (dict["title"] as? String) ?? "",
                note: dict["note"] as? String,
                why: dict["why"] as? String,
                status: status,
                capturedAt: (dict["captured_at"] as? String) ?? "",
                capturedBy: (dict["captured_by"] as? String) ?? "",
                sourceID: dict["source_id"] as? String,
                deletedAt: dict["deleted_at"] as? String
            )
        }
        log.error("[Hikae] inbox bookmarks decoded: \(results.count)")
        return results
    }

    private func mergePending(_ files: [GitHubFile]) async throws {
        let fileContent = try await gh.getFile("data/bookmarks.json")
        guard
            let rootData = fileContent.content.data(using: .utf8),
            var root = try JSONSerialization.jsonObject(with: rootData) as? [String: Any]
        else { throw GitHubError.invalidResponse }

        var bookmarks = root["bookmarks"] as? [[String: Any]] ?? []
        var sources = root["sources"] as? [[String: Any]] ?? []

        for file in files {
            let pending = try await gh.getFile(file.path)
            guard let capture = PendingCapture.parse(pending.content) else { continue }

            let capturedAt = parseFilenameDate(file.name) ?? iso.string(from: Date())
            let sourceID = resolveSource(url: capture.url, in: &sources)

            let bookmark: [String: Any] = [
                "id": UUID().uuidString.lowercased(),
                "type": capture.itemType,
                "url": capture.url,
                "title": capture.title,
                "folder_id": NSNull(),
                "tag_ids": [],
                "source_id": jsonNull(sourceID),
                "note": jsonNull(capture.note),
                "why": jsonNull(capture.why),
                "status": "inbox",
                "captured_at": capturedAt,
                "captured_by": capture.capturedBy,
                "last_modified_at": capturedAt,
                "last_modified_by": capture.capturedBy,
                "filed_at": NSNull(),
                "read_at": NSNull(),
                "archived_at": NSNull(),
                "deleted_at": NSNull()
            ]
            bookmarks.append(bookmark)
        }

        root["bookmarks"] = bookmarks
        root["sources"] = sources
        if var meta = root["meta"] as? [String: Any] {
            meta["last_modified"] = iso.string(from: Date())
            meta["last_modified_by"] = "mac"
            root["meta"] = meta
        }

        let updatedData = try JSONSerialization.data(
            withJSONObject: root,
            options: [.prettyPrinted, .sortedKeys]
        )
        let updatedContent = String(data: updatedData, encoding: .utf8)!
        try await gh.putFile(
            "data/bookmarks.json",
            content: updatedContent,
            sha: fileContent.sha,
            message: "mac: merge \(files.count) pending capture(s)"
        )

        for file in files {
            let fileSha = try await gh.getFile(file.path).sha
            try await gh.deleteFile(file.path, sha: fileSha, message: "mac: archive pending \(file.name)")
        }
    }

    private func resolveSource(url: String, in sources: inout [[String: Any]]) -> String? {
        guard let host = URL(string: url)?.host else { return nil }
        if let existing = sources.first(where: { item in (item["url"] as? String).map { URL(string: $0)?.host == host } ?? false }),
           let id = existing["id"] as? String {
            return id
        }
        let newID = UUID().uuidString.lowercased()
        let newSource: [String: Any] = [
            "id": newID,
            "name": host,
            "url": "https://\(host)",
            "created": iso.string(from: Date())
        ]
        sources.append(newSource)
        return newID
    }

    func file(_ bookmark: Bookmark) async {
        do {
            let fileContent = try await gh.getFile("data/bookmarks.json")
            guard
                let rootData = fileContent.content.data(using: .utf8),
                var root = try JSONSerialization.jsonObject(with: rootData) as? [String: Any],
                var bookmarks = root["bookmarks"] as? [[String: Any]]
            else { return }

            let now = iso.string(from: Date())
            if let idx = bookmarks.firstIndex(where: { ($0["id"] as? String) == bookmark.id }) {
                bookmarks[idx]["status"] = "filed"
                bookmarks[idx]["filed_at"] = now
                bookmarks[idx]["last_modified_at"] = now
                bookmarks[idx]["last_modified_by"] = "mac"
            }

            root["bookmarks"] = bookmarks
            if var meta = root["meta"] as? [String: Any] {
                meta["last_modified"] = now
                meta["last_modified_by"] = "mac"
                root["meta"] = meta
            }

            let updatedData = try JSONSerialization.data(
                withJSONObject: root,
                options: [.prettyPrinted, .sortedKeys]
            )
            let updatedContent = String(data: updatedData, encoding: .utf8)!
            try await gh.putFile(
                "data/bookmarks.json",
                content: updatedContent,
                sha: fileContent.sha,
                message: "mac: file bookmark \(bookmark.id)"
            )

            inboxItems.removeAll { $0.id == bookmark.id }
            bookmarkInboxCount = inboxItems.filter { !$0.isNote }.count
            noteInboxCount = inboxItems.filter { $0.isNote }.count
        } catch {
            self.error = error.localizedDescription
        }
    }

    func jsonNull(_ value: String?) -> Any {
        value.map { $0 as Any } ?? NSNull()
    }

    private func parseFilenameDate(_ filename: String) -> String? {
        let stem = filename.replacingOccurrences(of: ".json", with: "")
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMddHHmmss"
        formatter.timeZone = TimeZone(identifier: "UTC")
        guard let date = formatter.date(from: stem) else { return nil }
        return iso.string(from: date)
    }
}
