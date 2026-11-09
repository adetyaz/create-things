# What I need from you

> Only what's needed. Keys go in `.env`, never in this file. Unused settings were moved to `.env.removed` (git-ignored) on 9 Nov; delete it once you're sure.

## Now: for the hackathon

1. **`.env`:**
   - Remove `SKIP_ANALYSIS=1` (it stops every save from being analysed)
   - Add `SUI_PAYMENT_ADDRESS=` your Sui wallet address (where payments arrive)
   - Optional: `SUI_NETWORK=testnet` to demo payments with free test funds
   - Restart `npm run dev`
2. **`npm run db:migrate`** (applies 0015 and 0016; check with `node.exe scripts/check-migrations.mjs`)
3. **Run the checks the demo uses**, with `npm run dev` going:
   - `node.exe scripts/check-pet.mjs`
   - `node.exe scripts/check-journal.mjs` (1 credit)
   - `node.exe scripts/check-reminders.mjs`
   - `node.exe scripts/check-imports.mjs` (writes the 14th memory type)
   - `node.exe scripts/check-payments.mjs`, then send the shown amount and run it again with `<digest> pro_answer`
4. **Open the Walruscan link** from `GET /api/memories/receipts` and confirm it loads
5. **Push `main` and make the GitHub repo public**
6. **Record the video** ([demo-script.md](demo-script.md)), **publish the blog post** ([blog-post.md](blog-post.md)) and the X / LinkedIn posts
7. **Submission form:** Tatum account ID, your SUI address, Sui account ID, `MEMWAL_PUBLIC_KEY`

Your call: the video style (terminal + extension, or something else).

## Later: only when you switch these on

| Feature | Add to `.env` |
|---|---|
| Are.na | `SOURCE_TOKEN_KEY` (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`), `ARENA_CLIENT_ID`, `ARENA_CLIENT_SECRET` (dev.are.na; redirect `http://localhost:5173/api/sources/arena/callback`) |
| Google Calendar | `SOURCE_TOKEN_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Google Cloud; redirect `http://localhost:5173/api/sources/google_calendar/callback`) |
| Email reminders | `RESEND_API_KEY`, `EMAIL_FROM`, `OWNER_EMAIL` |
| Sign-in | `BETTER_AUTH_SECRET` (same command as above), `OWNER_EMAIL`, plus Google or Resend; then `REQUIRE_SIGN_IN=true` |
| Going live | `wrangler deploy` (also runs the daily and hourly jobs) |
