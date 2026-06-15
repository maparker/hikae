Is there an app for macOS and iOS that uses GitHub as a bookmark manager? I need a way to manage bookmarks between my home and work machines that doesn’t use iCloud. I cannot sync iCloud to my work machine

5:20 PM

Searched the web
Searched the web
Floccus is the closest thing to what you're describing, and it's quite capable. There's no single polished "GitHub-native" bookmark app for macOS/iOS, but Floccus covers the use case well.

How it works: Floccus syncs your real, native browser bookmarks directly, with support for any Git server including GitHub, GitLab, Gitea, etc., as well as WebDAV, Google Drive, Dropbox, Nextcloud, Linkwarden, and KaraKeep. 
GitHub

The setup:

Browser extension on macOS (Chrome, Firefox, Edge, Brave, Vivaldi -- Safari not yet supported) 
GitHub
iOS Companion app ($1.99 on the App Store) that connects to the same Git backend 
apple
Point both at a private GitHub repo -- your bookmarks live in an .xbel file in that repo
On the macOS side, since Safari isn't supported, you'd need to run this through Chrome or Firefox on your work machine. That's actually a feature for your case -- it sidesteps the browser entirely rather than trying to hook into Safari's iCloud-dependent sync.

The iOS Companion app gives you view, organize, and share access to synced bookmarks, with offline mode so you can browse without internet and changes sync when you reconnect. 
App Store

One honest caveat from real-world use: Floccus is OK at merging when you add links to the synced folder, but it struggles in situations where you have an existing folder with links and you point a remote at it. Starting fresh is smoother than migrating an existing bookmark tree. 
Digitalsorceress

Alternative worth knowing: GhostMark uses a secret GitHub Gist as its backend -- it's a PWA that works offline, has a CLI, and iOS Scriptable integration for quick saves from Share Sheet. Much more minimal, but zero infrastructure. Came up on HN in January 2026 so it's newer and rougher. 
Hacker News

Given your GitOps comfort level, Floccus + a private GitHub repo is probably the right call. The .xbel file is human-readable XML, so you could even script around it if needed.

How well does floccus work to view the bookmarks on the Mac

5:27 PM

Searched the web
Searched the web
Honestly, on the Mac side Floccus isn't really a "viewer" -- it's purely a sync layer. Floccus is not so much a bookmark manager -- it doesn't give you a managing interface. You use the browser to sort and clean up your bookmarks like you always have. Floccus is just a syncing tool: it synchronizes your browser's native bookmarks and gets out of the way. 
Floccus

So on macOS you'd browse and manage bookmarks entirely through the browser's own bookmark UI, the same as always. The extension just keeps them in sync with GitHub in the background.

The browser extension experience is well-regarded though. Users praise it for easy setup, strong cross-browser/multi-device syncing, and describe it as a "setup and forget" experience. It syncs instantly when you add or edit a bookmark. 
Chrome-Stats
Chrome Web Store

The iOS companion app is a different story. One App Store review notes that with a large number of bookmarks in the same folder, the app freezes -- the developer acknowledged this as a known problem. So if you have a flat structure with hundreds of links in one folder, the mobile app can choke. Folder organization helps. 
App Store

The practical reality for your use case:

On your home machine, you'd be managing bookmarks through Chrome or Firefox's native bookmark manager -- which is fine but not exciting. On your work machine, same thing -- the extension pulls from GitHub and your bookmarks just appear. The GitHub repo is the source of truth, not an app you interact with directly.

If you want an actual management UI on top of it, that's where something like Raindrop.io or Linkwarden (self-hosted) pulls ahead -- they have dedicated apps with richer interfaces. But those aren't GitHub-backed out of the box. Floccus could actually sync to a self-hosted Linkwarden instance if you ever wanted to go that route and get a proper app experience on both platforms.

I wonder if it would be better to build something?

5:29 PM
That's a reasonable instinct given your background. The question is what "better" means for this use case.

A GitHub-backed bookmark tool is actually pretty tractable to build -- the GitHub API is straightforward, a private repo or Gist as storage is free and already auditable, and you'd have full control over the data format.

A few directions worth thinking through before committing:

Browser extension -- gets you the tightest integration (save from any page, access from the toolbar) but comes with the most platform friction. Safari extensions on macOS require an Xcode wrapper and Apple notarization. Chrome/Firefox are easier but then you're back to "not Safari."

