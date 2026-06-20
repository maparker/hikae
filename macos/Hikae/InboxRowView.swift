import SwiftUI

struct InboxRowView: View {
    let bookmark: Bookmark
    @EnvironmentObject var sync: SyncService

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(bookmark.title)
                .font(.subheadline)
                .lineLimit(2)
                .frame(maxWidth: .infinity, alignment: .leading)

            HStack {
                if bookmark.isNote {
                    Label("note", systemImage: "pencil")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text(bookmark.host)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Spacer()
                if !bookmark.isNote {
                    Button("Open") {
                        if let url = URL(string: bookmark.url) {
                            NSWorkspace.shared.open(url)
                        }
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.small)
                }
                Button("File") {
                    Task { await sync.file(bookmark) }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }
}
