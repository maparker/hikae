import { useState } from 'react'
import { Sidebar } from '../components/Sidebar'
import { BookmarkRow } from '../components/BookmarkRow'
import { EditBookmarkModal } from '../components/EditBookmarkModal'
import { Spinner } from '../components/ui/spinner'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarkStatus } from '../types'

export function Home() {
  const { data, loading, error } = useData()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | null>('inbox')
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<Bookmark | null>(null)

  const filteredBookmarks = data?.bookmarks.filter((b) => {
    if (b.status === 'deleted') return false
    if (selectedTagId) return b.tag_ids.includes(selectedTagId)
    if (selectedFolderId) return b.folder_id === selectedFolderId
    if (selectedStatus) return b.status === selectedStatus
    return true
  }) ?? []

  const sortedBookmarks = [...filteredBookmarks].sort(
    (a, b) => new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime()
  )

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        selectedStatus={selectedStatus}
        setSelectedStatus={setSelectedStatus}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        selectedTagId={selectedTagId}
        setSelectedTagId={setSelectedTagId}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {selectedStatus
              ? selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)
              : selectedFolderId
              ? data?.folders.find((f) => f.id === selectedFolderId)?.name ?? 'Folder'
              : selectedTagId
              ? data?.tags.find((t) => t.id === selectedTagId)?.name ?? 'Tag'
              : 'All Bookmarks'}
          </h2>
          <p className="text-xs text-gray-400">
            {sortedBookmarks.length} bookmark{sortedBookmarks.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="mx-6 mt-6 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && sortedBookmarks.length === 0 && (
          <div className="flex flex-col items-center py-20 text-gray-400">
            <p className="text-sm">No bookmarks here</p>
          </div>
        )}

        {!loading && !error && sortedBookmarks.length > 0 && (
          <div>
            {sortedBookmarks.map((b) => (
              <BookmarkRow key={b.id} bookmark={b} onEdit={setEditingBookmark} />
            ))}
          </div>
        )}
      </main>

      <EditBookmarkModal bookmark={editingBookmark} onClose={() => setEditingBookmark(null)} />
    </div>
  )
}
