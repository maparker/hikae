import { getPreferenceValues } from "@raycast/api";
import { BookmarksData } from "../types";

interface Prefs {
  github_pat: string;
  github_repo: string;
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

async function githubFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { github_pat, github_repo } = getPrefs();
  const url = `https://api.github.com/repos/${github_repo}/contents/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `token ${github_pat}`,
      Accept: "application/vnd.github+json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `GitHub API error ${res.status}`);
  }
  return res;
}

export async function getBookmarksData(): Promise<BookmarksData & { sha: string }> {
  const res = await githubFetch("data/bookmarks.json");
  const json = await res.json();
  const decoded = atob(json.content.replace(/\n/g, ""));
  const data: BookmarksData = JSON.parse(decoded);
  return { ...data, sha: json.sha };
}

function formatTimestamp(d: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds())
  );
}

export async function writePendingCapture(
  url: string,
  title: string,
  note: string,
  why: string
): Promise<void> {
  const timestamp = formatTimestamp(new Date());
  const lines = [
    `url=${url}`,
    `title=${title}`,
    `note=${note}`,
    `why=${why}`,
    `captured_by=raycast`,
  ];
  const content = btoa(unescape(encodeURIComponent(lines.join("\n"))));

  await githubFetch(`data/pending/${timestamp}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `capture: ${title || url}`,
      content,
    }),
  });
}

export async function fileBookmark(
  bookmarkId: string
): Promise<void> {
  const { sha, bookmarks, sources, meta, folders, tags } = await getBookmarksData();
  const now = new Date().toISOString();
  const updated = bookmarks.map((b) =>
    b.id === bookmarkId
      ? { ...b, status: "filed" as const, filed_at: now, last_modified_at: now, last_modified_by: "raycast" }
      : b
  );

  const newData: BookmarksData = {
    meta: { ...meta, last_modified: now, last_modified_by: "raycast" },
    folders,
    tags,
    sources,
    bookmarks: updated,
  };

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2))));

  await githubFetch("data/bookmarks.json", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: `file bookmark ${bookmarkId}`,
      content,
      sha,
    }),
  });
}
