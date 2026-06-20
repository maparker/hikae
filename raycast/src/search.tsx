import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { fileBookmark, getBookmarksData } from "./lib/github";
import { Bookmark } from "./types";

type StatusFilter = "all" | "inbox" | "filed" | "archived";

function getRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function SearchCommand() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");

  const { data, isLoading, revalidate } = useCachedPromise(getBookmarksData);

  const sourceMap = new Map((data?.sources ?? []).map((s) => [s.id, s]));

  const filtered = (data?.bookmarks ?? []).filter((b) => {
    if (b.status === "deleted") return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!searchText) return true;
    const lower = searchText.toLowerCase();
    const sourceName = b.source_id ? (sourceMap.get(b.source_id)?.name ?? "") : "";
    return (
      b.title.toLowerCase().includes(lower) ||
      b.url.toLowerCase().includes(lower) ||
      sourceName.toLowerCase().includes(lower)
    );
  });

  async function handleFile(bookmark: Bookmark) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Filing…" });
    try {
      await fileBookmark(bookmark.id);
      toast.style = Toast.Style.Success;
      toast.title = "Filed";
      revalidate();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to file";
      toast.message = String(err);
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks…"
      onSearchTextChange={setSearchText}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by status" onChange={(v) => setStatusFilter(v as StatusFilter)}>
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Inbox" value="inbox" />
          <List.Dropdown.Item title="Filed" value="filed" />
          <List.Dropdown.Item title="Archived" value="archived" />
        </List.Dropdown>
      }
    >
      {filtered.map((b) => {
        const source = b.source_id ? sourceMap.get(b.source_id) : undefined;
        let hostname = b.url;
        try {
          hostname = new URL(b.url).hostname;
        } catch {}

        return (
          <List.Item
            key={b.id}
            title={b.title}
            subtitle={hostname}
            accessories={[
              ...(source ? [{ tag: source.name }] : []),
              { text: getRelativeDate(b.captured_at) },
            ]}
            actions={
              <ActionPanel>
                {b.type !== 'note' && <Action.OpenInBrowser url={b.url} />}
                {b.type !== 'note' && <Action.CopyToClipboard title="Copy URL" content={b.url} />}
                <Action title="File" onAction={() => handleFile(b)} />
                <Action.OpenInBrowser title="Open in Hikae" url="https://maparker.github.io/hikae" />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
