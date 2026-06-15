import SwiftUI

@main
struct HikaeApp: App {
    @StateObject private var sync = SyncService()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(sync)
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "bookmark")
                if sync.inboxCount > 0 {
                    Text("\(sync.inboxCount)")
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