macOS menu bar app + iOS Share Extension -- probably the most native-feeling approach. A SwiftUI app that reads/writes JSON or Markdown to a GitHub repo via the API. You'd get a system-wide share target on both platforms, a menu bar dropdown for quick access on Mac, and full control over the data model. This is the option that would actually feel like a real app rather than a sync shim.

Static site / PWA on GitHub Pages -- zero infrastructure, your bookmarks file IS the repo, and the "app" is just a read view deployed automatically. Lowest effort, no native feel.

CLI + raycast extension -- honestly might be the most practical for your actual workflow. A simple JSON file in a repo, a shell script or Raycast extension to add/search, and you're done. You already live in the terminal.

Before going deeper: what's the actual friction point? Is it adding bookmarks quickly, finding them later, or just having them available across machines? That answer changes the build considerably.

Here is the problem I am trying to solve. I view a lot of RSS on my phone and personal Mac. Many of the the things I read about are work related. I want a way to capture that information while not at work. Then when at work, I want a way to be reminded about those things I captured as well as add and read bookmarks easily.

5:33 PM
That reframes it significantly. This isn't really a bookmark sync problem -- it's a read-it-later / capture-to-work-queue problem. The bookmark part is almost incidental.

What you're actually describing:

Capture: frictionless save from iOS Share Sheet or Mac, while reading RSS
Queue: those saves surface at work as a "here's what you flagged" list
Consume: at work, open, read, act on them -- then clear them out
That workflow already exists and is well-solved by a couple of tools before building anything:

Raindrop.io is probably the closest fit out of the box. Web-based, no iCloud dependency, iOS Share Sheet support, browser extension on the work Mac, tag/collection support, and free tier covers the basics. Your work machine just opens a browser tab.

Omnivore was purpose-built for exactly this -- RSS reader + save + read later, cross-platform. It was acquired and shut down last year though.

Readwise Reader is the current gold standard for this specific workflow -- RSS ingestion, save from anywhere, highlights, resurface later. It's $8/month but it's genuinely the most complete solution for "I read things on my phone and want to act on them at work."

Before you build anything, the honest question is: do you want the tool, or do you want the project? Because Readwise Reader solves this without any building. But if the GitHub-as-backend angle is important for auditability, no vendor lock-in, or just the craft of it -- that's a completely valid reason to build, and the scope is actually pretty clear now.

Which is it?

It is also a bookmark problem, because I don5 want to have to organize them in another system.

5:34 PM
That's the key constraint then -- you want one place that serves both the capture/queue workflow and long-term bookmark storage, and you don't want to maintain a separate organizational system on top of your browser bookmarks.

So the ideal thing is something that:

Lives alongside or inside your existing browser bookmark structure
Lets you capture from iOS and personal Mac with minimal friction
Surfaces the unread/unfiled queue at work
Doesn't require a parallel tagging/folder taxonomy you have to maintain separately
That's actually a harder product problem than either piece alone, and it's why nothing off the shelf nails it. Raindrop and Readwise are both "another system" with their own organization model. Floccus syncs your browser bookmarks but has no queue concept.

The build case is stronger now. The core of what you need is pretty simple:

A JSON or Markdown file in a GitHub repo as the data store
An "inbox" concept -- unsorted captures land here with a flag
iOS Share Extension to drop things into the inbox
A work-machine view (browser extension, Raycast extension, or just a local web app) that shows the inbox prominently and lets you file things into your real browser bookmarks or just clear them
A personal Mac component that does the same
The GitHub repo gives you the no-iCloud cross-machine sync for free, full history, and no vendor.

The hardest piece is the iOS Share Extension -- that requires a native Swift app wrapper even if the logic is minimal. Everything else is pretty lightweight.

Is Swift something you want to take on, or would you rather the iOS piece be a Shortcut or Scriptable script that hits the GitHub API directly?

I don’t have an existing bookmark browser structure. Hence the ask

5:37 PM
That actually simplifies things considerably. You're starting fresh, so there's no migration problem and no existing structure to work around.

So what you really want is:

A personal bookmark manager that is the system of record
With a capture queue for things you flag while reading RSS
Accessible at work without iCloud
GitHub as the backend so it's portable, auditable, and vendor-free
That's a clean, well-scoped build. And since you're starting fresh you get to design the data model from scratch -- which means you can make it exactly fit how your brain works rather than conforming to how some app thinks you should organize links.

