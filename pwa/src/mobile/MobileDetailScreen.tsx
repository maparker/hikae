import { useEffect, useState } from 'react'
import { ChevronLeft, ExternalLink, FolderInput, Archive, Edit2 } from 'lucide-react'
import { useData } from '../context/DataContext'
import { EditBookmarkModal } from '../components/EditBookmarkModal'
import type { Bookmark, BookmarksData } from '../types'

interface MobileDetailScreenProps {
  bookmarkId: string
  onBack: () => void
}

const STATUS_PILL: Record<string, { color: string; bg: string }> = {
  inbox: { color: '#A8341F', bg: '#FBF1ED' },
  filed: { color: '#5E7A8A', bg: '#EDF2F4' },
  read: { color: '#5B7A5F', bg: '#EDF3EE' },
  archived: { color: '#8A8173', bg: '#F1ECE0' },
}

function domain(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function MobileDetailScreen({ bookmarkId, onBack }: MobileDetailScreenProps) {
  const { data, save } = useData()
  const [visible, setVisible] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  const bookmark = data?.bookmarks.find((b) => b.id === bookmarkId) ?? null
  const folder = data?.folders.find((f) => f.id === bookmark?.folder_id)
  const tags = data?.tags.filter((t) => bookmark?.tag_ids.includes(t.id)) ?? []
  const source = data?.sources.find((s) => s.id === bookmark?.source_id)

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

  const handleBack = () => {
    setVisible(false)
    setTimeout(onBack, 260)
  }

  const pill = bookmark ? (STATUS_PILL[bookmark.status] ?? STATUS_PILL.archived) : null

  return (
    <div
      className="fixed inset-0 z-50 bg-canvas-detail dark:bg-dk-bg"
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 260ms cubic-bezier(.4,0,.2,1)',
      }}
    >
      {/* Scrollable body */}
      <div className="h-full overflow-y-auto pb-[100px]" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        {/* Navigation header */}
        <div className="flex items-center justify-between px-4 pb-3 pt-[54px]">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[13px] font-medium text-accent-ink dark:border-dk-border dark:bg-dk-card dark:text-dk-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Inbox
          </button>
          {bookmark && (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 rounded-full border border-hairline bg-surface px-3 py-1.5 text-[13px] font-medium text-accent-ink dark:border-dk-border dark:bg-dk-card dark:text-dk-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Open
            </a>
          )}
        </div>

        {bookmark && (
          <div className="px-5">
            {/* Status pill */}
            {pill && (
              <span
                className="inline-block rounded-full px-2.5 py-0.5 font-mono text-[10.5px] uppercase tracking-wider"
                style={{ color: pill.color, backgroundColor: pill.bg }}
              >
                {bookmark.status}
              </span>
            )}

            {/* Title */}
            <h1
              className="mt-3 font-serif text-[25px] font-semibold leading-[1.34] text-ink dark:text-dk-ink"
              style={{ textWrap: 'pretty' } as React.CSSProperties}
            >
              {bookmark.title}
            </h1>

            {/* Why kept */}
            {bookmark.why && (
              <div className="mt-4 rounded-[14px] border border-accent-wash-border bg-accent-wash px-4 py-3.5">
                <p className="mb-1.5 font-serif text-[11px] uppercase tracking-[.16em]" style={{ color: '#C68B7C' }}>
                  控 · why kept
                </p>
                <p className="text-[15.5px] leading-[1.5] text-accent-wash-text">{bookmark.why}</p>
              </div>
            )}

            {/* Note */}
            {bookmark.note && (
              <p className="mt-4 text-[15px] leading-relaxed text-ink-2 dark:text-dk-ink-2">
                {bookmark.note}
              </p>
            )}

            {/* Meta */}
            <div className="mt-5 space-y-3 border-t border-hairline-card pt-4 dark:border-dk-divider">
              {[
                { key: 'Source', value: source?.name ?? '—', mono: false },
                { key: 'Domain', value: domain(bookmark.url), mono: true },
                { key: 'Folder', value: folder?.name ?? '—', mono: false },
                { key: 'Captured', value: formatDate(bookmark.captured_at), mono: true },
              ].map(({ key, value, mono }) => (
                <div key={key} className="flex items-baseline justify-between gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 dark:text-dk-ink-3">
                    {key}
                  </span>
                  <span
                    className={`text-right text-[13px] text-[#4A443A] dark:text-dk-ink-2 ${mono ? 'font-mono' : ''}`}
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
                    className="rounded-[6px] border border-hairline-card bg-chip-bg px-2 py-0.5 font-mono text-[11px] text-ink-mono dark:border-dk-chip-border dark:bg-dk-chip-bg dark:text-dk-ink-3"
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pinned action bar */}
      {bookmark && (
        <div
          className="fixed bottom-0 left-0 right-0 flex gap-3 border-t border-hairline px-5 pb-[30px] pt-3 dark:border-dk-border"
          style={{ background: 'rgba(247,243,234,.92)', backdropFilter: 'blur(14px)' }}
        >
          <button
            onClick={() => setEditing(true)}
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-hairline bg-surface-sunken text-[14px] font-medium text-ink-2 dark:border-dk-border dark:bg-dk-card dark:text-dk-ink-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
          {bookmark.status === 'inbox' && (
            <button
              onClick={() => {
                const now = new Date().toISOString()
                transition({ status: 'filed', filed_at: now }, `File: ${bookmark.title}`)
              }}
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[12px] border border-hairline bg-surface-sunken text-[14px] font-medium text-ink-2 dark:border-dk-border dark:bg-dk-card dark:text-dk-ink-2"
            >
              <FolderInput className="h-4 w-4" />
              File
            </button>
          )}
          {bookmark.status !== 'archived' && bookmark.status !== 'deleted' && (
            <button
              onClick={() => {
                const now = new Date().toISOString()
                transition({ status: 'archived', archived_at: now }, `Archive: ${bookmark.title}`)
              }}
              className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-accent text-[14px] font-medium text-white"
            >
              <Archive className="h-4 w-4" />
              Archive
            </button>
          )}
        </div>
      )}

      <EditBookmarkModal bookmark={editing ? bookmark : null} onClose={() => setEditing(false)} />
    </div>
  )
}
