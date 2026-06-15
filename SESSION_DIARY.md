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

### 2026-06-14 22:50 - iOS Shortcut: Remove Source Picker, Auto-Detect from URL

**Investigated:** Whether the source picker step added value or friction at capture time.

**Changed:**
- `docs/ios-shortcut-spec.md` — removed "Choose from list — Source" step; replaced with "Get component of URL → Host" (step 3) and a find-or-create source lookup (step 12); updated step numbering throughout; added source auto-detection explanation section
- `ios-shortcut/test-api.sh` — removed source_name parameter; replaced static source_id=null with Python `urlparse` logic that finds an existing source by host match or creates a new source entry; fixed `base64 | tr -d '\n'` for clean encoding

**Decided:** Source is derived automatically from the URL hostname. First capture from a domain creates a source entry; subsequent captures from the same domain reuse it. Users can rename sources (e.g., `news.ycombinator.com` → `Hacker News`) in the PWA later.

**Why:** The source picker added ~3 seconds of friction to every capture. URL domain as implied source requires no user input, keeps the managed sources list growing organically, and produces richer data than a manual pick would (exact domain is more useful than a generic "RSS" label).

---
