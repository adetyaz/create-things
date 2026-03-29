# createthings — User Stories

**Full product · all features · all three user types · v1.0 · March 2026**

User types: **[Designer]** · **[Developer]** · **[Content Creator]**
35 user stories across 11 feature areas.

---

## Status Key

- `[ ]` Not started
- `[~]` In progress / partial
- `[x]` Done

---

## 01 · Onboarding & Setup

| ID     | Story                                  | Type            | Status |
| ------ | -------------------------------------- | --------------- | ------ |
| US-001 | Connect Notion workspace               | Designer        | `[x]`  |
| US-002 | Auto-create databases on first connect | Developer       | `[x]`  |
| US-003 | Set platform preferences               | Content Creator | `[x]`  |

### US-001 — Connect Notion workspace `[x]`

> As a designer, I want to connect my Notion workspace when I first open the extension so that createthings has a home for all my inspiration and work.

- AC-01 Without a Notion connection, onboarding screen is shown instead of capture UI
- AC-02 Onboarding shows two options: Download Notion and Connect existing workspace
- AC-03 Clicking Connect opens Notion OAuth flow in a new tab
- AC-04 After successful OAuth, extension closes the tab and returns to connected capture UI
- AC-05 Success state confirms connection with workspace name visible
- AC-06 All 6 Notion databases are auto-created on first connect
- AC-07 A root page called `createthings` is created and all databases live inside it

### US-002 — Auto-create databases on first connect `[x]`

> As a developer, I want all my Notion databases created automatically when I connect so that I don't have to manually set up any structure before I can start using the tool.

- AC-01 All 6 databases created: Inspiration Vault, Analysis Results, Roadmaps, Projects, Publish Queue, User Profile
- AC-02 Relations between databases are set up correctly — Inspiration Vault links to Analysis, Projects, and Roadmaps
- AC-03 All database property types match the schema — selects, relations, checkboxes, dates, rich text, URLs
- AC-04 Setup completes within 10 seconds
- AC-05 If setup fails, clear error with retry option is shown
- AC-06 Database IDs are stored in User Profile entry for future API calls

### US-003 — Set platform preferences `[x]`

> As a content creator, I want to set which social platforms I use so that createthings only drafts captions for the platforms I actually post on.

- AC-01 Settings shows all platforms: Twitter/X, LinkedIn, Instagram, Reddit
- AC-02 User can select one or more platforms
- AC-03 Preferences saved to User Profile Notion database
- AC-04 Caption drafting only generates content for selected platforms
- AC-05 User can update preferences at any time from settings
- AC-06 Stale threshold can also be set in settings (default: 14 days)

---

## 02 · Capture

| ID     | Story                              | Type            | Status |
| ------ | ---------------------------------- | --------------- | ------ |
| US-004 | Capture current page URL           | Designer        | `[x]`  |
| US-005 | Capture a full page screenshot     | Designer        | `[x]`  |
| US-006 | Capture a selected area screenshot | Designer        | `[x]`  |
| US-007 | Paste a URL manually               | Developer       | `[x]`  |
| US-008 | Upload an image file               | Developer       | `[x]`  |
| US-009 | Capture a note                     | Content Creator | `[x]`  |

### US-004 — Capture current page URL `[x]`

> As a designer browsing Dribbble, I want to save a design I love with one click so that I can capture it without breaking my browsing flow.

- AC-01 Opening extension auto-fills current tab URL and page title
- AC-02 User can optionally add a quick note before saving
- AC-03 Save to Notion creates a new entry in Inspiration Vault
- AC-04 Entry is created with Status: Pending and Capture Type: url
- AC-05 Date Saved set to today automatically
- AC-06 Success confirmation shown with link to view entry in app
- AC-07 Capture takes no more than 3 seconds

### US-005 — Capture a full page screenshot `[x]`

> As a designer, I want to screenshot an entire page so that I can save the full visual reference including parts below the fold.

- AC-01 Screenshot > Full page captures the entire visible viewport
- AC-02 Screenshot captured as base64 and attached to the Notion entry
- AC-03 Image appears in Inspiration Vault entry as a file attachment
- AC-04 Capture type set to screenshot
- AC-05 Process completes within 5 seconds

