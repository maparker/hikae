import { useRef, useState } from 'react'
import { FolderInput, Archive, ExternalLink } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

interface SwipeableCardProps {
  bookmark: Bookmark
  onTap: () => void
}

const REVEAL = 140

function domain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function SwipeableCard({ bookmark, onTap }: SwipeableCardProps) {
  const { data, save } = useData()
  const [offset, setOffset] = useState(0)
  const [animate, setAnimate] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const startOffset = useRef(0)
  const isHorizontal = useRef<boolean | null>(null)

  const folder = data?.folders.find((f) => f.id === bookmark.folder_id)
  const tags = data?.tags.filter((t) => bookmark.tag_ids.includes(t.id)) ?? []
  const source = data?.sources.find((s) => s.id === bookmark.source_id)

  const transition = async (updates: Partial<Bookmark>, message: string) => {
    if (!data) return
    const now = new Date().toISOString()
    const updated: BookmarksData = {
      ...data,
      meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
      bookmarks: data.bookmarks.map((b) =>
        b.id === bookmark.id
          ? { ...b, ...updates, last_modified_at: now, last_modified_by: 'pwa' }
          : b
      ),
    }
    await save(updated, message)
  }

  const snapTo = (target: number) => {
    setAnimate(true)
    setOffset(target)
    setTimeout(() => setAnimate(false), 220)
  }

  const handleFile = () => {
    snapTo(0)
    const now = new Date().toISOString()
    transition({ status: 'filed', filed_at: now }, `File: ${bookmark.title}`)
  }

  const handleArchive = () => {
    snapTo(0)
    const now = new Date().toISOString()
    transition({ status: 'archived', archived_at: now }, `Archive: ${bookmark.title}`)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    startOffset.current = offset
    isHorizontal.current = null
  }

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - touchStartX.current
    const dy = e.touches[0].clientY - touchStartY.current

    if (isHorizontal.current === null) {
      if (Math.abs(dx) > Math.abs(dy) + 4) isHorizontal.current = true
      else if (Math.abs(dy) > Math.abs(dx) + 4) isHorizontal.current = false
      else return
    }

    if (!isHorizontal.current) return
    e.preventDefault()
    const next = Math.max(-REVEAL, Math.min(0, startOffset.current + dx))
    setOffset(next)
    setAnimate(false)
  }

  const onTouchEnd = () => {
    if (!isHorizontal.current) return
    if (offset < -REVEAL * 0.75) {
      handleArchive()
    } else if (offset < -REVEAL * 0.25) {
      snapTo(-REVEAL)
    } else {
      snapTo(0)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-hairline-card bg-surface shadow-[0_1px_2px_rgba(80,55,20,.05)] dark:border-dk-border dark:bg-dk-card">
      {/* Action buttons */}
      <div className="absolute right-0 top-0 flex h-full" style={{ width: REVEAL }}>
        {bookmark.status === 'inbox' && (
          <button
            onClick={handleFile}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-ink-2"
            style={{ background: '#E0D4BC' }}
          >
            <FolderInput className="h-5 w-5" />
            <span className="text-[11px] font-medium">File</span>
          </button>
        )}
        <button
          onClick={handleArchive}
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-accent text-white"
        >
          <Archive className="h-5 w-5" />
          <span className="text-[11px] font-medium">Archive</span>
        </button>
      </div>

      {/* Card content */}
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: animate ? 'transform 220ms cubic-bezier(.25,.1,.25,1)' : 'none',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={() => offset === 0 && onTap()}
        className="relative cursor-pointer bg-surface px-4 pb-4 pt-4 dark:bg-dk-card"
      >
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-[15.5px] font-semibold leading-[1.32] text-ink-title dark:text-dk-ink">
            {bookmark.title}
          </h3>
          <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0 text-chevron" />
        </div>

        {/* Metadata */}
        <p className="mt-1 font-mono text-[11px] text-ink-mono dark:text-dk-ink-3">
          {source && <span className="font-medium text-[#6F675B] dark:text-dk-ink-2">{source.name} · </span>}
          {domain(bookmark.url)}
        </p>

        {/* Why */}
        {bookmark.why && (
          <div className="mt-3 flex gap-2.5">
            <div
              className="mt-0.5 w-[3px] flex-shrink-0 self-stretch rounded-full"
              style={{ background: 'var(--why-bar, #C13D2B)' }}
            />
            <p className="text-[13.5px] leading-[1.5] text-ink-2 dark:text-dk-accent" style={{ ['--why-bar' as string]: undefined }}>
              {bookmark.why}
            </p>
          </div>
        )}

        {/* Footer */}
        {(tags.length > 0 || bookmark.captured_at) && (
          <div className="mt-3 flex items-center justify-between border-t border-hairline-faint pt-3 dark:border-dk-divider">
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-[6px] border border-hairline-card bg-chip-bg px-1.5 py-0.5 font-mono text-[10.5px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3"
                >
                  #{tag.name}
                </span>
              ))}
              {folder && (
                <span className="rounded-[6px] border border-hairline-card bg-chip-bg px-1.5 py-0.5 font-mono text-[10.5px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3">
                  {folder.name}
                </span>
              )}
            </div>
            <span className="flex-shrink-0 font-mono text-[10.5px] text-ink-mono-faint dark:text-dk-ink-faint">
              {timeAgo(bookmark.captured_at)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
