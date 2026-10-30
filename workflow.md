# createthings — Workflow

> v2.0 · October 2026

## Where things stand

- **Concept:** rebuilt and agreed. See [Project Breakdown.md](Project%20Breakdown.md).
- **Stories:** 70 stories in [user-stories.md](user-stories.md); 8 partly exist in the old code.
- **Tasks:** 86 steps across 12 phases in [todolist.md](todolist.md).
- **Plan:** v2 uses Neon Postgres on Cloudflare; Notion is only an optional export.
- **Code:** not migrated yet. The repo still has the old v1 build (data in users' Notion, Vercel, publish + portfolio). **Next up: Phase 0, the platform move.**

## How the docs fit together

| Doc                    | Answers                                      | Update when                      |
| ---------------------- | -------------------------------------------- | -------------------------------- |
| Project Breakdown.md   | What we're building and how                  | A product or architecture decision changes |
| user-stories.md        | What each feature must do (acceptance criteria) | A feature's scope changes      |
| todolist.md            | What to build next, in order                 | A task is finished and verified  |
| workflow.md            | Where things stand                           | A phase starts or ends           |
| ui-todolist.md         | Zine design implementation                   | Still describes v1 screens; needs a v2 pass |

## Working rules

1. Build in phase order. Each phase ends with a **Verify** task; don't start the next phase until it passes.
2. Before a phase, check its items in **To Verify Before Building** (Project Breakdown.md).
3. A story's status changes to `[x]` only when all its acceptance criteria pass.
4. Decisions change the Breakdown first, then stories, then the todolist.
5. Commit docs with the code that changes them, so they can't get lost again.

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

Built in v1 and reusable after porting: the SvelteKit app and Zine design system, the extension's capture UI (all five types), screenshot area selection, AI prompts and analysis logic, roadmap generation, the project editor and journal, stale and digest logic, and the Notion client (reused for export).

Dropped from v1: publish queue and Buffer, portfolio and Upstash, Figma export, Creative DNA, Notion as the database.
