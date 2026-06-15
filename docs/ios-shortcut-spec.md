# Hikae iOS Shortcut Specification

This document specifies the exact actions to build in the iOS Shortcuts app.
It also covers the GitHub API calls the shortcut makes.

---

## Prerequisites

- A GitHub Personal Access Token with `repo` scope, scoped to `maparker/hikae-data` only
- The token stored as a Shortcuts text action (set as a variable at the top of the shortcut so it's easy to rotate)
- Data repo: `maparker/hikae-data`

---

## Shortcut: Hikae Capture

### Trigger
Share Sheet — accepts URLs (and optionally web pages from Safari)

---

### Actions (in order)

**1. Receive input from Share Sheet**
- Input type: URLs
- If no input is provided: Stop and output nothing

**2. Get details of URL**
- Get: URL from Shortcut Input
- Store as variable: `captured_url`

**3. Get component of URL**
- Component: Host
- From: `captured_url`
- Store as: `url_host`
- *(e.g., `news.ycombinator.com`, `github.com`)*

**4. Get contents of URL** *(optional — for title fetch)*
- URL: `captured_url`
- If this fails or is slow, skip and use the page name from the share sheet instead
- Store page title as variable: `captured_title`
  - Alternatively: use "Name" from the Shortcut Input (Safari passes the page title)

**5. Ask for input** — Note (optional)
- Prompt: "Add a note? (optional)"
- Allow empty input: yes
- Store as: `capture_note`

**6. Ask for input** — Why (optional)
- Prompt: "Why are you saving this? (optional)"
- Allow empty input: yes
- Store as: `capture_why`

**7. Get current date**
- Format: ISO 8601 (use "Format Date" with custom format: `yyyy-MM-dd'T'HH:mm:ss'Z'` and UTC timezone)
- Store as: `captured_at`

**8. Generate UUID** *(via Text action — see note below)*
- Use a Generate UUID action if available, or use a workaround:
  - Use "Format Date" with format `yyyyMMddHHmmssSSSS` as a timestamp-based ID
  - Store as: `bookmark_id`
- Also generate one for potential new source: store as `new_source_id`

**9. Get file from GitHub (read current bookmarks.json)**
- URL: `https://api.github.com/repos/maparker/hikae-data/contents/data/bookmarks.json`
- Method: GET
- Headers:
  - `Authorization`: `token YOUR_GITHUB_PAT`
  - `Accept`: `application/vnd.github.v3+json`
- Store response as: `github_response`
- Get Dictionary Value: key `sha` from `github_response` → store as `file_sha`
- Get Dictionary Value: key `content` from `github_response` → store as `file_content_b64`

**10. Decode base64 content**
- Use "Base64 Encode" action set to Decode
- Input: `file_content_b64`
- Store as: `bookmarks_json_text`

**11. Get Dictionary from Input**
- Input: `bookmarks_json_text`
- Store as: `bookmarks_data`

**12. Find or create source from URL host**

This is the most complex step. The goal: look up `url_host` in the existing `sources` array; use the matching source's `id` if found, otherwise create a new source entry.

*In Shortcuts:*
- Get Value for key `sources` from `bookmarks_data` → store as `sources_list`
- Filter `sources_list` where "url" contains `url_host`
- If filtered list count > 0:
  - Get first item → Get Dictionary Value `id` → store as `source_id`
- Otherwise (new source):
  - Set `source_id` = `new_source_id`
  - Build new source dictionary:
    ```
    { "id": new_source_id, "name": url_host, "url": "https://[url_host]", "created": captured_at }
    ```
  - Append to `sources_list`
  - Set Value for key `sources` in `bookmarks_data` to updated `sources_list`

**13. Build new bookmark dictionary**
```
{
  "id": bookmark_id,
  "url": captured_url,
  "title": captured_title,
  "folder_id": null,
  "tag_ids": [],
  "source_id": source_id,
  "note": capture_note (or null if empty),
  "why": capture_why (or null if empty),
  "status": "inbox",
  "captured_at": captured_at,
  "captured_by": "ios",
  "last_modified_at": captured_at,
  "last_modified_by": "ios",
  "filed_at": null,
  "read_at": null,
  "archived_at": null,
  "deleted_at": null
}
```

**14. Add to bookmarks array**
- Get Value for key `bookmarks` from `bookmarks_data`
- Append new bookmark dictionary to the list
- Set Value for key `bookmarks` in `bookmarks_data` to updated list

**15. Update meta**
- Set `meta.last_modified` to `captured_at`
- Set `meta.last_modified_by` to `ios`

**16. Convert Dictionary to JSON text**
- Input: updated `bookmarks_data`
- Store as: `updated_json`

**17. Base64 encode the updated JSON**
- Encode: `updated_json`
- Store as: `encoded_content_raw`

**17b. Strip newlines from base64 output**
- Action: "Replace Text"
- Find: a newline character (tap Return in the search field)
- Replace with: *(leave blank)*
- Input: `encoded_content_raw`
- Store as: `encoded_content`
- *(Shortcuts wraps base64 every 76 chars; GitHub's API requires no line breaks in the `content` field)*

**18. Build PUT request body dictionary**
```
{
  "message": "Add bookmark: [captured_title] via iOS",
  "content": encoded_content,
  "sha": file_sha
}
```

**19. PUT to GitHub API**
- URL: `https://api.github.com/repos/maparker/hikae-data/contents/data/bookmarks.json`
- Method: PUT
- Headers:
  - `Authorization`: `token YOUR_GITHUB_PAT`
  - `Content-Type`: `application/json`
  - `Accept`: `application/vnd.github.v3+json`
- Request body: JSON from step 18

**20. Show notification on success**
- Title: "Hikae"
- Body: "Saved to inbox"
- Show: only if response status indicates success

---

## Notes on UUID generation in Shortcuts

Shortcuts doesn't have a native UUID action on older iOS. Workarounds:
1. If on iOS 17+, there may be a "Generate UUID" action — use it if available.
2. A practical fallback: "Format Date" with format `yyyyMMddHHmmssSSSS` gives a timestamp-based ID that's unique enough for personal use.

---

## Source auto-detection behavior

The source is derived automatically from the URL host — no user prompt. Examples:
- `https://news.ycombinator.com/item?id=123` → source name: `news.ycombinator.com`
- `https://github.com/owner/repo` → source name: `github.com`

On first capture from a domain, a new source entry is added to the `sources` array and reused on all future captures from the same domain. You can later rename sources (e.g., `news.ycombinator.com` → `Hacker News`) in the PWA.

---

## Testing the API calls

See `ios-shortcut/test-api.sh` for a shell script that exercises the same GitHub API flow as the shortcut, useful for verifying your token and repo setup before building the Shortcut.
