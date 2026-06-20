export interface Folder {
  id: string
  name: string
  created: string
  archived: boolean
}

export interface Tag {
  id: string
  name: string
  created: string
}

export interface Source {
  id: string
  name: string
  url: string
  created: string
}

export type BookmarkStatus = 'inbox' | 'filed' | 'read' | 'archived' | 'deleted'
export type BookmarkType = 'bookmark' | 'note'

export interface Bookmark {
  id: string
  type?: BookmarkType
  url: string
  title: string
  folder_id: string | null
  tag_ids: string[]
  source_id: string | null
  note: string | null
  why: string | null
  status: BookmarkStatus
  captured_at: string
  captured_by: string
  last_modified_at: string
  last_modified_by: string
  filed_at: string | null
  read_at: string | null
  archived_at: string | null
  deleted_at: string | null
}

export interface BookmarksMeta {
  version: string
  last_modified: string
  last_modified_by: string
}

export interface BookmarksData {
  meta: BookmarksMeta
  folders: Folder[]
  tags: Tag[]
  sources: Source[]
  bookmarks: Bookmark[]
  [key: string]: unknown
}
