import { useEffect, useState, useMemo } from 'react'
import { Inbox } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { BookmarkRow } from '../components/BookmarkRow'
import { DetailPanel } from '../components/DetailPanel'
import { EditBookmarkModal } from '../components/EditBookmarkModal'
import { MobileLayout } from '../mobile/MobileLayout'
import { Spinner } from '../components/ui/spinner'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import type { Bookmark, BookmarkStatus } from '../types'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function DesktopHome() {
  const { data, loading, error } = useData()
  const { user } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | null>('inbox')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  const sortedBookmarks = useMemo(() => {
    const filtered = (data?.bookmarks ?? []).filter((b) => {
      if (b.status === 'deleted') return false
      if (selectedTagId) return b.tag_ids.includes(selectedTagId)
      if (selectedFolderId) return b.folder_id === selectedFolderId
      if (selectedStatus) return b.status === selectedStatus
      return true
    })
    return [...filtered].sort(
      (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
    )
  }, [data, selectedTagId, selectedFolderId, selectedStatus])

  const effectiveSelectedId =
    selectedBookmarkId && sortedBookmarks.find((b) => b.id === selectedBookmarkId)
      ? selectedBookmarkId
      : (sortedBookmarks[0]?.id ?? null)

  const selectedBookmark = sortedBookmarks.find((b) => b.id === effectiveSelectedId) ?? null

  const listTitle = selectedStatus
    ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)
    : selectedFolderId
    ? (data?.folders.find((f) => f.id === selectedFolderId)?.name ?? 'Folder')
    : selectedTagId
    ? (data?.tags.find((t) => t.id === selectedTagId)?.name ?? 'Tag')
    : 'All Bookmarks'

  const resetSelection = () => setSelectedBookmarkId(null)

  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans">
      <Sidebar
        selectedStatus={selectedStatus}
        setSelectedStatus={(s) => { setSelectedStatus(s); resetSelection() }}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={(id) => { setSelectedFolderId(id); resetSelection() }}
        selectedTagId={selectedTagId}
        setSelectedTagId={(id) => { setSelectedTagId(id); resetSelection() }}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4 dark:border-dk-border">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-semibold text-ink dark:text-dk-ink">{listTitle}</h2>
            <span className="font-mono text-[12.5px] text-ink-3 dark:text-dk-ink-3">
              {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-chip-bg px-2.5 py-1 dark:border-dk-border dark:bg-dk-chip-bg">
            <span className="h-1.5 w-1.5 rounded-full bg-sync-green dark:bg-dk-green" />
            <span className="font-mono text-[11.5px] text-ink-mono dark:text-dk-ink-3">
              synced · {user}/hikae-data
              {data?.meta.last_modified ? ` · ${timeAgo(data.meta.last_modified)}` : ''}
            </span>
          </div>
        </div>

        {/* Capture bar */}
        <div className="flex items-center gap-3 border-b border-hairline-faint bg-row-hover px-6 py-[11px] dark:border-dk-divider dark:bg-dk-bg">
          <svg className="h-4 w-4 flex-shrink-0 text-icon-default dark:text-dk-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <span className="flex-1 font-mono text-[13px] text-ink-3 dark:text-dk-ink-3">
            Paste a URL to keep for later…
          </span>
          <span className="font-mono text-[11px] text-ink-3 dark:text-dk-ink-3">source auto-detected from domain</span>
          <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-mono shadow-[0_2px_0_#E6DECE] dark:border-dk-border dark:bg-dk-card dark:text-dk-ink-3">
            ⌘V
          </kbd>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <div className="flex justify-center py-16"><Spinner size="lg" /></div>}
          {error && (
            <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {!loading && !error && sortedBookmarks.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-icon-default">
              <Inbox className="h-[30px] w-[30px]" />
              <p className="text-sm">Nothing here yet</p>
            </div>
          )}
          {!loading && !error && sortedBookmarks.map((b) => (
            <BookmarkRow
              key={b.id}
              bookmark={b}
              isSelected={b.id === effectiveSelectedId}
              onSelect={() => setSelectedBookmarkId(b.id)}
            />
          ))}
        </div>
      </div>

      <DetailPanel bookmark={selectedBookmark} onEdit={setEditingBookmark} />
      <EditBookmarkModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} />
    </div>
  )
}

export function Home() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopHome />
}
