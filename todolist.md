# createthings — Build Todolist

> Tick each item only after it is fully completed and verified.

---

## Phase 1 — Foundation

- [x] 1. Scaffold SvelteKit project with adapter-vercel
- [x] 2. Set up Notion OAuth flow (connect workspace)
- [x] 3. Build `lib/notion/setup.ts` — auto-creates all 6 databases on first connect
- [x] 4. Build `lib/notion/client.ts` — Notion API client wrapper
- [x] 5. Verify: user can connect Notion, databases appear in their workspace

## Phase 2 — Extension (capture layer)

- [x] 6. Set up MV3 extension with Svelte components (unified app — MetaMask model)
- [x] 7. Build `notion-check.ts` — checks chrome.storage for token
- [x] 8. Build `NotionConnect.svelte` — onboarding UI (no token state)
- [x] 9. Build `Popup.svelte` — main capture UI with 5 options
- [x] 10. Build `CaptureURL.svelte` — auto-fills current tab URL
- [x] 11. Build `CaptureNote.svelte` — text input
- [x] 12. Build `CaptureUpload.svelte` — file picker
- [x] 13. Build `screenshot.ts` content script (full page + select area)
- [x] 14. Build `capture.ts` — sends payload to Notion API
- [ ] 15. Verify: all 5 capture types save entries to Notion Inspiration Vault

## Phase 3 — AI Analysis Pipeline

- [x] 16. Build `lib/scraper/metadata.ts` — metascraper URL fetcher
- [x] 17. Build `lib/colors/extract.ts` — node-vibrant color extraction
- [x] 18. Write all prompt templates in `lib/ai/prompts.ts`
- [x] 19. Build `lib/ai/gemini.ts` — Gemini Vision API integration
- [x] 20. Build `lib/ai/groq.ts` — Groq text generation integration
- [x] 21. Build `/api/webhook/notion/+server.ts` — receives Notion automation webhook
- [ ] 22. Set up Notion Automation: new Inspiration Vault entry → webhook
- [x] 23. Build `lib/notion/mcp.ts` — MCP write-back for analysis results
- [ ] 24. Verify: save a URL → analysis appears in Notion within 30 seconds

## Phase 4 — Extension App Views (full-page tab)

- [x] 25. Build dashboard view — inspiration vault grid
- [x] 26. Build inspiration detail view — analysis card with full breakdown
- [x] 27. Build roadmap view — learning roadmap display
- [x] 28. Build `/api/roadmap/+server.ts` — Groq roadmap generation
- [x] 29. Build project view — project page + journal editor
- [ ] 30. Verify: full loop from capture → analysis card → roadmap works

## Phase 5 — Publish

- [x] 31. Build publish queue view in extension
- [x] 32. Build `/api/publish/+server.ts` — caption generation + social posting
- [x] 33. Build `lib/publish/buffer.ts` — Buffer adapter
- [ ] 34. Set up Notion Automation: Publish Queue status = Approved → webhook
- [ ] 35. Verify: caption drafted, approved, published to at least one platform

## Phase 6 — Figma Export

- [x] 36. Build settings view — includes Figma connect
- [x] 37. Build `lib/figma/export.ts` — Figma REST API frame creation
- [x] 38. Add [ Export to Figma ] button to inspiration card (image captures only)
- [ ] 39. Verify: screenshot capture → export to Figma → frame appears in Figma workspace

## Phase 7 — Portfolio (public web page)

- [x] 40. Build `/portfolio/[username]/+page.svelte` — public page (no auth, served by SvelteKit)
- [x] 41. Build `/api/portfolio/+server.ts` — reads published data from Notion
- [ ] 42. Verify: shareable link shows work, process, and inspiration

## Phase 8 — Reminders + Polish

- [x] 43. Build stale check logic in dashboard load
- [x] 44. Build weekly digest (Vercel cron or Notion scheduled automation)
- [x] 45. Polish UI, error states, loading states
- [ ] 46. Record demo video following the demo script
