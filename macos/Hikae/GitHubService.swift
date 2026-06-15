import Foundation

struct GitHubFile {
    let name: String
    let path: String
    let sha: String
}

struct GitHubFileContent {
    let content: String
    let sha: String
}

class GitHubService {
    static let shared = GitHubService()

    var token: String {
        get { UserDefaults.standard.string(forKey: "github_pat") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "github_pat") }
    }

    var repo: String {
        get { UserDefaults.standard.string(forKey: "github_repo") ?? "maparker/hikae-data" }
        set { UserDefaults.standard.set(newValue, forKey: "github_repo") }
    }

    func listDirectory(_ path: String) async throws -> [GitHubFile] {
        let data = try await request(method: "GET", path: path)
        guard let array = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
            throw GitHubError.invalidResponse
        }
        return array.compactMap { item -> GitHubFile? in
            guard
                let type_ = item["type"] as? String, type_ == "file",
                let name = item["name"] as? String,
                let filePath = item["path"] as? String,
                let sha = item["sha"] as? String
            else { return nil }
            return GitHubFile(name: name, path: filePath, sha: sha)
        }
    }

    func getFile(_ path: String) async throws -> GitHubFileContent {
        let data = try await request(method: "GET", path: path)
        guard
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
            let rawContent = json["content"] as? String,
            let sha = json["sha"] as? String
        else { throw GitHubError.invalidResponse }

        let stripped = rawContent.components(separatedBy: .newlines).joined()
        guard let decoded = Data(base64Encoded: stripped),
              let content = String(data: decoded, encoding: .utf8)
        else { throw GitHubError.invalidResponse }

        return GitHubFileContent(content: content, sha: sha)
    }

    func putFile(_ path: String, content: String, sha: String?, message: String) async throws {
        let encoded = content.data(using: .utf8)!.base64EncodedString()
        var body: [String: Any] = ["message": message, "content": encoded]
        if let sha { body["sha"] = sha }
        let bodyData = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(method: "PUT", path: path, body: bodyData)
    }

    func deleteFile(_ path: String, sha: String, message: String) async throws {
        let body: [String: Any] = ["message": message, "sha": sha]
        let bodyData = try JSONSerialization.data(withJSONObject: body)
        _ = try await request(method: "DELETE", path: path, body: bodyData)
    }

    private func request(method: String, path: String, body: Data? = nil) async throws -> Data {
        let urlString = "https://api.github.com/repos/\(repo)/contents/\(path)"
        var req = URLRequest(url: URL(string: urlString)!)
        req.httpMethod = method
        req.setValue("token \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("application/vnd.github.v3+json", forHTTPHeaderField: "Accept")
        if let body {
            req.httpBody = body
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let (data, response) = try await URLSession.shared.data(for: req)
        let http = response as! HTTPURLResponse
        guard (200...299).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
            throw GitHubError.apiError(message)
        }
        return data
    }
}

enum GitHubError: Error, LocalizedError {
    case invalidResponse
    case apiError(String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid response from GitHub API"
        case .apiError(let msg): return msg
        }
    }
}
