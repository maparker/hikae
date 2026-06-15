import { ExternalLink, Zap, FolderInput, Archive, Edit2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

interface DetailPanelProps {
  bookmark: Bookmark | null
  onEdit: (b: Bookmark) => void
}

const STATUS_PILL: Record<string, { color: string; bg: string }> = {
  inbox: { color: '#A8341F', bg: '#FBF1ED' },
  filed: { color: '#5E7A8A', bg: '#EDF2F4' },
  read: { color: '#5B7A5F', bg: '#EDF3EE' },
  archived: { color: '#8A8173', bg: '#F1ECE0' },
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
      <div className="w-[340px] flex-shrink-0 border-l border-hairline bg-surface" />
    )
  }

  const folder = data?.folders.find((f) => f.id === bookmark.folder_id)
  const tags = data?.tags.filter((t) => bookmark.tag_ids.includes(t.id)) ?? []
  const source = data?.sources.find((s) => s.id === bookmark.source_id)
  const pill = STATUS_PILL[bookmark.status] ?? STATUS_PILL.archived

  return (
    <div className="flex w-[340px] flex-shrink-0 flex-col overflow-y-auto border-l border-hairline bg-surface p-[22px]">
      {/* Status + Open */}
      <div className="flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-medium uppercase tracking-wider"
          style={{ color: pill.color, backgroundColor: pill.bg }}
        >
          {bookmark.status}
        </span>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[12px] font-medium text-accent-ink hover:underline"
        >
          <ExternalLink className="h-[13px] w-[13px]" />
          Open
        </a>
      </div>

      {/* Title */}
      <h1
        className="mt-3 text-[18px] font-semibold leading-[1.3] text-ink-title"
        style={{ textWrap: 'pretty' } as React.CSSProperties}
      >
        {bookmark.title}
      </h1>

      {/* Why kept */}
      {bookmark.why && (
        <div className="mt-4 rounded-[10px] border border-accent-wash-border bg-accent-wash px-[15px] py-[13px]">
          <p
            className="mb-1.5 font-serif text-[10px] uppercase tracking-[.16em]"
            style={{ color: '#C68B7C' }}
          >
            控 · why kept
          </p>
          <p className="text-[14px] leading-[1.5] text-accent-wash-text">{bookmark.why}</p>
        </div>
      )}

      {/* Note */}
      {bookmark.note && (
        <p className="mt-3 text-[13px] leading-relaxed" style={{ color: '#6A6256' }}>
          {bookmark.note}
        </p>
      )}

      {/* Meta table */}
      <div className="mt-4 space-y-[11px] border-t border-hairline-faint pt-4">
        {[
          { key: 'Source', value: source?.name ?? '—', mono: false },
          { key: 'Domain', value: domain(bookmark.url), mono: true },
          { key: 'Folder', value: folder?.name ?? '—', mono: false },
          { key: 'Captured', value: formatDate(bookmark.captured_at), mono: true },
        ].map(({ key, value, mono }) => (
          <div key={key} className="flex items-baseline justify-between gap-4">
            <span className="text-[11.5px] uppercase tracking-wider text-ink-3">{key}</span>
            <span
              className={`text-right text-[12px] text-[#4A443A] ${mono ? 'font-mono' : ''}`}
            >
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
              className="rounded-[5px] border border-[#E9E1D1] bg-chip-bg px-2 py-0.5 font-mono text-[10.5px] text-ink-mono"
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar"
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
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        )}
        <button
          onClick={() => onEdit(bookmark)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[8px] border border-hairline-warm bg-surface-sunken py-2 text-[12.5px] font-medium text-[#4A443A] transition-colors hover:bg-sidebar"
        >
          <Edit2 className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-1.5 pt-6">
        <Zap className="h-3 w-3 text-ink-mono-faint" />
        <span className="font-mono text-[11px] text-ink-mono-faint">
          captured via {bookmark.captured_by}
        </span>
      </div>
    </div>
  )
}
