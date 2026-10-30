# createthings — Workflow

> v2.0 · October 2026

## Where things stand

- **Concept:** rebuilt and agreed. See [Project Breakdown.md](Project%20Breakdown.md).
- **Stories:** 78 stories in [user-stories.md](user-stories.md) (US-071–078 are the hackathon ones); 8 partly exist in the old code.
- **Tasks:** 108 in [todolist.md](todolist.md): 18 hackathon tasks (H1–H18), 86 steps across Phases 0–11, and 4 after launch.
- **UI:** being redesigned. The v1 Zine look doesn't carry over; the new direction is still to be decided.
- **Plan:** v2 uses Neon Postgres on Cloudflare; Notion is only an optional export.
- **Hackathon:** entering Tatum × Walrus "Total Recall", Track 02 (Smart Agents for Real Life). Scope and checklist in the Breakdown; tasks H1–H18 in the todolist.
- **Code:** v1 app code removed; the extension is still v1 and needs porting. **Now: hackathon Stage A.** Done: Cloudflare adapter, H1 Walrus live test, H10 Tatum client, Neon Postgres wired and migrated (25 tables), v1 code removed. Waiting on `wrangler login` (real Hyperdrive config, other bindings), payment answers (MPP test) and the sign-in choice (auth). Order in the Breakdown's Hackathon section.

## How the docs fit together

| Doc                    | Answers                                      | Update when                      |
| ---------------------- | -------------------------------------------- | -------------------------------- |
| Project Breakdown.md   | What we're building and how                  | A product or architecture decision changes |
| user-stories.md        | What each feature must do (acceptance criteria) | A feature's scope changes      |
| todolist.md            | What to build next, in order                 | A task is finished and verified  |
| workflow.md            | Where things stand                           | A phase starts or ends           |
| ui-todolist.md         | The old v1 Zine look                         | Out of date: the UI is being redesigned; replace once the new direction is set |

## Working rules

1. Build in phase order. Each phase ends with a **Verify** task; don't start the next phase until it passes.
2. Before a phase, check its items in **To Verify Before Building** (Project Breakdown.md).
3. A story's status changes to `[x]` only when all its acceptance criteria pass.
4. Decisions change the Breakdown first, then stories, then the todolist.
5. Commit docs with the code that changes them, so they can't get lost again.

## Branches: one per feature

- `main` always builds and passes `npm run check`. Nothing half-done lands on it.
- Each feature gets its own branch from the latest `main`: `feature/<short-name>` (e.g. `feature/auth`, `feature/memory-outbox`, `feature/sui-payments`). A feature is one todolist item or a small group that ships together.
- The branch carries its own doc updates (rules 4 and 5).
- Before merging: `npm run build` and `npm run check` pass, and the feature's Verify step or live test passes.
- Merge into `main` once agreed, then delete the branch. Start the next feature from the updated `main`.

## Phases

| Phase | Name                     | Status      |
| ----- | ------------------------ | ----------- |
| 0     | Platform move            | Next        |
| 1     | Capture + AI foundation  | Not started |
| 2     | Choosing                 | Not started |
| 3     | Starting + Pomodoro      | Not started |
| 4     | Pet v1                   | Not started |
| 5     | Remembering              | Not started |
| 6     | Pet, full version        | Not started |
| 7     | Living interface + weather | Not started |
| 8     | PWA + notifications      | Not started |
| 9     | Integrations             | Not started |
| 10    | Store + payments         | Not started |
| 11    | Launch prep              | Not started |

## Carried over from v1

Built in v1 and reusable after porting: the SvelteKit app, the extension's capture logic (all five types), screenshot area selection, AI prompts and analysis logic, roadmap generation, the project editor and journal, stale and digest logic, and the Notion client (reused for export).

Dropped from v1: publish queue and Buffer, portfolio and Upstash, Figma export, Creative DNA, Notion as the database, and the Zine look.
