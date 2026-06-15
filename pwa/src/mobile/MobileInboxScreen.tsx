import { useMemo, useRef, useState } from 'react'
import { SwipeableCard } from './SwipeableCard'
import { Spinner } from '../components/ui/spinner'
import { useData } from '../context/DataContext'
import type { BookmarkStatus } from '../types'
import hikaeLogo from '../assets/hikae-icon.png'

const FILTERS: { status: BookmarkStatus; label: string }[] = [
  { status: 'inbox', label: 'Inbox' },
  { status: 'filed', label: 'Filed' },
  { status: 'read', label: 'Read' },
  { status: 'archived', label: 'Archived' },
]

interface MobileInboxScreenProps {
  onSelectBookmark: (id: string) => void
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

const PULL_THRESHOLD = 64

export function MobileInboxScreen({ onSelectBookmark }: MobileInboxScreenProps) {
  const { data, loading, error, refresh, lastFetched } = useData()
  const [filter, setFilter] = useState<BookmarkStatus>('inbox')
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const bookmarks = useMemo(() => {
    return (data?.bookmarks ?? [])
      .filter((b) => b.status === filter)
      .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
  }, [data, filter])

  const inboxCount = data?.bookmarks.filter((b) => b.status === 'inbox').length ?? 0

  const onTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    } else {
      touchStartY.current = -1
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current < 0) return
    const dy = e.touches[0].clientY - touchStartY.current
    if (dy > 0) {
      e.preventDefault()
      setPullY(Math.min(dy * 0.5, PULL_THRESHOLD))
    }
  }

  const onTouchEnd = async () => {
    if (pullY >= PULL_THRESHOLD * 0.8 && !refreshing) {
      setRefreshing(true)
      setPullY(0)
      try { await refresh() } finally { setRefreshing(false) }
    } else {
      setPullY(0)
    }
    touchStartY.current = -1
  }

  return (
    <div className="flex h-full flex-col bg-canvas-mobile dark:bg-dk-bg">
      {/* Header */}
      <div className="px-5 pb-3 pt-[54px]">
        {/* Brand row */}
        <div className="mb-3 flex items-center gap-2">
          <img
            src={hikaeLogo}
            alt="Hikae"
            className="h-[26px] w-[26px]"
            style={{ borderRadius: '5.8px', boxShadow: '0 1px 2px rgba(80,55,20,.18)' }}
          />
          <span className="font-serif text-[17px] font-semibold text-ink dark:text-dk-ink">
            Hikae
          </span>
          <button
            onClick={() => { if (!refreshing) { setRefreshing(true); refresh().finally(() => setRefreshing(false)) } }}
            className="ml-auto flex items-center gap-1.5 rounded-full border border-hairline bg-surface px-2.5 py-1 dark:border-dk-border dark:bg-dk-card active:opacity-60"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${refreshing ? 'bg-ink-3 dark:bg-dk-ink-3' : 'bg-sync-green dark:bg-dk-green'}`} />
            <span className="font-mono text-[10.5px] text-ink-mono dark:text-dk-ink-3">
              {refreshing ? 'syncing…' : lastFetched ? `synced · ${timeAgo(lastFetched.toISOString())}` : 'synced'}
            </span>
          </button>
        </div>

        {/* Title */}
        <div className="flex items-baseline gap-2">
          <h1 className="font-serif text-[32px] font-semibold text-ink dark:text-dk-ink">
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </h1>
          {data && (
            <span className="font-mono text-[12.5px] text-ink-3 dark:text-dk-ink-3">
              {bookmarks.length} {bookmarks.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {/* Filter pills */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map(({ status, label }) => {
            const active = filter === status
            const isInbox = status === 'inbox'
            const count = data?.bookmarks.filter((b) => b.status === status).length ?? 0
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className="flex flex-shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors"
                style={
                  active
                    ? { background: '#C13D2B', color: '#fff' }
                    : { background: '#EAE1CE', color: '#6F675B' }
                }
              >
                {isInbox && inboxCount > 0 && !active && (
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                )}
                {label}
                <span
                  className="font-mono text-[11px]"
                  style={{ color: active ? 'rgba(255,255,255,.75)' : '#9A917E' }}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Pull-to-refresh indicator */}
      {(pullY > 0 || refreshing) && (
        <div
          className="flex items-center justify-center"
          style={{ height: refreshing ? 48 : pullY, transition: refreshing ? 'height 200ms' : 'none' }}
        >
          <Spinner size="sm" />
        </div>
      )}

      {/* List */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-[160px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[12px] border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && bookmarks.length === 0 && (
          <div className="flex flex-col items-center py-16">
            <img
              src={hikaeLogo}
              alt=""
              className="mb-4 h-[76px] w-[76px] opacity-40"
              style={{ borderRadius: '17px' }}
            />
            <p className="font-serif text-[21px] font-semibold text-ink dark:text-dk-ink">
              Inbox zero
            </p>
            <p className="mt-2 max-w-[260px] text-center text-[14px] leading-[1.5] text-ink-3 dark:text-dk-ink-3">
              Nothing kept for later. Capture a link from your phone, Mac, or browser — it lands right here.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {['iOS Shortcut', 'macOS', 'Raycast', 'Web'].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-hairline-card bg-surface px-3 py-1.5 text-[12px] text-ink-2 dark:border-dk-border dark:bg-dk-card dark:text-dk-ink-2"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[13px] pt-1">
          {!loading &&
            !error &&
            bookmarks.map((b) => (
              <SwipeableCard
                key={b.id}
                bookmark={b}
                onTap={() => onSelectBookmark(b.id)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}
