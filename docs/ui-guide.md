# UI guide

For building the app's screens. The server side is done: every screen below has its data ready.
This explains how the UI talks to it and which endpoints each screen uses. Shapes and parameters are
in [api.md](api.md); how the server works is in [architecture.md](architecture.md).

## Where the UI lives

| Surface           | Code                                                              | State today                                                                                                         |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Web app           | `src/routes/` (SvelteKit, Svelte 5 runes, Tailwind v4)            | Placeholder landing page, `/signin`, `/privacy`. The app screens are to be built                                    |
| Browser extension | `extension/src/` (MV3, Svelte 5)                                  | Popup (pet, today's #1 with Focus timer, reminders, reviews, settings), save toasts, import bars on X and Pinterest |
| Shared            | `src/lib/components/` (`Toast.svelte`), `src/lib/toast.svelte.ts` | `addToast(message, type)`                                                                                           |

Styles: [`src/routes/layout.css`](../src/routes/layout.css) holds the design system's tokens for
the 5 launch themes as CSS variables. Use the classes (`bg-paper`, `bg-card`, `text-ink`,
`text-ink-2`, `text-ink-3`, `text-seal`, `shadow-card`, `font-serif`, `font-ui`, `font-mono`);
a theme switch is one attribute: `<html data-theme="night">` (paper, night, snow, seaside,
botanical). The `zine-*` classes are the old look, left only on `/privacy`. The extension has its
own [`app.css`](../extension/src/popup/app.css) and should read the same token names.

The sky and the pet are web components in [`src/lib/ct/`](../src/lib/ct/), copied from the design
handoff. Import them in `onMount` (they need the browser), then use `<ct-weather>` and
`<ct-kawaii>` inside a positioned element carrying `data-ct` and `data-hour`, `data-species`,
`data-state`, `data-action`.

Built so far: the home page (`/`), onboarding (`/start`: what you're into → pet → what's on
your mind) and capture with your saved things (`/app`).

## Talking to the server

- **Same origin, JSON, through one helper.** `api<T>(path, method?, body?)` from
  [`$lib/api`](../src/lib/api.ts). It throws `ApiError` with the server's `message`, `status`,
  `code` and `cost`, and `needsSignIn` for a 401.
- **Who you are:** nothing to do while building. Without `REQUIRE_SIGN_IN=true` every request is
  the dev user, so screens work without signing in. Once sign-in is on, the Better Auth cookie
  rides along automatically (sign-in UI: `/signin`, Better Auth at `/api/auth/*`).
- **Errors:** a failed request returns `{ message }` with the status. Show `message` as is: it's
  written for people. Two to handle specially:
  - **400:** bad input; `message` names the field ("messages.0.text: Too small").
  - **`code: 'out_of_credits'`** (with `cost`): today's free AI is used up. Offer the credits screen
    or "free again tomorrow"; never show it as a crash.
- **Slow work comes back later.** Saving an item answers at once; its analysis arrives through a
  queue, so `GET /api/items/[id]` has `analysis: null` until it's done. Poll every few seconds, or
  show the item as "reading it…". Roadmaps work the same way.
- **What costs credits:** only AI. Each screen that calls AI should say its cost before the tap
  (prices in [`credits/pricing.ts`](../src/lib/server/features/credits/pricing.ts);
  `GET /api/credits` for the balance and today's free quota).

## Rules every screen follows

- **Everything visible:** every badge, count or state explains itself and leads to what it counts.
  A "6" opens the six things; a mood says why.
- **The pet is on almost every screen.** `GET /api/pet` gives its mood, the reason, and today's
  food. The server decides all of it; the UI only shows it. A response that feeds the pet returns
  `fed`; react to that (an eating moment).
- **Always a next step.** Today, the roadmap, finishing and reminders each return a concrete next
  thing; show it with one obvious action.
- **Universal states** for every list and screen: loading, empty (with what to do), error (the
  message and a retry), offline.
- **Plain words.** The API already returns user-facing text (reasons, summaries, digest lines). Use
  it rather than rebuilding sentences in the UI.

## Screens and their endpoints

| Screen                           | Read                                                                                                                      | Do                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Onboarding**                   | `GET /api/onboarding` (variant, templates, species with sample lines, defaults), `GET /api/pet/species`                   | `POST /api/onboarding/suggest` {sentence} → user types (free); `POST /api/onboarding` saves all of it and adopts the pet                                                      |
| **Today (home)**                 | `GET /api/plan/day` (blocks, #1, calendar clashes), `GET /api/focus`, `GET /api/pet`, `GET /api/reminders`                | `POST /api/steps/[id]/complete`; start a focus timer (Pomodoro below)                                                                                                         |
| **Capture**                      |                                                                                                                           | `POST /api/items` (link, note, screenshot); `POST /api/voice` (2 credits) → ideas to approve; `DELETE /api/items/[id]` to undo                                                |
| **Inbox and item detail**        | `GET /api/items`, `GET /api/items/[id]` (analysis), `GET /api/items/[id]/understanding`, `GET /api/items/[id]/references` | `PUT /api/items/[id]/understanding` (the "Is this what you meant?" card); `POST /api/items/[id]/analyze` to retry                                                             |
| **Triage (sort the pile)**       | `GET /api/items`                                                                                                          | `POST /api/triage` {itemId, decision: keep, let_go or later}                                                                                                                  |
| **Pick for me + Start**          |                                                                                                                           | `POST /api/focus/pick` {minutes, energy} → one item and why; `POST /api/focus/decide` {start, not_today or let_go}; `POST /api/focus/pause`                                   |
| **Roadmap**                      | `GET /api/items/[id]/roadmap`                                                                                             | `POST` to make one, `PATCH` to edit; `POST /api/items/[id]/tasters` (try it out); `PUT /api/items/[id]/rhythm`                                                                |
| **Planning** (month, week, day)  | `GET /api/plan/month`, `GET /api/plan/periods/[kind]`, `GET /api/plan/day`                                                | `POST/PATCH /api/plan/month`, `POST/PUT /api/plan/week`, `PATCH/DELETE /api/plan/slots/[id]`, `POST /api/plan/tomorrow`                                                       |
| **Fit a new idea in**            |                                                                                                                           | `POST /api/plan/fit` → options; `PUT /api/plan/fit` to accept                                                                                                                 |
| **Reshuffle**                    | `GET /api/plan/reshuffle`                                                                                                 | `POST /api/plan/reshuffle`                                                                                                                                                    |
| **Daily shutdown**               | `GET /api/plan/shutdown` (done today, what moves, tomorrow's top 3)                                                       | `POST /api/plan/shutdown`                                                                                                                                                     |
| **Pomodoro**                     | `GET /api/pomodoro` (resume an open session)                                                                              | `POST /api/pomodoro` {stepId?}; `POST /api/pomodoro/[id]/end` {note?} → `fed`                                                                                                 |
| **Journal**                      | `GET /api/journal`                                                                                                        | `POST /api/journal` {kind: entry or check_in, body, itemId?} → `fed`, `suggestFocus`, `offerCards`; `GET /api/journal/[id]/cards` drafts (1 credit), `POST` to keep them      |
| **Talk to the pet**              |                                                                                                                           | `POST /api/chat` {mode: chat, stuck or teach; messages; tier?}; a paid Pro answer: `POST /api/payments/pro-answer`                                                            |
| **Finish and what's next**       | `GET /api/items/[id]/next`                                                                                                | `POST /api/items/[id]/finish`                                                                                                                                                 |
| **Course (syllabus)**            |                                                                                                                           | `POST /api/courses`                                                                                                                                                           |
| **Knowledge review and quizzes** | `GET /api/reviews`, `GET /api/cards` (library)                                                                            | `POST /api/reviews/[id]` {rating}; `POST /api/items/[id]/quiz` (2 credits) and `/quiz/result`                                                                                 |
| **What your pet knows**          | `GET /api/memories` (grouped in plain words), `GET /api/memories/receipts` (Walrus and Sui proof links)                   | `DELETE /api/memories/[id]`; `POST /api/memories/forget` {confirm: true}                                                                                                      |
| **Weekly digest**                | `GET /api/digest`                                                                                                         |                                                                                                                                                                               |
| **Credits and payments**         | `GET /api/credits`, `GET /api/payments` (packs, prices, your account and receipts)                                        | `POST /api/payments/test-funds` (testnet), `POST /api/payments/buy` {pack}                                                                                                    |
| **Collections and imports**      | `GET /api/collections`, `GET /api/collections/[id]`                                                                       | `POST /api/collections`, `PUT /api/collections/[id]` (link to a goal), `POST /api/collections/[id]/analyse`                                                                   |
| **Settings: rhythm and pet**     | `GET /api/settings/rhythm`, `GET /api/templates`, `GET /api/experiments`                                                  | `PUT /api/settings/rhythm`, `PUT /api/reminders/settings`, `PUT /api/pet/rest`                                                                                                |
| **Settings: connections**        | `GET /api/sources` (accounts, calendar link, extension devices), `GET /api/calendar`                                      | `GET /api/sources/[source]/connect` (a link, not fetch), `DELETE /api/sources/[source]`, `PUT /api/calendar` {icsUrl}, `POST /api/calendar/feed`, `POST /api/extension/token` |
| **Are.na**                       | `GET /api/sources/arena/channels`                                                                                         | `POST /api/sources/arena/channels`, `/sync`, `/share`                                                                                                                         |

`/api/dev/*` routes are for testing (fake a pet state, add credits, run the cron); they're off in
production.

## When the API is missing something

Add the field or endpoint on the server rather than working around it in the UI: the logic lives
in `src/lib/server/features/`. After changing a route, run `node.exe scripts/api-docs.mjs` to
refresh [api.md](api.md).
