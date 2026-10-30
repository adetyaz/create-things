# createthings

> Pick one thing. Start it. Keep what you learn. Don't let your pet starve.

createthings is for people with too many ideas and too many things they want to try, who end up stuck deciding what to start and do nothing. It collects everything you save, helps you choose **one** thing, breaks it into steps small enough to start today, makes what you learn stick, and gives you a 3D pet that depends on you showing up.

It's meant to be a complete digital experience: the app has weather, a day and night cycle, sounds, and a pet that lives in it. The app itself shows whether you've been showing up.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Who It's For](#who-its-for)
3. [Core Loop](#core-loop)
4. [Principles](#principles)
5. [Surfaces](#surfaces)
6. [Features](#features)
7. [Monetisation](#monetisation)
8. [Out of Scope](#out-of-scope)
9. [User Flows](#user-flows)
10. [Tech Stack](#tech-stack)
11. [Architecture](#architecture)
12. [Data Model](#data-model)
13. [API Routes](#api-routes)
14. [Costs](#costs)
15. [Environment Variables](#environment-variables)
16. [Build Order](#build-order)
17. [To Verify Before Building](#to-verify-before-building)
18. [After Launch](#after-launch)

---

## The Problem

Three things go wrong, one after the other:

1. **Too many options.** People save links, screenshots, notes and Are.na blocks faster than they can act on them. The pile becomes a source of guilt, not ideas.
2. **No clear first step.** Even after choosing something, it feels too big or too hard to begin, so they go back to saving more things.
3. **Learning doesn't stick.** When they do try something new, what they learned fades within weeks. The next attempt starts from zero, and hard skills never compound.

On top of that, nothing pulls them back. Most productivity apps are easy to forget about for a month.

---

## Who It's For

Anyone who is scattered: designers, developers, writers, students, hobbyists, people learning a language or an instrument. Not limited to one profession. If you have a long list of "things I want to do" and keep doing none of them, it's for you.

The AI adapts to what was saved (a UI screenshot, an article, a video, a "learn Spanish" note), not to a profession picked at signup.

---

## Core Loop

```
CAPTURE → SORT → PICK ONE → START SMALL → LEARN → REMEMBER
   ↑                                                  │
   └──────────── next thing, when this is done ───────┘

            🐾 your pet eats when you do the work
```

| Step        | What happens                                                                  |
| ----------- | ----------------------------------------------------------------------------- |
| Capture     | Save anything from the extension or PWA, or import Are.na channels            |
| Sort        | Quick keep / let go triage turns the pile into a short Shortlist              |
| Pick one    | The app suggests one item to focus on, based on time and energy available     |
| Start small | A roadmap of 15–30 minute steps; the current step is shown alone              |
| Learn       | Pomodoro sessions in the project space, with a journal and AI help            |
| Remember    | What you learn becomes review cards, resurfaced on a spaced schedule          |

The **pet** runs alongside the whole loop. Work on your Focus item feeds it. Neglect makes it hungry, then it runs away, and eventually it dies.

---

## Principles

Every feature is judged by these:

1. **Fewer choices, not more.** Show one thing at a time wherever possible.
2. **Starting beats planning.** Any screen should lead to a first action within a minute.
3. **Letting go counts as progress.** Archiving an idea you'll never do is a win.
4. **Limit what's in progress.** Only 1–3 items can be in Focus at once (default 1).
5. **Learning should compound.** Nothing you learn is lost; it comes back until it sticks.
6. **No guilt, but real consequences.** The pet and the interface show neglect, and there's always a free way back.
7. **Showing up beats skipping.** Half a workout is better than no gym. Five minutes or two lines always counts.
8. **The interface shows how you've been doing.** You can tell at a glance whether you've been showing up, without reading a number.
9. **You can't buy your way out of showing up.** Everything paid is cosmetic or extra AI. Nothing paid replaces doing the work.

---

## Surfaces

| Surface               | Role                                                                    | When          |
| --------------------- | ----------------------------------------------------------------------- | ------------- |
| **PWA** (web app)     | The main app: Today, pet, focus, journal, reviews. Installable on phone and desktop, partly offline | Launch |
| **Browser extension** | Quick capture on laptops; badge shows pet mood and reviews due          | Launch (exists) |
| **Desktop app**       | The PWA wrapped with Tauri or Electron                                  | After launch  |

---

## Features

### 1. Capture

**Browser extension** (exists)

- Screenshot (full page or selected area), current page URL, pasted URL, image upload, note
- Optional quick note on every capture
- Badge shows the pet's mood and how many reviews are due; clicking it opens the app

**PWA capture**

- Share sheet target on phones (share a link or image to createthings)
- Quick-add note or link from the Today screen

### 2. Are.na Import

- Connect Are.na and choose channels. **Import only**: nothing is written back.
- Per channel, choose **"triage these"** (default) or **"already curated"** (goes straight to Shortlist)
- Block mapping: Image → upload, Link → url, Text → note, Media → url, Attachment → url
- Sync on demand and daily; already-imported block IDs are skipped

### 3. Analyze (exists, changed)

Runs automatically after every capture, through a queue.

- Images and URLs: colors, typography, layout, mood, components, technical patterns, content structure (hook, tone)
- Notes: concept, direction, a starting brief
- **Learning goals** (e.g. "learn Blender") are detected and marked so they get a skill-style roadmap
- Source attribution (author, URL, platform) from metadata
- **New:** size estimate (afternoon / weekend / week / month) and difficulty (easy / medium / hard), used by the picker

### 4. Sort: Triage

- One card at a time: **Keep** (→ Shortlist), **Let go** (→ Archived), **Later** (stays Ready)
- Prompt appears when more than ~10 items are unsorted ("Sort 12 new things, about 2 min")
- End screen frames letting go as progress ("Kept 3, let go of 8")

### 5. Pick One: Today Screen + Focus

- **Today is the home screen.** It shows the pet's room, one Focus item, its current step, a Start Pomodoro button and any reviews due. Nothing else.
- **Pick for me** asks how much time you have (15 / 30 / 60+ min) and your energy (low / normal / high), then suggests one Shortlist item with its first step
  - **Start** · **Not today** (next suggestion) · **Let it go**
- **Focus limit:** default 1, up to 3. Adding a new Focus item means pausing or finishing one.
- **Pause** returns an item to the Shortlist with its progress kept

### 6. Start Small: Roadmaps (exists, changed)

- Generated from an item's analysis
- **Two styles:**
  - **Project roadmaps** for things to make or recreate
  - **Skill roadmaps** for learning goals: basics → practice → small project, with more knowledge cards along the way
- Every milestone is split into **steps of 15–30 minutes**. Only the current step is prominent.
- **"I'm stuck"** gives a smaller step or a short explanation. **"Teach me this"** gives a short lesson tied to the item. Both are asked through the pet (see Pet assistant).
- Progress tracking per step and milestone

### 7. Learn: Project Space + Journal (exists)

- Project page per Focus item: editor with headings, images, embeds; linked inspirations alongside
- Journal: dated entries about what you tried, what worked, what you learned
- AI reflection prompts after a session ("What was harder than expected?")
- **v1 scope:** notes are focused on your Focus work. General notes (any page, linked to anything) come later.
- **Export:** automatic one-way export to Notion on a schedule; Obsidian export as a downloadable zip of Markdown files

### 8. Pomodoro + Focus Sounds

**Pomodoro**

- Start a session **from your current step**
- Defaults: 25 min focus / 5 min break / 15 min long break after 4 sessions, all adjustable
- **Focus:** the pet curls up and sleeps, and the interface goes calm
- **End of focus:** a one-line "what did you do?" note. It feeds the pet, can be saved as a journal entry, and can draft knowledge cards.
- **Break:** the pet wakes up and plays. Light interaction (pet it, throw a toy) is allowed, limited to the length of the break.
- **Feeding:** a completed session is a **meal**; stopping early after 10+ minutes is a **snack**

**Focus sounds** (optional, off by default, remembered once switched on)

| Group        | Examples                                                    | Source                         |
| ------------ | ----------------------------------------------------------- | ------------------------------ |
| Noise        | White, pink, brown                                          | Generated in the browser (Web Audio): free, offline, no loops |
| Nature/places| Rain, thunder, forest, ocean, fireplace, café, library, train | Recorded loops in R2, cached for offline |
| Music        | Lo-fi, ambient, classical (royalty-free with commercial rights, or commissioned) | Loops in R2 |
| Your pet     | Its sleeping breath, purring, snoring, matched to species (a dragon rumbles and crackles) | Loops in R2 |

- **Mix** several sounds with separate volumes
- Fade in on focus, fade out on break; optional break sound (birds, pet playing)
- Optional end chime in your pet's voice (bark, meow, roar)
- Free starter set (noise, rain, café, your pet). **Sound packs** cost credits or are earned at milestones.
- Weather suggests a mix ("It's raining in Lagos. Rain + fireplace?")

### 9. Remember: Knowledge Review

- **Knowledge cards** come from completed steps (AI drafts 1–3), journal entries and pomodoro notes (AI suggests, you approve), or are written by hand
- **Card types:** question/answer, and **explain it back** (you write the idea in your own words; AI points out gaps)
- **Spaced review:** 1, 3, 7, 14, 30, 60 days. **Got it** → next interval; **Shaky** → repeat; **Forgot** → back to 1 day
- Reviews due appear on Today, **capped at 5 per day** (adjustable)
- Each card links to its source item, step or journal entry
- **Knowledge library:** browse everything learned, by item or topic

### 10. The Pet

#### Species

- **Launch:** dog, cat, fluffy monster, dragon. Each has **breeds** (variants on the same model with different fur, shape and personality).
- **First post-launch drop:** bears. More species after that.
- **Limited editions:** seasonal drops bought with credits
- **Trend pets** are our own original designs. A popular dragon show inspires *our* dragon, never a copy of Smaug, Drogon, Caraxes, Simba or similar. Official licensing is only considered once we're big enough.

#### Look and feel

- **3D, fluffy and fuzzy, or badass.** Sliders go from fluffy to tough, plus fur length, size, colors, patterns, eyes, horns or armor.
- It walks around **every screen**, and has its **own room** on the Today screen
- Idles, plays in the background, sleeps, purrs, eats, gets sad
- Can be minimised or shooed

#### Personality

- Set by species and breed: a golden retriever is eager to help, a husky is dramatic, a cat is sarcastic, a dragon is proud and blunt
- A **tone slider** from gentle to savage softens or sharpens it
- Personality changes **how** the pet says things, never **what** it advises

#### Assistant (think of the old Office assistant, but useful)

| Level        | What it does                                                         | Cost           |
| ------------ | -------------------------------------------------------------------- | -------------- |
| 1. Guide     | Speech bubbles: next step, onboarding tips, reminders                | Free           |
| 2. Actions   | Click the pet to start a pomodoro, log a check-in, open reviews, pick your focus | Free |
| 3. Chat      | Talk to it as your AI assistant ("I'm stuck on kerning", "teach me this") | Free daily quota, then credits |

Rules: it moves away from your cursor, never sits on text you're typing, goes quiet during pomodoros, and can be shooed or minimised.

#### Feeding

Only work on your **Focus items** counts. Saving things never feeds it. Journaling about a Shortlist item prompts "Make this your focus?"

| Action                                                  | Food                  |
| ------------------------------------------------------- | --------------------- |
| Completed pomodoro / stopped after 10+ min              | Meal / snack          |
| Completed roadmap step                                  | Meal                  |
| Journal entry about Focus work                          | Snack or meal, by depth |
| Each knowledge card created ("cookies of knowledge")    | Snack                 |
| Finished review session                                 | Snack                 |
| "Just 5 minutes" one-line check-in                      | Snack                 |
| Finishing a Focus item                                  | Feast                 |

- AI checks journal entries and check-ins relate to the Focus item and decides the size. **This check is always free.**
- **Daily food cap**, so one marathon day can't cover a week
- Each pet eats its own food: cookies, bones, fish, meat, embers

#### Hunger, running away and death

Hunger is **calculated** from the time since the pet was last fed. There's no nightly job.

| Default (days without food) | State          | What you see                                                      |
| --------------------------- | -------------- | ----------------------------------------------------------------- |
| 0–2                         | Happy          | Lively, clean app                                                 |
| 3–6                         | Peckish        | Dust appears                                                      |
| 7–13                        | Hungry         | Cobwebs, food-scrap bones scattered                               |
| 14–29                       | Starving       | Heavy dust, empty bowl, pet weak. One feed brings it back up      |
| 30–59                       | **Ran away**   | Empty bed, pawprints. **3 days of activity** bring it home        |
| 60+                         | **Died**       | A skeleton is left behind and the pet becomes a **memorial**      |

- **Onboarding:** the user picks their timeline. Minimums: run away ≥ 10 days, death ≥ 21 days. Defaults: 30 and 60. Earlier stages scale to fit.
- **Changing it later:** more lenient any time; stricter at most once a month
- **Rest mode** pauses the clock for holidays and sick days
- **After death:**
  - **Revive** the same pet with credits, keeping its growth (cheaper for pets you bought)
  - Or **earn a new egg** with about 7 days of activity. The new pet is free and starts fresh.
  - The app always works without a pet
- **Memorial:** every dead pet gets one. It sits on the memorial shelf in the room with its signature item.

#### Growth

- The pet grows and changes as total food builds up, a visible record of what you've done and learned
- Milestones unlock earned accessories, sound packs and looks

#### Customization

| Layer          | Examples                                                              |
| -------------- | --------------------------------------------------------------------- |
| Body (sliders) | Fluffy ↔ tough, fur length, size, colors, patterns, eyes, horns/armor |
| Accessories    | Head (hats, horns), face (glasses, scars), neck (scarf, chain), back (cape, wings, backpack), held item (book, sword, coffee) |
| Room           | Bed, bowl, toys, wallpaper, floor, plants, memorial shelf             |
| Toys           | Ball, yarn, laser dot, bone: each adds a different break game         |
| Personality    | Name, tone slider, voice/sound pack                                   |

- **Body sliders are free.** Some accessories are **earned** at growth milestones. Premium, seasonal and limited items cost **credits**.
- **Purely cosmetic:** items change looks, animations and sounds only, never hunger, food or progress
- **Items belong to your account** and work on any pet, except one signature item that stays with a dead pet's memorial
- **Shared attachment points** (head, face, neck, back, hand) on every species, so one hat fits all. Occasional species-only premium items, such as dragon armor.

#### Micro-interactions

| Moment                          | Pet does                                                        |
| ------------------------------- | --------------------------------------------------------------- |
| Cursor nearby                   | Looks at it, ears perk                                          |
| Click / tap                     | Purrs, wags or growls (by species)                              |
| Drag                            | Wriggles, lands with a bounce                                   |
| Typing in the journal           | Walks over and "reads" beside the text, never covering it       |
| Pomodoro starts / break starts  | Yawns and curls up / stretches and plays                        |
| Step completed                  | Food flies from the step card into its mouth, happy hop         |
| Review "Got it"                 | Nods                                                            |
| New capture arrives             | Sniffs the new card                                             |
| Long idle                       | Gets bored, bats at a card corner, chases dust                  |
| Late night                      | Sleepy eyes, suggests stopping                                  |
| Coming back after a gap         | Runs to the screen; the dust-sweep animation plays              |

- **Liveliness setting:** calm / normal (default) / chaotic. It calms down automatically during pomodoros and while you're typing.

### 11. Living Interface + Weather

The app looks different depending on how you've been doing and what's happening outside.

**Neglect** (follows the hunger states above)

- Dust, then cobwebs, then food-scrap bones, then an empty bed and pawprints, then a skeleton
- Hovering a cobweb makes it sway, clicking tears it, and dust lifts where your cursor moves
- **Coming back is the reward:** your first feed after a gap sweeps everything clean with an animation
- Only on Today, the project space and the extension. Settings, help and account screens stay clean.
- Effects never block buttons or hide text; reduced-motion settings are respected

**Weather**

- Rain streaks, fog, snow building up on cards, sun rays, lightning flashes, wind moving cobwebs and accessories
- **Day and night** from local time (sunrise, golden hour, night; the room gets dark)
- **Seasons** by hemisphere, plus seasonal touches (snow on fur, a pumpkin bed)
- **Pet reacts:** raincoat, hides under the bed in thunder, sunbathes, shakes off wet fur, builds a snowman on breaks
- Suggests focus sound mixes; real weather moments unlock accessories (a scarf on your first real snow)
- Mixes with neglect: an abandoned app in the rain looks extra gloomy
- **Purely cosmetic.** Weather never affects hunger or progress.
- **Location:** city from the IP address (Cloudflare provides it, so there's no permission pop-up), or a city you type in. Only the city is stored, never coordinates.
- **Options:** "weather from anywhere" (focus to Tokyo rain while living in Lagos), or turn weather off

### 12. Notifications, Reminders + Digest

- **Channels:** extension badge, email, web push. All messages come from the pet, in its voice.
- Stale Shortlist/Focus items: "You saved this 3 weeks ago, still want it?" → Start / Let it go / Later
- Hunger: "Biscuit is getting hungry, 10 minutes on your type poster?"
- Pomodoro end, reviews due
- **Quiet hours** (default 22:00–08:00 local) and per-channel settings
- **Weekly digest:** what you started, finished and let go, steps done, cards reviewed, how much the pet ate. Encouraging when the week was empty.

---

## Monetisation

### Free for everyone

- Capture, triage, Focus, Today, roadmaps viewing, journal, reviewing cards, pomodoro, starter sounds, the pet (feeding, the journal check, levels 1–2), body sliders, weather
- A **daily free AI quota** on Basic models (resets every day)

### Credits

One currency for everything. **Credits never expire.**

**AI usage** (the main reason to buy)

- Each action has a base cost, multiplied by model tier: **Basic** 1× · **Plus** 3× · **Pro** 10×
- Example base costs (numbers to set once hosting costs are known): pet chat 1, analysis 2, "I'm stuck"/"teach me" 1, card drafting 1, explain-it-back 1, roadmap 5
- Checked and deducted server-side before each call, refunded on failure
- When credits run out, nothing already created is locked

**Pet and experience**

- Reviving a dead pet (cheaper for bought pets)
- Limited-edition and seasonal pets
- Premium accessories, room decor, fur colors and patterns
- Sound packs

**Purchase**

- One-off credit packs (e.g. $5 / $10 / $20, bigger packs get a bonus)
- Payment provider is decided last (Lemon Squeezy, Paddle, Polar or Stripe, depending on country and tax handling)

---

## Out of Scope

| Feature                         | Why                                                                 |
| ------------------------------- | ------------------------------------------------------------------- |
| Publish queue + social captions | Pulls focus toward output and audience instead of starting          |
| Public portfolio                | Same                                                                |
| Remix tags + credit lines       | Only existed for publishing (attribution is still saved)            |
| Creative DNA                    | Only shown on the portfolio                                         |
| Figma export                    | Figma's REST API can't create frames                                |
| Notion as the main database     | Replaced by our own Postgres; Notion becomes an export target       |
| Two-way Notion/Obsidian sync    | Risky; revisit once general notes exist                             |
| Music streaming integrations    | Accounts, no offline support, heavy integration                     |
| User-generated pets             | Copyright risk                                                      |
| Self-hosted GPUs                | Only pays off at large, steady volume                               |

---

## User Flows

### Flow 1: Onboarding

```
Open PWA or extension
  → Sign in (magic link or Google)
  → "What's on your mind?" → add 3–5 things you want to do (or import Are.na)
  → Pick a species + breed, name it, set fluffy↔tough
  → Choose the pet's timeline (defaults 30 / 60 days, minimums shown)
  → Lands on Today: pet in its room, "Let's pick one thing"
```

### Flow 2: Capture

```
Extension / share sheet / quick add
  → Item saved (Status: Inbox) → analysis job queued
  → Worker: metadata + colors + vision/text model via AI Gateway
  → Analysis saved, size + difficulty set, Status: Ready
  → Pet sniffs the new card next time you open the app
```

### Flow 3: Are.na import

```
Settings → Connect Are.na → pick channels → "triage" or "already curated" per channel
  → Blocks queued → items created (Inbox or Shortlist) → analysis as Flow 2
  → Daily sync adds new blocks, skips known block IDs
```

### Flow 4: Triage

```
"Sort 12 new things" on Today
  → One card at a time: Keep / Let go / Later
  → "Kept 3, let go of 8"
```

### Flow 5: Pick one and start

```
Today with no Focus item → Pick for me
  → time (15/30/60+) + energy (low/normal/high)
  → One suggestion + first step
  → Start → Status: Focus, roadmap generated if missing, project page created
  → Not today → next suggestion · Let it go → Archived
```

### Flow 6: Pomodoro on a step

```
Today → current step → Start pomodoro (sounds optional)
  → Pet sleeps, interface calm, focus mix fades in
  → Timer ends → "What did you do?" one-liner
  → Feed (meal) → optional journal entry → card drafts to approve
  → Break: pet wakes and plays; tap to pet, throw a toy
  → Step marked done when finished → next step shown
```

### Flow 7: Stuck

```
Click pet → "I'm stuck"
  → Pet replies in its personality with a smaller step or short explanation
  → Uses free quota, then credits (cost shown before sending)
```

### Flow 8: Daily review

```
Today: "3 reviews due"
  → Recall or explain → answer / AI feedback
  → Got it / Shaky / Forgot → next date set → snack for the pet
```

### Flow 9: Finish or pause

```
All steps done → Mark done → feast, summary of steps + cards → "Pick your next thing?"
Pause → back to Shortlist with progress kept
```

### Flow 10: Neglect and return

```
Days pass with no feeding → dust → cobwebs → scraps → (pet runs away) → (pet dies)
  → Pet messages by badge, email, push (quiet hours respected)
User returns
  → Starving: one feed → dust swept away, pet perks up
  → Ran away: empty bed; 3 days of activity → pet comes home
  → Died: memorial + skeleton; Revive (credits) or earn an egg (~7 days of activity)
```

### Flow 11: Exports

```
Settings → Connect Notion → scheduled one-way export of items, journals, knowledge
Settings → Download Obsidian vault → zip of Markdown files
```

---

## Tech Stack

| Layer              | Choice                                                           |
| ------------------ | ---------------------------------------------------------------- |
| App                | SvelteKit (Svelte 5), Tailwind CSS v4, PWA (service worker + IndexedDB) |
| Extension          | Manifest V3, Svelte popup (exists)                               |
| Hosting            | **Cloudflare Workers** (`adapter-cloudflare`), replacing Vercel  |
| Database           | **Neon Postgres** through **Cloudflare Hyperdrive**              |
| ORM                | Drizzle (works on Workers with Hyperdrive), to confirm           |
| Auth               | **Better Auth**: magic link + Google (Apple later)               |
| Files              | **Cloudflare R2** (captures, sounds, pet assets), replacing Uploadcare |
| Cache              | Cloudflare KV (weather per city, model config)                   |
| Background jobs    | Cloudflare **Queues** (analysis, imports, exports, notifications) + **Cron Triggers** |
| AI                 | **AI Gateway** → Workers AI, DeepInfra / Groq, premium via OpenRouter |
| Abuse protection   | Turnstile + rate limiting                                        |
| Email              | Resend                                                           |
| Push               | Web Push (VAPID) from Workers                                    |
| Weather            | Provider to choose (Open-Meteo commercial plan likely), cached per city |
| 3D pet             | Designed in **Spline**; real-time 3D on capable devices, lightweight pre-rendered fallback on low-power phones and the extension |
| Audio              | Web Audio (generated noise + mixing), loops in R2                |
| Payments           | To decide last                                                   |
| Desktop (later)    | Tauri or Electron                                                |

---

## Architecture

```
 Extension ─┐                         ┌─ R2 (images, sounds, pet assets)
 PWA ───────┼─→ Cloudflare Workers ───┼─ Neon Postgres (via Hyperdrive)
 Are.na ────┘   (SvelteKit app + API) ├─ KV (weather cache, config)
                      │               └─ Turnstile / rate limits
                      │
                      ├─→ Queues ─→ consumers: analysis · Are.na import ·
                      │                         Notion export · notifications
                      │
                      ├─→ Credits check ─→ AI Gateway ─┬─ Workers AI (Basic, vision)
                      │                                ├─ Groq (fast pet chat)
                      │                                ├─ DeepInfra (fallback)
                      │                                └─ OpenRouter (Plus / Pro tiers)
                      │
                      └─→ Cron: digest · stale + hunger notifications · Are.na sync
```

### AI routing

| Task                    | Primary                          | Fallback                         |
| ----------------------- | -------------------------------- | -------------------------------- |
| Image/URL analysis      | Workers AI vision model          | Gemini Flash-Lite (paid tier)    |
| Text (roadmaps, cards)  | Workers AI (e.g. Qwen3 30B)      | DeepInfra                        |
| Pet chat                | Groq (fastest replies)           | Workers AI                       |
| Plus / Pro tiers        | Premium models via OpenRouter    | —                                |

- **Privacy rule:** only providers or tiers that don't train on your data (no Gemini free tier, no `:free` models)
- Structured JSON output is tested per model before it's used for roadmaps and cards
- OpenCode Zen's free models can't be used: they only work inside OpenCode

### Rules that let it scale

1. **Hunger is calculated, not updated.** The pet's state comes from `last_fed_at` and the user's timeline whenever it's read. Cron jobs only send notifications, in batches.
2. **Every AI call:** credits/quota check → queue (for background work) → AI Gateway. Spending is capped per user.
3. **Weather is cached per city for about an hour.** Cost grows with the number of cities, not users.
4. **Spikes queue instead of crashing.** Analysis, imports and exports are all queue consumers.
5. **Static assets** (pet models, sounds) are served from R2 with no egress fees and cached by the PWA.

### Offline (PWA)

- Works offline: Today screen, pomodoro and timer, the pet (from its last known state), journal drafts, pomodoro notes, reviews already downloaded, generated noise and cached sounds
- Stored in IndexedDB with a sync queue that replays when you're back online
- Needs a connection: AI, captures' analysis, Are.na, exports, purchases

### Security

- Credits and purchases live in an **append-only ledger** in Postgres, only changed server-side
- Every query is scoped to the signed-in user
- Private images use signed R2 URLs
- Payment and Are.na webhooks verify signatures
- Turnstile on signup and on free-quota AI use; per-user and per-IP rate limits
- Secrets in Workers secrets; CSP headers on the app

---

## Data Model

Postgres tables (main columns only).

| Table                | Columns                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `users`, `sessions`, `accounts` | Managed by Better Auth                                       |
| `user_settings`      | user_id, focus_limit, daily_review_cap, liveliness, tone, pomodoro (focus/break/long), sounds_on, quiet_hours, weather_mode (auto/city/off), city, runaway_days, death_days, timeline_changed_at, rest_until |
| `items`              | id, user_id, title, source_url, author, platform, capture_type, image_key, note, status (inbox/ready/shortlist/focus/paused/done/archived), size, difficulty, is_learning_goal, arena_block_id, saved_at, last_active_at |
| `analyses`           | id, item_id, colors, typography, layout, mood[], style, components, for_developers, for_creators, brief, attribution, model |
| `roadmaps`           | id, item_id, style (project/skill), skills, resources, progress         |
| `roadmap_steps`      | id, roadmap_id, milestone, position, title, minutes, done_at            |
| `projects`           | id, item_id, title, status, content (editor JSON), started_at, completed_at |
| `journal_entries`    | id, project_id, body, source (manual/pomodoro/check-in), created_at     |
| `pomodoro_sessions`  | id, user_id, step_id, started_at, ended_at, completed, note             |
| `knowledge_cards`    | id, user_id, item_id, source_type, source_id, type (qa/explain), prompt, answer, interval_days, next_review_at, last_rating, review_count |
| `pets`               | id, user_id, species, breed, name, sliders (JSON), status (alive/ran_away/dead), growth, last_fed_at, food_today, food_today_date, returning_days, born_at, died_at, memorial_item_id, paid |
| `pet_feeds`          | id, pet_id, source_type, source_id, size (snack/meal/feast), created_at |
| `catalog_items`      | id, kind (accessory/decor/toy/sound_pack/pet/fur), slot, species_only, price_credits, earn_rule, season, available_from/to |
| `user_items`         | user_id, catalog_item_id, acquired_via (earned/bought), equipped_on_pet_id |
| `credit_ledger`      | id, user_id, delta, reason (purchase/spend/refund/grant), ref, created_at (append-only) |
| `credit_balances`    | user_id, balance (updated in the same transaction as the ledger)        |
| `ai_usage_daily`     | user_id, date, free_used                                                |
| `arena_connections`  | user_id, token (encrypted), last_sync_at                                |
| `arena_channels`     | id, user_id, slug, mode (triage/curated)                                |
| `exports`            | user_id, target (notion), token (encrypted), last_run_at                |
| `push_subscriptions` | id, user_id, endpoint, keys                                             |
| `notifications`      | id, user_id, kind, channel, sent_at                                     |

---

## API Routes

| Route                              | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `/api/auth/*`                      | Better Auth                                     |
| `/api/items`, `/api/items/[id]`    | Capture, list, update status                    |
| `/api/triage`                      | Keep / let go / later                           |
| `/api/focus/pick`                  | Suggest one Shortlist item                      |
| `/api/roadmap`                     | Generate project or skill roadmap               |
| `/api/steps/[id]`                  | Complete a step                                 |
| `/api/projects`, `/api/journal`    | Project content + journal                       |
| `/api/pomodoro`                    | Start / finish sessions                         |
| `/api/knowledge/*`                 | Draft, review, explain-it-back                  |
| `/api/pet/*`                       | State, feed, rename, sliders, equip, revive, rest mode |
| `/api/assistant`                   | Pet chat (stuck, teach me, questions)           |
| `/api/store/*`                     | Catalog, buy with credits                       |
| `/api/credits/*`                   | Balance, history, checkout                      |
| `/api/weather`                     | City weather (KV cached)                        |
| `/api/arena/*`                     | Connect, channels, import, sync                 |
| `/api/export/*`                    | Notion connect + run, Obsidian zip              |
| `/api/push/*`                      | Subscribe / unsubscribe                         |
| `/api/webhooks/payments`           | Add credits after confirmed payment             |
| Queue consumers                    | analysis, arena-import, notion-export, notify   |
| Crons                              | digest (weekly), notifications (hourly), arena sync (daily) |

---

## Costs

Estimates from October 2026 prices. AI cost assumes about 60 AI actions and 30 captures per user per month on cheap models, about **$0.03 per user per month**.

| Monthly            | Building | ~1k users | ~10k users | ~100k users     |
| ------------------ | -------- | --------- | ---------- | --------------- |
| Workers + Queues   | $0       | $5        | ~$8        | ~$25            |
| AI (all providers) | $0       | ~$30      | ~$300      | **~$3,000**     |
| Neon Postgres      | $0       | $0–20     | ~$80       | ~$350           |
| R2                 | $0       | $0        | ~$5        | ~$55            |
| Resend             | $0       | $0–20     | $20        | $160–350        |
| Weather            | $0       | plan TBD  | plan TBD   | plan TBD        |
| **Total**          | **$0**   | **~$35–75** | **~$410** | **~$3.6k–3.8k + weather** |

- AI is about 80% of the bill. Heavy pet chat could double it, which is why the free quota stays on Basic models.
- Not included: Spline plan, domain, payment fees (a percentage per sale), Apple Developer ($99/year, only for native iOS).

Key prices: Workers Paid $5/month base · Workers AI $0.011 per 1k neurons (10k free/day) · R2 $0.015/GB-month, no egress fees · Neon $0.106/CU-hour + $0.35/GB-month · Resend Pro $20 (50k emails).

---

## Environment Variables

```env
# App
PUBLIC_APP_URL=http://localhost:5173

# Database
DATABASE_URL=                 # Neon (local dev); Hyperdrive binding in production

# Auth
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI
AI_GATEWAY_ID=
GROQ_API_KEY=
DEEPINFRA_API_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=

# Email + push
RESEND_API_KEY=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# Integrations
ARENA_CLIENT_ID=
ARENA_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
WEATHER_API_KEY=

# Abuse
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# Payments (added last)
PAYMENTS_SECRET_KEY=
PAYMENTS_WEBHOOK_SECRET=
```

Workers AI, R2, KV, Queues and Hyperdrive are Cloudflare **bindings** in `wrangler.toml`, not keys.

---

## Build Order

### What already exists and carries over

SvelteKit app and Zine design system, the extension's capture UI, AI prompts and analysis logic, roadmap generation, the project editor and journal, stale and digest logic. The Notion code is reused for the Notion export.

### Phase 0: Platform move

1. Switch to `adapter-cloudflare`, set up `wrangler.toml` with bindings
2. Neon + Hyperdrive + ORM schema and migrations
3. Better Auth (magic link + Google); extension signs in against the new API
4. R2 for uploads, replacing Uploadcare
5. Remove publish, portfolio, Figma, Creative DNA, Upstash and the Notion-as-database code
6. Check `node-vibrant` and `metascraper` on Workers; swap or move them into queue consumers

### Phase 1: Capture + AI foundation

7. Items API; extension and PWA capture write to Postgres
8. Analysis queue consumer through AI Gateway, adding size, difficulty and learning-goal detection
9. Credit ledger + daily free quota enforced on every AI call (metering only, no purchases yet)
10. Turnstile + rate limits

### Phase 2: Choosing

11. Today screen as home
12. Triage
13. Pick for me + Focus limit + pause

### Phase 3: Starting + Pomodoro

14. Roadmaps with ≤30-minute steps, project and skill styles
15. Pomodoro with end-of-session note
16. Focus sounds: generated noise, R2 loops, mixer, starter set
17. Journal reflection prompts

### Phase 4: Pet v1

18. One species in Spline with idle, walk, sleep, eat, sad animations, plus the low-power fallback
19. Pet room on Today, walking on other screens
20. Feeding from steps, pomodoros, journal (with the free AI check), check-ins
21. Calculated hunger states + daily food cap + rest mode
22. Level 1–2 assistant (speech bubbles, click actions)

### Phase 5: Remembering

23. Card drafting from steps, journal and pomodoro notes
24. Spaced review with daily cap
25. Explain-it-back checking
26. Knowledge library

### Phase 6: Pet, full version

27. All 4 launch species with breeds, sliders and personalities with the tone slider
28. Level 3 assistant (chat via Groq) replacing the stuck/teach buttons
29. Onboarding timeline, running away, death, memorial, revive, earn an egg
30. Shared attachment points, earned accessories, room decor, toys and break games
31. Micro-interactions + liveliness setting

### Phase 7: Living interface + weather

32. Neglect overlays (dust, cobwebs, bones, empty bed, skeleton) and the sweep-clean animation
33. Weather provider, city-level cache, IP location + manual city + weather-from-anywhere
34. Weather visuals, day/night, seasons, pet weather reactions, sound suggestions

### Phase 8: PWA + notifications

35. Installable PWA, offline cache + IndexedDB sync queue
36. Extension badge (pet mood, reviews due)
37. Email + web push from the pet, quiet hours, weekly digest

### Phase 9: Integrations

38. Are.na connect, channel modes, import + daily sync
39. Notion scheduled export; Obsidian zip

### Phase 10: Store + payments (last)

40. Catalog: premium accessories, decor, sound packs, limited pets, revives
41. Model tiers (Plus / Pro) in the assistant and analysis
42. Payment provider checkout + webhook + credit packs

### Phase 11: Launch prep

43. Ask Cloudflare to raise Workers AI rate limits
44. Load test a signup spike; check queue backlogs and AI Gateway caps
45. Set real credit prices from measured AI costs

---

## To Verify Before Building

| Item                                                     | When        |
| -------------------------------------------------------- | ----------- |
| `node-vibrant` and `metascraper` run on Workers          | Phase 0     |
| ORM choice (Drizzle) with Hyperdrive                     | Phase 0     |
| Which Workers AI models return reliable structured JSON  | Phase 1     |
| Spline export: live sliders, performance on phones, fallback renders | Phase 4 |
| iPhone PWA background audio when the screen locks        | Phase 3     |
| Weather provider and commercial plan price               | Phase 7     |
| Are.na API endpoints, auth and rate limits               | Phase 9     |
| Payment provider availability in your country            | Phase 10    |
| Workers AI rate limit increase                           | Phase 11    |

---

## After Launch

- **Bears**, the first species drop, then more species and seasonal limited editions
- Desktop app (Tauri or Electron)
- General notes (any page, links between notes), moving toward a Notion/Obsidian alternative
- Two-way Notion/Obsidian sync
- Official licensing for popular characters, once big enough
- Apple sign-in and iOS push
- Bring-your-own-key, if users ask
