# createthings

> Your creative OS — powered by Notion MCP

A creative workflow platform for designers, developers, and content creators. Capture inspiration, analyze it with AI, learn from it, create your own work, and publish it with proper attribution — all with Notion as the backbone.

Built for the [DEV.to × Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04).

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Core Concept](#core-concept)
5. [Feature List](#feature-list)
6. [User Flows](#user-flows)
7. [Architecture](#architecture)
8. [Notion Setup](#notion-setup)
9. [Database Schema](#database-schema)
10. [API Integrations](#api-integrations)
11. [Environment Variables](#environment-variables)
12. [Build Order](#build-order)
13. [MVP Scope](#mvp-scope)
14. [Design Notes](#design-notes)

---

## Project Overview

createthings has two surfaces:

- **Browser Extension** — the primary interface. Opens on any page. Captures inspiration via screenshot (full page or user-selected area), current page URL, image upload, URL paste, or typed note. Checks for Notion connection on every open. If not connected, shows onboarding flow.
- **SvelteKit Web App** — the dashboard, portfolio, and publishing layer. Where users read analysis, write journals, review captions, and share their portfolio.

**Notion is the brain.** It stores all data, triggers the AI pipeline via automations and webhooks, and executes publishing via Notion MCP. The user never needs to open Notion directly but can if they want to.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend app | SvelteKit |
| Browser extension | Web Extensions API — Manifest V3 (Chrome, Firefox, Edge, Safari) |
| Extension UI | Svelte components compiled for popup |
| Backend / API routes | SvelteKit server routes |
| Primary database | Notion (6 linked databases) |
| Automation trigger | Notion database automations + webhook actions |
| Agent / orchestration layer | Notion MCP |
| Visual AI (image + URL analysis) | Google Gemini API (free tier — gemini-1.5-flash) |
| Text generation AI (roadmaps, captions, prompts) | Groq API (free tier — llama3-70b-8192 or mixtral-8x7b) |
| Color palette extraction | node-vibrant (npm, no API key required) |
| URL metadata scraping | metascraper (npm, no API key required) |
| Social publishing middleware | Buffer API (free tier — fallback for unapproved direct APIs) |
| Figma export | Figma REST API |
| Deployment | Vercel (SvelteKit adapter-vercel) |

---

## Repository Structure

```
createthings/
├── README.md
├── .env.example
├── package.json
│
├── src/
│   ├── app.html
│   ├── app.css
│   │
│   ├── routes/
│   │   ├── +layout.svelte                  # root layout, auth check
│   │   ├── +page.svelte                    # dashboard — vault overview
│   │   ├── inspiration/
│   │   │   └── [id]/
│   │   │       └── +page.svelte            # single inspiration card + analysis
│   │   ├── projects/
│   │   │   └── [id]/
│   │   │       └── +page.svelte            # project page + creative journal
│   │   ├── roadmap/
│   │   │   └── [id]/
│   │   │       └── +page.svelte            # learning roadmap view
│   │   ├── publish/
│   │   │   └── +page.svelte                # publish queue — review + approve
│   │   ├── portfolio/
│   │   │   └── [username]/
│   │   │       └── +page.svelte            # public portfolio page (no auth)
│   │   └── settings/
│   │       └── +page.svelte                # platform prefs, stale threshold
│   │
│   ├── routes/api/
│   │   ├── webhook/
│   │   │   └── notion/
│   │   │       └── +server.js              # receives Notion automation webhook
│   │   ├── analyze/
│   │   │   └── +server.js                  # calls Gemini/Groq, writes back to Notion via MCP
│   │   ├── publish/
│   │   │   └── +server.js                  # drafts captions, pushes to social APIs
│   │   ├── roadmap/
│   │   │   └── +server.js                  # generates learning path via Groq
│   │   ├── portfolio/
│   │   │   └── +server.js                  # serves public portfolio data from Notion
│   │   └── notion/
│   │       └── setup/
│   │           └── +server.js              # auto-creates all 6 Notion databases on first connect
│   │
│   └── lib/
│       ├── notion/
│       │   ├── client.js                   # Notion API client (instantiated with user token)
│       │   ├── mcp.js                      # Notion MCP integration — read/write via agent layer
│       │   ├── databases.js                # database IDs, query helpers, property builders
│       │   └── setup.js                    # creates all 6 databases programmatically
│       ├── ai/
│       │   ├── gemini.js                   # Gemini API — image and URL visual analysis
│       │   ├── groq.js                     # Groq API — text generation (roadmaps, captions, prompts)
│       │   └── prompts.js                  # all AI prompt templates
│       ├── scraper/
│       │   └── metadata.js                 # metascraper — fetches title, author, og:image from URLs
│       ├── colors/
│       │   └── extract.js                  # node-vibrant — extracts color palette from images
│       ├── publish/
│       │   ├── buffer.js                   # Buffer API adapter
│       │   ├── twitter.js                  # Twitter/X API adapter
│       │   ├── linkedin.js                 # LinkedIn API adapter
│       │   └── reddit.js                   # Reddit API adapter
│       ├── figma/
│       │   └── export.js                   # Figma REST API — exports captured image as Figma frame
│       └── stores/
│           ├── vault.js                    # Svelte store — inspiration vault state
│           ├── user.js                     # Svelte store — user profile + preferences
│           └── publish.js                  # Svelte store — publish queue state
│
└── extension/
    ├── manifest.json                       # MV3, cross-browser compatible
    ├── package.json
    ├── src/
    │   ├── popup/
    │   │   ├── Popup.svelte                # main popup UI — capture options
    │   │   ├── CaptureURL.svelte           # URL capture — auto-fills current tab URL
    │   │   ├── CaptureNote.svelte          # note capture — free text input
    │   │   ├── CaptureUpload.svelte        # image upload from local files
    │   │   ├── NotionConnect.svelte        # onboarding — connect Notion workspace
    │   │   └── SuccessState.svelte         # post-save confirmation
    │   ├── background/
    │   │   ├── service-worker.js           # MV3 service worker
    │   │   ├── notion-check.js             # checks if Notion is connected (reads from storage)
    │   │   └── capture.js                  # sends capture payload to Notion API
    │   └── content/
    │       └── screenshot.js               # injected into page — handles area selection + full capture
    └── build/                              # compiled extension output
```

---

## Core Concept

```
CAPTURE → ANALYZE → THINK → CREATE → PUBLISH → PORTFOLIO
```

```
Browser Extension (capture)
        ↓
Notion API — saves to Inspiration Vault
        ↓
Notion Automation detects new entry
        ↓
Webhook fires → POST /api/webhook/notion
        ↓
SvelteKit server:
  image/URL → node-vibrant (colors) + Gemini (visual analysis)
  note      → Groq (concept extraction, mood, brief)
        ↓
Results written back to Notion via Notion MCP
        ↓
User reads analysis card in app
        ↓
User requests roadmap → Groq generates → MCP writes to Notion
        ↓
User creates project, writes journal
        ↓
User approves publish → Notion MCP triggers social post
        ↓
Portfolio page auto-updates from Notion data
```

---

## Feature List

### Capture (Browser Extension)
- **Screenshot — full page**: captures the entire visible page
- **Screenshot — select area**: user draws a resizable crop box over any portion of the page (snipping tool style). User can resize and reposition before confirming.
- **URL**: current tab URL is auto-filled when extension opens. User can edit if needed.
- **Upload image**: pick any image from local files
- **Paste URL**: manually enter a different URL
- **Note**: free text field — for ideas, concepts, thoughts, verbal inspiration
- Quick note field available on every capture type
- Notion connection check on every extension open
- If not connected: onboarding screen with [ Download Notion ] and [ Connect workspace ] options
- On first connect: OAuth flow, then SvelteKit auto-creates all 6 Notion databases

### Analyze (AI-powered, runs server-side)
For image and URL captures:
- Color palette extraction (node-vibrant + Gemini)
- Typography identification — fonts, weights, pairing style
- Layout and composition breakdown
- Design style and mood tagging
- Component identification and naming
- For developers: UI architecture hints, pattern recognition, likely tech stack
- For content creators: hook style, tone, narrative structure, why it works
- Auto source attribution: creator name, origin URL, platform — scraped from metadata

For note captures:
- Concept and theme extraction
- Mood and direction identification
- Starting brief generation
- Visual reference suggestions — what to go look for based on the note

### Learn
- Auto-generated learning roadmap per saved inspiration (one click from analysis card)
- "Teach me this" — micro-lesson generated for any individual analysis point
- Skill progress tracker — mark milestones as complete
- Visual growth timeline across all completed milestones

### Think — Creative Journal
- Per-project thought space for text notes
- Voice note capture (transcribed and saved to Notion)
- AI-generated reflection prompts based on linked inspiration
- Decision log — document why creative choices were made
- Entries linked back to source inspiration

### Create
- AI-assisted project brief generator from the analysis
- Mood board builder from saved inspirations
- Draft generator for content creators — outline or first draft
- Project page in Notion per piece of work
- Link multiple inspirations to one project

### Publish
- Multi-platform caption drafter — tone adapted per platform:
  - Twitter/X: punchy, concise, max 280 chars
  - LinkedIn: professional framing
  - Instagram: visual-first, emoji-friendly
  - Reddit: community-aware, no hard sell
- Remix tag — user selects one:
  - Inspired by — loosely influenced
  - Remixed from — significantly based on
  - Recreated — direct reproduction for learning
- Auto-credit line inserted from saved source attribution
- Hashtag generator per platform
- Publish queue managed in Notion
- User sets platform preferences in settings
- Notion MCP triggers the actual social post on queue entry approval

### Figma Export (Designers)
- On any inspiration card with an image: [ Export to Figma ] button
- Sends the captured screenshot to the user's Figma workspace as a new frame
- Frame is named after the inspiration title and tagged with source URL
- Uses Figma REST API — user connects their Figma account in settings

### Portfolio
- Auto-generated public portfolio page served from Notion data
- Sections: Work / Process / Learning / Inspiration / Creative DNA
- Shareable via single link: createthings.app/@username
- User controls what is public vs private per item
- Visitors can see finished work, process journal entries (if public), and inspiration sources

### Identity
- Creative DNA profile — built from saved inspirations over time
- Taste summary — auto-updated as vault grows
- Shareable as a card on the portfolio page

### Reminders
- Stale inspiration detection — user sets their own threshold (default: 14 days)
- Three states per saved piece: Active / Pending / Stale
- Smart contextual nudges — relevant prompts, not generic pings
- Weekly creative digest — what was saved, created, published, and learned
- Stale check runs on dashboard load and on weekly schedule

---

## User Flows

### Flow 1 — First Time Setup
```
User installs extension
  → Opens extension — Notion not connected
  → Shown: [ Download Notion ] [ Connect existing workspace ]
  → OAuth flow to connect Notion
  → SvelteKit POST /api/notion/setup — auto-creates all 6 databases
  → User lands on connected extension — ready to capture
```

### Flow 2 — Capture via URL
```
User is on any page
  → Opens extension
  → Current page URL auto-filled
  → User optionally adds a quick note
  → Taps [ Save to Notion ]
  → Extension calls Notion API → new entry in Inspiration Vault (status: Pending)
  → Notion automation detects new entry → fires webhook
  → POST /api/webhook/notion
  → SvelteKit: scrapes metadata + calls Gemini for analysis
  → Results written to Notion via MCP (status: Ready)
```

### Flow 3 — Screenshot (Select Area)
```
User is on any page
  → Opens extension → selects [ Screenshot ]
  → Chooses [ Select area ]
  → Content script injects overlay onto current page
  → User drags to draw a selection box — can resize corners and edges
  → User confirms selection
  → Extension captures that region as image
  → Saved to Notion with image attached
  → Gemini analyzes the image → results written back via MCP
```

### Flow 4 — Screenshot (Full Page)
```
User selects [ Full page ] from screenshot options
  → Extension captures entire visible page
  → Saved to Notion with image attached
  → Analysis pipeline runs as normal
```

### Flow 5 — Note Capture
```
User opens extension → selects [ Note ]
  → Types their thought or idea
  → Taps [ Save to Notion ]
  → Notion entry created — type: note
  → Webhook triggers → Groq processes text
  → Extracts concept, mood, direction, generates brief
  → Suggests visual references to go find
  → Analysis card shows text-based breakdown
```

### Flow 6 — View Analysis and Build Roadmap
```
User opens app → Inspiration Vault
  → Taps a saved card
  → Sees full AI breakdown
  → Taps [ Teach me this ] on any point → micro-lesson generated inline
  → OR taps [ Build my roadmap ]
    → Groq generates personalized learning path
    → MCP creates roadmap page in Notion linked to inspiration
  → User sees roadmap with skills, milestones, resources
```

### Flow 7 — Figma Export
```
User is on an inspiration card (image capture)
  → Taps [ Export to Figma ]
  → If Figma not connected: prompted to connect in settings
  → If connected: image sent to Figma via REST API as a new frame
  → Frame named after inspiration title, source URL added as annotation
  → Success toast: "Saved to Figma"
```

### Flow 8 — Creative Journal
```
User starts a project from an inspiration card
  → Project page created in Notion
  → User opens thought space in app
  → Writes or voice-notes their process
  → AI reflection prompts appear contextually
  → Entries saved to Notion Projects DB
  → User marks entries public or private
```

### Flow 9 — Publish with Attribution
```
User completes work
  → Uploads final piece to project page
  → Selects remix tag: [ Inspired by ] [ Remixed from ] [ Recreated ]
  → Taps [ Prepare to publish ]
  → Groq drafts captions for each selected platform
  → Auto-credit line inserted from saved source attribution
  → User reviews and edits captions
  → Taps [ Approve and queue ]
  → Publish Queue entry updated in Notion → status: Approved
  → Notion automation detects Approved status → fires webhook
  → POST /api/publish → calls social APIs / Buffer
  → MCP updates entry status: Published
  → Portfolio page auto-updates
```

### Flow 10 — Portfolio View
```
Visitor opens createthings.app/@username
  → Public portfolio loads from Notion data
  → Sections: Work / Process / Learning / Inspiration / Creative DNA
  → Click any piece → see finished work + process journal + inspiration source + remix tag
```

### Flow 11 — Stale Reminder
```
Dashboard loads → system checks vault
  → Finds inspirations past user's stale threshold
  → Smart nudge: "You saved this 14 days ago — ready to use it?"
  → [ Start a project ] [ Archive it ] [ Reset timer ]
  → Action taken → Notion entry status updated
  → Actioned piece feeds weekly digest
```

---

## Architecture

### Data Flow (Complete)

```
EXTENSION
  User opens extension
    → notion-check.js reads chrome.storage for Notion token
    → If no token: show NotionConnect.svelte onboarding
    → If token: show Popup.svelte with capture options

  User captures:
    Screenshot (area):
      → screenshot.js injected into page via content script
      → Overlay rendered, user selects area
      → Canvas API captures selected region as base64 image
      → Sent to background service worker
    Screenshot (full):
      → chrome.tabs.captureVisibleTab() called
      → Returns base64 image
    URL:
      → chrome.tabs.query() gets current tab URL + title
    Upload / Paste URL / Note:
      → User input in popup UI

  capture.js sends payload to Notion API:
    POST https://api.notion.com/v1/pages
    Body: { database_id, properties, image_attachment }
    Creates new entry in Inspiration Vault (status: Pending)

NOTION AUTOMATION
  Trigger: New entry created in Inspiration Vault
  Action: Send webhook to POST /api/webhook/notion
  Payload: { page_id, type, image_url, source_url, note_text }

SVELTEKIT SERVER — /api/webhook/notion
  Receives webhook
  Reads entry from Notion to get full data
  Routes by capture type:

  type: image or URL
    → lib/scraper/metadata.js fetches URL metadata (title, author, og:image)
    → lib/colors/extract.js runs node-vibrant on image → palette
    → lib/ai/gemini.js sends image to Gemini Vision:
        prompt: see lib/ai/prompts.js ANALYSIS_PROMPT
        returns: { colors, typography, layout, mood, components, style, attribution }
    → lib/notion/mcp.js writes full analysis to Analysis Results DB
    → Updates Inspiration Vault entry status: Ready

  type: note
    → lib/ai/groq.js sends text to Groq:
        prompt: see lib/ai/prompts.js NOTE_ANALYSIS_PROMPT
        returns: { concept, mood, direction, brief, visual_references }
    → lib/notion/mcp.js writes results to Analysis Results DB
    → Updates Inspiration Vault entry status: Ready

SVELTEKIT SERVER — /api/roadmap
  Called when user clicks [ Build my roadmap ]
  Reads analysis from Notion via MCP
  lib/ai/groq.js generates learning path:
    prompt: see lib/ai/prompts.js ROADMAP_PROMPT
    returns: { skills[], milestones[], resources[] }
  lib/notion/mcp.js creates new Roadmap page in Notion
  Links roadmap page to source inspiration

SVELTEKIT SERVER — /api/publish
  Triggered by Notion automation (Publish Queue status = Approved)
  OR called directly when user taps [ Prepare to publish ]

  On prepare:
    Reads project + inspiration + remix tag from Notion
    lib/ai/groq.js drafts captions per platform:
      prompt: see lib/ai/prompts.js CAPTION_PROMPT
      returns: { twitter, linkedin, instagram, reddit, credit_line, hashtags }
    lib/notion/mcp.js writes drafts to Publish Queue entry

  On approve + publish:
    Reads approved captions from Notion
    Routes to connected platform adapters:
      lib/publish/buffer.js OR
      lib/publish/twitter.js / linkedin.js / reddit.js
    lib/notion/mcp.js updates Publish Queue status: Published
    Portfolio data refreshes

SVELTEKIT APP — portfolio
  GET /portfolio/[username]
  /api/portfolio/+server.js reads from Notion:
    Published projects + captions
    Public journal entries
    Completed roadmap milestones
    User profile + Creative DNA
  Rendered as public SvelteKit page — no auth required
```

### Notion MCP Usage Points

| Where | MCP Action | Data |
|---|---|---|
| After image/URL analysis | Write to Analysis Results DB | colors, typography, layout, mood, components, attribution |
| After note analysis | Write to Analysis Results DB | concept, mood, direction, brief, references |
| After roadmap generation | Create new Roadmap page + link to inspiration | skills, milestones, resources |
| After caption drafting | Write to Publish Queue entry | captions per platform, credit line, hashtags |
| After social post sent | Update Publish Queue entry status | status: Published |
| On inspiration action | Update Inspiration Vault entry status | Active / Pending / Stale / Archived |
| After work published | Read all published data for portfolio | projects, captions, journals, milestones |

---

## Notion Setup

### First Connection Flow

When the user connects Notion for the first time, `POST /api/notion/setup` is called automatically. It creates all 6 databases in their workspace.

### Notion Automations to Configure (manual setup — document clearly for users)

**Automation 1 — Trigger AI Analysis**
- Trigger: New page added to Inspiration Vault database
- Action: Send webhook to `https://yourapp.vercel.app/api/webhook/notion`
- Payload: include page ID

**Automation 2 — Trigger Publish**
- Trigger: Publish Queue entry "Status" property changes to "Approved"
- Action: Send webhook to `https://yourapp.vercel.app/api/publish`
- Payload: include page ID

**Automation 3 — Stale Check (optional)**
- Trigger: Daily schedule
- Action: Send webhook to `https://yourapp.vercel.app/api/stale-check`

---

## Database Schema

### 1. Inspiration Vault

| Property | Type | Notes |
|---|---|---|
| Title | Title | Page title — scraped or user-entered |
| Source URL | URL | Original URL of the inspiration |
| Author | Rich text | Creator name — scraped from metadata |
| Platform | Select | Dribbble, Twitter, Website, Instagram, Other |
| Capture Type | Select | screenshot, url, upload, note |
| Image | Files | Attached image |
| Status | Select | Pending, Ready, Active, Stale, Archived |
| Date Saved | Date | Auto-set on creation |
| Last Active | Date | Updated when user acts on it |
| Analysis | Relation | → Analysis Results DB |
| Projects | Relation | → Projects DB |
| Roadmap | Relation | → Roadmaps DB |
| Notes | Rich text | Quick note added at capture time |

### 2. Analysis Results

| Property | Type | Notes |
|---|---|---|
| Title | Title | Auto: "Analysis — [inspiration title]" |
| Inspiration | Relation | → Inspiration Vault |
| Colors | Rich text | Palette as hex values + names |
| Typography | Rich text | Font names, weights, pairing notes |
| Layout | Rich text | Composition breakdown |
| Mood | Multi-select | Tags: minimal, bold, editorial, playful, etc |
| Style | Rich text | Design style description |
| Components | Rich text | Identified UI or design components |
| Attribution | Rich text | Source creator + URL + platform |
| For Developers | Rich text | Architecture and pattern notes |
| For Creators | Rich text | Hook, tone, structure notes |
| Roadmap Suggestions | Rich text | What skills this piece requires |

### 3. Roadmaps & Learning

| Property | Type | Notes |
|---|---|---|
| Title | Title | Auto: "Roadmap — [inspiration title]" |
| Inspiration | Relation | → Inspiration Vault |
| Skills | Rich text | List of skills to develop |
| Milestones | Rich text | Ordered learning steps |
| Resources | Rich text | Links and references |
| Progress | Select | Not started, In progress, Complete |
| Completed Skills | Multi-select | Skills marked done |

### 4. Projects

| Property | Type | Notes |
|---|---|---|
| Title | Title | Project name |
| Status | Select | Ideating, In Progress, Done |
| Inspiration | Relation | → Inspiration Vault (can link multiple) |
| Remix Tag | Select | Inspired by, Remixed from, Recreated |
| Journal | Rich text | Creative thought process notes |
| Final Output | Files | Uploaded finished work |
| Publish Queue | Relation | → Publish Queue DB |
| Date Started | Date | |
| Date Completed | Date | |
| Public | Checkbox | Show on portfolio |

### 5. Publish Queue

| Property | Type | Notes |
|---|---|---|
| Title | Title | Auto: "Post — [project title]" |
| Project | Relation | → Projects DB |
| Status | Select | Draft, Approved, Published |
| Caption Twitter | Rich text | Platform-specific caption |
| Caption LinkedIn | Rich text | Platform-specific caption |
| Caption Instagram | Rich text | Platform-specific caption |
| Caption Reddit | Rich text | Platform-specific caption |
| Credit Line | Rich text | Auto-generated attribution text |
| Hashtags | Rich text | Per-platform hashtag sets |
| Platforms | Multi-select | Where to post |
| Scheduled | Date | Optional scheduled publish time |
| Published At | Date | Set when post goes live |

### 6. User Profile

| Property | Type | Notes |
|---|---|---|
| Username | Title | Used in portfolio URL |
| Notion Token | Rich text | Encrypted — user's Notion OAuth token |
| Stale Threshold | Number | Days before inspiration is marked stale (default: 14) |
| Platforms | Multi-select | Connected social platforms |
| Figma Connected | Checkbox | Whether Figma is connected |
| Portfolio Public | Checkbox | Whether portfolio page is publicly accessible |
| Creative DNA | Rich text | AI-generated taste summary — updated over time |
| Bio | Rich text | User-written bio shown on portfolio |

---

## API Integrations

### Required (build first)

| API | Purpose | Docs |
|---|---|---|
| Notion API | All database operations | https://developers.notion.com/reference/intro |
| Notion MCP | Agent read/write layer | https://developers.notion.com/docs/mcp |
| Notion MCP — Supported Tools | Exact available MCP actions | https://developers.notion.com/guides/mcp/mcp-supported-tools |
| Notion Automations + Webhooks | Pipeline trigger | https://www.notion.com/help/webhook-actions |
| Google Gemini API | Image and URL visual analysis | https://ai.google.dev/gemini-api/docs |
| Groq API | Text generation | https://console.groq.com/docs |
| metascraper (npm) | URL metadata scraping | https://github.com/microlinkhq/metascraper |
| node-vibrant (npm) | Color palette extraction | https://github.com/Vibrant-Colors/node-vibrant |

### Social Publishing

| API | Notes | Priority |
|---|---|---|
| Buffer API | Free tier — fallback for all platforms | Build first |
| Twitter/X API v2 | Apply early — approval can take days | Second |
| LinkedIn API | Relatively quick approval | Second |
| Reddit API | Fast approval | Third |
| Instagram Graph API | Requires Facebook app — slowest | Last |

### Enhancement

| API | Purpose | Notes |
|---|---|---|
| Figma REST API | Export captured image to Figma as frame | https://www.figma.com/developers/api |
| ElevenLabs or Web Speech API | Voice note transcription | Web Speech API is free |
| Resend API | Weekly digest email | Free tier |

---

## Environment Variables

```env
# Notion
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
NOTION_REDIRECT_URI=

# AI
GEMINI_API_KEY=
GROQ_API_KEY=

# Social Publishing
BUFFER_ACCESS_TOKEN=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Figma
FIGMA_CLIENT_ID=
FIGMA_CLIENT_SECRET=

# App
PUBLIC_APP_URL=https://createthings.vercel.app
WEBHOOK_SECRET=
```

---

## Build Order

Build in this exact order. Each step depends on the previous.

### Phase 1 — Foundation (do this first)
1. Scaffold SvelteKit project with adapter-vercel
2. Set up Notion OAuth flow (connect workspace)
3. Build `lib/notion/setup.js` — auto-creates all 6 databases on first connect
4. Build `lib/notion/client.js` — Notion API client wrapper
5. Verify: user can connect Notion, databases appear in their workspace

### Phase 2 — Extension (capture layer)
6. Set up MV3 extension with Svelte components
7. Build `notion-check.js` — checks chrome.storage for token
8. Build `NotionConnect.svelte` — onboarding UI (no token state)
9. Build `Popup.svelte` — main capture UI with 5 options
10. Build `CaptureURL.svelte` — auto-fills current tab URL
11. Build `CaptureNote.svelte` — text input
12. Build `CaptureUpload.svelte` — file picker
13. Build `screenshot.js` content script:
    - Full page: `chrome.tabs.captureVisibleTab()`
    - Select area: inject overlay, canvas crop, return base64
14. Build `capture.js` — sends payload to Notion API
15. Verify: all 5 capture types save entries to Notion Inspiration Vault

### Phase 3 — AI Analysis Pipeline
16. Build `lib/scraper/metadata.js` — metascraper URL fetcher
17. Build `lib/colors/extract.js` — node-vibrant color extraction
18. Write all prompt templates in `lib/ai/prompts.js`
19. Build `lib/ai/gemini.js` — Gemini Vision API integration
20. Build `lib/ai/groq.js` — Groq text generation integration
21. Build `/api/webhook/notion/+server.js` — receives Notion automation webhook
22. Set up Notion Automation: new Inspiration Vault entry → webhook
23. Build `lib/notion/mcp.js` — MCP write-back for analysis results
24. Verify: save a URL → analysis appears in Notion within 30 seconds

### Phase 4 — SvelteKit App (viewing layer)
25. Build dashboard `+page.svelte` — inspiration vault grid
26. Build `/inspiration/[id]/+page.svelte` — analysis card with full breakdown
27. Build `/roadmap/[id]/+page.svelte` — learning roadmap view
28. Build `/api/roadmap/+server.js` — Groq roadmap generation
29. Build `/projects/[id]/+page.svelte` — project page + journal editor
30. Verify: full loop from capture → analysis card → roadmap works

### Phase 5 — Publish
31. Build `/publish/+page.svelte` — publish queue UI
32. Build `/api/publish/+server.js` — caption generation + social posting
33. Build `lib/publish/buffer.js` — Buffer adapter (easiest, unblocks demo)
34. Set up Notion Automation: Publish Queue status = Approved → webhook
35. Verify: caption drafted, approved, published to at least one platform

### Phase 6 — Figma Export
36. Build `/settings/+page.svelte` — includes Figma connect
37. Build `lib/figma/export.js` — Figma REST API frame creation
38. Add [ Export to Figma ] button to inspiration card (image captures only)
39. Verify: screenshot capture → export to Figma → frame appears in Figma workspace

### Phase 7 — Portfolio
40. Build `/portfolio/[username]/+page.svelte` — public page (no auth)
41. Build `/api/portfolio/+server.js` — reads published data from Notion
42. Verify: shareable link shows work, process, and inspiration

### Phase 8 — Reminders + Polish
43. Build stale check logic in dashboard load
44. Build weekly digest (can use Vercel cron or Notion scheduled automation)
45. Polish UI, error states, loading states
46. Record demo video following the demo script below

---

## MVP Scope

### Ships for Submission
- Extension — URL capture + both screenshot modes + note + upload
- Notion onboarding — connect and auto-create all 6 databases
- Notion automation + webhook trigger
- AI analysis — Gemini vision + Groq text, results in Notion
- Analysis card in app
- Roadmap generator — one click from card
- Creative journal — text notes on project page
- Publish queue — captions drafted + credit line
- At least one social platform live (Twitter/X or LinkedIn via Buffer)
- Figma export for image captures
- Portfolio page — public and shareable
- Stale reminder on dashboard load

### Post-MVP
- Voice notes
- Multiple social platforms beyond Buffer
- Creative DNA profile (needs time + saved data to build)
- Weekly digest email
- Trend pulse (needs multiple users)

---

## Demo Script (for submission video)

Record these 8 moments in order:

1. Open extension on a Dribbble shot — show URL auto-filled
2. Use "select area" screenshot — drag to select a portion of the design
3. Save to Notion — show the entry appear in Notion Inspiration Vault live
4. Open the app — show the analysis card with full AI breakdown
5. Click [ Build my roadmap ] — show roadmap page created in Notion
6. Open a project journal — write a quick process note
7. Hit [ Prepare to publish ] — show AI-drafted caption with auto-credit line → approve → post goes live
8. Click [ Export to Figma ] — show the frame appear in Figma
9. Open the portfolio link — show the public page with work, process, and inspiration

---

## Design Notes

### Extension UI States
- **Connected**: teal dot in header, capture options visible
- **Disconnected**: warning state, onboarding CTA, no capture options
- **Saving**: loading state on [ Save to Notion ] button
- **Saved**: success state with link to view in app

### Screenshot Area Select UX
- Content script injects a full-page dark overlay (opacity 0.5)
- User clicks and drags to draw selection — selection area shows through overlay at full brightness
- Eight resize handles on corners and edges
- Confirm button appears below selection
- Escape key cancels and removes overlay

### Figma Export UX
- Button only appears on inspiration cards where capture type is screenshot or upload (not URL or note)
- If Figma not connected: button opens settings drawer to connect
- After export: toast notification "Saved to Figma workspace"
- Frame name: `[inspiration title] — captured via createthings`
- Frame annotation: source URL added as a Figma comment on the frame

### Color System
- Primary accent: `#1D9E75` (teal)
- Background: transparent / system default
- Text primary: `var(--color-text-primary)`
- Text secondary: `var(--color-text-secondary)`
- All components use CSS variables for light/dark mode compatibility

### Wordmark
```
[ create  things ]
```
Stacked layout. "create" in regular weight, "things" in medium weight. Bracket mark in teal. No tagline.

---

## Challenge Alignment

This project is a submission for the [DEV.to Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04).

**Judging criteria:**

**Originality & Creativity** — A creative OS with attribution baked in, learning roadmaps generated from real inspiration, and a living portfolio that grows with the creator. The remix tagging system (Inspired by / Remixed from / Recreated) is a novel approach to ethical creative sharing.

**Technical Complexity** — Cross-browser MV3 extension + SvelteKit full-stack + Notion as primary database + Notion automations as event triggers + Notion MCP as agent layer + multi-model AI pipeline (Gemini + Groq) + multi-platform social publishing + Figma API integration.

**Practical Implementation** — Solves a real daily problem for designers, developers, and content creators. Every feature has a clear user need. The workflow is complete end to end.

**Why Notion MCP is central (not a bolt-on):**
- Extension writes directly to Notion — Notion is the save target
- Notion automations are the trigger — the AI pipeline starts when Notion fires it
- Notion MCP is how the AI writes back — all analysis, roadmaps, and captions land in Notion via MCP
- Portfolio is served from Notion data — Notion is the CMS
- Publish queue lives in Notion — approval happens in Notion, MCP executes it
- Remove Notion and the product does not exist

---

*createthings — DEV.to × Notion MCP Challenge — March 2026*
