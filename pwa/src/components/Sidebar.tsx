import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Inbox, FileText, BookOpen, Archive, LogOut, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { Badge } from './ui/badge'
import type { BookmarkStatus } from '../types'

const cn = (...args: Parameters<typeof clsx>) => twMerge(clsx(...args))

interface SidebarProps {
  selectedStatus: BookmarkStatus | null
  setSelectedStatus: (s: BookmarkStatus | null) => void
  selectedFolderId: string | null
  setSelectedFolderId: (id: string | null) => void
  selectedTagId: string | null
  setSelectedTagId: (id: string | null) => void
}

const STATUS_ITEMS: { status: BookmarkStatus; label: string; icon: typeof Inbox }[] = [
  { status: 'inbox', label: 'Inbox', icon: Inbox },
  { status: 'filed', label: 'Filed', icon: FileText },
  { status: 'read', label: 'Read', icon: BookOpen },
  { status: 'archived', label: 'Archived', icon: Archive },
]

export function Sidebar({
  selectedStatus,
  setSelectedStatus,
  selectedFolderId,
  setSelectedFolderId,
  selectedTagId,
  setSelectedTagId,
}: SidebarProps) {
  const { user, avatarUrl, signOut } = useAuth()
  const { data } = useData()
  const navigate = useNavigate()

  const countByStatus = (status: BookmarkStatus) =>
    data?.bookmarks.filter((b) => b.status === status).length ?? 0

  const countByFolder = (folderId: string) =>
    data?.bookmarks.filter((b) => b.folder_id === folderId && b.status !== 'deleted').length ?? 0

  const countByTag = (tagId: string) =>
    data?.bookmarks.filter((b) => b.tag_ids.includes(tagId) && b.status !== 'deleted').length ?? 0

  const handleStatusClick = (status: BookmarkStatus) => {
    setSelectedStatus(status)
    setSelectedFolderId(null)
    setSelectedTagId(null)
  }

  const handleFolderClick = (id: string) => {
    setSelectedFolderId(id)
    setSelectedStatus(null)
    setSelectedTagId(null)
  }

  const handleTagClick = (id: string) => {
    setSelectedTagId(id)
    setSelectedStatus(null)
    setSelectedFolderId(null)
  }

  return (
    <aside className="flex h-screen w-60 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
      <div className="px-4 py-5">
        <Link to="/" className="text-xl font-bold text-gray-900">
          Hikae
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        <div className="mb-4">
          <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Status
          </p>
          {STATUS_ITEMS.map(({ status, label, icon: Icon }) => (
            <button
              key={status}
              onClick={() => handleStatusClick(status)}
              className={cn(
                'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                selectedStatus === status
                  ? 'bg-gray-200 font-medium text-gray-900'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span className="text-xs text-gray-400">{countByStatus(status)}</span>
            </button>
          ))}
        </div>

        {data && data.folders.filter((f) => !f.archived).length > 0 && (
          <div className="mb-4">
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Folders
            </p>
            {data.folders
              .filter((f) => !f.archived)
              .map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                    selectedFolderId === folder.id
                      ? 'bg-gray-200 font-medium text-gray-900'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <span className="truncate">{folder.name}</span>
                  <span className="text-xs text-gray-400">{countByFolder(folder.id)}</span>
                </button>
              ))}
          </div>
        )}

        {data && data.tags.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Tags
            </p>
            <div className="flex flex-wrap gap-1 px-2">
              {data.tags.map((tag) => (
                <button key={tag.id} onClick={() => handleTagClick(tag.id)}>
                  <Badge
                    variant={selectedTagId === tag.id ? 'default' : 'secondary'}
                    className="cursor-pointer"
                  >
                    {tag.name} ({countByTag(tag.id)})
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            {avatarUrl && (
              <img src={avatarUrl} alt={user ?? ''} className="h-7 w-7 rounded-full" />
            )}
            <span className="truncate text-sm text-gray-700">{user}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/organize')}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              title="Organize"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={signOut}
              className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