A few questions that would shape the design before going further:

How do you think about organization -- do you naturally think in folders/collections, tags, or do you prefer a flat list you just search? That affects the data model significantly.

And on the work machine specifically -- what browser are you using there? That would determine whether a browser extension is viable or whether a Raycast extension or standalone web app makes more sense as the "work interface."

I like folders and tags. I use chrome and Raycast at work. I also have a Js based command center that I am building at work. If I could incorporate the system into that, it would be ideal.

5:40 PM
That all fits together really cleanly. The JS command center is actually the ideal work-side interface -- you're already building it, you control the UI, and adding a bookmark/inbox panel is just another module.

So the full picture is coming into focus:

Data layer: JSON file(s) in a private GitHub repo. Folders and tags are just fields in the schema. The GitHub API handles reads and writes from every surface.

Capture (iOS + personal Mac): iOS Share Extension or Shortcut hitting the GitHub API directly -- drops a link into an inbox array with title, URL, timestamp, optional note. Personal Mac could be a Raycast extension or a simple menu bar app that does the same.

Work interface: A module in your JS command center that reads from the GitHub repo, shows the inbox queue prominently, lets you file things into folders/tags, and mark as done. This is just a few API calls.

Raycast at work: A Raycast extension that lets you search the full bookmark store and quick-add -- complementing the command center for when you're not looking at it.

The data model would be something like:

json
{
  "inbox": [],
  "bookmarks": [
    {
      "id": "",
      "url": "",
      "title": "",
      "folder": "",
      "tags": [],
      "added": "",
      "read": false,
      "notes": ""
    }
  ]
}
The inbox items graduate to bookmarks once you file them at work.

What's your JS command center built in -- React, vanilla, something else? That'll determine how to structure the GitHub API integration module.

Command center is build in react and has a card based interface where I can add different cards in the interface to focus on different things.

5:41 PM
Perfect -- a bookmark/inbox card drops right into that model. You'd have two cards probably:

Inbox card -- shows unprocessed captures with a count badge, each item has quick actions to file into a folder/add tags and promote it to your bookmark store, or dismiss it. This is the "what did I flag this week" view.

Bookmarks card -- search, browse by folder, filter by tag. Probably with a quick-add input at the top for when you're at work and want to save something directly.

The GitHub integration would be a shared service/hook both cards consume -- something like a useBookmarks() hook that handles reading and writing the JSON file via the GitHub API, with optimistic updates so the UI feels instant even though it's round-tripping to GitHub.

A few things worth designing upfront before writing any code:

Single file vs multiple files -- one bookmarks.json works fine at small scale but GitHub API writes require reading the current file, merging, and writing back. With a single file that's a read-modify-write on every save, which creates race conditions if you capture from two places quickly. Splitting inbox and bookmarks into separate files reduces that risk.

Conflict handling -- if you add something from your phone and your command center is open at the same time, you need a strategy. Append-only inbox writes mitigate most of this.

Auth -- a GitHub Personal Access Token scoped to just that repo is the right call. You'd store it in your command center's config.

Want to start sketching the data schema and the React hook, or tackle the iOS capture piece first since that's the hardest native component?

I want to look at the iOS side first. On the react server side we are on a feature freeze. So, I want a temporary option and then to work on the integration for the server when the feature freeze is done.

9:08 PM
Smart sequencing. So the immediate goal is: capture from iOS and be able to view/manage on the Mac temporarily, with the React integration coming later.

For iOS capture, a Shortcut hitting the GitHub API directly is the lowest friction path -- no Xcode, no App Store, just a Shortcut that:

Accepts a URL from the Share Sheet
Optionally prompts for a quick note or folder
Appends the item to your inbox JSON file in the GitHub repo via the API
That's fully functional and takes maybe 30 minutes to build.

For the temporary Mac-side view, since you have Raycast at work already, a Raycast extension that reads your GitHub repo and shows inbox + bookmarks is a solid interim. You can search, file inbox items, and add bookmarks -- then when the React integration is ready, you retire the Raycast extension as the primary UI but keep it for quick search.

So the temporary stack would be:

iOS: Shortcut for capture via Share Sheet
Mac personal: Same Shortcut or a menu bar tool
Mac work: Raycast extension for viewing/managing
Storage: GitHub private repo with a simple JSON schema
This also means you're building the GitHub API integration layer once -- the Shortcut and Raycast extension both use the same repo and file structure that the React card will eventually consume.

