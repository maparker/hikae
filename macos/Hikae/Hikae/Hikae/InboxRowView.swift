import SwiftUI

struct InboxRowView: View {
    let bookmark: Bookmark
    @EnvironmentObject var sync: SyncService
    @State private var isHovered = false

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(bookmark.title)
                    .font(.subheadline)
                    .lineLimit(2)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(bookmark.host)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if isHovered {
                HStack(spacing: 2) {
                    iconButton("arrow.up.right.square", help: "Open") {
                        if let url = URL(string: bookmark.url) {
                            NSWorkspace.shared.open(url)
                        }
                    }
                    iconButton("checkmark", help: "File") {
                        Task { await sync.file(bookmark) }
                    }
                    iconButton("archivebox", help: "Archive") {
                        Task { await sync.archive(bookmark) }
                    }
                    iconButton("trash", help: "Delete", destructive: true) {
                        Task { await sync.delete(bookmark) }
                    }
                }
                .transition(.opacity)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .onHover { isHovered = $0 }
        .animation(.easeInOut(duration: 0.12), value: isHovered)
    }

    @ViewBuilder
    private func iconButton(_ icon: String, help: String, destructive: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 11))
                .foregroundStyle(destructive ? Color.red : Color.secondary)
                .frame(width: 24, height: 24)
                .background(.quaternary, in: RoundedRectangle(cornerRadius: 5))
        }
        .buttonStyle(.plain)
        .help(help)
    }
}
