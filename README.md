# createthings

> Pick one thing. Start it. Keep what you learn. Don't let your pet starve.

createthings is an **active partner for scattered people**: people with a long list of things they want to make, learn or try, who keep doing none of them. It turns a pile of saved links and notes into **one clear next step**, plans small steps around real life, **bends the plan when life gets in the way**, and keeps what you learn so it compounds. A **pet** runs alongside it: an accountability agent that remembers your goals, your plans and how you actually work, on **Walrus Memory**, and uses that memory visibly in every suggestion it makes.

Built for the **Tatum × Walrus "Total Recall" hackathon, Track 02: Smart Agents for Real Life**.

---

## The problem

Five things stop people, usually in this order:

1. **Too many options**: saved ideas pile up into guilt.
2. **No idea where to go next**: no next step, no idea what to search for or which tool to use.
3. **Nothing pushes them**: a to-do list never tells you to do it.
4. **Plans break**: something comes up and reshuffling feels like starting over.
5. **Learning doesn't stick**: the next attempt starts from zero.

## What it does (built and tested)

The server side below is built and verified live. Each feature has a check script in [`scripts/`](scripts/). The screens come next (see [design-prd.md](design-prd.md)).

| Feature | What happens | Memory it uses or writes |
| --- | --- | --- |
| **Capture + analysis** | Save a link or note; AI works out what it is, how big it is, and **what you're trying to do** (learn, make, follow a course, try it out, grow or tend something, build a habit) | Writes `goal` / `learning_goal` |
| **Pick for me** | Give your time and energy, get **one** thing to start, with a first step and a 2-minute start | **Recalls** your goals and how you work; **cites** the memories it used |
| **Confirm card** | "Looks like you want to learn jazz piano. Goal: play Autumn Leaves. Right?" One tap to confirm or correct | Corrections are remembered |
| **Roadmaps as navigation** | Milestones of 15–30 minute steps, each with a 2-minute version, **what to search for** and **which tools**; a goal ("By the end you'll be able to…"); **proving grounds** (real songs, labs, practice exams) | **Recalls** what you know and what tripped you up, so it skips the first and supports the second; re-plans after each milestone (`plan`, `plan_change`) |
| **Follow a course** | Upload a syllabus (PDF or photos); the roadmap follows its units in order, with class dates in your weekly plan | — |
| **Try it out** | 2–3 taster sessions, then keep / park / let go | Remembers what you decided and why |
| **Plans in layers** | Year → half-year → quarter → month (two lists) → week (the pet fills your blocks as "I will … at 8:00 at my desk") → day (tomorrow's top 3) | `plan`, `plan_change`, yearly and monthly reviews |
| **Reshuffle** | Missed blocks get new slots (never silently); **never miss twice** puts yesterday's step first as its 2-minute version; busy week moves what doesn't fit | `plan_change` |
| **Fit it in** | A new idea mid-plan is matched to the goal it belongs to **by meaning** and offered: add as a step · swap a block · park it · 5-minute note | **Walrus `embed`**; `idea_merged` / `idea_parked` |
| **Pet chat** | Talk to the pet; **"I'm stuck"** suggests a break first, then a smaller step or a new angle; **"Teach me this"** gives a short lesson | **Recalls** before every reply and **cites** what it used; saves `stuck_topic` |
| **Voice ("just yap")** | Ramble out loud; get separate ideas, each with a suggested place | `voice_ideas` (the idea titles, never the transcript) |
| **Finish + what's next** | Finishing remembers the skills you built and suggests what to do next, with what carries over | `lesson_learned` |
| **Daily shutdown** | What got done, what moves, tomorrow's top 3 | `session_summary` |
| **Flashcards + quizzes** | Recall questions become flashcards; spaced review (1·3·7·14·30·60 days); practice quizzes with explanations | Wrong answers → `review_weakness` |
| **What your pet knows** | See every memory in plain-word groups; delete one or forget everything | Honest deletes (below) |
| **Credits** | A free daily quota, then credits; reserved atomically, refunded on failure | — |
| **The pet** | Adopt one (4 species, 8 breeds with personalities); it eats when you do real work (a step is a meal, finishing an item a feast, reviews and quizzes a snack), gets hungry, runs away, comes home after 3 days of work; every mood says *why* | — |
| **Browser extension** | Save from anywhere (popup, right-click, Alt+Shift+S, Save buttons on X, Pinterest, Are.na, YouTube, Instagram, Dribbble, Behance, Reddit, GitHub); every save shows what was saved with Undo; reviews and the pet in the popup | — |

### Built, waiting for the live check

Built on 8 Nov 2026 with type checks, 100 unit tests and builds passing; each has a check script, and moves up once run against the live app.

| Feature | What happens | Memory |
| --- | --- | --- |
| **Reminders** | Blocks near their time, never miss twice, check-ins on your rhythm, reviews, a hungry pet, shutdown, the weekly plan; 3 a day, quiet hours, never during a busy calendar slot; system notifications from the extension, email hourly | — |
| **Calendar** | Busy times from an ICS link or Google Calendar; plans flag clashes; your blocks as a private ICS feed or real Google events with alerts | — |
| **Journal and check-ins** | Write about anything; entries about Focus work feed the pet by depth (free rules, a tiny AI check only when unclear); flashcards from what you learned | `session_summary` in the daily digest (never the entry) |
| **Pomodoro** | Focus sessions on a step (a full one is a meal); the note goes into the journal | — |
| **Weekly digest** | Focused time first, steps, blocks kept and moved, what the pet ate, in identity language | — |
| **User types and templates** | 14 types (jewelry, music, cloud exam, garden…) set rhythm, prompts, reviews and the pet's leniency; onboarding API; hunger can follow your check-in rhythm | — |
| **A/B experiments** | Defaults tested, not guessed; stable placement; outcomes in our own database | — |
| **Collections, copies, imports** | X bookmarks and Pinterest saves copied as you go ("Do this · Keep as reference · Fit into a goal · Later"); X bookmarks and Pinterest boards imported; nothing duplicated; analysed only when used | One `expansion` per import; a weekly "what you're drawn to" |
| **Are.na** | Connect (OAuth + PKCE), bring channels in as to-dos, curated or references, daily sync, link to a goal, share back with your OK | `expansion` |
| **Payments** | Credit packs and Pro answers in USDC or SUI, confirmed on Sui through Tatum | — |
| **Sign-in** | Google or an email link; the extension signs in without copying a token | — |

## How Walrus Memory is used

The pet is an agent whose memory **visibly changes the product**: picks, roadmaps, re-plans, chat answers and next-thing suggestions all recall memories first, and replies say which memories they used.

- **SDK:** `@mysten-incubation/memwal` on **Walrus mainnet** (86+ memories stored during development, 13 of 14 memory types written).
- **Walrus's own AI:** `analyze` splits rich summaries (goals, reviews, lessons, session summaries) into searchable facts; `remember` stores one-fact memories; `recall` is used before every AI decision; `embed` matches new ideas to goals by meaning (fit-it-in, what's next).
- **Privacy:** only short summaries in our words go to Walrus, never journal text or voice transcripts. One namespace per user.
- **Delivery through a queue** (one message at a time, retries, dead-letter queue), so saving a memory never slows the app.
- **Cost rules** (the relayer allows 500 points an hour per account, shared by the whole app): small events go out as **one daily digest**; one-fact memories use `remember` with **dedupe** and **idempotency keys**; embeddings are **cached**; recall has a distance cutoff. Reasons and sources: [Project Breakdown §13](Project%20Breakdown.md).
- **Honest deletes:** Walrus storage is append-only and the SDK has no delete. Deleting a memory hides its facts from every recall (blob ids from one bulk status lookup); forgetting everything moves you to a fresh namespace. The app says plainly that the encrypted copy expires on its own.
- **Why we don't use `withMemWal` for chat:** it saves with `analyze` after every reply (which would use the whole app's allowance at ~50 messages an hour) and can't hide deleted memories. Our recall does the same recall → inject → cite while respecting both.

