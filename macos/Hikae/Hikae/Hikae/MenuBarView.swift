import SwiftUI

struct MenuBarView: View {
    @EnvironmentObject var sync: SyncService

    var body: some View {
        VStack(spacing: 0) {
            header
            Divider()
            content
            footer
        }
        .frame(width: 320)
        .onAppear { Task { await sync.sync() } }
    }

    private var header: some View {
        HStack {
            Text("Hikae")
                .font(.headline)
            Spacer()
            if sync.isSyncing {
                ProgressView()
                    .scaleEffect(0.7)
            } else {
                Button {
                    Task { await sync.sync() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(.plain)
            }
            Button {
                NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                NSApp.activate(ignoringOtherApps: true)
            } label: {
                Image(systemName: "gear")
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private var content: some View {
        if sync.inboxItems.isEmpty {
            VStack(spacing: 8) {
                Image(systemName: "tray")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)
                Text("Inbox empty")
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 32)
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(sync.inboxItems) { bookmark in
                        InboxRowView(bookmark: bookmark)
                        Divider()
                    }
                }
            }
            .frame(minHeight: 300, maxHeight: 600)
        }
    }

    @ViewBuilder
    private var footer: some View {
        if sync.error != nil || sync.lastSynced != nil {
            Divider()
            VStack(spacing: 2) {
                if let error = sync.error {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 12)
                }
                if let lastSynced = sync.lastSynced {
                    Text("Updated \(lastSynced, style: .relative) ago")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.vertical, 6)
        }
    }
}
