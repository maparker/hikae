# Hikae

Personal bookmark and read-later capture system. Captures URLs from iOS, macOS, and Raycast into a private GitHub repository. No accounts, no third-party services — just a JSON file in a repo you own.

**控え** (*hikae*) — a note kept for later.

---

## How it works

Captures are written as pending files to a private data repo (`maparker/hikae-data`). A GitHub Actions workflow processes them into `bookmarks.json`. The PWA and macOS app read from that same file.

```
iOS Shortcut ─┐
Raycast       ├──► data/pending/ ──► GitHub Actions ──► data/bookmarks.json
macOS app ────┘                                               │
                                                              ▼
                                                   PWA / macOS app (read)
```

---

## Repos

| Repo | Purpose |
|------|---------|
| `maparker/hikae` | This repo — all application code |
| `maparker/hikae-data` | Private data repo — bookmarks.json, pending files |

---

## Prerequisites

- A private GitHub repo for data (see [Data repo setup](#data-repo-setup))
- A GitHub Personal Access Token with **Contents: Read and write** on the data repo
- For the PWA: a Cloudflare account (free tier is fine)

---

## Data repo setup

The data repo holds `bookmarks.json` and the GitHub Actions workflow that processes captures.

1. Create a private repo (e.g. `yourname/hikae-data`)
2. Copy the workflow and script into it:
   ```
   .github/
     workflows/add-bookmark.yml
     scripts/add_bookmark.py
   data/
     bookmarks.json        ← initial structure below
     pending/.gitkeep
   ```
3. Initial `bookmarks.json`:
   ```json
   {
     "meta": { "version": "1.0", "last_modified": "", "last_modified_by": "" },
     "folders": [],
     "tags": [],
     "sources": [],
     "bookmarks": []
   }
   ```

The workflow fires on any push to `data/pending/**`, runs `add_bookmark.py`, and commits the result back to `bookmarks.json`.

---

## iOS Shortcut

See [`docs/ios-shortcut-spec.md`](docs/ios-shortcut-spec.md) for the full step-by-step build guide. The shortcut is assembled on-device in the iOS Shortcuts app — it can't be distributed as a file.

**Quick summary of what it does:**
1. Receives a URL from the Share Sheet
2. Asks for an optional note and "why"
3. Writes a `key=value` pending file to `data/pending/[timestamp]` in the data repo via the GitHub Contents API

**To test the API flow before building on-device:**
```bash
export HIKAE_TOKEN=ghp_...
export HIKAE_REPO=yourname/hikae-data
./ios-shortcut/test-api.sh "https://example.com" "Page Title" "note" "why"
```

---

## macOS menu bar app

Swift app in `macos/`. Shows your inbox in a menu bar popover; syncs every 5 minutes and on open.

**To build:**
```bash
cd macos
./build.sh          # outputs Hikae.app to macos/build/
```

Or open `macos/Hikae/Hikae.xcodeproj` in Xcode and run.

**First launch:** open Settings (gear icon) and enter your GitHub PAT and data repo name.

---

## PWA

React app deployed to GitHub Pages at `maparker.github.io/hikae`. Uses GitHub OAuth so you sign in with your GitHub account — no separate credentials.

**Local development:**
```bash
cd pwa
npm install
npm run dev
```

**Deploy:** push to `master` — the `deploy-pwa.yml` workflow builds and deploys automatically.

The PWA requires the Cloudflare Worker for the OAuth code exchange (GitHub doesn't allow client secrets in browser apps).

---

## Cloudflare Worker

Handles the GitHub OAuth callback — exchanges the auth code for a token server-side so the client secret stays off the client.

```bash
cd worker
npx wrangler deploy
```

Set these secrets in the Cloudflare dashboard (or via `wrangler secret put`):
- `GITHUB_DEV_CLIENT_SECRET`
- `GITHUB_PROD_CLIENT_SECRET`

The client IDs are hardcoded in `wrangler.toml`.

---

## Raycast extension

Two commands: **Search Bookmarks** and **Capture Bookmark**.

**To install:**
```bash
cd raycast
npm install
npm run dev     # imports the extension into Raycast in development mode
```

On first run, Raycast will prompt for your GitHub PAT and data repo name in extension preferences.