### US-006 — Capture a selected area screenshot `[x]`

> As a designer, I want to select just a portion of a page so that I can capture only the specific component or section that inspired me.

- AC-01 Screenshot > Select area injects an overlay onto the current page
- AC-02 Overlay dims the full page at 50% opacity
- AC-03 User can click and drag to draw a selection box
- AC-04 Selection box has 8 resize handles on corners and edges
- AC-05 Selected area shows through overlay at full brightness
- AC-06 Confirm button appears below the selection
- AC-07 Pressing Escape cancels and removes the overlay
- AC-08 Confirmed selection is captured as an image and saved to Notion
- AC-09 Capture type set to screenshot

### US-007 — Paste a URL manually `[x]`

> As a developer, I want to paste a URL from somewhere other than my current tab so that I can save references I find in Slack, email, or other apps.

- AC-01 Paste URL shows a text input field in the extension popup
- AC-02 User pastes or types any URL
- AC-03 SvelteKit server fetches metadata: title, author, og:image from the URL
- AC-04 Fetched data populates the Notion entry automatically
- AC-05 If metadata fetch fails, URL is still saved with user-entered URL as title
- AC-06 Capture type set to url

### US-008 — Upload an image file `[x]`

> As a developer, I want to upload a screenshot or image from my local files so that I can save references I have already captured outside the browser.

- AC-01 Upload image opens the system file picker
- AC-02 Accepted file types: PNG, JPG, JPEG, WEBP, GIF
- AC-03 Maximum file size: 10MB
- AC-04 Selected image attached to Notion Inspiration Vault entry
- AC-05 Capture type set to upload
- AC-06 If file is too large, error shown

### US-009 — Capture a note `[x]`

> As a content creator, I want to type a free-text note about an idea or feeling so that I can capture verbal inspiration even when there is no visual reference to save.

- AC-01 Selecting Note shows a textarea in the extension popup
- AC-02 User can type freely — no character limit enforced at capture
- AC-03 Note saved to Notion with Capture Type: note
- AC-04 AI analysis is triggered just like image and URL captures
- AC-05 Analysis for notes extracts concept, mood, direction, and generates a starting brief
- AC-06 Visual reference suggestions included in analysis output

---

## 03 · Analyze

| ID     | Story                                 | Type            | Status |
| ------ | ------------------------------------- | --------------- | ------ |
| US-010 | See visual analysis of a saved design | Designer        | `[x]`  |
| US-011 | See technical analysis of a saved UI  | Developer       | `[x]`  |
| US-012 | See content analysis of a saved post  | Content Creator | `[x]`  |
| US-013 | See analysis of a saved note          | Content Creator | `[x]`  |

### US-010 — See visual analysis of a saved design `[x]`

> As a designer, I want to see a full breakdown of any saved design so that I understand exactly what makes it work and what I can learn from it.

- AC-01 Analysis card shows: color palette (hex values), typography (fonts, weights, pairing), layout/composition notes, mood tags, style description, identified components
- AC-02 Analysis generated automatically after saving — no manual trigger required
- AC-03 Analysis ready within 30 seconds of saving
- AC-04 Status on Inspiration Vault updates from Pending → Ready when analysis completes
- AC-05 User sees notification or badge indicating analysis is ready
- AC-06 Source attribution (creator name, origin URL, platform) shown on every card

### US-011 — See technical analysis of a saved UI `[x]`

> As a developer, I want the AI to identify the component structure and likely tech patterns in a saved interface so that I know what to study and replicate.

- AC-01 Analysis card includes a For Developers section
- AC-02 Covers: likely component breakdown, UI architecture hints, interaction pattern notes, probable tech stack indicators
- AC-03 Analysis is specific to what is visible — not generic
- AC-04 Developer analysis appears alongside standard visual analysis

### US-012 — See content analysis of a saved post `[x]`

> As a content creator, I want the AI to break down the hook, tone, and structure of any saved post so that I can learn what made it work and apply those patterns to my own writing.

- AC-01 Analysis card includes a For Creators section
- AC-02 Covers: hook style, opening technique, narrative structure, tone description, why it likely performed well
- AC-03 Works on URL captures from Twitter, LinkedIn, blog posts, newsletters
- AC-04 Creator analysis appears alongside standard analysis

