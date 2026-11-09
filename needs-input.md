# What I need from you

> Only what's needed. Keys go in `.env`, never in this file. Unused settings were moved to `.env.removed` (git-ignored) on 9 Nov; delete it once you're sure.

## Now: for the hackathon

1. **`.env`:**
   - Remove `SKIP_ANALYSIS=1` (it stops every save from being analysed)
   - Add `SOURCE_TOKEN_KEY=` the output of `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` (encrypts users' Sui accounts; never change it afterwards)
   - Run `node.exe scripts/sui-agent-key.mjs` and paste the `SUI_AGENT_KEY_TESTNET=` line it prints (the app's own account: pays users' gas and receives payments; the script also asks the faucet for test SUI)
   - Restart `npm run dev`
   - Payments run on testnet; for real money later: `SUI_NETWORK=mainnet` plus `node.exe scripts/sui-agent-key.mjs mainnet`
2. **`npm run db:migrate`** (applies 0015, 0016 and 0017; check with `node.exe scripts/check-migrations.mjs`)
3. **Run the checks the demo uses**, with `npm run dev` going:
   - `node.exe scripts/check-pet.mjs`
   - `node.exe scripts/check-journal.mjs` (1 credit)
   - `node.exe scripts/check-reminders.mjs`
   - `node.exe scripts/check-imports.mjs` (writes the 14th memory type)
   - `node.exe scripts/check-payments.mjs --fund`, then `--buy small` (no wallet: the app made your account and pays the gas)
   - `node.exe scripts/check-payments.mjs --mpp` (free: shows the MPP 402 price), then `--pro "what should I do first?"` (pays one Pro answer over MPP in test SUI; 1 AI call)
4. **Open the Walruscan link** from `GET /api/memories/receipts` and confirm it loads
5. **Push `main` and make the GitHub repo public**
6. **Record the video** ([demo-script.md](demo-script.md)), **publish the blog post** ([blog-post.md](blog-post.md)) and the X / LinkedIn posts
7. **Submission form:** Tatum account ID, the app's Sui address (printed by `sui-agent-key.mjs`), Sui account ID, `MEMWAL_PUBLIC_KEY`

Your call: the video style (terminal + extension, or something else).

## Later: only when you switch these on

| Feature | Add to `.env` |
|---|---|
| Are.na | `ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET` (dev.are.na; redirect `http://localhost:5173/api/sources/arena/callback`) |
| Google Calendar | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google Cloud; redirect `http://localhost:5173/api/sources/google_calendar/callback`) |
| Email reminders | `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` |
| Real money | `SUI_NETWORK=mainnet`, `SUI_AGENT_KEY_MAINNET` (from `sui-agent-key.mjs mainnet`, holding a little SUI for gas); users top up their account with USDC (an on-ramp comes later) |
| Sign-in | `BETTER_AUTH_SECRET` (same command as `SOURCE_TOKEN_KEY`), `OWNER_EMAIL`, plus Google or Resend; then `REQUIRE_SIGN_IN=true` |
| Going live | `wrangler deploy` (also runs the daily and hourly jobs) |