Want to start with the Shortcut or nail down the JSON schema first?

What would be the viewing system on my phone or personal Mac?

9:11 PM
Good question -- the Shortcut handles capture but viewing is a gap.

On iOS, your options without building a native app:

The Floccus companion app -- ironically still relevant here. If your JSON is in GitHub it won't talk to it directly, but it's worth noting. More realistically, a Progressive Web App (PWA) you host on GitHub Pages that reads your repo via the API. Add it to your home screen and it behaves app-like. No App Store, no Xcode.
Scriptable -- a JavaScript runtime for iOS. You could build a reasonable read/browse UI as a Scriptable widget or full script. It can hit the GitHub API and render a list. Ugly but functional.
Working Copy -- a Git client for iOS that can view files. Not a purpose-built bookmark UI but you can literally open and read your JSON. Too raw probably.
On your personal Mac, easier options:

A local HTML file that reads from GitHub API -- open it in any browser, no server needed
Raycast extension -- same one as work, install it on your personal Mac too
A simple menu bar app built in Swift -- but that's scope creep right now
Honestly the PWA on GitHub Pages is the cleanest answer for both platforms simultaneously. One build, works on iOS and personal Mac in a browser, reads and writes to your GitHub repo. It bridges the gap until the React command center integration is done, and the effort is low since it's just React or vanilla JS.

Want to go that route?

I want to start with the best long-term option. I find that I get 75% into many projects and features need to be added. I want to make sure I can easily view and organize everything on all OSs

9:17 PM
The honest long-term answer is a PWA -- and not just as a temporary bridge. It becomes the permanent viewing and management interface on every platform:

iOS home screen -- feels native enough, Share Sheet capture via Shortcut feeds it
Personal Mac -- browser tab or pinned window
Work Mac -- same URL, no iCloud, no install, works in Chrome
Any other device -- just works
The React command center card becomes a panel that embeds or links to the same PWA, or shares the same useBookmarks() hook. You're not building two UIs -- you're building one that surfaces in multiple contexts.

The full long-term stack:

GitHub private repo -- source of truth, JSON data store
PWA (React) -- the primary UI for browse, search, organize, deployed to GitHub Pages or a simple host like your DreamHost plan
iOS Shortcut -- Share Sheet capture, writes to GitHub API
Raycast extension -- quick search and add at work without opening a browser
React command center card -- embeds the same data layer when feature freeze lifts
Everything reads and writes the same JSON schema via the GitHub API. You build the data layer and PWA once, and everything else is just a different surface on top of it.

The PWA is also the piece that future-proofs you -- if you ever want a proper iOS app later, the GitHub API integration and data model are already solid and a native Swift app is just a new frontend.

Want to start by designing the JSON schema and GitHub API service layer, since everything depends on that foundation?

Could the reminder piece be built-in to the temporary mac app

10:10 PM
Yes, and it's actually a natural fit for a menu bar app on Mac. A menu bar app can:

Show a badge count of unread inbox items so it's always visible
Send a daily or session-based notification -- "you have 5 unread captures" when you open your Mac at work
Let you quick-file or dismiss items without opening a full browser window
The reminder piece is honestly one of the stronger arguments for building a lightweight native menu bar app as the Mac component rather than just relying on the PWA. The PWA can't push notifications reliably on macOS and it requires you to actively open a browser tab. A menu bar app is ambient -- it's just there.

The menu bar app scope would be intentionally narrow:

Inbox view with notification/badge
Quick file to folder + add tags
Search existing bookmarks
Open in browser for full PWA when you need it
SwiftUI makes a menu bar app surprisingly approachable -- it's much less scope than a full iOS app. And since it's just reading and writing JSON via the GitHub API, the logic is simple. The heavy UI lifting lives in the PWA.

So the revised picture:

macOS menu bar app -- ambient reminders, quick inbox triage, badge count
PWA -- full browse, organize, manage on all platforms
iOS Shortcut -- capture
GitHub repo -- data layer
The menu bar app and PWA complement each other rather than compete. Does that feel like the right split?

Yeah, that sounds great. Should we build here or in Claude Code

10:11 PM
Given the scope of this project, Claude Code is the better choice. Here's why:

Multiple files across multiple projects (Swift menu bar app, PWA, Raycast extension, iOS Shortcut export) -- Claude Code handles a real file system rather than artifacts in isolation
You'll want a proper Git repo from the start, and Claude Code works directly in your terminal alongside that
The Swift menu bar app in particular needs Xcode project structure, entitlements, Info.plist -- that's messy to manage as artifacts
When you eventually integrate with your React command center, Claude Code can work directly in that codebase
The one thing worth doing here first is finalizing the JSON schema and data model before writing any code. That's a design conversation, not a coding task, and getting it right before touching Claude Code means you're not refactoring the foundation halfway through.

Want to nail down the schema here -- bookmarks structure, inbox structure, folder/tag model, GitHub file layout -- and then take that spec into Claude Code as the starting point?

Yeah, let's get the scheme and data model set and deal with any other design needs.

10:12 PM
Let's work through it methodically. A few questions to nail the schema:

Folders
Do you want folders to be flat (just a name on a bookmark) or a true hierarchy with nested subfolders? Nested is more flexible but adds complexity to the UI and schema.

Tags
Just free-form strings, or do you want a managed tag list so you don't end up with swift, Swift, and Swift/iOS as three different tags?

Inbox items
When you capture something, what's the minimum you want to record? URL and title are obvious. Do you want:

An optional quick note at capture time
The source (which RSS feed it came from)
A "why I saved this" field for work context
Read state
Do you want a distinction between "captured but not reviewed" (inbox), "reviewed and filed" (bookmark), and "read/done"? Or is filed = done?

Bookmarks at work
When you add something directly at work via Raycast or the command center -- does it skip the inbox and go straight to filed, or do you want everything to flow through the inbox regardless of where it was added?

Archive
Do you want a soft delete / archive, or just hard delete when something is no longer useful?

These answers will determine whether the schema stays simple or needs a bit more structure. What are your instincts?

Flat folders, managed list of tags, I want to capture source, note, and why field. Yes, I want a distinction between "Captured but not reviewed inbox, reviewed and filed, and read/done. Captured at work does not skip the inbox. All capture locations should be treated the same. Yes, I want a soft delete/archive.

10:16 PM
Good, clean decisions. One follow-up before I draft the schema:

Read/Done state -- when something is "read/done" do you want it to stay visible in its folder as a historical record, or does "done" effectively mean it moves out of your active bookmark space?

The reason I ask: "reviewed and filed" already means it's organized and available. "Read/done" could mean:

Keep it -- it's in your library permanently, just marked as consumed. Good if you want to reference it later ("I read something about this once...")
Archive it -- moves out of active view into an archive you can search but don't see day to day
Delete it -- soft delete, gone from normal view, recoverable but you don't expect to go back
This matters because it determines whether "read/done" is a state on a bookmark or whether it's the trigger that moves something to the archive. Those are two different data model approaches.

Also worth clarifying: folders and tags together -- do you see folders as the primary organization (a bookmark lives in one folder) and tags as secondary cross-cutting labels? Or are they equal?

I ask because if a bookmark can only be in one folder, the schema is simpler. If it can live in multiple folders that's more like a tagging system and the distinction between folders and tags blurs.

Keep read/done. Folders are the primary organization

10:17 PM
Perfect. One last question on the folder/tag relationship since folders are primary:

Does a bookmark have to be in a folder, or can it be unfoldered?

The reason: items that come out of the inbox need to be filed into a folder to be considered "reviewed and filed." But you may occasionally want to promote something out of the inbox without having decided where it lives yet -- a kind of "reviewed but not yet organized" limbo state. Or you may want to enforce that filing always means choosing a folder, keeping things clean.

And on tags -- since they're managed, do you want tags to be global across everything, or scoped per folder? Global is almost certainly the right answer but worth confirming. Global means a tag like swift applies the same way whether a bookmark is in a "Dev" folder or a "Reading" folder, and you can filter across folders by tag.

Also, since you mentioned the source field at capture time -- do you want sources to be a managed list too, or free-form? For example, if you're reading from specific RSS feeds regularly, having a managed source list means you could later filter "everything I saved from Hacker News" consistently. But if sources are ad-hoc it might not be worth managing.

These are the last moving pieces before the schema locks in.

A folder does not have to be in a folder. Tags are global. I like a managed list of sources.