### US-013 — See analysis of a saved note `[x]`

> As a content creator, I want my typed notes analyzed so that even a vague idea gets shaped into something I can act on.

- AC-01 Note captures analyzed for: concept and theme, mood and emotional direction, suggested visual references, a starting creative brief
- AC-02 Output displayed as text-based analysis card — no image required
- AC-03 Visual reference suggestions include descriptive direction, not just keywords
- AC-04 Brief is actionable — gives the creator a clear starting point

---

## 04 · Learn

| ID     | Story                                    | Type      | Status |
| ------ | ---------------------------------------- | --------- | ------ |
| US-014 | Generate a learning roadmap              | Designer  | `[x]`  |
| US-015 | Get a micro-lesson on any analysis point | Developer | `[ ]`  |
| US-016 | Track learning progress                  | Designer  | `[x]`  |

### US-014 — Generate a learning roadmap `[x]`

> As a designer, I want to generate a personalized learning roadmap from any saved inspiration so that I know exactly what skills I need to build to create something similar.

- AC-01 "Build my roadmap" button appears on every analysis card
- AC-02 Generates a roadmap via Groq AI based on the analysis
- AC-03 Roadmap includes: skills list, ordered milestones, resources and references per skill
- AC-04 Roadmap saved as a new page in Roadmaps Notion database
- AC-05 Roadmap linked to source inspiration entry via relation
- AC-06 Roadmap appears in app linked from analysis card
- AC-07 Generation completes within 15 seconds

### US-015 — Get a micro-lesson on any analysis point `[ ]`

> As a developer, I want to tap on any single analysis point and get a short explanation of it so that I can go deep on the specific things I do not yet understand.

- AC-01 Every individual analysis point has a "Teach me this" button or tap area
- AC-02 Tapping generates a short explanation (3–5 paragraphs) of that specific concept
- AC-03 Explanation is contextual — tied to the saved piece, not generic
- AC-04 Micro-lesson appears inline on the analysis card without leaving the page
- AC-05 Lesson generated within 10 seconds

### US-016 — Track learning progress `[x]`

> As a designer, I want to mark skills as complete on my roadmap so that I can see how much I have grown over time.

- AC-01 Each skill and milestone has a checkbox to mark as done
- AC-02 Marking a skill updates the Roadmap Notion entry
- AC-03 Progress status updates: Not started → In progress → Complete
- AC-04 Completed skills visually distinguished from pending ones
- AC-05 Progress indicator shows percentage complete across all milestones

---

## 05 · Think — Creative Journal

| ID     | Story                              | Type            | Status |
| ------ | ---------------------------------- | --------------- | ------ |
| US-017 | Write a journal entry on a project | Designer        | `[x]`  |
| US-018 | Receive AI reflection prompts      | Content Creator | `[ ]`  |
| US-019 | Make journal entries public        | Designer        | `[ ]`  |

### US-017 — Write a journal entry on a project `[x]`

> As a designer, I want a private thought space on every project so that I can document my process as I work and remember why I made certain decisions.

- AC-01 Every project page has a journal section
- AC-02 User can write free-text entries of any length
- AC-03 Entries saved to Projects Notion database journal field
- AC-04 Multiple entries can be added over time — newest first
- AC-05 Each entry has a timestamp
- AC-06 Journal entries are private by default

### US-018 — Receive AI reflection prompts `[ ]`

> As a content creator, I want the AI to ask me targeted questions about my process so that I can articulate my creative decisions more clearly in my journal.

- AC-01 AI prompts appear in the journal section contextually based on linked inspiration
- AC-02 Example prompts: "What feeling were you trying to create?", "What would you do differently?", "What did the original piece teach you?"
- AC-03 Prompts change based on capture type and analysis — not generic
- AC-04 User can dismiss prompts or respond to them as journal entries
- AC-05 Responded prompts saved alongside free-text entries

### US-019 — Make journal entries public `[ ]`

> As a designer, I want to choose which journal entries appear on my public portfolio so that potential clients can see my thinking process.

- AC-01 Each journal entry has a Private / Public toggle
- AC-02 Public entries appear on portfolio page under Process section
- AC-03 Private entries never visible outside the app
- AC-04 Default state is Private
- AC-05 User can change visibility of any entry at any time

