import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Inbox, Search, X } from 'lucide-react'
import { Sidebar } from '../components/Sidebar'
import { BookmarkRow } from '../components/BookmarkRow'
import { DetailPanel } from '../components/DetailPanel'
import { EditBookmarkModal } from '../components/EditBookmarkModal'
import { DesktopCaptureModal } from '../components/DesktopCaptureModal'
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
  const { data, loading, error, refresh, lastFetched } = useData()
  const { user } = useAuth()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | null>('inbox')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureInitialUrl, setCaptureInitialUrl] = useState('')
  const [searchActive, setSearchActive] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const captureBarRef = useRef<HTMLInputElement>(null)

  // ⌘K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchActive(true)
        setTimeout(() => searchInputRef.current?.focus(), 0)
      }
      if (e.key === 'Escape' && searchActive) {
        setSearchActive(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchActive])

  const closeSearch = useCallback(() => {
    setSearchActive(false)
    setSearchQuery('')
  }, [])

  const sortedBookmarks = useMemo(() => {
    if (searchActive && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      const matched = (data?.bookmarks ?? []).filter((b) => {
        if (b.status === 'deleted') return false
        if (b.title.toLowerCase().includes(q)) return true
        const source = data?.sources.find((s) => s.id === b.source_id)
        if (source?.name.toLowerCase().includes(q)) return true
        const tags = data?.tags.filter((t) => b.tag_ids.includes(t.id)) ?? []
        if (tags.some((t) => t.name.toLowerCase().includes(q))) return true
        try { if (new URL(b.url).hostname.includes(q)) return true } catch { /* */ }
        return false
      })
      return matched.sort(
        (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
      )
    }
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
  }, [data, selectedTagId, selectedFolderId, selectedStatus, searchActive, searchQuery])

  const effectiveSelectedId =
    selectedBookmarkId && sortedBookmarks.find((b) => b.id === selectedBookmarkId)
      ? selectedBookmarkId
      : (sortedBookmarks[0]?.id ?? null)

  const selectedBookmark = sortedBookmarks.find((b) => b.id === effectiveSelectedId) ?? null

  const listTitle = searchActive && searchQuery
    ? `Results for "${searchQuery}"`
    : selectedStatus
    ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)
    : selectedFolderId
    ? (data?.folders.find((f) => f.id === selectedFolderId)?.name ?? 'Folder')
    : selectedTagId
    ? (data?.tags.find((t) => t.id === selectedTagId)?.name ?? 'Tag')
    : 'All Bookmarks'

  const resetSelection = () => setSelectedBookmarkId(null)

  const handleCaptureBarPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text').trim()
    e.preventDefault()
    setCaptureInitialUrl(text)
    setCaptureOpen(true)
    captureBarRef.current?.blur()
  }

  const handleCaptureBarFocus = () => {
    setCaptureInitialUrl('')
    setCaptureOpen(true)
    captureBarRef.current?.blur()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-canvas font-sans">
      <Sidebar
        selectedStatus={selectedStatus}
        setSelectedStatus={(s) => { setSelectedStatus(s); resetSelection(); closeSearch() }}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={(id) => { setSelectedFolderId(id); resetSelection(); closeSearch() }}
        selectedTagId={selectedTagId}
        setSelectedTagId={(id) => { setSelectedTagId(id); resetSelection(); closeSearch() }}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          {searchActive ? (
            <div className="flex flex-1 items-center gap-2">
              <Search className="h-4 w-4 flex-shrink-0 text-ink-3" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); resetSelection() }}
                placeholder="Search bookmarks…"
                autoFocus
                className="flex-1 bg-transparent font-sans text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <button
                onClick={closeSearch}
                className="flex-shrink-0 rounded-[6px] p-1 text-ink-3 hover:bg-hairline-faint hover:text-ink-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <h2 className="text-[17px] font-semibold text-ink">{listTitle}</h2>
                <span className="font-mono text-[12.5px] text-ink-3">
                  {sortedBookmarks.length} {sortedBookmarks.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setSearchActive(true); setTimeout(() => searchInputRef.current?.focus(), 0) }}
                  className="flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-ink-3 transition-colors hover:bg-hairline-faint hover:text-ink-2"
                  title="Search (⌘K)"
                >
                  <Search className="h-3.5 w-3.5" />
                  <kbd className="font-mono text-[10px]">⌘K</kbd>
                </button>
                <button
                  onClick={() => refresh()}
                  className="flex items-center gap-1.5 rounded-full border border-hairline bg-chip-bg px-2.5 py-1 transition-opacity hover:opacity-70"
                  title="Click to sync"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-ink-3' : 'bg-sync-green'}`} />
                  <span className="font-mono text-[11.5px] text-ink-mono">
                    {loading ? 'syncing…' : `synced · ${user}/hikae-data${lastFetched ? ` · ${timeAgo(lastFetched.toISOString())}` : ''}`}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Capture bar */}
        <div className="flex items-center gap-3 border-b border-hairline-faint bg-row-hover px-6 py-[11px]">
          <svg className="h-4 w-4 flex-shrink-0 text-icon-default" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 17H7A5 5 0 0 1 7 7h2" /><path d="M15 7h2a5 5 0 1 1 0 10h-2" /><line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          <input
            ref={captureBarRef}
            type="url"
            placeholder="Paste a URL to keep for later…"
            onFocus={handleCaptureBarFocus}
            onPaste={handleCaptureBarPaste}
            readOnly
            className="flex-1 cursor-pointer bg-transparent font-mono text-[13px] text-ink-3 outline-none placeholder:text-ink-3"
          />
          <span className="font-mono text-[11px] text-ink-3">source auto-detected from domain</span>
          <kbd className="rounded border border-hairline bg-surface px-1.5 py-0.5 font-mono text-[10.5px] text-ink-mono shadow-[0_2px_0_#E6DECE]">
            ⌘V
          </kbd>
        </div>

        {/* Bookmark list */}
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
              <p className="text-sm">
                {searchActive && searchQuery ? `No results for "${searchQuery}"` : 'Nothing here yet'}
              </p>
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
      {captureOpen && (
        <DesktopCaptureModal
          initialUrl={captureInitialUrl}
          onClose={() => setCaptureOpen(false)}
        />
      )}
    </div>
  )
}

export function Home() {
  const isMobile = useIsMobile()
  return isMobile ? <MobileLayout /> : <DesktopHome />
}