10:18 PM
Great. I have everything I need. Let me draft the full schema:

json
{
  "meta": {
    "version": "1.0",
    "last_modified": "ISO8601 timestamp",
    "last_modified_by": "string (ios|mac|raycast|pwa|work)"
  },
  "folders": [
    {
      "id": "uuid",
      "name": "string",
      "created": "ISO8601 timestamp",
      "archived": false
    }
  ],
  "tags": [
    {
      "id": "uuid",
      "name": "string",
      "created": "ISO8601 timestamp"
    }
  ],
  "sources": [
    {
      "id": "uuid",
      "name": "string",
      "url": "string",
      "created": "ISO8601 timestamp"
    }
  ],
  "bookmarks": [
    {
      "id": "uuid",
      "url": "string",
      "title": "string",
      "folder_id": "uuid | null",
      "tag_ids": ["uuid"],
      "source_id": "uuid | null",
      "note": "string | null",
      "why": "string | null",
      "status": "inbox | filed | read | archived | deleted",
      "captured_at": "ISO8601 timestamp",
      "captured_by": "string (ios|mac|raycast|pwa|work)",
      "filed_at": "ISO8601 timestamp | null",
      "read_at": "ISO8601 timestamp | null",
      "archived_at": "ISO8601 timestamp | null",
      "deleted_at": "ISO8601 timestamp | null"
    }
  ]
}
A few things to note about the design decisions baked in:

status is a single field with a clear progression:

inbox -- captured, not reviewed
filed -- reviewed, assigned folder (optional) and tags
read -- consumed, stays visible
archived -- soft removed from active view
deleted -- soft delete, recoverable
captured_by and last_modified_by track which surface created or last touched something -- useful for debugging sync conflicts and eventually for understanding your own capture patterns.

folder_id is nullable since a bookmark doesn't have to live in a folder.

source_id is nullable since work-added bookmarks may not have an RSS source.

On the GitHub file layout, I'd suggest splitting into two files rather than one:

/data
  bookmarks.json    # the full schema above
  bookmarks.lock    # lightweight conflict detection file
The lock file is just:

json
{
  "locked_by": "string | null",
  "locked_at": "ISO8601 timestamp | null"
}
This gives you a simple optimistic locking mechanism -- before any write, check the lock file, claim it, write, release it. Prevents the iOS Shortcut and another surface writing simultaneously and clobbering each other.

One thing I want to flag: the meta.version field is important. As you add features later -- the Raycast extension, the React card -- you may evolve the schema. Versioning it from day one means every client can check compatibility before reading or writing.

Does this feel right, or anything you want to adjust before taking it into Claude Code?

I think this looks good. Every cool project needs a great name. Let's come up with some ideas.

10:30 PM
Given what this project is -- a personal capture and recall system rooted in quiet, ambient organization across your life and work -- here are some directions to explore:

Concept: The idea of saving/collecting

Haul
Cache
Stow
Tuck
Glean
Folio
Concept: The inbox/queue idea

Drift
Queue (too generic)
Ripple
Tide
Current
Concept: Japanese/craft aesthetic (in the Shikomi spirit)

Tameru (溜める) -- to accumulate, to save up
Atsumeru (集める) -- to gather, to collect
Hikae (控え) -- a note kept for later, a reserve
Tebiki (手引き) -- a guide you keep close
Tome (留め) -- to fasten, to hold in place
Concept: The ambient reminder angle

Nudge (too product-y)
Ember
Beacon
Trace
My instinct given your naming sensibility with Shikomi and Sentinel -- you tend toward words with quiet weight and intentional meaning over clever wordplay. Hikae stands out to me. "A note kept for later" maps perfectly to what this is, and it has the same understated craft feel as Shikomi.

Tameru is a close second -- accumulating deliberately over time is exactly the behavior the tool enables.

What direction resonates?

Hikae is it. How is it pronounced

10:31 PM
Hikae is pronounced: hee-kah-eh

Three syllables:

Hi -- like "he"
ka -- like "ca" in "car" but shorter
e -- like "eh"
Said naturally it flows as hee-KAH-eh, with a slight emphasis on the middle syllable.

It's a clean word to say out loud, which matters when you're talking about it at MacAdmins or JNUC. Easy enough for an English speaker to pronounce correctly without overthinking it, but distinct enough to be memorable.

Ready to take Hikae into Claude Code?

Let's head to claude code