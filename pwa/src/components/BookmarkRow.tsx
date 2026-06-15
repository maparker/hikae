import { ExternalLink, Edit2, FolderInput, Archive } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

interface BookmarkRowProps {
  bookmark: Bookmark
  onEdit: (b: Bookmark) => void
}

function domain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function BookmarkRow({ bookmark, onEdit }: BookmarkRowProps) {
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

  const handleFile = () => {
    const now = new Date().toISOString()
    transition({ status: 'filed', filed_at: now }, `File: ${bookmark.title}`)
  }

  const handleArchive = () => {
    const now = new Date().toISOString()
    transition({ status: 'archived', archived_at: now }, `Archive: ${bookmark.title}`)
  }

  return (
    <div className="flex items-start gap-4 border-b border-gray-100 px-4 py-3 last:border-b-0 hover:bg-gray-50">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
          >
            {bookmark.title}
          </a>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          {source && <span className="font-medium">{source.name}</span>}
          <span>{domain(bookmark.url)}</span>
          <span>·</span>
          <span>{formatDate(bookmark.captured_at)}</span>
          {folder && (
            <>
              <span>·</span>
              <span className="text-gray-400">{folder.name}</span>
            </>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag.id} variant="secondary">
                {tag.name}
              </Badge>
            ))}
          </div>
        )}

        {bookmark.note && (
          <p className="mt-1.5 line-clamp-2 text-xs text-gray-500">{bookmark.note}</p>
        )}
      </div>

      <div className="flex flex-shrink-0 items-center gap-1 pt-0.5">
        <Button variant="ghost" size="sm" onClick={() => onEdit(bookmark)} title="Edit">
          <Edit2 className="h-3.5 w-3.5" />
        </Button>
        {bookmark.status === 'inbox' && (
          <Button variant="ghost" size="sm" onClick={handleFile} title="File">
            <FolderInput className="h-3.5 w-3.5" />
          </Button>
        )}
        {bookmark.status !== 'archived' && bookmark.status !== 'deleted' && (
          <Button variant="ghost" size="sm" onClick={handleArchive} title="Archive">
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
