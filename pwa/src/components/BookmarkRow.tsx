import { ExternalLink, FolderInput, Archive, PenLine } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

interface BookmarkRowProps {
  bookmark: Bookmark
  isSelected: boolean
  onSelect: () => void
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
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

export function BookmarkRow({ bookmark, isSelected, onSelect }: BookmarkRowProps) {
  const { data, save } = useData()

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

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer border-b border-hairline-faint px-6 py-[14px] transition-colors duration-150 dark:border-dk-divider ${
        isSelected ? 'bg-row-hover dark:bg-dk-row-hover' : 'hover:bg-row-hover dark:hover:bg-dk-row-hover'
      }`}
    >
      {isSelected && (
        <div className="absolute left-0 top-0 h-full w-0.5 bg-accent dark:bg-dk-accent" />
      )}

      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {/* Title */}
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-ink-title dark:text-dk-ink">
              {bookmark.title}
            </span>
            {bookmark.type === 'note'
              ? <PenLine className="h-[13px] w-[13px] flex-shrink-0 text-chevron dark:text-dk-ink-3" />
              : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    window.open(bookmark.url, '_blank', 'noopener,noreferrer')
                  }}
                  className="flex-shrink-0 rounded p-0.5 text-chevron transition-colors hover:text-accent-ink dark:text-dk-ink-3 dark:hover:text-dk-accent"
                  title="Open link"
                >
                  <ExternalLink className="h-[13px] w-[13px]" />
                </button>
              )
            }
          </div>

          {/* Metadata */}
          <div className="mt-[5px] flex flex-wrap items-center gap-x-[5px] font-mono text-[11.5px] text-ink-mono dark:text-dk-ink-3">
            {bookmark.type === 'note' ? (
              <span className="font-medium text-[#6F675B] dark:text-dk-ink-2">note</span>
            ) : (
              <>
                {source && (
                  <>
                    <span className="font-medium text-[#6F675B] dark:text-dk-ink-2">{source.name}</span>
                    <span>·</span>
                  </>
                )}
                <span>{domain(bookmark.url)}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgo(bookmark.captured_at)}</span>
            {folder && (
              <>
                <span>·</span>
                <span className="text-ink-mono-faint dark:text-dk-ink-faint">{folder.name}</span>
              </>
            )}
          </div>

          {/* Note body preview */}
          {bookmark.type === 'note' && bookmark.note && (
            <div className="mt-2 flex gap-2">
              <div className="mt-[3px] w-0.5 flex-shrink-0 self-stretch rounded-full bg-chevron dark:bg-dk-border" />
              <p className="line-clamp-2 text-[13px] leading-[1.45] text-[#6A6256] dark:text-dk-ink-2">{bookmark.note}</p>
            </div>
          )}

          {/* Why */}
          {bookmark.type !== 'note' && bookmark.why && (
            <div className="mt-2 flex gap-2">
              <div className="mt-[3px] w-0.5 flex-shrink-0 self-stretch rounded-full bg-accent dark:bg-dk-accent" />
              <p className="text-[13px] leading-[1.45] text-[#6A6256] dark:text-dk-ink-2">{bookmark.why}</p>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-[9px] flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-[5px] border border-[#E9E1D1] bg-chip-bg px-1.5 py-0.5 font-mono text-[10.5px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 flex-col gap-0.5 pt-0.5">
          {bookmark.status === 'inbox' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const now = new Date().toISOString()
                transition({ status: 'filed', filed_at: now }, `File: ${bookmark.title}`)
              }}
              className="rounded-[6px] p-1.5 text-icon-default transition-colors duration-150 hover:bg-chip-bg hover:text-[#6F675B] dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg dark:hover:text-dk-ink-2"
              title="File"
            >
              <FolderInput className="h-3.5 w-3.5" />
            </button>
          )}
          {bookmark.status !== 'archived' && bookmark.status !== 'deleted' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                const now = new Date().toISOString()
                transition({ status: 'archived', archived_at: now }, `Archive: ${bookmark.title}`)
              }}
              className="rounded-[6px] p-1.5 text-icon-default transition-colors duration-150 hover:bg-chip-bg hover:text-[#6F675B] dark:text-dk-ink-3 dark:hover:bg-dk-chip-bg dark:hover:text-dk-ink-2"
              title="Archive"
            >
              <Archive className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
