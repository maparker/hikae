import { useState, useEffect, useRef } from 'react'
import { Plus, Check } from 'lucide-react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Label } from './ui/label'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData, Folder, Tag } from '../types'

interface EditBookmarkModalProps {
  bookmark: Bookmark | null
  onClose: () => void
}

export function EditBookmarkModal({ bookmark, onClose }: EditBookmarkModalProps) {
  const { data, save } = useData()
  const [note, setNote] = useState('')
  const [why, setWhy] = useState('')
  const [folderId, setFolderId] = useState<string>('')
  const [tagIds, setTagIds] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newTagName, setNewTagName] = useState('')
  const [showNewTag, setShowNewTag] = useState(false)
  const [pendingTags, setPendingTags] = useState<Tag[]>([])
  const newTagRef = useRef<HTMLInputElement>(null)

  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [pendingFolders, setPendingFolders] = useState<Folder[]>([])
  const newFolderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!bookmark) return
    setNote(bookmark.note ?? '')
    setWhy(bookmark.why ?? '')
    setFolderId(bookmark.folder_id ?? '')
    setTagIds(new Set(bookmark.tag_ids))
    setPendingTags([])
    setPendingFolders([])
    setShowNewTag(false)
    setShowNewFolder(false)
    setError(null)
  }, [bookmark])

  useEffect(() => {
    if (showNewTag) setTimeout(() => newTagRef.current?.focus(), 0)
  }, [showNewTag])

  useEffect(() => {
    if (showNewFolder) setTimeout(() => newFolderRef.current?.focus(), 0)
  }, [showNewFolder])

  const toggleTag = (id: string) => {
    setTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const confirmNewTag = () => {
    const name = newTagName.trim()
    if (!name) return
    const existing = [...(data?.tags ?? []), ...pendingTags].find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      setTagIds((prev) => new Set([...prev, existing.id]))
    } else {
      const newTag: Tag = { id: crypto.randomUUID(), name, created: new Date().toISOString() }
      setPendingTags((prev) => [...prev, newTag])
      setTagIds((prev) => new Set([...prev, newTag.id]))
    }
    setNewTagName('')
    setShowNewTag(false)
  }

  const confirmNewFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    const existing = [...(data?.folders ?? []), ...pendingFolders].find(
      (f) => f.name.toLowerCase() === name.toLowerCase()
    )
    if (existing) {
      setFolderId(existing.id)
    } else {
      const newFolder: Folder = { id: crypto.randomUUID(), name, archived: false, created: new Date().toISOString() }
      setPendingFolders((prev) => [...prev, newFolder])
      setFolderId(newFolder.id)
    }
    setNewFolderName('')
    setShowNewFolder(false)
  }

  const handleSave = async () => {
    if (!bookmark || !data) return
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()
    const updated: BookmarksData = {
      ...data,
      meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
      tags: [...data.tags, ...pendingTags],
      folders: [...data.folders, ...pendingFolders],
      bookmarks: data.bookmarks.map((b) =>
        b.id === bookmark.id
          ? {
              ...b,
              note: note.trim() || null,
              why: why.trim() || null,
              folder_id: folderId || null,
              tag_ids: [...tagIds],
              last_modified_at: now,
              last_modified_by: 'pwa',
            }
          : b
      ),
    }
    try {
      await save(updated, `Edit bookmark: ${bookmark.title}`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!bookmark) return null

  const allTags = [...(data?.tags ?? []), ...pendingTags]
  const allFolders = [...(data?.folders ?? []), ...pendingFolders].filter((f) => !f.archived)

  return (
    <Dialog open={!!bookmark} onClose={onClose} title="Edit Bookmark">
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <p className="mt-1 text-sm text-gray-700">{bookmark.title}</p>
        </div>

        <div>
          <Label>URL</Label>
          <button
            onClick={() => window.open(bookmark.url, '_blank', 'noopener,noreferrer')}
            className="mt-1 block truncate text-left text-sm text-blue-600 hover:underline"
          >
            {bookmark.url}
          </button>
        </div>

        <div>
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            className="mt-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Your notes…"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="why">Why saved</Label>
          <Textarea
            id="why"
            className="mt-1"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="Why did you save this?"
            rows={2}
          />
        </div>

        {/* Folder */}
        <div>
          <Label>Folder</Label>
          <div className="mt-1 flex items-center gap-2">
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No folder</option>
              {allFolders.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {!showNewFolder && (
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2.5 py-1.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
          </div>
          {showNewFolder && (
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={newFolderRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewFolder()
                  if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') }
                }}
                placeholder="Folder name…"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={confirmNewFolder}
                disabled={!newFolderName.trim()}
                className="rounded-md bg-blue-600 p-1.5 text-white disabled:opacity-40 hover:bg-blue-700"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <Label>Tags</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {allTags.map((tag) => (
              <label key={tag.id} className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={tagIds.has(tag.id)}
                  onChange={() => toggleTag(tag.id)}
                  className="rounded border-gray-300"
                />
                {tag.name}
              </label>
            ))}
            {!showNewTag && (
              <button
                onClick={() => setShowNewTag(true)}
                className="flex items-center gap-1 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600"
              >
                <Plus className="h-3 w-3" />
                New tag
              </button>
            )}
          </div>
          {showNewTag && (
            <div className="mt-2 flex items-center gap-2">
              <input
                ref={newTagRef}
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmNewTag()
                  if (e.key === 'Escape') { setShowNewTag(false); setNewTagName('') }
                }}
                placeholder="Tag name…"
                className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={confirmNewTag}
                disabled={!newTagName.trim()}
                className="rounded-md bg-blue-600 p-1.5 text-white disabled:opacity-40 hover:bg-blue-700"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
