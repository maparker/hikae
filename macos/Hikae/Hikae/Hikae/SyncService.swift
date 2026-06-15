import Foundation
import Combine

@MainActor
class SyncService: ObservableObject {
    @Published var inboxItems: [Bookmark] = []
    @Published var isSyncing = false
    @Published var lastSynced: Date?
    @Published var error: String?

    var inboxCount: Int { inboxItems.count }

    private let gh = GitHubService.shared
    private let iso = ISO8601DateFormatter()

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
            } catch {
                jsonFiles = []
            }
            if !jsonFiles.isEmpty {
                try await mergePending(jsonFiles)
            }
            let fileContent = try await gh.getFile("data/bookmarks.json")
            inboxItems = try parseInboxBookmarks(from: fileContent.content)
            lastSynced = Date()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func parseInboxBookmarks(from json: String) throws -> [Bookmark] {
        guard
            let data = json.data(using: .utf8),
            let root = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let rawBookmarks = root["bookmarks"] as? [[String: Any]]
        else { return [] }

        let decoder = JSONDecoder()
        return rawBookmarks.compactMap { dict -> Bookmark? in
            guard
                let status = dict["status"] as? String, status == "inbox",
                (dict["deleted_at"] is NSNull) || dict["deleted_at"] == nil
            else { return nil }
            guard let itemData = try? JSONSerialization.data(withJSONObject: dict),
                  let bookmark = try? decoder.decode(Bookmark.self, from: itemData)
            else { return nil }
            return bookmark
        }
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
