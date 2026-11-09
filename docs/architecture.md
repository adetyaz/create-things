# Architecture

How createthings is put together: what runs where, how a request travels, where data lives, and
the rules for adding to it. For every endpoint see [api.md](api.md); for building screens see
[ui-guide.md](ui-guide.md).

## The shape of it

```
 Browser app (SvelteKit pages)      Browser extension (MV3, Svelte 5)       Any MPP client
            │  session cookie                 │  Bearer device token          │ x-createthings-token
            └──────────────┬──────────────────┴───────────────────────────────┘
                           ▼
             Cloudflare Worker  (SvelteKit + adapter-cloudflare)
             src/hooks.server.ts  → who's asking → src/routes/api/**/+server.ts
                           │
            route: validate input (zod) → call one feature → return JSON
                           │
             src/lib/server/features/<feature>/service.ts   (all the logic)
                │            │             │              │               │
                ▼            ▼             ▼              ▼               ▼
         Neon Postgres   AI chain     Cloudflare      Walrus Memory   Tatum (Sui gRPC,
         (Drizzle, via   Workers AI → Queues          (relayer)       Data API) ─► Sui
          Hyperdrive)    Gemini →     analysis,                         payments,
                         Groq         memory,                           receipts
                                      roadmap
             Cron: daily 05:00 + hourly → scripts/worker-entry.js → /api/internal/cron
```

One Worker serves the pages, the API, the queue consumers and the cron jobs.
[`scripts/worker-entry.js`](../scripts/worker-entry.js) wraps SvelteKit's worker to add `queue()`
and `scheduled()`; both call internal routes, so every piece of logic runs through the same code.

## Layers and their rules