## How Tatum is used

- **Sui gRPC through Tatum:** Tatum's Sui JSON-RPC endpoint is gone, and its gRPC gateway speaks native gRPC, which the Sui SDK can't use from Workers. [`TatumGrpcTransport`](src/lib/server/integrations/tatum/transport.ts) sends unary gRPC over `fetch` and plugs into the official `SuiGrpcClient`, verified on mainnet and testnet from the Workers runtime.
- **Data API:** live SUI/USD rate (`/v4/data/rate/symbol`) for paying with SUI.
- **Memory receipts:** the Walrus Memory account object read from Sui through Tatum (its last change and Suiscan links) and the latest memory's blob with a Walruscan link (`GET /api/memories/receipts`).
- **Payments:** credit packs and one-off Pro answers paid in USDC (or SUI at Tatum's rate) to the app's address; the transaction is read through Tatum's Sui gRPC and checked (succeeded, recent, enough to the right address) before credits arrive; each transaction counts once (`/api/payments`). USDC transfers on Sui need no gas.

## Architecture

```
SvelteKit (Svelte 5) PWA ── Cloudflare Workers ──┬─ Neon Postgres (Hyperdrive, Drizzle)
Browser extension (MV3)                          ├─ Queues: analysis · roadmap · memory (+ dead-letter)
                                                 ├─ Cron: daily (Are.na, Google, weekly memory) · hourly (email)
                                                 ├─ AI: Workers AI → Gemini → Groq fallback chain
                                                 ├─ Walrus Memory (remember · analyze · recall · embed)
                                                 ├─ Tatum (Sui gRPC · Data API)
                                                 ├─ Better Auth (Google, email links) · Resend
                                                 └─ Are.na · Google Calendar (OAuth + PKCE)
```

- **Thin routes, feature modules:** `src/routes/api` validates with zod and calls `src/lib/server/features/*`. Shared layers (`ai`, `jobs`, `integrations`, `platform`) never import features.
- **Plug and play:** intents, kinds of practice, plan shapes and planning periods are **registries**: adding one is a single entry, no migration.
- **Cheap by design:** rule-based features need no AI (week filling, reshuffle, fit-it-in offers, the Pick for me fallback); every AI call has a per-task reply limit and a credit check with refund on failure.

## Run it locally

```sh
npm install
cp .env.example .env        # fill in DATABASE_URL(_UNPOOLED), GEMINI_API_KEY, MEMWAL_*, TATUM_API_KEY
npm run db:migrate
npm run dev                 # web app (Workers bindings emulated; AI runs on Gemini locally)
npm run dev:worker          # or: build and run in the local Workers runtime with real queues
```

Checks:

```sh
npm run check   # type check
npm run lint
npm test        # unit tests (server + client)
```

**Live checks** (with `npm run dev` running; each script prints its cost in credits, AI calls and Walrus points at the top):

| Script | Shows |
| --- | --- |
| `check-intents.mjs` | Six different goals understood correctly (learn, make, course, try, tend, habit) |
| `check-goals.mjs` | Roadmap goal options and proving grounds; switching the goal |
| `check-course.mjs` | A syllabus read into units; a roadmap that follows them |
| `check-plan.mjs` · `check-horizons.mjs` | Month, week and day plans; year, half-year and quarter |
| `check-reshuffle.mjs` · `check-resume.mjs` | Missed blocks, never miss twice, busy week, fit-it-in, stop and continue |
| `check-chat.mjs` | Pet chat, "I'm stuck", "teach me", citations, deleted memories staying hidden |
| `check-voice.mjs` | A spoken ramble split into ideas (speaks a sample with Windows' voice) |
| `check-next.mjs` · `check-shutdown.mjs` · `check-quiz.mjs` | What's next, the daily shutdown, flashcards and quizzes |
| `check-memories.mjs` · `check-digest.mjs` | What your pet knows, honest deletes, the daily digest and cost rules |
| `check-pet.mjs` · `check-saving.mjs` · `list-saves.mjs` | The pet's moods and feeding; undo and the reference switch; your latest saves |
| `check-reminders.mjs` · `check-calendar.mjs` | Reminders due now and why any are held; busy times, clashes, your feed |
| `check-journal.mjs` · `check-digest-week.mjs` | Check-ins and feeding by depth, flashcards from the journal; pomodoro and the weekly digest |
| `check-onboarding.mjs` | User types, rhythm in plain words, rest mode, experiments |
| `check-collections.mjs` · `check-imports.mjs` · `check-arena.mjs` | No duplicates, collections linked to goals, imports and their memory, Connections and Are.na |
| `check-payments.mjs` · `check-migrations.mjs` | Prices and confirming a payment on Sui; which migrations are applied |

## Docs

| Doc | What it covers |
| --- | --- |
| [Project Breakdown.md](Project%20Breakdown.md) | The full concept, principles, features, architecture, data model, API, cost rules and build order |
| [design-prd.md](design-prd.md) | The design brief: every process, its screens, states, copy and the data each screen gets |
| [user-stories.md](user-stories.md) | 121 user stories with acceptance criteria and their status |
| [pricing.md](pricing.md) | Free to use with credits only for AI, prices by country, the path to $1M |
| [needs-input.md](needs-input.md) | Keys, decisions and steps only the owner can do |
| [todolist.md](todolist.md) | The build checklist by phase, with what was verified and when |
| [pet-state-machine.md](pet-state-machine.md) | The pet's states, activities and reactions, for building the 3D model |
| [workflow.md](workflow.md) | How the docs fit together and how features are built |

## Status

- **Built and verified:** the first table in "What it does" (server side, plus the extension).
- **Built, waiting for the live check:** the second table; keys and steps it needs are in [needs-input.md](needs-input.md).
- **Next:** the screens from the design PRD (5 launch themes), the 3D pet, deploying.
