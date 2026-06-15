import SwiftUI

struct SettingsView: View {
    @AppStorage("github_pat") private var pat = ""
    @AppStorage("github_repo") private var repo = "maparker/hikae-data"

    var body: some View {
        Form {
            Section("GitHub") {
                SecureField("Personal Access Token", text: $pat)
                Text("Needs repo scope on \(repo)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                TextField("Repository", text: $repo)
            }
        }
        .frame(width: 360)
        .padding()
    }
}
