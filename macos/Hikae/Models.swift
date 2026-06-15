import Foundation

struct Bookmark: Identifiable, Codable {
    let id: String
    let url: String
    let title: String
    let note: String?
    let why: String?
    let status: String
    let capturedAt: String
    let capturedBy: String
    let sourceID: String?
    let deletedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, url, title, note, why, status
        case capturedAt = "captured_at"
        case capturedBy = "captured_by"
        case sourceID = "source_id"
        case deletedAt = "deleted_at"
    }

    var host: String {
        URL(string: url)?.host ?? url
    }
}

struct PendingCapture {
    let url: String
    let title: String
    let note: String?
    let why: String?
    let capturedBy: String

    static func parse(_ text: String) -> PendingCapture? {
        var dict: [String: String] = [:]
        for line in text.components(separatedBy: .newlines) {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard !trimmed.isEmpty, let eqRange = trimmed.range(of: "=") else { continue }
            let key = String(trimmed[trimmed.startIndex..<eqRange.lowerBound])
                .trimmingCharacters(in: .whitespaces)
            let value = String(trimmed[eqRange.upperBound...])
                .trimmingCharacters(in: .whitespaces)
            dict[key] = value
        }
        guard let url = dict["url"], !url.isEmpty else { return nil }
        return PendingCapture(
            url: url,
            title: dict["title"] ?? url,
            note: dict["note"].flatMap { $0.isEmpty ? nil : $0 },
            why: dict["why"].flatMap { $0.isEmpty ? nil : $0 },
            capturedBy: dict["captured_by"] ?? "ios"
        )
    }
}