---

## 06 · Create

| ID     | Story                                     | Type            | Status |
| ------ | ----------------------------------------- | --------------- | ------ |
| US-020 | Generate a project brief from analysis    | Designer        | `[x]`  |
| US-021 | Generate a content draft outline          | Content Creator | `[ ]`  |
| US-022 | Link multiple inspirations to one project | Developer       | `[x]`  |

### US-020 — Generate a project brief from analysis `[x]`

> As a designer, I want an AI-generated project brief based on my saved inspiration so that I have a structured starting point instead of a blank canvas.

- AC-01 "Start creating" button appears on every analysis card
- AC-02 Tapping creates a new Project entry in Notion linked to the inspiration
- AC-03 AI generates a brief: creative direction, mood and tone, key elements to incorporate, suggested approach
- AC-04 Brief appears in the project page in the app
- AC-05 User can edit the brief freely
- AC-06 Brief saved to Projects Notion database

### US-021 — Generate a content draft outline `[ ]`

> As a content creator, I want an AI-generated outline based on my saved inspiration so that I am not starting from a blank page when I sit down to write.

- AC-01 For URL and note captures from content sources, an outline option appears on the analysis card
- AC-02 AI generates: suggested headline, hook options, section structure, closing CTA suggestion
- AC-03 Outline saved to Project page in Notion
- AC-04 User can edit and expand the outline freely
- AC-05 Outline is informed by the hook and structure analysis from the captured piece

### US-022 — Link multiple inspirations to one project `[x]`

> As a developer, I want to link several saved references to a single project so that I can build something that combines ideas from multiple sources.

- AC-01 Project page has an "Add inspiration" button
- AC-02 User can link any number of saved inspirations to one project
- AC-03 Linked inspirations appear as reference cards in the project page
- AC-04 Relation stored in both Projects and Inspiration Vault Notion databases
- AC-05 All linked inspirations are credited if the project is published

---

## 07 · Publish

| ID     | Story                                      | Type            | Status |
| ------ | ------------------------------------------ | --------------- | ------ |
| US-023 | Tag work with a remix label                | Designer        | `[x]`  |
| US-024 | Get platform-specific captions drafted     | Content Creator | `[x]`  |
| US-025 | Review and edit captions before publishing | Designer        | `[x]`  |
| US-026 | Auto-credit the original creator           | Developer       | `[x]`  |

### US-023 — Tag work with a remix label `[x]`

> As a designer, I want to tag my published work as inspired by, remixed, or recreated so that my audience always understands my relationship to the original.

- AC-01 Before publishing, user selects remix tag: Inspired by, Remixed from, or Recreated
- AC-02 Tag is required — publish flow does not proceed without a selection
- AC-03 Tag stored in Projects Notion database
- AC-04 Tag appears in published caption as a clear attribution statement
- AC-05 Tag visible on portfolio page alongside the published work

### US-024 — Get platform-specific captions drafted `[x]`

> As a content creator, I want AI to write captions tailored to each platform so that I am not manually rewriting the same post five different ways.

- AC-01 Prepare to publish generates separate captions for each connected platform
- AC-02 Twitter/X: max 280 characters, punchy, uses hashtags
- AC-03 LinkedIn: professional framing, slightly longer, no excessive hashtags
- AC-04 Instagram: visual-first language, emoji-friendly, hashtags at end
- AC-05 Reddit: community-aware tone, no hard sell, conversational
- AC-06 Each caption auto-includes credit line based on saved attribution
- AC-07 All captions saved as drafts in Publish Queue Notion database

### US-025 — Review and edit captions before publishing `[x]`

> As a designer, I want to review and edit every caption before it goes live so that I always have final say on what is posted under my name.

- AC-01 Publish queue page shows all drafted captions side by side
- AC-02 Each caption editable inline
- AC-03 Credit line is editable but not removable
- AC-04 User selects which platforms to publish to before approving
- AC-05 Approve and queue button updates Publish Queue status to Approved in Notion
- AC-06 Notion automation detects Approved status and triggers publish webhook
- AC-07 Confirmation shown when post goes live

### US-026 — Auto-credit the original creator `[x]`

