import { useState, useMemo } from 'react'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { SwipeableCard } from './SwipeableCard'
import { useData } from '../context/DataContext'

interface MobileFoldersScreenProps {
  onSelectBookmark: (id: string) => void
}

type DrillState =
  | { type: 'root' }
  | { type: 'folder'; id: string; name: string }
  | { type: 'tag'; id: string; name: string }

export function MobileFoldersScreen({ onSelectBookmark }: MobileFoldersScreenProps) {
  const { data } = useData()
  const [drill, setDrill] = useState<DrillState>({ type: 'root' })

  const activeFolders = data?.folders.filter((f) => !f.archived) ?? []

  const countByFolder = (id: string) =>
    data?.bookmarks.filter((b) => b.folder_id === id && b.status !== 'deleted').length ?? 0

  const countByTag = (id: string) =>
    data?.bookmarks.filter((b) => b.tag_ids.includes(id) && b.status !== 'deleted').length ?? 0

  const filteredBookmarks = useMemo(() => {
    if (drill.type === 'root') return []
    return (data?.bookmarks ?? [])
      .filter((b) => {
        if (b.status === 'deleted') return false
        if (drill.type === 'folder') return b.folder_id === drill.id
        if (drill.type === 'tag') return b.tag_ids.includes(drill.id)
        return false
      })
      .sort((a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime())
  }, [data, drill])

  if (drill.type !== 'root') {
    return (
      <div className="flex h-full flex-col bg-canvas-mobile dark:bg-dk-bg">
        <div className="px-5 pb-3 pt-[54px]">
          <button
            onClick={() => setDrill({ type: 'root' })}
            className="mb-3 flex items-center gap-1 text-[13px] font-medium text-accent-ink dark:text-dk-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Folders
          </button>
          <h1 className="font-serif text-[32px] font-semibold text-ink dark:text-dk-ink">
            {drill.name}
          </h1>
          <p className="mt-0.5 font-mono text-[12.5px] text-ink-3 dark:text-dk-ink-3">
            {filteredBookmarks.length} {filteredBookmarks.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-[160px]">
          {filteredBookmarks.length === 0 ? (
            <p className="mt-8 text-center text-[14px] text-ink-3 dark:text-dk-ink-3">Nothing here yet</p>
          ) : (
            <div className="flex flex-col gap-[13px] pt-1">
              {filteredBookmarks.map((b) => (
                <SwipeableCard key={b.id} bookmark={b} onTap={() => onSelectBookmark(b.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-canvas-mobile dark:bg-dk-bg">
      <div className="px-5 pb-3 pt-[54px]">
        <h1 className="font-serif text-[32px] font-semibold text-ink dark:text-dk-ink">Folders</h1>
        <p className="mt-0.5 font-mono text-[12.5px] text-ink-3 dark:text-dk-ink-3">
          {activeFolders.length} folders · {data?.tags.length ?? 0} tags
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-[160px]">
        {/* Folders */}
        {activeFolders.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 dark:text-dk-ink-3">
              Folders
            </p>
            <div className="overflow-hidden rounded-[16px] border border-hairline-card bg-surface dark:border-dk-border dark:bg-dk-card">
              {activeFolders.map((folder, i) => (
                <button
                  key={folder.id}
                  onClick={() => setDrill({ type: 'folder', id: folder.id, name: folder.name })}
                  className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-hairline-faint dark:active:bg-dk-divider ${
                    i > 0 ? 'border-t border-hairline-faint dark:border-dk-divider' : ''
                  }`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: '#F4ECDC' }}>
                    <span style={{ fontSize: 18, color: '#B6885E' }}>📁</span>
                  </div>
                  <span className="flex-1 text-[15px] font-medium text-ink-title dark:text-dk-ink">
                    {folder.name}
                  </span>
                  <span className="font-mono text-[12px] text-ink-3 dark:text-dk-ink-3">
                    {countByFolder(folder.id)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-chevron" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {data && data.tags.length > 0 && (
          <div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[.1em] text-ink-3 dark:text-dk-ink-3">
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {data.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setDrill({ type: 'tag', id: tag.id, name: tag.name })}
                  className="flex items-center gap-1.5 rounded-[8px] border border-hairline-card bg-surface px-3 py-2 dark:border-dk-border dark:bg-dk-card"
                >
                  <span className="font-mono text-[11px] text-ink-mono-faint">#</span>
                  <span className="font-mono text-[13px] text-ink-2 dark:text-dk-ink-2">{tag.name}</span>
                  <span className="font-mono text-[11px] text-ink-3 dark:text-dk-ink-3">{countByTag(tag.id)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeFolders.length === 0 && data?.tags.length === 0 && (
          <p className="mt-8 text-center text-[14px] text-ink-3 dark:text-dk-ink-3">
            No folders or tags yet. Use the Organize page to add them.
          </p>
        )}
      </div>
    </div>
  )
}
