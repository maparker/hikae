import SwiftUI

@main
struct HikaeApp: App {
    @StateObject private var sync = SyncService()

    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(sync)
        } label: {
            MenuBarLabel(sync: sync)
        }
        .menuBarExtraStyle(.window)

        Settings {
            SettingsView()
        }
    }
}

struct MenuBarLabel: View {
    @ObservedObject var sync: SyncService

    var body: some View {
        Text("⊕\(sync.bookmarkInboxCount) ✎\(sync.noteInboxCount)")
            .font(.caption.monospacedDigit())
    }
}
