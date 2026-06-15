import type { BookmarksData } from '../types'

const API = 'https://api.github.com'
const DATA_PATH = 'data/bookmarks.json'

async function apiRequest<T>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
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
