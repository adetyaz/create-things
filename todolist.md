# createthings — Build Todolist

> v2.0 · Tick an item only when it's built **and** verified. Phases and details: [Project Breakdown.md](Project%20Breakdown.md#build-order). Stories: [user-stories.md](user-stories.md).

---

## Hackathon — Tatum × Walrus "Total Recall" (Track 02)

> Details: [Project Breakdown.md](Project%20Breakdown.md#hackathon-tatum--walrus-total-recall). Builds on Phases 0–4 plus pet chat (Phase 6, item 48).

- [x] H1. Confirm the Walrus Memory SDK runs on Workers; health check against the mainnet relayer (30 Oct: health + mainnet save + recall pass under `wrangler dev`; `/api/dev/checks`)
- [x] H2. `memories` table + queue consumer that sends summaries to Walrus within its rate limit; summaries go through Walrus `analyze` to extract facts (US-071) (31 Oct: `features/memory`, `createthings-memory` queue + DLQ, per-user namespaces, analysis remembers goals; verified 31 Oct: a learning goal was sent to Walrus mainnet; analyze extracted 6 facts)
- [ ] H3. Memory writes for every type in the Breakdown list; at least 10 on mainnet
- [ ] H4. Recall wired into Pick for me, roadmaps, "I'm stuck"/"teach me" and pet chat; the pet cites the memory it used (US-071) (31 Oct: Pick for me done; roadmaps, stuck and chat come with those features)
- [ ] H5. Plan with time blocks: `plan_slots` with day, start time or habit anchor, place; drag to move; Today shows today's block; nudges at the block's time (US-073) (31 Oct: server side done and verified live: move/unplan a block, misses found on read. Dragging is UI; nudges come with email and push, #68)
- [x] H5a. Weekly plan: blocks wanted (count + when) → the pet fills them from the month's goals as implementation intentions; adjust and save; `plan_periods` (US-085) (verified live 31 Oct: 4 blocks filled in roadmap order and saved; `plan` memory sent. Screen comes with the UI)
- [x] H5b. Monthly plan: review + pick 1–3 goals; the rest parked until next month (`items.parked_until`); Pick for me and the weekly plan draw only from the goals (US-084) (verified live 31 Oct: 1 goal, 4 parked; `lesson_learned` + `plan_change` sent)
- [ ] H5d. Year, half-year and quarter plans as a period registry (`features/plan/periods.ts`); each feeds the one below; reviews (yearly integrity report); `plan_periods.kind` becomes a text registry id (US-099)
- [x] H5c. Tomorrow's top 3, ranked (Ivy Lee); Today shows only #1 (US-086). The shutdown screen itself is #28b (verified live 31 Oct: reverse ranking applied; `GET /api/plan/day` returns #1 as `first`)
- [x] H6. Fit-it-in flow for new ideas: add as step / swap a block / park / 5-minute note; related item found with Walrus `embed`; stop and continue (US-072) (31 Oct: verified live: related idea 0.44 → add as a step, unrelated 0.18 → park; `idea_merged`/`idea_parked` sent. Stop and continue verified live: starting again says "You'd done 1 of 9 steps; next up: …")
- [x] H6b. Reshuffle: missed blocks offered new slots, today rebuilt, never miss twice (2-minute version first after a missed day), busy-week reshuffle (US-079, US-073) (verified live 31 Oct: missed blocks offered new slots, never miss twice put yesterday's step first today, busy week kept 1 and moved 1; `plan_change` sent)
- [ ] H7. Voice mode: record → Workers AI transcription → split + sort ideas → fit-it-in (US-074)
- [ ] H8. Next-thing suggestions that carry knowledge forward (US-075)
- [ ] H9. "What your pet knows": list, delete, forget all (US-076)
- [x] H10. Tatum client (server-only): Sui RPC + Data API (30 Oct: `src/lib/server/tatum`, gRPC over fetch; mainnet + testnet + SUI/USD pass under `wrangler dev`)
- [ ] H11. Memory receipts read from Sui through Tatum (US-076)
- [ ] H12. Per-request Pro payment with `@suimpp/mpp`, confirmed via Tatum (US-077). Needs Phase 10 item 79 (Plus/Pro tiers) first
- [ ] H13. Credit packs in USDC/SUI with the Tatum exchange rate (US-078)
- [x] H14. Check whether Tatum Notifications cover Sui: they don't (30 Oct); payments are confirmed through Tatum's Sui gRPC endpoint instead
- [ ] H15. Verify: run the full demo loop on a fresh account; memories visible on the Walrus dashboard
- [ ] H16. README matches what's built; repo public
- [ ] H17. Blog post (what it does, Tatum + Walrus, how it learned over time)
- [ ] H18. 2–3 min demo video; X + LinkedIn posts; submit the form

## Phase 0 — Platform move

- [ ] 1. Switch to `@sveltejs/adapter-cloudflare`; add `wrangler.toml` with R2, KV, Queues, Hyperdrive, Workers AI bindings
- [ ] 2. Neon project + Hyperdrive config; confirm ORM (Drizzle) works through Hyperdrive (30 Oct: Neon project linked via `neon.ts`, Drizzle + `pg` read/write pass through local Hyperdrive emulation. Left: real Hyperdrive config, needs `wrangler login`)
- [x] 3. Database schema + migrations for the tables in the Data Model section (30 Oct: 25 tables in `src/lib/server/db/schema.ts`; `drizzle/0000_init.sql` applied to Neon `production`; typed insert/read through Hyperdrive verified. Foreign keys to Better Auth users come with #4)
- [ ] 4. Better Auth: Google + magic links, optional 2FA (US-001). Built near the end (hackathon Stage E); until then `src/lib/server/user.ts` returns one dev user
- [ ] 5. Extension signs in against the new API
- [ ] 6. R2 uploads replace Uploadcare; signed URLs for private images
- [x] 7. Remove publish, portfolio, Figma, Creative DNA, Upstash and Notion-as-database code, plus their routes, nav links and landing-page copy (30 Oct: 43 files removed; landing page is a v2 placeholder until the redesign; kept AI modules, metascraper, Notion client for export, privacy page, extension)
- [ ] 8. Check `node-vibrant` and `metascraper` on Workers; swap them or move them into a queue consumer (30 Oct: metascraper works; node-vibrant fails, replacement to decide)
- [ ] 9. Verify: sign in on web and extension, upload an image to R2, read/write Postgres from a Worker

## Phase 1 — Capture + AI foundation

- [ ] 10. Items API; extension capture writes to Postgres (US-006) (30 Oct: `POST/GET /api/items`, `GET /api/items/[id]` built for links + notes as the dev user; screenshots/uploads wait for R2; extension not ported yet)
- [ ] 11. AI Gateway set up with Workers AI primary and DeepInfra fallback
- [ ] 12. Test which models return reliable structured JSON; pick defaults per task (model ids in `src/lib/server/analysis/model.ts`; analysis reports which model answered)
- [x] 13. Analysis queue consumer: analysis + size + difficulty + learning-goal detection (US-010–012) (30 Oct: built — queue wrapper + internal route, metadata, Material palette, Workers AI vision → text → Groq, migration 0001; verified live under `npm run dev` with Gemini on 31 Oct; errors saved on the item; retry via `POST /api/items/[id]/analyze`; migrations 0002–0003; verified through the real queue under `npm run dev:worker` on 31 Oct: learning goal detected)
- [x] 14. Credit ledger, balances and daily free quota enforced on every AI call; refund on failure (US-062, US-063) (31 Oct: `features/credits`, wired into analysis; verified 31 Oct: an analysis took 2 from the free quota)
- [ ] 15. Turnstile + per-user and per-IP rate limits (US-070)
- [ ] 16. Verify: capture a URL, screenshot and note → analysis appears; quota decreases; a forced failure refunds

## Phase 2 — Choosing

- [ ] 17. Today screen as home (US-014)
- [ ] 18. Onboarding brain dump (US-002)
- [ ] 19. Triage screen + API (US-013) (31 Oct: `POST /api/triage` built and verified; screen waits for the UI redesign)
- [ ] 20. Pick for me + API (US-015) (31 Oct: `POST /api/focus/pick` + decide built, memory-informed with citations; verified: picked the jazz-piano learning goal, Start moved it to Focus, decision remembered on Walrus. Left: Start should also create the project page and roadmap (Phase 3))
- [ ] 21. Focus limit + pause (US-016) (31 Oct: enforced on Start, `POST /api/focus/pause`; limit verified (second Start → at_limit); pause not yet run)
- [ ] 22. Settings page rebuilt for v2 (US-005)
- [ ] 23. Verify: from 15 captures, triage to a Shortlist, get a suggestion, start it

## Phase 3 — Starting + Pomodoro

- [x] 24. Roadmap prompt with ≤30-minute steps; project vs skill style; each step gets a 2-minute version, search terms and tools (US-017, US-018, US-081, US-082) (31 Oct: roadmap queue + job, recall-informed prompt, Start creates the project and queues it, `GET/POST /api/items/[id]/roadmap`, migration 0004; verified live 31 Oct: 4 milestones / 8 steps with 2-minute versions, search terms and tools; `plan` memory saved)
- [x] 24b. Adaptive roadmap: re-plan what comes next when a topic or milestone is done (US-081) (31 Oct: `POST /api/steps/[id]/complete` queues a re-plan when a milestone finishes; verified live 31 Oct: finished milestone kept, the 3 untouched ones rewritten from memory; `plan_change` memory saved)
- [x] 24c. Learning rules in skill roadmaps: chunk shape, a recall check ending each learning step, interleaved practice, process framing (US-087) (verified live 31 Oct on "Learn Jazz Piano Chords": 4 chunks, a recall question on every step, an interleave step. "Stuck offers a break first" comes with #48 (pet chat handles "I'm stuck"))
- [x] 24d. Intents and practice kinds as registries (`features/intents`); `items.intent`, `practice_kind`, `goal`, `target_date` replace `is_learning_goal`; analysis guesses them (US-088) (verified live 31 Oct: 6 different notes all got the right intent and practice kind, the AWS exam date was read, and the garden roadmap followed the tend shape; migrations 0006 + 0007)
- [ ] 24e. Confirm card at Start and at month pick: intent, goal, date, each changeable; remembered (US-088) (31 Oct: verified live: Start on an unconfirmed item shows the card and waits; confirming plans the roadmap toward the confirmed goal; remembered. Not yet seen: a correction memory, and cards from a month pick)
- [x] 24f. Roadmap goal ("by the end you'll be able to…", 2–3 suggestions) and proving grounds after each learning milestone (US-090) (31 Oct: verified live: 3 goal options per roadmap, proving grounds per milestone for jazz (Autumn Leaves → Blue Bossa) and AWS (quiz → S3 lab → IAM lab → timed practice exam). Switching the goal verified live: Blue Bossa kept exactly as the goal and the plan rebuilt toward it)
- [ ] 24g. "I want to…" input, typed or spoken (US-089) (31 Oct: typed works as a note capture, verified live with 6 sentences in check-intents; spoken comes with voice, H7)
- [ ] 24h. Follow a course: syllabus from a PDF or photos → course units in order → course roadmap; class dates feed the weekly plan (US-091) (31 Oct: verified live: sample syllabus read into units with dates (practice: body), the showcase as target date, one milestone per unit with matching titles, a real song as the Week 4 proving ground. Not yet seen: the week proposal marking blocks before a class)
- [ ] 24i. Try-it-out tasters: 2–3 sessions, then keep / park / let go (US-092)
- [ ] 25. Project space + journal ported to Postgres (US-021, US-022)
- [ ] 26. Pomodoro timer, start from step, end-of-session note (US-026, US-027)
- [ ] 27. Focus sounds: Web Audio noise, R2 loops, mixer, fades, starter set (US-028)
- [ ] 28. Reflection prompts (US-023)
- [ ] 28b. Start ritual for blocks and the daily shutdown wrap-up with shutdown time in settings; ranks tomorrow's top 3 (H5c) (US-080)
- [ ] 29. Check iPhone PWA background audio behaviour
- [ ] 30. Verify: start a step, run a pomodoro with sounds, log a note, step completes

## Phase 4 — Pet v1

- [ ] 31. First species modelled in Spline: idle, walk, sleep, eat, sad
- [ ] 32. Check Spline export: live sliders and phone performance; build the pre-rendered fallback
- [ ] 33. Pet room on Today; walking on other screens; minimise/shoo (US-036)
- [ ] 34. Onboarding pet picker (one species for now) (US-003)
- [ ] 35. Feeding from pomodoros, steps, journal (free AI check), check-ins; daily cap (US-041)
- [ ] 36. Calculated hunger states (US-042)
- [ ] 37. Rest mode (US-043)
- [ ] 38. Level 1 guide bubbles + Level 2 click actions (US-038, US-039)
- [ ] 39. Pet sleeping sounds + chime (US-029)
- [ ] 40. Verify: feed through each source, watch hunger drop over simulated days, rest mode pauses it

## Phase 5 — Remembering

- [ ] 41. Card drafting from steps, journal and pomodoro notes; approve flow (US-031, US-032)
- [ ] 42. Spaced review with intervals, ratings and daily cap (US-033)
- [ ] 43. Explain-it-back checking (US-034)
- [ ] 44. Knowledge library (US-035)
- [ ] 44b. Flashcards from recall questions when a learning step is done; practice quizzes per milestone and before a target date; wrong answers → cards + `review_weakness` memories (US-098)
- [ ] 45. Verify: card created → due tomorrow → each rating sets the right next date

## Phase 6 — Pet, full version

- [ ] 46. All 4 launch species with breeds; shared attachment points
- [ ] 47. Personalities + tone slider (US-037)
- [ ] 48. Level 3 chat via Groq wrapped with Walrus `withMemWal`, replacing stuck/teach buttons (US-019, US-020, US-040)
- [ ] 49. Onboarding timeline with minimums; change rules (US-004)
- [ ] 50. Run away + 3-day return (US-044)
- [ ] 51. Death, skeleton, memorial shelf, signature item (US-045)
- [ ] 52. Revive with credits / earn an egg (US-046)
- [ ] 53. Growth stages + earned unlocks (US-047)
- [ ] 54. Body sliders (US-048)
- [ ] 55. Accessories, room decor, toys + break games (US-049, US-050)
- [ ] 56. Micro-interactions + liveliness setting (US-051)
- [ ] 56b. Choose a web search provider; help me choose comparisons with sources, "checked on" dates and one pick (US-083)
- [ ] 57. Verify: full pet lifecycle on a test account with a short timeline

## Phase 7 — Living interface + weather

- [ ] 58. Neglect overlays tied to pet state; cobweb/dust interactions (US-052)
- [ ] 59. Sweep-clean animation on return (US-053)
- [ ] 60. Choose weather provider; city-level KV cache (US-054)
- [ ] 61. IP city + manual city + weather-from-anywhere + off (US-054, US-057)
- [ ] 62. Weather visuals, day/night, seasons (US-055)
- [ ] 63. Pet weather reactions, weather unlocks, sound suggestions (US-056, US-030)
- [ ] 64. Verify: reduced motion respected; nothing blocks buttons; cache hit rate by city

## Phase 8 — PWA + notifications

- [ ] 65. Installable PWA + share target (US-068, US-007)
- [ ] 66. Offline cache + IndexedDB sync queue (US-069)
- [ ] 67. Extension badge + lightweight pet in popup (US-058)
- [ ] 68. Email (Resend) + web push in the pet's voice; quiet hours (US-059, US-060)
- [ ] 69. Weekly digest card + email: focused hours first, identity language (US-061)
- [ ] 70. Verify: go offline mid-pomodoro and journal, come back, everything syncs

## Phase 9 — Integrations

- [ ] 71. Confirm Are.na API endpoints, auth and limits
- [ ] 72. Are.na connect, channel modes, queued import (US-008)
- [ ] 73. Daily Are.na sync (US-009)
- [ ] 73b. Sources as plug-in adapters (`features/sources/registry.ts`, `source_connections`); Are.na moved onto it
- [ ] 73c. Suggested collections: saves grouped by meaning (Walrus `embed`), kept in one tap (US-093)
- [ ] 73d. Build from a collection: thread, ideas, make one, learn what's behind it, keep growing; `expansion` memories (US-094)
- [ ] 73e. Pinterest adapter on the library or MCP built for createthings (US-095)
- [ ] 74. Notion scheduled export (US-024)
- [ ] 75. Obsidian zip download (US-025)

## Phase 10 — Store + payments

- [ ] 76. Catalog and store UI (US-066)
- [ ] 77. Limited-edition pets (US-067)
- [ ] 78. Sound packs (US-030)
- [ ] 79. Plus / Pro model tiers (US-064)
- [ ] 80. Choose payment provider; checkout + webhook + credit packs (US-065)
- [ ] 81. Verify: buy a pack in test mode → credits arrive → buy an item → ledger is correct

## Phase 11 — Launch prep

- [ ] 82. Ask Cloudflare to raise Workers AI rate limits
- [ ] 83. Load test a signup spike; check queue backlogs and AI Gateway caps
- [ ] 84. Set real credit prices and free quota from measured AI costs
- [ ] 85. Privacy policy update (AI providers, weather location, payments)
- [ ] 86. Launch

---

## After launch

- [ ] Recurring plan shape: tend something over time (US-096) and build a habit (US-097)
- [ ] More intents, kinds and sources from the possible-later lists (Breakdown §3b), one registry entry each
- [ ] Bears (first species drop)
- [ ] Desktop app (Tauri or Electron)
- [ ] General notes
- [ ] Apple sign-in + iOS push
