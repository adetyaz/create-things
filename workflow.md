# createthings — Workflow

## Completed

### Phase 1 — Foundation

- Scaffold SvelteKit project with adapter-vercel
- Notion OAuth flow (connect workspace)
- Auto-creates all 6 databases on first connect
- Notion API client wrapper

### Phase 2 — Extension (capture layer)

- MV3 extension with Svelte components (unified app)
- Onboarding UI, main capture UI (5 capture types)
- CaptureURL, CaptureNote, CaptureUpload components
- Screenshot content script (full page + select area)
- Capture payload → Notion Inspiration Vault

### Phase 3 — AI Analysis Pipeline

- URL metadata scraper (`metascraper`)
- Color extraction (`node-vibrant`)
- Prompt templates, Gemini Vision, Groq text generation
- Notion webhook receiver (`/api/webhook/notion`)
- Notion Automation: new entry → webhook → AI analysis → write back

### Phase 4 — Extension App Views

- Dashboard view — inspiration vault grid
- Inspiration detail — analysis card with full breakdown
- Roadmap view + `/api/roadmap` Groq generation
- Project view — project page + journal editor

### Phase 5 — Publish

- Publish queue view
- `/api/publish` — caption generation + social posting
- Buffer adapter (Bearer auth, `api.buffer.com`)
- Approve action publishes directly via Buffer (no Notion Automation needed)

### Phase 6 — Figma Export

- Settings view with Figma connect
- `lib/figma/export.ts` scaffolded
- Export button on inspiration card
- **Deferred:** Figma REST API cannot create frames — requires a Figma Plugin (future work)

### Phase 7 — Portfolio (public web page)

- `/portfolio/[username]` public page (no auth)
- Portfolio data stored in Upstash Redis (KV) keyed by username
- Settings section: username input + "Make portfolio public" toggle
- Project cards with detail modal (blocks, images, YouTube embeds)
- Shareable at `/portfolio/YOUR_USERNAME`

### Phase 8 — Reminders + Polish

- Stale project check in dashboard load
- Weekly digest (Vercel cron)
- Dormant project detection with motivational quotes + configurable threshold
- Test dormant reminder button on dashboard

---

## Open / Pending

| #   | Item                                                   | Notes                                       |
| --- | ------------------------------------------------------ | ------------------------------------------- |
| 15  | Verify all 5 capture types save to Notion              | Needs live extension testing                |
| 24  | Verify URL → analysis in Notion within 30s             | Needs webhook + Notion Automation live test |
| 30  | Verify full loop: capture → analysis → roadmap         | End-to-end test                             |
| 35  | Verify caption drafted, approved, published via Buffer | Needs Buffer account + live test            |
| 39  | Figma export                                           | Deferred — requires Figma Plugin            |
| 46  | Record demo video                                      | After verification items done               |

---

## New UI — Territory

> Expand this section as work progresses
