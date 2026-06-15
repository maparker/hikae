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