> As a developer, I want the credit line generated automatically from the saved source attribution so that I never forget to credit the original creator.

- AC-01 Credit line generated from attribution field captured during analysis
- AC-02 Format: `Inspired by [Author] — [Source URL]`
- AC-03 If no author detected, credit line shows source URL only
- AC-04 Credit line inserted into every platform caption automatically
- AC-05 Credit line cannot be fully removed — only edited
- AC-06 For Recreated tag: `Recreated from [Author] — original at [URL]`

---

## 08 · Figma Export

| ID     | Story                                 | Type     | Status |
| ------ | ------------------------------------- | -------- | ------ |
| US-027 | Export a captured screenshot to Figma | Designer | `[ ]`  |
| US-028 | Connect Figma account in settings     | Designer | `[ ]`  |

### US-027 — Export a captured screenshot to Figma `[ ]`

> As a designer, I want to send any captured screenshot directly to my Figma workspace so that I have the reference right inside my design tool without switching contexts.

- AC-01 Export to Figma button appears on inspiration cards where capture type is screenshot or upload
- AC-02 Button does not appear on URL-only or note captures
- AC-03 If Figma not connected, tapping opens settings drawer to connect
- AC-04 If connected, image sent to Figma via REST API as a new frame
- AC-05 Frame named: `[inspiration title] — captured via createthings`
- AC-06 Source URL added as a Figma comment on the frame
- AC-07 Success toast: "Saved to Figma workspace"
- AC-08 Export completes within 5 seconds

### US-028 — Connect Figma account in settings `[ ]`

> As a designer, I want to connect my Figma account once so that all future exports happen without any extra steps.

- AC-01 Settings page has a Connect Figma section
- AC-02 Tapping Connect opens Figma OAuth flow
- AC-03 After approval, Figma Connected set to true in User Profile Notion database
- AC-04 Connected state shown clearly in settings with workspace name
- AC-05 User can disconnect Figma from settings at any time

---

## 09 · Portfolio

| ID     | Story                                 | Type            | Status |
| ------ | ------------------------------------- | --------------- | ------ |
| US-029 | View my public portfolio page         | Designer        | `[x]`  |
| US-030 | Control what appears on my portfolio  | Content Creator | `[~]`  |
| US-031 | Show process behind a published piece | Developer       | `[ ]`  |

### US-029 — View my public portfolio page `[x]`

> As a designer, I want an automatically generated portfolio page that I can share as a single link so that anyone can see my work, process, and creative journey without me building a separate site.

- AC-01 Portfolio page available at `createthings.app/@username`
- AC-02 Publicly accessible — no login required for visitors
- AC-03 Page shows sections: Work, Process, Learning, Inspiration, Creative DNA
- AC-04 Work section shows all published projects marked as Public
- AC-05 Process section shows journal entries marked as Public
- AC-06 Page updates automatically when new work is published
- AC-07 Page loads within 3 seconds

### US-030 — Control what appears on my portfolio `[~]`

> As a content creator, I want to choose exactly what is visible on my public portfolio so that I only show what I am ready to share.

- AC-01 Every project has a Public checkbox ✓ (done)
- AC-02 Every journal entry has a Private / Public toggle ✗ (not yet)
- AC-03 Inspiration sources only appear if linked project is public ✗ (not yet)
- AC-04 Creative DNA card toggled on or off in settings ✗ (not yet)
- AC-05 Portfolio visibility setting can make entire page private with one toggle ✗ (not yet)
- AC-06 Changes take effect immediately ✗ (not yet)

### US-031 — Show process behind a published piece `[ ]`

> As a developer, I want visitors to my portfolio to see the inspiration and process behind my work so that they understand how I think and not just what I produce.

- AC-01 Each published piece links to a detail view
- AC-02 Detail view shows: finished work, source inspiration, remix tag, credit line, public journal entries
- AC-03 Inspiration source shows original URL and creator attribution
- AC-04 Journal entries show creative decisions made during the project
- AC-05 Visitor sees full journey from inspiration to finished work

---

## 10 · Identity

| ID     | Story                                  | Type     | Status |
| ------ | -------------------------------------- | -------- | ------ |
| US-032 | Build a Creative DNA profile over time | Designer | `[~]`  |

### US-032 — Build a Creative DNA profile over time `[~]`

