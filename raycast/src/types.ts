export interface Source {
  id: string;
  name: string;
  url: string;
  created: string;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  source_id: string | null;
  note: string | null;
  why: string | null;
  status: "inbox" | "filed" | "read" | "archived" | "deleted";
  captured_at: string;
  captured_by: string;
  last_modified_at: string;
  last_modified_by: string;
  filed_at: string | null;
  deleted_at: string | null;
}

export interface BookmarksData {
  meta: {
    version: string;
    last_modified: string;
    last_modified_by: string;
  };
  folders: unknown[];
  tags: unknown[];
  sources: Source[];
  bookmarks: Bookmark[];
}
