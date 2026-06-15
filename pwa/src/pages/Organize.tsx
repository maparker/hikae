import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2, ArchiveRestore, Archive, Check, X } from 'lucide-react'
import { Tabs } from '../components/ui/tabs'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Spinner } from '../components/ui/spinner'
import { useData } from '../context/DataContext'
import type { BookmarksData, Tag, Folder, Source } from '../types'

function countTagBookmarks(data: BookmarksData, tagId: string) {
  return data.bookmarks.filter((b) => b.tag_ids.includes(tagId) && b.status !== 'deleted').length
}
function countFolderBookmarks(data: BookmarksData, folderId: string) {
  return data.bookmarks.filter((b) => b.folder_id === folderId && b.status !== 'deleted').length
}
function countSourceBookmarks(data: BookmarksData, sourceId: string) {
  return data.bookmarks.filter((b) => b.source_id === sourceId && b.status !== 'deleted').length
}

function InlineEdit({
  value,
  onSave,
  onCancel,
}: {
  value: string
  onSave: (v: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState(value)
  return (
    <div className="flex items-center gap-2">
      <Input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="h-7 w-40 text-xs"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSave(val.trim())
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={() => onSave(val.trim())} className="text-green-600 hover:text-green-700">
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function TagsTab() {
  const { data, save } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (!data) return null

  const handleRename = async (tag: Tag, name: string) => {
    if (!name) return
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        tags: data.tags.map((t) => (t.id === tag.id ? { ...t, name } : t)),
      },
      `Rename tag: ${tag.name} → ${name}`
    )
    setEditingId(null)
  }

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all bookmarks.`)) return
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        tags: data.tags.filter((t) => t.id !== tag.id),
        bookmarks: data.bookmarks.map((b) => ({
          ...b,
          tag_ids: b.tag_ids.filter((id) => id !== tag.id),
        })),
      },
      `Delete tag: ${tag.name}`
    )
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    const now = new Date().toISOString()
    const newTag: Tag = { id: crypto.randomUUID(), name: newName.trim(), created: now }
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        tags: [...data.tags, newTag],
      },
      `Add tag: ${newTag.name}`
    )
    setNewName('')
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {adding ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              className="h-7 w-40 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
            />
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            New tag
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-2">Name</th>
            <th className="pb-2">Bookmarks</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.tags.map((tag) => (
            <tr key={tag.id} className="border-b border-gray-100">
              <td className="py-2">
                {editingId === tag.id ? (
                  <InlineEdit
                    value={tag.name}
                    onSave={(name) => handleRename(tag, name)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  tag.name
                )}
              </td>
              <td className="py-2 text-gray-500">{countTagBookmarks(data, tag.id)}</td>
              <td className="py-2">
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => setEditingId(tag.id)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(tag)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.tags.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No tags yet</p>
      )}
    </div>
  )
}

function FoldersTab() {
  const { data, save } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  if (!data) return null

  const handleRename = async (folder: Folder, name: string) => {
    if (!name) return
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        folders: data.folders.map((f) => (f.id === folder.id ? { ...f, name } : f)),
      },
      `Rename folder: ${folder.name} → ${name}`
    )
    setEditingId(null)
  }

  const handleToggleArchive = async (folder: Folder) => {
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        folders: data.folders.map((f) =>
          f.id === folder.id ? { ...f, archived: !f.archived } : f
        ),
      },
      `${folder.archived ? 'Unarchive' : 'Archive'} folder: ${folder.name}`
    )
  }

  const handleDelete = async (folder: Folder) => {
    if (!confirm(`Delete folder "${folder.name}"? Bookmarks will be unfoldered.`)) return
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        folders: data.folders.filter((f) => f.id !== folder.id),
        bookmarks: data.bookmarks.map((b) =>
          b.folder_id === folder.id ? { ...b, folder_id: null } : b
        ),
      },
      `Delete folder: ${folder.name}`
    )
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    const now = new Date().toISOString()
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      created: now,
      archived: false,
    }
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        folders: [...data.folders, newFolder],
      },
      `Add folder: ${newFolder.name}`
    )
    setNewName('')
    setAdding(false)
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        {adding ? (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Folder name"
              className="h-7 w-40 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') setAdding(false)
              }}
            />
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            New folder
          </Button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-2">Name</th>
            <th className="pb-2">Bookmarks</th>
            <th className="pb-2">Status</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.folders.map((folder) => (
            <tr key={folder.id} className="border-b border-gray-100">
              <td className="py-2">
                {editingId === folder.id ? (
                  <InlineEdit
                    value={folder.name}
                    onSave={(name) => handleRename(folder, name)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <span className={folder.archived ? 'text-gray-400' : ''}>{folder.name}</span>
                )}
              </td>
              <td className="py-2 text-gray-500">{countFolderBookmarks(data, folder.id)}</td>
              <td className="py-2 text-xs text-gray-400">{folder.archived ? 'Archived' : 'Active'}</td>
              <td className="py-2">
                <div className="flex items-center gap-1 justify-end">
                  <button
                    onClick={() => setEditingId(folder.id)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggleArchive(folder)}
                    className="p-1 text-gray-400 hover:text-gray-700"
                    title={folder.archived ? 'Unarchive' : 'Archive'}
                  >
                    {folder.archived ? (
                      <ArchiveRestore className="h-3.5 w-3.5" />
                    ) : (
                      <Archive className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(folder)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.folders.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No folders yet</p>
      )}
    </div>
  )
}

function SourcesTab() {
  const { data, save } = useData()
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!data) return null

  const handleRename = async (source: Source, name: string) => {
    if (!name) return
    const now = new Date().toISOString()
    await save(
      {
        ...data,
        meta: { ...data.meta, last_modified: now, last_modified_by: 'pwa' },
        sources: data.sources.map((s) => (s.id === source.id ? { ...s, name } : s)),
      },
      `Rename source: ${source.name} → ${name}`
    )
    setEditingId(null)
  }

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
            <th className="pb-2">Name</th>
            <th className="pb-2">URL</th>
            <th className="pb-2">Bookmarks</th>
            <th className="pb-2"></th>
          </tr>
        </thead>
        <tbody>
          {data.sources.map((source) => (
            <tr key={source.id} className="border-b border-gray-100">
              <td className="py-2">
                {editingId === source.id ? (
                  <InlineEdit
                    value={source.name}
                    onSave={(name) => handleRename(source, name)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  source.name
                )}
              </td>
              <td className="py-2 max-w-xs truncate text-gray-500 text-xs">{source.url}</td>
              <td className="py-2 text-gray-500">{countSourceBookmarks(data, source.id)}</td>
              <td className="py-2">
                <button
                  onClick={() => setEditingId(source.id)}
                  className="p-1 text-gray-400 hover:text-gray-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.sources.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">No sources yet</p>
      )}
    </div>
  )
}

export function Organize() {
  const { loading, error } = useData()
  const navigate = useNavigate()

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-base font-semibold text-gray-900">Organize</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {!loading && !error && (
          <Tabs
            items={[
              { id: 'tags', label: 'Tags', content: <TagsTab /> },
              { id: 'folders', label: 'Folders', content: <FoldersTab /> },
              { id: 'sources', label: 'Sources', content: <SourcesTab /> },
            ]}
          />
        )}
      </div>
    </div>
  )
}
