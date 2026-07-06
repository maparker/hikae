import { ExternalLink, Zap, FolderInput, Archive, Edit2, PenLine } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

interface DetailPanelProps {
  bookmark: Bookmark | null
  onEdit: (b: Bookmark) => void
}

const STATUS_PILL: Record<string, string> = {
  inbox: 'bg-accent-wash text-accent-ink dark:bg-dk-accent-wash dark:text-dk-accent',
  filed: 'bg-[#EDF2F4] text-[#5E7A8A] dark:bg-[#1E2B2F] dark:text-[#7AABB8]',
  read: 'bg-[#EDF3EE] text-[#5B7A5F] dark:bg-[#1E2B22] dark:text-dk-green',
  archived: 'bg-chip-bg text-ink-3 dark:bg-dk-chip-bg dark:text-dk-ink-3',
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function DetailPanel({ bookmark, onEdit }: DetailPanelProps) {
  const { data, save } = useData()

  const transition = async (updates: Partial<Bookmark>, message: string) => {
    if (!data || !bookmark) return
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

  if (!bookmark) {
    return (
      <div className="w-[340px] flex-shrink-0 border-l border-hairline bg-surface dark:border-dk-border dark:bg-dk-card" />
    )
  }

  const folder = data?.folders.find((f) => f.id === bookmark.folder_id)
  const tags = data?.tags.filter((t) => bookmark.tag_ids.includes(t.id)) ?? []
  const source = data?.sources.find((s) => s.id === bookmark.source_id)
  const pillClass = STATUS_PILL[bookmark.status] ?? STATUS_PILL.archived

  return (
    <div className="flex w-[340px] flex-shrink-0 flex-col overflow-y-auto border-l border-hairline bg-surface p-[22px] dark:border-dk-border dark:bg-dk-card">
      {/* Status + Open/Note badge */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider ${pillClass}`}>
          {bookmark.status}
        </span>
        {bookmark.type === 'note' ? (
          <span className="flex items-center gap-1 text-[12px] font-medium text-ink-3 dark:text-dk-ink-3">
            <PenLine className="h-[13px] w-[13px]" />
            Note
          </span>
        ) : (
          <button
            onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
            className="flex items-center gap-1 text-[12px] font-medium text-accent-ink hover:underline dark:text-dk-accent"
          >
            <ExternalLink className="h-[13px] w-[13px]" />
            Open
          </button>
        )}
      </div>

      {/* Title */}
      <h1
        className="mt-3 text-[18px] font-semibold leading-[1.3] text-ink-title dark:text-dk-ink"
        style={{ textWrap: 'pretty' } as React.CSSProperties}
      >
        {bookmark.title}
      </h1>

      {/* Note body (notes only — shown prominently) */}
      {bookmark.type === 'note' && bookmark.note && (
        <p className="mt-3 text-[14px] leading-relaxed text-[#4A443A] dark:text-dk-ink-2">
          {bookmark.note}
        </p>
      )}

      {/* Why kept */}
      {bookmark.why && (
        <div className="mt-4 rounded-[10px] border border-accent-wash-border bg-accent-wash px-[15px] py-[13px] dark:border-dk-accent-wash-border dark:bg-dk-accent-wash">
          <p className="mb-1.5 font-serif text-[10px] uppercase tracking-[.16em] text-[#C68B7C] dark:text-[#D4907C]">
            控 · why kept
          </p>
          <p className="text-[14px] leading-[1.5] text-accent-wash-text dark:text-dk-ink-2">{bookmark.why}</p>
        </div>
      )}

      {/* Note field for bookmarks (not notes) */}
      {bookmark.type !== 'note' && bookmark.note && (
        <p className="mt-3 text-[13px] leading-relaxed text-[#6A6256] dark:text-dk-ink-2">
          {bookmark.note}
        </p>
      )}

      {/* Meta table */}
      <div className="mt-4 space-y-[11px] border-t border-hairline-faint pt-4 dark:border-dk-divider">
        {(bookmark.type === 'note'
          ? [
              { key: 'Folder', value: folder?.name ?? '—', mono: false },
              { key: 'Captured', value: formatDate(bookmark.captured_at), mono: true },
            ]
          : [
              { key: 'Source', value: source?.name ?? '—', mono: false },
              { key: 'Domain', value: domain(bookmark.url), mono: true },
              { key: 'Folder', value: folder?.name ?? '—', mono: false },
              { key: 'Captured', value: formatDate(bookmark.captured_at), mono: true },
            ]
        ).map(({ key, value, mono }) => (
          <div key={key} className="flex items-baseline justify-between gap-4">
            <span className="text-[11.5px] uppercase tracking-wider text-ink-3 dark:text-dk-ink-3">{key}</span>
            <span className={`text-right text-[12px] text-[#4A443A] dark:text-dk-ink-2 ${mono ? 'font-mono' : ''}`}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="rounded-[5px] border border-[#E9E1D1] bg-chip-bg px-2 py-0.5 font-mono text-[10.5px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {bookmark.status === 'inbox' && (
          <button
            onClick={() => {
              const now = new Date().toISOString()
              transition({ status: 'filed', filed_at: now }, `File: ${bookmark.title}`)
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar dark:border-dk-border dark:bg-dk-surface-sunken dark:text-dk-ink-2 dark:hover:bg-dk-row-hover"
          >
            <FolderInput className="h-3.5 w-3.5" />
            File
          </button>
        )}
        {bookmark.status !== 'archived' && bookmark.status !== 'deleted' && (
          <button
            onClick={() => {
              const now = new Date().toISOString()
              transition(
                { status: 'archived', archived_at: now },
                `Archive: ${bookmark.title}`
              )
            }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar dark:border-dk-border dark:bg-dk-surface-sunken dark:text-dk-ink-2 dark:hover:bg-dk-row-hover"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        )}
        <button
          onClick={() => onEdit(bookmark)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar dark:border-dk-border dark:bg-dk-surface-sunken dark:text-dk-ink-2 dark:hover:bg-dk-row-hover"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-1.5 pt-6">
        <Zap className="h-3 w-3 text-ink-mono-faint dark:text-dk-ink-faint" />
        <span className="font-mono text-[11px] text-ink-mono-faint dark:text-dk-ink-faint">
          captured via {bookmark.captured_by}
        </span>
      </div>
    </div>
  )
}
