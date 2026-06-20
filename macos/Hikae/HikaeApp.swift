import SwiftUI

@main
struct HikaeApp: App {
    @StateObject private var sync = SyncService()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(sync)
        } label: {
            HStack(spacing: 5) {
                if sync.bookmarkInboxCount > 0 || sync.inboxCount == 0 {
                    Image(systemName: "bookmark")
                    if sync.bookmarkInboxCount > 0 {
                        Text("\(sync.bookmarkInboxCount)")
                            .font(.caption.monospacedDigit())
                    }
                }
                if sync.noteInboxCount > 0 {
                    Image(systemName: "pencil")
                    Text("\(sync.noteInboxCount)")
                        .font(.caption.monospacedDigit())
                }
            }
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
        }
    }
}
