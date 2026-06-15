import { useState } from 'react'
import { Inbox, Folder, Search, Settings, Plus } from 'lucide-react'
import { MobileInboxScreen } from './MobileInboxScreen'
import { MobileFoldersScreen } from './MobileFoldersScreen'
import { MobileSearchScreen } from './MobileSearchScreen'
import { MobileSettingsScreen } from './MobileSettingsScreen'
import { MobileDetailScreen } from './MobileDetailScreen'
import { CaptureSheet } from './CaptureSheet'

type Tab = 'inbox' | 'folders' | 'search' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof Inbox }[] = [
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'folders', label: 'Folders', icon: Folder },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function MobileLayout() {
  const [activeTab, setActiveTab] = useState<Tab>('inbox')
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-canvas-mobile dark:bg-dk-bg">
      {/* Tab screens */}
      <div className="h-full">
        {activeTab === 'inbox' && (
          <MobileInboxScreen onSelectBookmark={setSelectedBookmarkId} />
        )}
        {activeTab === 'folders' && (
          <MobileFoldersScreen onSelectBookmark={setSelectedBookmarkId} />
        )}
        {activeTab === 'search' && (
          <MobileSearchScreen onSelectBookmark={setSelectedBookmarkId} />
        )}
        {activeTab === 'settings' && <MobileSettingsScreen />}
      </div>

      {/* FAB */}
      <button
        onClick={() => setCaptureOpen(true)}
        className="fixed bottom-[108px] right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white"
        style={{ boxShadow: '0 8px 20px rgba(193,61,43,.4), 0 2px 5px rgba(0,0,0,.18)' }}
        aria-label="Capture bookmark"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Tab bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-hairline-warm px-2 pb-[30px] pt-3 dark:border-dk-border"
        style={{ background: 'rgba(247,243,234,.92)', backdropFilter: 'blur(14px)' }}
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
            >
              <Icon
                className="h-[22px] w-[22px]"
                style={{ color: active ? '#C13D2B' : '#A79E8E', strokeWidth: active ? 2.2 : 1.8 }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: active ? '#C13D2B' : '#A79E8E',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Detail overlay */}
      {selectedBookmarkId && (
        <MobileDetailScreen
          bookmarkId={selectedBookmarkId}
          onBack={() => setSelectedBookmarkId(null)}
        />
      )}

      {/* Capture sheet */}
      {captureOpen && <CaptureSheet onClose={() => setCaptureOpen(false)} />}
    </div>
  )
}
