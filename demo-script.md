# Demo script (2–3 minutes)

For the Tatum × Walrus submission video (H18). Works as a screen recording of the extension plus a terminal (the video style is still your call, needs-input D4). Each scene lists what to show, what to say, and the command or click. Run `node.exe scripts/check-migrations.mjs` first: everything should say "applied".

**Before recording:** `npm run dev` running; the extension connected; a Focus goal with a roadmap (e.g. "Learn jazz piano chords"); Mochi adopted; `SKIP_ANALYSIS` off.

| # | Time | Show | Say |
|---|---|---|---|
| 1 | 0:00–0:15 | The extension popup: Mochi's card ("last fed 2 days ago…"), today's #1, reviews | "I save everything and do nothing with it. createthings turns the pile into one next step, and a pet keeps me honest." |
| 2 | 0:15–0:35 | On X, bookmark a post; the toast: "From your X bookmarks: Do this · Keep as reference · Fit into a goal · Later" → **Fit into a goal** → the pet's offer → Yes | "Saving is where things usually die. Here the pet asks what it's for, and fits it into a goal I already have, matched by meaning with Walrus `embed`." |
| 3 | 0:35–1:05 | Terminal: `node.exe scripts/check-chat.mjs` (or the "I'm stuck" part): the reply and its **based on** notes | "Every answer starts with recall from Walrus Memory, and says what it used. It remembers I got stuck on drop-2 voicings last week." |
| 4 | 1:05–1:25 | Popup: today's #1 → **Done**; Mochi eats ("Mochi ate a meal"); the badge turns green | "Real work feeds the pet. Skipping it doesn't. Every mood says why." |
| 5 | 1:25–1:45 | Terminal: `node.exe scripts/check-memories.mjs` (the groups) then the receipts: `curl -s localhost:5173/api/memories/receipts` → Suiscan and Walruscan links (open one) | "What the pet knows, in plain words, deletable. And the receipt: the memory account on Sui, read through Tatum." |
| 6 | 1:45–2:10 | Miss a block (or `check-reshuffle.mjs`): "Missing once is fine. Let's not miss twice" with the 2-minute version | "Plans bend instead of breaking. After a missed day, the smallest version comes first." |
| 7 | 2:10–2:30 | `node.exe scripts/check-payments.mjs`: prices in USDC and SUI (Tatum rate); confirm a test payment (testnet) | "Paying is a gasless USDC transfer on Sui, checked through Tatum before credits arrive." |
| 8 | 2:30–2:45 | The popup again, Mochi happy | "Pick one thing. Start it. Keep what you learn. Don't let your pet starve." |

**Costs while recording:** chat 1–3 credits (scene 3); everything else free except a testnet payment. Walrus: a few `remember`/`recall` calls, well under the hourly limit.

**Posts (X / LinkedIn), draft:** "I built a pet that remembers what I'm trying to learn, on @WalrusProtocol Memory, with Sui reads and USDC payments through @tatum_io. It picks one next step, bends plans when life happens, and eats when I do the work. #TotalRecall ⟨video⟩ ⟨repo⟩"
