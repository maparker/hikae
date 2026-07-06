# Session Diary — Hikae

---

### 2026-06-14 22:45 - Project Setup: Data Layer + iOS Shortcut Spec

**Investigated:** Full project history in history.md — prior design conversation covering the problem (cross-platform capture/queue without iCloud), naming (Hikae = 控え, "a note kept for later"), schema design choices, and build order.

**Changed:**
- Created `/data/bookmarks.json` — empty initial data store with version 1.0
- Created `/data/bookmarks.lock` — empty lock file for optimistic write locking
- Created `/docs/ios-shortcut-spec.md` — full step-by-step action specification for the iOS Shortcut (can't generate a binary .shortcut file, so this is the build guide)
- Created `/ios-shortcut/test-api.sh` — shell script that exercises the exact GitHub API read-modify-write flow the Shortcut will use; validates token + repo config before building on-device
- Initialized git repo (`git init`), staged all new files

**Decided:** iOS Shortcut specified as a step-by-step build guide rather than a binary file — `.shortcut` files are signed binary plists that must be assembled on-device. The test script covers the API logic so it can be validated before building the shortcut.

**Why:** The schema and data layer are the foundation everything else (macOS app, PWA, Raycast, command center) depends on. Getting the JSON structure locked in first avoids refactoring across all surfaces later. iOS Shortcut is the highest-priority capture surface.

---

### 2026-06-15 17:00 - iOS Shortcut: End-to-End Capture Working

**Investigated:** Several bugs blocking the shortcut from writing to GitHub, discovered through iterative testing.

**Changed:**
- `docs/ios-shortcut-spec.md` — added step 17b: Replace Text with regex `\s` to strip all whitespace from base64 output before PUT (GitHub rejects base64 with newlines)
- Shortcut (on-device): fixed "Get URLs from Input" returning 2 items by adding "Get Item from List → First Item"; added "Get Component of URL → Full URL" to convert URL type to plain text; fixed dynamic filename using Format Date (`yyyyMMddHHmmss`) as `captured_id` in the PUT URL; fixed base64 newline stripping with Replace Text regex `\s`

**Decided:** Pending-file approach — each capture writes a new file to `data/pending/[timestamp].json` in hikae-data rather than read-modify-write on a single bookmarks.json.

**Why:** Much simpler for iOS — no SHA lookup, no read-decode-modify-encode-write cycle, no race conditions. A later process (macOS app or script) merges pending files into the main bookmarks.json.

---

### 2026-06-14 22:50 - iOS Shortcut: Remove Source Picker, Auto-Detect from URL

**Investigated:** Whether the source picker step added value or friction at capture time.

**Changed:**
- `docs/ios-shortcut-spec.md` — removed "Choose from list — Source" step; replaced with "Get component of URL → Host" (step 3) and a find-or-create source lookup (step 12); updated step numbering throughout; added source auto-detection explanation section
- `ios-shortcut/test-api.sh` — removed source_name parameter; replaced static source_id=null with Python `urlparse` logic that finds an existing source by host match or creates a new source entry; fixed `base64 | tr -d '\n'` for clean encoding

**Decided:** Source is derived automatically from the URL hostname. First capture from a domain creates a source entry; subsequent captures from the same domain reuse it. Users can rename sources (e.g., `news.ycombinator.com` → `Hacker News`) in the PWA later.

**Why:** The source picker added ~3 seconds of friction to every capture. URL domain as implied source requires no user input, keeps the managed sources list growing organically, and produces richer data than a manual pick would (exact domain is more useful than a generic "RSS" label).

---

### 2026-06-14 23:00 - GitHub Repos Created

**Changed:**
- Created `/Users/mattparker/Documents/Code/hikae-data/` — data-only repo
  - `/data/bookmarks.json` and `/data/bookmarks.lock` copied in
  - `git init`, branch set to `main`, initial commit "Initialize Hikae data store (v1.0)"
  - `gh repo create maparker/hikae-data --private` → https://github.com/maparker/hikae-data
  - Pushed to `origin/main`
- Removed `data/` from hikae code repo (data belongs in hikae-data, not here)
- Updated `docs/ios-shortcut-spec.md` — replaced placeholder repo URLs with `maparker/hikae-data`
- Updated `ios-shortcut/test-api.sh` — defaulted `HIKAE_REPO` to `maparker/hikae-data` (no longer required env var)
- Made first commit in hikae code repo (master branch, local only for now)

**Decided:** Two separate repos — `maparker/hikae-data` (private, data store) and `hikae` (code). Data repo is live on GitHub; code repo is local only.

**Why:** Every bookmark capture creates a commit in the data repo; mixing that with code history would be noisy. Data must be private; code could be public later. Clean separation makes both cleaner.

---

### 2026-06-15 - PWA: Full Scaffold Written

**Investigated:** Project memory and schema.md to confirm bookmarks.json shape, auth flow (Cloudflare Worker code exchange), and required surfaces.

**Changed:**
- Created `/Users/mattparker/Documents/Code/hikae/pwa/` — all 29 files from scratch
- `package.json` — React 18, React Router v6, Tailwind v3, lucide-react, clsx, tailwind-merge; no extra deps
- `vite.config.ts`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `index.html`
- `src/types/index.ts` — full typed interfaces: Bookmark, BookmarkStatus, Folder, Tag, Source, BookmarksData
- `src/lib/github.ts` — `getUser`, `getBookmarksData`, `saveBookmarksData` using `btoa`/`atob` for base64; `unescape(encodeURIComponent(...))` to handle non-ASCII on save
- `src/context/AuthContext.tsx` — token/user/avatarUrl from localStorage, `setAuth`, `signOut`
- `src/context/DataContext.tsx` — optimistic save: update state immediately, revert + rethrow on API error; updates local `sha` on each successful write to avoid 409s
- `src/components/ui/` — 9 handwritten shadcn-style components: Button (4 variants, 2 sizes), Input, Badge, Dialog (overlay + Escape key), Select, Textarea, Label, Tabs, Spinner
- `src/pages/Login.tsx` — GitHub OAuth redirect with hardcoded CLIENT_ID
- `src/pages/Callback.tsx` — exchanges code via Cloudflare Worker, stores token+user+avatar, redirects to /
- `src/pages/Home.tsx` — sidebar + filtered/sorted bookmark list + EditBookmarkModal
- `src/pages/Organize.tsx` — Tags/Folders/Sources tabs with inline rename, create, delete, archive
- `src/components/Sidebar.tsx` — status filters with counts, folder list, tag badges, user avatar + sign-out
- `src/components/BookmarkRow.tsx` — title link, source/domain/date metadata, tag badges, Edit/File/Archive actions
- `src/components/EditBookmarkModal.tsx` — note, why, folder select, tag checkboxes; optimistic save with revert
- `src/App.tsx` — BrowserRouter routes; Protected wrapper uses DataProvider only when authenticated

**Decided:** BrowserRouter wraps AuthProvider which wraps routes; DataProvider only mounts inside Protected routes so it never tries to load data when unauthenticated. Each Protected route gets its own DataProvider.

**Why:** Keeps the data-loading lifecycle tied to auth state. No risk of GitHub API calls firing before token is available. The `sha` update-on-write pattern is critical — without it a second save within the same session gets a 409 because GitHub's ETag has moved.

---

### 2026-06-15 13:23 - macOS App: Swift Source Files Written

**Investigated:** Project memory (schema.md, project_overview.md) to confirm bookmarks.json round-trip constraints and data flow from iOS pending files.

**Changed:**
- Created `/Users/mattparker/Documents/Code/hikae/macos/Hikae/` — new directory
- Created `HikaeApp.swift` — `@main` entry point, `MenuBarExtra` with `.window` style, badge shows inbox count, links `Settings` scene
- Created `Models.swift` — `Bookmark` struct (Codable, only display fields), `PendingCapture` with `parse(_:)` splitting on first `=` to handle URLs with query params
- Created `GitHubService.swift` — `static let shared`, reads token/repo from `UserDefaults`, `listDirectory`, `getFile` (strips newlines before base64 decode), `putFile`, `deleteFile`, private `request` helper throwing response body on non-2xx
- Created `SyncService.swift` — `@MainActor ObservableObject`, polls every 300s, merges pending via raw `JSONSerialization` (preserves unknown fields), resolves/creates sources by URL host, `file(_:)` action sets status="filed", `jsonNull` helper
- Created `MenuBarView.swift` — 320pt fixed width, header with refresh/gear buttons, empty state, `ScrollView`+`LazyVStack` capped at 400pt, error + relative-time footer
- Created `InboxRowView.swift` — two-line row (title + host/Open/File), 12/8pt padding
- Created `SettingsView.swift` — `@AppStorage` PAT (SecureField) + repo (TextField), 360pt frame

**Decided:** `JSONSerialization` with `[String: Any]` for all bookmarks.json read-write; only decode the `bookmarks` array into Swift structs for display. Pending file SHA is re-fetched before DELETE to avoid stale SHA issues.

**Why:** Round-trip safety — `Codable` on the full root would drop unknown keys (`folders`, `tags`, future fields). Re-fetching SHA for each pending delete adds one extra GET per file but eliminates 409 Conflict errors if something else touches the file between merge and delete.

---

### 2026-06-15 - Raycast Extension: Full Scaffold Written

**Investigated:** Project memory (project_overview.md, schema.md) and full task spec to align types, status values, and GitHub API patterns with the rest of the system.

**Changed:**
- Created `/Users/mattparker/Documents/Code/hikae/raycast/` — new directory
- `package.json` — Raycast extension manifest: two commands (search/capture), two extension-level preferences (github_pat password, github_repo textfield defaulting to maparker/hikae-data)
- `tsconfig.json` — extends `@raycast/api/tsconfig.json`
- `src/types.ts` — `Bookmark`, `Source`, `BookmarksData` interfaces matching schema
- `src/lib/github.ts` — `getPrefs`, `getBookmarksData` (GET + atob), `writePendingCapture` (PUT new pending file), `fileBookmark` (GET with SHA, map status to filed, PUT back); both btoa calls use `unescape(encodeURIComponent(...))` for Unicode safety
- `src/search.tsx` — `useCachedPromise` for data, `List.Dropdown` status filter, client-side filter (deleted hidden, search on title/url/source name), accessories show source badge + relative date, actions: Open, Copy URL, File, Open in Hikae
- `src/capture.tsx` — reads clipboard on mount, pre-fills URL if starts with http, Form with URL/Title/Note/Why fields, on submit calls `writePendingCapture` + toast + `popToRoot`
- `assets/README.md` — placeholder note for icon.png

**Decided:** `fileBookmark` lives in `github.ts` (not search.tsx) so it can be reused by other commands later. Pending captures use the same key=value text format as the iOS Shortcut.

**Why:** Consistency across capture surfaces is a core design constraint. The pending-file approach means no read-modify-write race on bookmarks.json for captures, matching the iOS pattern exactly.

---

### 2026-06-15 - Fix Raycast Extension tsconfig.json

**Investigated:** `npm run build` failing with 23 TypeScript errors. Root cause: `tsconfig.json` extended `@raycast/api/tsconfig.json` which doesn't exist on disk, so no JSX support, no esModuleInterop, and node_modules types were being checked.

**Changed:** `/Users/mattparker/Documents/Code/hikae/raycast/tsconfig.json` — replaced single-line `extends` with full standalone config (`jsx: react-jsx`, `esModuleInterop: true`, `skipLibCheck: true`, `moduleResolution: node`, `include: src/**/*`, `exclude: node_modules/dist`).

**Decided:** Standalone tsconfig rather than trying to locate/fix the extends path.

**Why:** `@raycast/api/tsconfig.json` simply doesn't exist in the installed package. A standalone config with the right options resolves all 23 errors cleanly. Build now passes: `ready - built extension successfully`.

---

### 2026-06-15 22:01 - iOS Home Screen Icon

**Investigated:** Available icon files at `/Users/mattparker/Downloads/design_handoff_hikae_appicon/AppIcon.appiconset/` — sizes 16×16 through 512×512. Confirmed `icon_512x512.png` is the correct Hikae hanko stamp.

**Changed:**
- Copied `icon_512x512.png` → `pwa/public/apple-touch-icon.png`
- `pwa/index.html`: added `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` plus three `apple-mobile-web-app-*` meta tags (capable, status-bar-style, title)
- Committed and pushed to master; GitHub Action auto-deploys to `maparker.github.io/hikae`

**Decided:** Use the 512×512 icon as `apple-touch-icon.png`. iOS Safari scales it down; larger is better.

**Why:** iOS reads `apple-touch-icon` link from `<head>` when user taps "Add to Home Screen." Without it, Safari uses a screenshot thumbnail. Vite copies files from `public/` to `dist/` verbatim, so no transform needed.

### 2026-06-15 22:10 - Fix "new bookmarks not appearing after iOS shortcut"

**Investigated:** Both the PWA (DataContext) and macOS menu bar app (SyncService/MenuBarView) were fetching data only on initial load with no on-focus/on-open refresh.

**Changed:**
- `pwa/src/context/DataContext.tsx`: Added `visibilitychange` event listener that calls `load()` when the page becomes visible — so switching back to the PWA after using the iOS shortcut triggers an immediate re-fetch
- `macos/Hikae/MenuBarView.swift` + `macos/Hikae/Hikae/Hikae/MenuBarView.swift`: Added `.onAppear { Task { await sync.sync() } }` on the root VStack so opening the menu bar popover always triggers a sync
- Pushed all to master; PWA auto-deployed via GitHub Actions

**Decided:** On-demand refresh on focus/open rather than more aggressive polling.

**Why:** The 5-minute macOS timer is fine for background polling, but users expect immediate freshness when they actively open the app. `visibilitychange` on the web and `.onAppear` on the mac are the minimal correct hooks for this.

### 2026-06-15 23:45 - iOS shortcut → mac/PWA sync debugging session

**Investigated:** End-to-end flow from iOS Shortcut capture to mac app and PWA display. Multiple bugs found and fixed in sequence.

**Changed:**
- `pwa/public/apple-touch-icon.png`: Added iOS home screen icon (512×512 from design handoff)
- `pwa/index.html`: Added apple-touch-icon link + PWA meta tags
- `pwa/src/context/DataContext.tsx`: Re-fetch on visibilitychange; merge pending files on every load; track lastFetched timestamp
- `pwa/src/lib/github.ts`: Added cache: 'no-store' to all fetches; added mergePendingFiles() function; filter pending by !gitkeep (not .json extension)
- `pwa/src/mobile/MobileSettingsScreen.tsx`: Show lastFetched separately from meta.last_modified; manual refresh button
- `macos/Hikae/Hikae/Hikae/SyncService.swift`: Wrap listDirectory in own try/catch (404 no longer aborts sync); fix deleted_at empty-string check; add archive/delete actions; add [Hikae] print diagnostics; pending file filter changed from .json to !.gitkeep; parseFilenameDate strips dashes from yyyyMMdd-HHmmss format
- `macos/Hikae/Hikae/Hikae/GitHubService.swift`: req.cachePolicy = .reloadIgnoringLocalCacheData; verbose entry logging (later trimmed); log non-array responses
- `macos/Hikae/Hikae/Hikae/MenuBarView.swift`: SettingsLink replaces openSettings() env action; power button (NSApp.terminate); always-visible footer with sync time + count; onAppear sync trigger
- `macos/Hikae/Hikae/Hikae/InboxRowView.swift`: Hover-reveal icon buttons (↗ ✓ archivebox 🗑); trash is red
- `macos/Hikae/Hikae/Hikae/Models.swift`: PendingCapture.parse() tries JSON first, falls back to KEY=VALUE

**Decided:** Accept any filename in data/pending/ (not just .json); KEY=VALUE pending format is what the actual shortcut writes

**Why:** The iOS Shortcut writes files named yyyyMMdd-HHmmss (no extension) in KEY=VALUE format — the original spec assumed .json which was never implemented on-device. Filter on !.gitkeep is more robust than .hasSuffix(".json"). URLSession was caching GitHub API directory listings; .reloadIgnoringLocalCacheData fixes it.

---

### 2026-06-15 - PWA: Sync pill shows last-fetched time + tap/click to force sync

**Changed:**
- `pwa/src/mobile/MobileInboxScreen.tsx`: Added `timeAgo` helper; imported `lastFetched` from `useData()`; converted static "synced" div to a tappable `<button>` that calls `refresh()`, shows "synced · Xm ago" using `lastFetched`, and shows "syncing…" with a grey dot while in-flight. Pull-to-refresh still works in addition.
- `pwa/src/pages/Home.tsx`: Imported `refresh` and `lastFetched` from `useData()`; converted static chip to a clickable `<button>`; switched from `data.meta.last_modified` (when data was last *written*) to `lastFetched` (when the PWA last *fetched*); shows "syncing…" while loading.

**Decided:** Use `lastFetched` (set in DataContext after each successful `load()`) rather than `meta.last_modified` for the sync timestamp in both pills.

**Why:** `meta.last_modified` reflects when any client last wrote the file — it could be hours old even if the PWA just fetched 5 seconds ago. `lastFetched` tells the user how stale *their view* is, which is what they actually want to know.

---

### 2026-06-16 - PWA: Inline tag and folder creation in edit modal

**Investigated:** `EditBookmarkModal` required tags and folders to already exist before they could be applied — no way to create them without leaving the modal and going to Organize first.

**Changed:**
- `pwa/src/components/EditBookmarkModal.tsx`: Added `pendingTags` and `pendingFolders` local state arrays; "New" button next to folder dropdown shows an inline text input (Enter to confirm, Escape to cancel) that creates a folder and auto-selects it; "+ New tag" button below tags list does the same for tags and auto-checks the new tag. Duplicate detection by name (case-insensitive) reuses existing entries instead of creating duplicates. All pending tags/folders are merged into `BookmarksData` on save — one atomic write creates the folder/tag and updates the bookmark.

**Decided:** Create inline in the modal rather than linking out to Organize. New tags/folders are held in component state and only written to GitHub on Save — not eagerly committed.

**Why:** The modal is the natural point of intent. Forcing a detour to Organize breaks flow. Deferring the write until Save keeps the change atomic — no orphaned tags if the user cancels.

---

### 2026-06-16 - Raycast Extension: Add to repo

**Investigated:** `raycast/` was written last session but never committed — only untracked directory in the repo. Verified `npm run build` passes cleanly. Checked `.gitignore` — `raycast/node_modules/` was already excluded but `raycast/dist/` was missing.

**Changed:**
- `.gitignore` — added `raycast/dist/` so build output isn't committed
- Committed `raycast/` — `package.json`, `tsconfig.json`, `raycast-env.d.ts`, `src/types.ts`, `src/lib/github.ts`, `src/search.tsx`, `src/capture.tsx`, `assets/icon.png`, `assets/README.md`

**Decided:** Commit source + assets only; exclude `dist/` and `node_modules/`.

**Why:** `dist/` is generated by `ray build`; committing it would add churn on every build. The extension is loaded in dev mode via `ray develop`, so the dist output is only needed locally.

---

### 2026-06-16 - iOS Shortcut: Base64 fix confirmed working

**Changed:** Added Replace Text step on-device (after Base64 Encode): find `\s`, replace with empty, Regular Expression enabled, input `Base64 Encoded`. This strips MIME newlines before the content goes into the PUT body.

**Decided:** No code changes needed — purely an on-device Shortcuts fix.

**Why:** GitHub's Contents API rejects base64 with embedded newlines. Shortcuts' Base64 Encode produces MIME-format output (newline every ~76 chars). The Replace Text + regex `\s` strips all whitespace cleanly.

**Result:** Full end-to-end capture flow confirmed working. All five surfaces complete: iOS Shortcut → GitHub Actions → bookmarks.json; PWA, macOS menu bar app, Raycast extension all reading and writing correctly.

---

### 2026-06-16 - Add README

**Changed:** Created `README.md` at repo root. Covers: what Hikae is, architecture diagram, two-repo structure, prerequisites, and setup instructions for each surface (data repo, iOS Shortcut, macOS app, PWA, Cloudflare Worker, Raycast extension). Committed and pushed to master.

**Decided:** Practical setup guide rather than marketing copy — structured for someone (or future-Matt) returning to the repo cold.

**Why:** Repo had no README; a visitor wouldn't know the two-repo architecture, that the iOS Shortcut must be built on-device, or how each surface connects.

---

### 2026-06-16 - Fix encoding: HTML entities and UTF-8 mojibake in titles

**Investigated:** Real captures showed corrupted titles in the PWA: `&#039;` (HTML entity apostrophe) and `ÃÂÃÂ...` blobs (deep UTF-8 mojibake, e.g. em dash encoded through multiple Latin-1 reinterpretation cycles). The simple `encode('latin-1').decode('utf-8')` loop hit a fixed point and couldn't unwind the deep encoding.

**Changed:**
- `hikae-data/.github/scripts/add_bookmark.py` — replaced the manual latin-1 loop with `ftfy.fix_text()` + `html.unescape()` + a regex `[ÃÂ-]{4,}` → `—` to handle unrecoverable remnants; applied to title, note, and why fields at ingest
- `hikae-data/.github/scripts/fix_encoding.py` — new one-off migration script using the same `clean_text` logic to retroactively fix existing bookmarks.json
- `hikae-data/.github/workflows/add-bookmark.yml` — added `pip3 install ftfy` step before processing
- Ran `fix_encoding.py` locally; fixed 5 corrupted titles (including full title recovery: e.g. `macOS virtualisation is leaping forward in Golden Gate [garbage]` → `macOS virtualisation is leaping forward in Golden Gate – The Eclectic Light Company`)
- Committed cleaned `bookmarks.json` and all script changes to hikae-data, pushed to main

**Decided:** `ftfy` as primary fix, regex as fallback for irrecoverable patterns.

**Why:** The mojibake was too many levels deep (UTF-8 bytes misread as Latin-1, repeated multiple times) for a simple decode loop to unwind. `ftfy` handles the common cases; the `[ÃÂ]{4,}` regex catches what `ftfy` can't recover and substitutes an em dash rather than leaving garbage. `html.unescape()` handles the separate issue of HTML-entity-encoded titles from Safari's Share Sheet.

---

### 2026-06-21 - Fix menu bar label to show both bookmark and note counts

**Investigated:** macOS `MenuBarExtra` label was only showing the bookmark count (🔖 19) despite `bookmarkInboxCount=19` and `noteInboxCount=1` being confirmed correct in logs. Tried: conditional visibility with opacity, VStack (only first row shows), NSViewRepresentable AppKit bridge (renders blank), `.fixedSize()` modifier on HStack, always-present HStack with all 4 views. All failed — the `NSStatusBarButton` sizes itself at first render and clips anything beyond that width.

**Changed:**
- `macos/Hikae/Hikae/Hikae/HikaeApp.swift` — replaced multi-view HStack label with single `Text("⊕\(sync.bookmarkInboxCount) ✎\(sync.noteInboxCount)")` using monochrome Unicode characters (⊕ U+2295, ✎ U+270E)
- `macos/Hikae/Hikae/Hikae/SyncService.swift` — made `bookmarkInboxCount` and `noteInboxCount` explicit `@Published var` (not computed); added `Logger` diagnostics; added `"type": capture.itemType` to `mergePending` bookmark dict
- `macos/Hikae/Hikae/Hikae/Models.swift` — added `itemType: String` field to `PendingCapture` and wired it through `parse()`

**Decided:** Single `Text` view with Unicode monochrome glyphs rather than SF Symbols or emoji. Chose ⊕ (bookmark) and ✎ (note/pencil).

**Why:** `MenuBarExtra` label frame is fixed at initial render — structural view changes or additions are silently clipped. Only a single `Text` view whose string content updates in place works reliably. SF Symbol `Image(systemName:)` renders invisible at caption size in this context. Color emoji worked but monochrome Unicode glyphs (⊕, ✎) are cleaner and more native-feeling in a menu bar.


### 2026-06-24 - Fix PWA "Open" link doing nothing

**Investigated:** `<a href=... target="_blank">` in DetailPanel, MobileDetailScreen, and EditBookmarkModal — these are silently blocked in Chrome PWA standalone mode (desktop), where popup-blocker rules suppress anchor-driven new-window navigations.

**Changed:**
- `pwa/src/components/DetailPanel.tsx` — replaced `<a target="_blank">` with `<button onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>`
- `pwa/src/mobile/MobileDetailScreen.tsx` — same change for the Open button in the nav header
- `pwa/src/components/EditBookmarkModal.tsx` — same change for the URL link in the edit form

**Decided:** Use `window.open()` called from a click handler everywhere, not anchor tags.

**Why:** In PWA standalone mode, `target="_blank"` anchors can be silently swallowed by Chrome's popup blocker. `window.open()` called synchronously from a user gesture (onclick) is treated as a trusted navigation and bypasses that block. Applies to both desktop Chrome PWA and iOS Safari PWA installs.

---

### 2026-07-06 20:10 - Add dark theme support to desktop PWA

**Investigated:** ThemeContext existed with light/dark/auto state + localStorage, dark color tokens were defined in tailwind.config.js (dk.*), and mobile screens already had dark: Tailwind variants — but the `dark` class was never applied to `document.documentElement`, and desktop components had no dark: variants or theme toggle UI.

**Changed:**
- `pwa/src/context/ThemeContext.tsx` — added `document.documentElement.classList.toggle('dark', isDark)` inside the existing `useEffect` so the class tracks state
- `pwa/tailwind.config.js` — added missing dark tokens: `dk.sidebar`, `dk.row-hover`, `dk.surface-sunken`, `dk.accent-wash`, `dk.accent-wash-border`
- `pwa/src/components/Sidebar.tsx` — added dark: variants throughout, replaced inline hex color styles with Tailwind class names; added Sun/Moon/Monitor theme cycle button to footer
- `pwa/src/pages/Home.tsx` — added dark: variants to header, capture bar, and status elements
- `pwa/src/components/BookmarkRow.tsx` — added dark: variants to row, title, metadata, note/why bars, tags, action buttons
- `pwa/src/components/DetailPanel.tsx` — added dark: variants, converted STATUS_PILL from inline hex styles to Tailwind class strings so dark: variants can apply
- `pwa/src/components/DesktopCaptureModal.tsx` — added dark: variants, used isDark from useTheme for the mode-tab active style that couldn't be done with Tailwind alone; darkened the scrim background
- `pwa/src/pages/Login.tsx` — added basic dark: variants

**Decided:** Theme toggle lives in the desktop sidebar footer as a cycle button (light → dark → auto → light) showing Sun/Moon/Monitor icons. Mobile already had a segmented control in Settings. No new pages or components created.

**Why:** The entire infrastructure was already in place — this was purely wiring + styling work. Keeping the toggle as a sidebar icon button matches the existing Settings/LogOut pattern without adding any visual weight. Using `dark:` Tailwind variants throughout keeps a single source of truth and avoids runtime class swapping.

---