> As a designer, I want the system to build a profile of my creative taste from everything I save so that I have a clear picture of what I am drawn to and what defines my aesthetic.

- AC-01 Creative DNA profile generated from saved inspirations ✗ (not yet)
- AC-02 Profile updates automatically as more inspirations are saved ✗ (not yet)
- AC-03 Profile describes: recurring color tendencies, preferred layout styles, common mood tags, aesthetic patterns ✗ (not yet)
- AC-04 Profile stored in User Profile Notion database ✗ (not yet)
- AC-05 Profile shown on portfolio page as a Creative DNA card ✓ (creativeDna field shown on portfolio)
- AC-06 Profile visibility toggled on or off by user ✗ (not yet)

---

## 11 · Reminders

| ID     | Story                                 | Type            | Status |
| ------ | ------------------------------------- | --------------- | ------ |
| US-033 | Get reminded about stale inspirations | Content Creator | `[x]`  |
| US-034 | Set my own stale threshold            | Designer        | `[x]`  |
| US-035 | Receive a weekly creative digest      | Developer       | `[~]`  |

### US-033 — Get reminded about stale inspirations `[x]`

> As a content creator, I want to be nudged about inspiration I saved and forgot so that nothing in my vault goes to waste.

- AC-01 Stale check runs every time the dashboard loads
- AC-02 Stale check also runs on a weekly schedule
- AC-03 An inspiration is stale when it has been Pending past the user's threshold
- AC-04 Stale nudge shows: title, how long saved, three options: Start a project / Archive it / Reset timer
- AC-05 Nudge is contextual — not just a generic reminder
- AC-06 Status updates in Notion based on user's action

### US-034 — Set my own stale threshold `[x]`

> As a designer, I want to set how many days before an inspiration is flagged as stale so that the system respects my own working pace.

- AC-01 Stale threshold configurable in settings
- AC-02 Default value is 14 days
- AC-03 User can enter any number of days
- AC-04 Threshold saved to User Profile Notion database
- AC-05 Changing threshold takes effect immediately on next stale check

### US-035 — Receive a weekly creative digest `[~]`

> As a developer, I want a weekly summary of what I saved, created, published, and learned so that I stay aware of my creative output and stay accountable.

- AC-01 Weekly digest generated every Monday ✗ (not yet scheduled)
- AC-02 Covers: inspirations saved, projects started, work published, roadmap milestones, stale items ✓ (API route exists at /api/digest)
- AC-03 Digest shown as a card on the dashboard ✗ (not yet wired to dashboard)
- AC-04 Digest data pulled from all 6 Notion databases via query ✓ (API route does this)
- AC-05 If nothing happened that week, encouraging empty state shown ✗ (not yet)

---

## Summary

| Area            | Total  | Done   | Partial | Not Started |
| --------------- | ------ | ------ | ------- | ----------- |
| 01 Onboarding   | 3      | 3      | 0       | 0           |
| 02 Capture      | 6      | 6      | 0       | 0           |
| 03 Analyze      | 4      | 4      | 0       | 0           |
| 04 Learn        | 3      | 2      | 0       | 1           |
| 05 Think        | 3      | 1      | 0       | 2           |
| 06 Create       | 3      | 2      | 0       | 1           |
| 07 Publish      | 4      | 4      | 0       | 0           |
| 08 Figma Export | 2      | 0      | 0       | 2           |
| 09 Portfolio    | 3      | 1      | 1       | 1           |
| 10 Identity     | 1      | 0      | 1       | 0           |
| 11 Reminders    | 3      | 2      | 1       | 0           |
| **Total**       | **35** | **25** | **3**   | **6**       |

### Not started (6)

- US-015 Micro-lesson on any analysis point
- US-018 AI reflection prompts in journal
- US-019 Make journal entries public
- US-021 Content draft outline generation
- US-027 Export screenshot to Figma
- US-028 Connect Figma in settings

### Partial / needs completing (3)

- US-030 Portfolio visibility controls (project Public checkbox done; journal toggle, DNA toggle, full private mode not yet)
- US-032 Creative DNA auto-generation (display done; profile generation from vault not yet)
- US-035 Weekly digest (API route done; dashboard card + Monday schedule not yet)
