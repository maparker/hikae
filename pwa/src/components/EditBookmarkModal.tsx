import { useState, useEffect } from 'react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { Select } from './ui/select'
import { Label } from './ui/label'
import { useData } from '../context/DataContext'
import type { Bookmark, BookmarksData } from '../types'

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

  useEffect(() => {
    if (!bookmark) return
    setNote(bookmark.note ?? '')
    setWhy(bookmark.why ?? '')
    setFolderId(bookmark.folder_id ?? '')
    setTagIds(new Set(bookmark.tag_ids))
    setError(null)
  }, [bookmark])

  const toggleTag = (id: string) => {
    setTagIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = async () => {
    if (!bookmark || !data) return
    setSaving(true)
    setError(null)
    const now = new Date().toISOString()
    const updated: BookmarksData = {
      ...data,
      meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
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

  return (
    <Dialog open={!!bookmark} onClose={onClose} title="Edit Bookmark">
      <div className="space-y-4">
        <div>
          <Label>Title</Label>
          <p className="mt-1 text-sm text-gray-700">{bookmark.title}</p>
        </div>

        <div>
          <Label>URL</Label>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-blue-600 hover:underline"
          >
            {bookmark.url}
          </a>
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

        <div>
          <Label htmlFor="folder">Folder</Label>
          <Select
            id="folder"
            className="mt-1"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
          >
            <option value="">No folder</option>
            {data?.folders
              .filter((f) => !f.archived)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
          </Select>
        </div>

        {data && data.tags.length > 0 && (
          <div>
            <Label>Tags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.tags.map((tag) => (
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
            </div>
          </div>
        )}

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