| Layer        | Where                             | Does                                                                                                                          | Never                                               |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Routes       | `src/routes/api/**/+server.ts`    | Parse and check input (`validate(schema, body)`), get the user (`currentUserId(event)`), call a feature, shape the response   | Hold logic or touch the database directly           |
| Features     | `src/lib/server/features/<name>/` | All product logic. `service.ts` is the entry; `input.ts` the zod schemas; `rules.ts` / `prompt.ts` pure helpers (unit-tested) | Import from routes                                  |
| Platform     | `src/lib/server/platform/`        | Env (`optionalEnv`, `requiredEnv`), bindings, the current user, input validation                                              | Know about features                                 |
| Data         | `src/lib/server/db/`              | Drizzle schema (one file per area), `withDb(platform, db => …)` per request                                                   | Share a connection between requests (Workers can't) |
| AI           | `src/lib/server/ai/`              | `generateJson` / `generate` with the fallback chain, `transcribe`                                                             | Spend credits itself (features reserve them)        |
| Integrations | `src/lib/server/integrations/`    | Walrus Memory client, Tatum client and gRPC transport, page metadata scraper                                                  | Product decisions                                   |
| Jobs         | `src/lib/server/jobs/`            | Queue names, enqueue, and the handler per queue                                                                               |                                                     |

Every route and feature file starts with a comment saying what it does; [api.md](api.md) is
generated from the route comments (`node.exe scripts/api-docs.mjs`).

## A request, start to finish

1. **[`hooks.server.ts`](../src/hooks.server.ts)** works out who's asking. In order: a device
   token in `Authorization: Bearer ct_…` (the extension) or `x-createthings-token` (MPP callers,
   whose `Authorization` carries the payment); otherwise the Better Auth session cookie (the app).
   `/api/auth/*` goes straight to Better Auth.
2. **The route** calls `currentUserId(event)`. Before sign-in is switched on
   (`REQUIRE_SIGN_IN` unset) everyone is the dev user, so the UI can be built without logging in.
3. **The feature** does the work inside `withDb`. Anything slow (analysis, roadmaps, writing to
   Walrus) is put on a queue and the route answers straight away with the item's status.
4. **Errors** come back as JSON `{ message }` with the HTTP status. Bad input is a 400 naming the
   field. Running out of credits returns `{ message, code: 'out_of_credits', cost }`.

## The main flows

### An item's life

Everything the user saves is an **item** (`items` table) with a status:

```
capture ──► inbox ──(analysis queue)──► ready ──triage──► shortlist ──pick──► focus ──finish──► done
  link, note,                                     │                           │
  screenshot,                                     └──► reference / archived   └──► paused
  voice, import
```

- **Capture** (`POST /api/items`, the extension, imports) stores the item and queues analysis.
  Imports from X, Pinterest and Are.na come in as `reference` without analysis (free).
- **Analysis** (`features/analysis`, queue `analysis`) reads the page or image and fills in title,
  intent, size, difficulty, colours and skills. It costs credits; in dev it's skipped while
  `SKIP_ANALYSIS=1`.
- **Focus** (`features/focus`) holds 1 to 3 items. Picking one makes its **roadmap**
  (`features/roadmap`, queue `roadmap`): milestones of small steps with one current step, re-planned
  when a milestone is finished.
- **Planning** (`features/plan`) places steps into the month, week and day (`plan_slots`), fits new
  ideas in, reshuffles when life happens, and runs the daily shutdown. Busy times come from the
  user's calendar (`features/calendar`).
- **Finish** (`POST /api/items/[id]/finish`) closes it and suggests what's next, so what was
  learned carries forward (`features/next`).

### The pet

[`features/pet`](../src/lib/server/features/pet/service.ts) holds the pet's state: mood (and why),
hunger, and what it ate. It eats real work: journal entries (snack or meal by depth), pomodoros
(a full session is a meal), steps done, knowledge reviews. Free: no AI, no Walrus. The UI shows it;
the server decides it.

### Memory (Walrus)

[`features/memory`](../src/lib/server/features/memory/service.ts): Postgres keeps every memory
(the source of truth); Walrus Memory gets **summaries only**, never raw journal text or
transcripts, through the `memory` queue (one at a time, retried). Small events go out as one daily
digest; one-fact memories use dedupe and idempotency keys; embeddings are cached; recall has a
distance cutoff. The pet's chat recalls the closest memories and cites them.
`GET /api/memories/receipts` shows the on-chain proof (Sui account object through Tatum, the
latest blob on Walruscan).

### AI and credits

- **Chain:** Workers AI → Gemini → Groq, falling through on failure. A Pro answer
  (`quality: 'pro'`) tries `GEMINI_PRO_MODEL` first.
- **Credits** ([`features/credits`](../src/lib/server/features/credits/service.ts)): a free daily
  quota first, then bought credits. Reserved atomically before the AI call and refunded if it
  fails; every change to bought credits is a row in the append-only `credit_ledger`. Prices per
  action are in [`credits/pricing.ts`](../src/lib/server/features/credits/pricing.ts). Everything
  that isn't AI is free.

### Payments (Sui, no wallet)

[`features/payments`](../src/lib/server/features/payments/):

- **Accounts:** each user gets an app-made Sui account. Its key is AES-GCM encrypted with
  `SOURCE_TOKEN_KEY` and never leaves the server.
- **Gas:** the app pays it. Each transaction is sponsored by the app's account
  (`SUI_AGENT_KEY_<NETWORK>`), which also receives payments.
- **Buying credits:** `POST /api/payments/buy`. The transaction is read back through Tatum before
  any credits arrive, and each one counts once (`sui_payments.tx_digest` is unique).
- **Pro answers over MPP:** `POST /api/mpp/pro-answer` speaks the Machine Payments Protocol
  (suimpp `sui/charge`): it answers 402 with a price, the client pays and retries with a signed
  proof, Tatum confirms, and the answer comes back with a `Payment-Receipt`. The app's own button
  (`/api/payments/pro-answer`) is such a client.
- **Network:** testnet by default; `SUI_NETWORK=mainnet` switches.

### Reminders, calendar, email

Reminders are worked out **when asked** (`GET /api/reminders`): the extension asks every few
minutes; the hourly cron sends the same ones by email. Rules: a daily limit, quiet hours, nothing
during a busy calendar slot, each reminder once. The calendar reads busy times from an ICS link or
Google Calendar, and publishes the user's blocks as a private ICS feed.

### Sources and imports

[`features/sources`](../src/lib/server/features/sources/registry.ts) is a registry of OAuth
accounts (Are.na, Google Calendar) with PKCE and tokens encrypted at rest. The extension reads X
bookmarks and Pinterest boards from the page; `features/imports` stores them into a
**collection** without duplicates and writes one `expansion` memory per import.

## Data model

Neon Postgres through Drizzle; one schema file per area in
[`src/lib/server/db/schema/`](../src/lib/server/db/schema/). Migrations are generated into
`drizzle/` (`npm run db:generate`) and applied with `npm run db:migrate`; never edit one that's
been applied.

| Area                     | Tables                                                                                                                        |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Items                    | `items`, `analyses`, `pending_images`                                                                                         |
| Plans and work           | `projects`, `roadmaps`, `roadmap_steps`, `plan_periods`, `plan_slots`, `course_units`, `journal_entries`, `pomodoro_sessions` |
| Pet                      | `pets`, `pet_feeds`, `catalog_items`, `user_items`                                                                            |
| Memory and knowledge     | `memories`, `voice_captures`, `knowledge_cards`                                                                               |
| Reminders and calendar   | `reminders`, `busy_times`, `notifications`, `push_subscriptions`                                                              |
| Collections and accounts | `collections`, `collection_items`, `source_connections`, `arena_connections`, `arena_channels`, `exports`                     |
| Credits and payments     | `credit_balances`, `credit_ledger`, `ai_usage_daily`, `sui_payments`, `sui_accounts`                                          |
| Users and settings       | `user`, `session`, `account`, `verification` (Better Auth), `user_settings`, `device_tokens`                                  |
| Experiments              | `experiment_assignments`, `product_events`                                                                                    |

## Background work

| What                                             | Trigger                                                       | Code                       |
| ------------------------------------------------ | ------------------------------------------------------------- | -------------------------- |
| Analysis of a saved item                         | queue `analysis` (batches of 5, 3 retries, dead-letter queue) | `features/analysis/run.ts` |
| Roadmap generation and re-planning               | queue `roadmap`                                               | `features/roadmap/job.ts`  |
| Sending memories to Walrus                       | queue `memory` (one at a time, 5 retries)                     | `features/memory/send.ts`  |
| Are.na and Google sync; Monday "drawn to" memory | cron daily 05:00 UTC                                          | `features/cron/service.ts` |
| Email reminders                                  | cron hourly                                                   | `features/cron/service.ts` |

Under `npm run dev` there are no real queues: each job runs in the background of the dev server,
one at a time per queue, and its outcome is logged in the terminal. `npm run dev:worker` runs the
real Worker locally.

## Extending it

The places where adding something is one entry:

| To add                                   | Edit                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------ |
| A user type and its templates            | [`features/templates/registry.ts`](../src/lib/server/features/templates/registry.ts)             |
| An intent (what someone is trying to do) | [`features/intents/registry.ts`](../src/lib/server/features/intents/registry.ts)                 |
| An A/B experiment                        | [`features/experiments/registry.ts`](../src/lib/server/features/experiments/registry.ts)         |
| A connected account (OAuth)              | [`features/sources/registry.ts`](../src/lib/server/features/sources/registry.ts) plus its client |
| A site the extension saves from          | [`extension/src/sites/registry.ts`](../extension/src/sites/registry.ts)                          |
| A queue                                  | `jobs/queues.ts`, its handler in `jobs/registry.ts`, and `wrangler.jsonc`                        |
| An AI action's price                     | [`features/credits/pricing.ts`](../src/lib/server/features/credits/pricing.ts)                   |

A new feature is a folder in `features/` with `service.ts` (and `input.ts` for its zod schemas),
routes under `src/routes/api/`, a comment at the top of each, and a check script in `scripts/`.

## Checking it

- `npm run check` type-checks; `npx vitest run` runs the unit tests (pure rules, prompts, parsers).
- Each feature has a live check in [`scripts/`](../scripts/) (`node.exe scripts/check-<feature>.mjs`
  against `npm run dev`); each script states what it costs in credits or Walrus writes.
- `node.exe scripts/check-migrations.mjs` lists the migrations the database has applied.

## Configuration

All settings are environment variables; [`.env.example`](../.env.example) lists each one with what
it's for. Cloudflare bindings (Hyperdrive, Workers AI, queues, crons) are in
[`wrangler.jsonc`](../wrangler.jsonc). Switches worth knowing:

| Variable               | Effect                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `REQUIRE_SIGN_IN=true` | Every request needs a session or token (production). Unset: everyone is the dev user |
| `SUI_NETWORK=mainnet`  | Payments with real money (needs `SUI_AGENT_KEY_MAINNET`)                             |
| `SKIP_ANALYSIS=1`      | Dev only: saves skip AI analysis (for testing capture without spending credits)      |
