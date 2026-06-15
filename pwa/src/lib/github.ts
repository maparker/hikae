import type { Bookmark, BookmarksData } from '../types'

const API = 'https://api.github.com'
const DATA_PATH = 'data/bookmarks.json'
const PENDING_PATH = 'data/pending'

async function apiRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export async function getUser(token: string): Promise<{ login: string; avatar_url: string }> {
  return apiRequest(`${API}/user`, token)
}

export async function getBookmarksData(
  user: string,
  token: string
): Promise<{ data: BookmarksData; sha: string }> {
  const res = await apiRequest<{ content: string; sha: string }>(
    `${API}/repos/${user}/hikae-data/contents/${DATA_PATH}`,
    token
  )
  const json = atob(res.content.replace(/\n/g, ''))
  const data = JSON.parse(json) as BookmarksData
  return { data, sha: res.sha }
}

export async function saveBookmarksData(
  user: string,
  token: string,
  data: BookmarksData,
  sha: string,
  message: string
): Promise<{ sha: string }> {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))))
  const res = await apiRequest<{ content: { sha: string } }>(
    `${API}/repos/${user}/hikae-data/contents/${DATA_PATH}`,
    token,
    {
      method: 'PUT',
      body: JSON.stringify({ message, content, sha }),
    }
  )
  return { sha: res.content.sha }
}

type GHFile = { name: string; path: string; sha: string; type: string }

function parsePendingContent(text: string): Partial<Bookmark> | null {
  try {
    const obj = JSON.parse(text)
    if (typeof obj.url === 'string' && obj.url) return obj as Partial<Bookmark>
  } catch { /* not JSON */ }
  // KEY=VALUE fallback
  const dict: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const eq = line.indexOf('=')
    if (eq < 1) continue
    dict[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return dict.url ? dict as Partial<Bookmark> : null
}

export async function mergePendingFiles(
  user: string,
  token: string,
  data: BookmarksData,
  sha: string
): Promise<{ data: BookmarksData; sha: string }> {
  let files: GHFile[] = []
  try {
    const all = await apiRequest<GHFile[]>(
      `${API}/repos/${user}/hikae-data/contents/${PENDING_PATH}`,
      token
    )
    files = all.filter(f => f.type === 'file' && f.name !== '.gitkeep')
  } catch {
    return { data, sha }
  }
  if (files.length === 0) return { data, sha }

  const now = new Date().toISOString()
  let updated = { ...data, bookmarks: [...data.bookmarks] }

  for (const file of files) {
    const res = await apiRequest<{ content: string; sha: string }>(
      `${API}/repos/${user}/hikae-data/contents/${file.path}`,
      token
    )
    const text = atob(res.content.replace(/\n/g, ''))
    const pending = parsePendingContent(text)
    if (!pending?.url) continue

    const captured = (pending.captured_at as string) ?? now
    const host = (() => { try { return new URL(pending.url).hostname.replace(/^www\./, '') } catch { return '' } })()
    let sourceId = pending.source_id ?? null
    if (!sourceId && host) {
      const existing = updated.sources.find(s => { try { return new URL(s.url).hostname.replace(/^www\./, '') === host } catch { return false } })
      if (existing) {
        sourceId = existing.id
      } else {
        const newSource = { id: crypto.randomUUID(), name: host, url: `https://${host}`, created: captured }
        updated = { ...updated, sources: [...updated.sources, newSource] }
        sourceId = newSource.id
      }
    }

    const bookmark: Bookmark = {
      id: (pending.id as string) ?? crypto.randomUUID(),
      url: pending.url,
      title: (pending.title as string) || pending.url,
      folder_id: null,
      tag_ids: (pending.tag_ids as string[]) ?? [],
      source_id: sourceId,
      note: (pending.note as string) || null,
      why: (pending.why as string) || null,
      status: 'inbox',
      captured_at: captured,
      captured_by: (pending.captured_by as string) ?? 'ios',
      last_modified_at: captured,
      last_modified_by: (pending.captured_by as string) ?? 'ios',
      filed_at: null,
      read_at: null,
      archived_at: null,
      deleted_at: null,
    }
    if (!updated.bookmarks.find(b => b.url === bookmark.url && b.captured_at === bookmark.captured_at)) {
      updated = { ...updated, bookmarks: [bookmark, ...updated.bookmarks] }
    }
  }

  updated = { ...updated, meta: { ...updated.meta, last_modified: now, last_modified_by: 'pwa' } }
  const saved = await saveBookmarksData(user, token, updated, sha, `pwa: merge ${files.length} pending capture(s)`)

  // delete pending files
  for (const file of files) {
    const fileSha = await apiRequest<{ sha: string }>(
      `${API}/repos/${user}/hikae-data/contents/${file.path}`,
      token
    ).then(r => r.sha).catch(() => null)
    if (fileSha) {
      await apiRequest(
        `${API}/repos/${user}/hikae-data/contents/${file.path}`,
        token,
        { method: 'DELETE', body: JSON.stringify({ message: `pwa: archive pending ${file.name}`, sha: fileSha }) }
      ).catch(() => { /* best effort */ })
    }
  }

  return { data: updated, sha: saved.sha }
}
