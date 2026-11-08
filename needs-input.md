# What I need from you

> Kept up to date while I work through the build queue in [todolist.md](todolist.md). Everything else is built without asking. Put keys and secrets in `.env` (never in this file); tick each item here when done.

## Keys and accounts (put the values in `.env`)

| # | What | Variable(s) | Used by | Where to get it |
|---|---|---|---|---|
| K1 | Google OAuth client (sign-in + Calendar) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar events and busy times (built), sign-in (Q16) | Google Cloud Console → enable the Google Calendar API → OAuth consent screen (add yourself as a test user; Calendar scopes need Google's review before the public can use them) → Credentials → OAuth client (Web). Redirect URI: `http://localhost:5173/api/sources/google_calendar/callback` (and the deployed address). Then open `/api/sources/google_calendar/connect` |
| K2 | Are.na OAuth app | `ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET` | Are.na connect (built) | dev.are.na → new application. Redirect: `http://localhost:5173/api/sources/arena/callback`. Then open `/api/sources/arena/connect`. The first run also confirms 3 API paths I took from the v3 docs (marked "confirm" in `features/arena/client.ts`) |
| K3 | Pinterest developer app (apply early, review takes time) | `PINTEREST_CLIENT_ID`, `PINTEREST_CLIENT_SECRET` | Pinterest connect (S9; the extension already copies saves and imports boards without it) | developers.pinterest.com → create app; scopes `boards:read`, `pins:read`; redirect `http://localhost:5173/api/sources/pinterest/callback` |
| K4 | Email sending | `RESEND_API_KEY`, `EMAIL_FROM` | Email reminders and the weekly digest | resend.com → API key; verify a sending domain |
| K5 | Web push keys | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Phone/desktop push (with the PWA) | I can generate these for you; say the word |
| K6 | App's Sui address that receives payments | `SUI_PAYMENT_ADDRESS` (and `SUI_NETWORK=testnet` to try with test funds) | Credit packs and Pro answers in USDC or SUI (built: `GET /api/payments`, `POST /api/payments/confirm`) | Your wallet's address. Until zkLogin or wallet connect exists, a payment is claimed by whoever submits its digest first; fine for the demo, fixed by D1 |
| K10 | Sign-in | `BETTER_AUTH_SECRET` (32+ random characters), `OWNER_EMAIL` (your email: your first sign-in keeps all data made before sign-in), then `REQUIRE_SIGN_IN=true` when you want every request signed in | Sign-in at `/signin` (Google with K1, or an email link with K4); the extension's "Sign in with createthings" | Generate the secret like K8. Add the deployed address to `externally_connectable` in `extension/manifest.json` (it allows localhost and *.workers.dev now) |
| K9 | The stronger model for Pro answers | `GEMINI_PRO_MODEL` (default `gemini-3.5-pro`) | Chat with `tier: 'pro'` | The Pro model name your Gemini key can use; if it fails, the normal chain answers |
| K7 | Enoki (only if zkLogin is chosen, D1) | `ENOKI_API_KEY` | zkLogin addresses + sponsored transactions | portal.enoki.mystenlabs.com |
| K8 | Key that encrypts connected-account tokens | `SOURCE_TOKEN_KEY` | Every connected account (Are.na, Google, Pinterest) | Run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` and paste the output; keep it secret and never change it once accounts are connected |

## Decisions (I picked a default so work isn't blocked; change any)

| # | Decision | Default I used | Where it matters |
|---|---|---|---|
| D1 | Payments: users' own wallets, or app-made zkLogin addresses (Enoki) | **Own wallet first** (works without Enoki); zkLogin added when K7 exists | H12–H13 |
| D2 | Calendar: Google first, ICS link for everyone else | **Both**: ICS (busy times + a feed of your blocks) works now; Google events need K1 and deploying | R4–R5 |
| D3 | Reminders a day by default | **3**, editable; an A/B experiment can try 2 vs 4 | R1 |
| D4 | Video style for the submission | — (yours) | H18 |
| D5 | The 5 launch themes | — (yours; send when ready) | UI |

## Things only you can do

| # | What | Why |
|---|---|---|
| Y1 | Run `npm run db:migrate` after I add a migration (listed per feature in todolist) | Applies new tables/columns to your Neon database |
| Y2 | Run each feature's check script (named in todolist) with `npm run dev` going | Live verification; I tick items only after |
| Y3 | Reload the extension after extension changes | Picks up the new build |
| Y4 | Open the Walruscan link from `GET /api/memories/receipts` and confirm it loads | H11 receipt check |
| Y5 | Make the GitHub repo public, push `main` | H16 |
| Y6 | Record and post the demo; submit the form | H18 |
| Y7 | Deploy to Cloudflare (`wrangler deploy`) once sign-in is in | The calendar feed link, Google Calendar for others, push and payments need a public URL; the daily cron (Are.na sync, Google sync, the weekly memory) only runs deployed (`POST /api/dev/cron` runs it locally) |
| Y8 | Migrations 0015 and 0016 | `npm run db:migrate` once: 0015 covers the build queue (reminders, calendar, journal, templates, experiments, collections, connections), 0016 adds sign-in's tables (user, session, account, verification) |
