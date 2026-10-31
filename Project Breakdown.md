# createthings

> Pick one thing. Start small. Keep going when plans change. Always know the next step.

createthings is for people with too many ideas and too many things they want to try, make or learn. To-do lists are passive: you write one, nothing pushes you to do it, and the first time something takes over that time the plan falls apart. createthings is an active partner instead. It helps you choose **one** thing, breaks it into steps small enough to start today, always shows you the next step (even what to search for and which tool to use), **reshuffles your plan when life gets in the way**, fits in new ideas without derailing you, keeps what you learn, and gives you a 3D pet that remembers your plans and depends on you showing up.

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
16. [Hackathon: Tatum × Walrus "Total Recall"](#hackathon-tatum--walrus-total-recall)
17. [Build Order](#build-order)
18. [To Verify Before Building](#to-verify-before-building)
19. [After Launch](#after-launch)

---

## The Problem

Five things stop people, usually in this order:

1. **Too many options.** People save links, screenshots, notes and Are.na blocks faster than they act on them. The pile becomes guilt, not ideas.
2. **No idea where to go next.** Even after choosing, they don't know the next step, which tools to use, or even what to search for. When they finish studying one thing, they don't know what comes after it. This is where most attempts stall.
3. **Nothing pushes them.** A to-do list never tells you to do it. Most productivity apps are easy to forget for a month.
4. **Plans break.** Something comes up and takes the time. Reshuffling everything by hand feels like starting over, so they give up instead.
5. **Learning doesn't stick.** What they learn fades in weeks, so the next attempt starts from zero and hard skills never compound.

The goal is **momentum when plans change**: always a next step, a push to take it, and a plan that bends instead of breaking.

---

## Who It's For

Anyone who is scattered: designers, developers, writers, students, hobbyists, people learning a language or an instrument. Not limited to one profession. If you have a long list of "things I want to do" and keep doing none of them, it's for you.

The AI adapts to what was saved (a UI screenshot, an article, a video, a "learn Spanish" note), not to a profession picked at signup.

---

## Core Loop

```
CAPTURE → SORT → PICK ONE → PLAN → START SMALL → LEARN → REMEMBER
   ↑                          ↑                              │
   │                          └── RESHUFFLE when life ───────┤
   │                              happens or ideas arrive    │
   └──────────────── next thing, when this is done ──────────┘

        🐾 your pet pushes, remembers your plans, and eats when you do the work
```

| Step        | What happens                                                                  |
| ----------- | ----------------------------------------------------------------------------- |
| Capture     | Save anything from the extension or PWA, or import Are.na channels            |
| Sort        | Quick keep / let go triage turns the pile into a short Shortlist              |
| Pick one    | The app suggests one item to focus on, based on time, energy and memory       |
| Plan        | Steps go into time blocks: day, time, place, and what they follow ("after coffee") |
| Start small | Each step is 15–30 minutes with a 2-minute version; the next step is always clear, with what to search and which tool to use |
| Learn       | Pomodoro sessions in the project space, with a journal and AI help            |
| Remember    | What you learn becomes review cards; the pet remembers how you work           |
| Reshuffle   | Missed a block or got a new idea? The pet re-plans around it and never lets you miss twice |

The **pet** runs alongside the whole loop. It pushes you toward the next step, holds you to your plan, and eats when you work on your Focus item. Neglect makes it hungry, then it runs away, and eventually it dies.

---

## Principles

Every feature is judged by these:

1. **Fewer choices, not more.** Show one thing at a time wherever possible.
2. **Starting beats planning.** Any screen should lead to a first action within a minute.
3. **There is always a next step.** Never leave someone wondering what to do, what to search for, or which tool to pick.
4. **Plans bend, they don't break.** When life takes the time, reshuffle; never make the user start over.
5. **Never miss twice.** Missing once is life. After a miss, the next day's smallest step becomes the priority. (*Atomic Habits*)
6. **Make it obvious, easy and satisfying.** A set time and place, a 2-minute version of every step, and an immediate reward. (*Atomic Habits*)
7. **Protect focus.** Time blocks, start and shutdown rituals, and new ideas parked instead of followed. (*Deep Work*)
8. **Letting go counts as progress.** Archiving an idea you'll never do is a win.
9. **Limit what's in progress.** Only 1–3 items can be in Focus at once (default 1).
10. **Learning should compound.** Nothing you learn is lost; it comes back until it sticks.
11. **Identity over outcomes.** Celebrate who you're becoming ("you design every morning now"), not just finished items.
12. **No guilt, but real consequences.** The pet and the interface show neglect, and there's always a free way back.
13. **Showing up beats skipping.** Half a workout is better than no gym. Two minutes or two lines always counts.
14. **The interface shows how you've been doing.** You can tell at a glance whether you've been showing up, without reading a number.
15. **You can't buy your way out of showing up.** Everything paid is cosmetic or extra AI. Nothing paid replaces doing the work.

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

### 5. Pick One, Plan + Reshuffle

This is the heart of the product: a plan that pushes you, then bends when life gets in the way.

**Today and Focus**

- **Today is the home screen.** It shows the pet's room, today's planned block (or the current step), a Start Pomodoro button and any reviews due. Nothing else.
- **Pick for me** asks how much time you have (15 / 30 / 60+ min) and your energy (low / normal / high), then suggests one Shortlist item with its first step
  - **Start** · **Not today** (next suggestion) · **Let it go**
- **Focus limit:** default 1, up to 3. Adding a new Focus item means pausing or finishing one.
- **Pause** returns an item to the Shortlist with its progress kept

**Plan: time blocks** (*Deep Work* time blocking, *Atomic Habits* implementation intentions)

- Focus steps are placed into **blocks**: a day, a start time, and optionally a place ("Tue 8:00, desk")
- A block can follow a **habit anchor** instead of a clock time: "after morning coffee", "after lunch" (habit stacking)
- The pet nudges at the block's time or anchor, in its own voice

**Reshuffle: when life happens**

- **Missed a block:** the pet offers to move it, never silently. Today's plan is rebuilt around what's left.
- **Never miss twice:** after a missed day, the next day starts with the step's **2-minute version** as the top priority, and the pet says so
- **New idea or plan mid-week:** goes through fit-it-in (§13): add as a step, swap a block, park it, or a 5-minute note
- **Busy week:** "Only 2 blocks free this week? Here's what moves."

**Rituals** (*Deep Work*)

- **Start ritual:** starting a block runs the same steps every time: sounds, pet sleeps, distractions parked
- **Daily shutdown:** at the end of the day (time set by the user) the pet runs a 1-minute wrap-up: what got done, what moves, what's first tomorrow. Finishing it is a snack for the pet.

### 6. Start Small: Roadmaps as Navigation (exists, changed)

A roadmap works like navigation: it always answers "what now?", including when someone doesn't know what to search for or which tool to use.

- Generated from an item's analysis
- **Two styles:**
  - **Project roadmaps** for things to make or recreate
  - **Skill roadmaps** for learning goals: basics → practice → small project, with more knowledge cards along the way
- Every milestone is split into **steps of 15–30 minutes**. Only the current step is prominent.
- **Each step comes with:**
  - a **2-minute version**, the smallest possible start (*Atomic Habits* two-minute rule)
  - **what to search for**: actual search terms, because "I don't know what to Google" is a real blocker
  - **tools and resources** for that step; when there's a real choice of tools, **help me choose** (below)
- **Adaptive, not fixed:** when a topic or milestone is done, the roadmap re-plans what comes next from what you now know, what you keep forgetting and your goals
- **"I'm stuck"** gives a smaller step or a short explanation. **"Teach me this"** gives a short lesson tied to the item. Both are asked through the pet (see Pet assistant).
- Progress tracking per step and milestone

**Help me choose (compare and contrast)**

- When a step needs a choice ("pick a 3D tool", "choose a website builder"), or when you ask the pet, it compares **2–4 options** side by side:
  - what each gives you **for your goal**, not a generic feature list
  - **price**: free, one-off or subscription, and free or student tiers
  - learning curve, fit for this project, and what you'd give up
- **Prioritised by goal:** for **learning**, free, beginner-friendly and well-documented first; for **building**, whatever gets the result fastest and holds up in production
- **Always ends with one pick** and a short reason ("Go with Blender: free, and your goal is learning"); the pick becomes part of the plan and is remembered
- Prices and features come from a **live web search**, with a source and "checked on" date for each; nothing is quoted from model memory
- Uses the free quota, then credits (a web search costs more than a plain answer)

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
- **Weekly digest:** focused hours and sessions first (the lead measure, *Deep Work*), then steps done, blocks kept and reshuffled, cards reviewed, and how much the pet ate. Written as identity, not a scorecard ("12 sessions: you're someone who designs now"). Encouraging when the week was empty.

### 13. Assistant Memory (Walrus)

The pet is an accountability partner that **remembers**. It knows your goals, what you want to learn, your current plan and how you actually work, so it can help when life doesn't follow the plan.

**What it remembers**

| Memory                  | Example                                                                |
| ----------------------- | ---------------------------------------------------------------------- |
| Goals                   | "Launch my portfolio site", "get comfortable in Blender"               |
| Learning goals          | "Wants to learn Spanish; prefers short daily practice"                 |
| The plan                | "Website contact page: Tue–Thu this week"                              |
| How you work            | "Follows through on 30-min slots in the morning; drifts after 3 days off" |
| What tripped you up     | "Kerning confused you; the side-by-side example worked"                |
| What you learned        | Topics from completed steps and cards, and which ones you keep forgetting |
| Parked ideas            | "Note on CSS grid, parked while building the website"                  |
| Suggestions and answers | Picks you started, skipped or let go; expansions you accepted          |

**What it does with it**

1. **Fits new ideas into what you're already doing.** When something new comes up mid-plan (a note, a voice ramble, a new link), the pet recalls the plan and offers ways to fit it in **without killing the vibe**:
   - "This is about the website. Add it as a step there?"
   - "You set Tue–Thu for the contact page. Swap Thursday for this, or park it until Friday?"
   - "Write it down for 5 minutes now, then back to the contact page"
   - Stop and continue: pause the current item with progress kept, and the pet reminds you where you left off
2. **Builds and keeps a proper plan.** Focus steps can be placed on days. The pet tracks everything you said you'd do and adjusts the plan when you capture something new or skip a day.
3. **Suggests what's next and how it connects.** "After the website, try the motion course next month. Your layout skills carry over." Knowledge from finished items and cards feeds the next item's roadmap.
4. **Gets better visibly.** Pick for me, roadmaps, "I'm stuck" answers and nudges all use what it remembers, and the pet says so ("Last Tuesday kerning tripped you up…").

**Voice mode ("just yap")**

- Hold the mic in the PWA or extension and ramble ideas
- Transcribed, then split into separate ideas and sorted: new item, step for a current Focus item, journal note, or learning goal
- Each idea goes through the fit-it-in flow above; nothing is added without your OK

**Walrus's own AI** (part of the Walrus Memory SDK)

| Feature       | What it does                                                        | Used for                                             |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `withMemWal`  | Wraps any AI SDK model: recalls relevant memories into the prompt before each reply and saves new facts after | **Pet chat** (Groq model wrapped), so every answer uses what the pet knows |
| `analyze`     | The relayer extracts individual facts from text and stores each one | Turning our **summaries** (session notes, plan changes) into memories |
| `embed`       | Embedding vector only, nothing stored                               | **Fit-it-in**: matching a new idea to the right Focus item |

- Auto-save in `withMemWal` is limited to chat; journal text and transcripts never go through it
- Saves and `analyze` calls go through the memory queue and respect the relayer's rate limits

**Rules**

- **Postgres stays the source of truth** (items, steps, journal, cards, pet). Walrus holds only what the assistant has learned.
- **Summaries, not raw text.** The hosted Walrus relayer can read what it receives, so journal entries and transcripts stay in Postgres; Walrus gets short summaries ("struggled with kerning, prefers short steps"), and `analyze` only ever runs on those summaries.
- Saves go through a queue (Walrus rate limits) and never block the app
- **"What the pet knows about you"** in Settings: see every memory, delete one, or forget everything
- Memory is part of the assistant: guide/actions stay free; recalls inside chat count toward the chat quota

### 14. On-chain Proof + Payments (Tatum on Sui)

The chain stays invisible unless you go looking.

- **Memory receipts:** Settings shows your memory's Sui account, how many memories are stored and when they last changed, read through **Tatum's Sui RPC**, with an explorer link
- **Pay with USDC on Sui:** credit packs and per-request **Plus/Pro** AI calls can be paid with USDC on Sui using **MPP** (`@suimpp/mpp`; no x402 package settles on Sui mainnet). Tatum's Sui gRPC endpoint confirms each payment on-chain before credits are added. Card payments (Breakdown §Monetisation) still come later.
- **SUI price:** paying with SUI is converted to credits at the live rate from **Tatum's Data API**

---

## Monetisation

### Free for everyone

- Capture, triage, Focus, Today, roadmaps viewing, journal, reviewing cards, pomodoro, starter sounds, the pet (feeding, the journal check, levels 1–2), body sliders, weather
- A **daily free AI quota** on Basic models: 20 credits a day by default in production, 1,000 when running locally so testing on free AI isn't blocked (`FREE_DAILY_CREDITS` overrides both), resetting at 00:00 UTC (the user's own timezone later). Unused free credits don't carry over

### Credits

One currency for everything. **Credits never expire.**

**AI usage** (the main reason to buy)

- Each action has a base cost, multiplied by model tier: **Basic** 1× · **Plus** 3× · **Pro** 10×
- Example base costs (numbers to set once hosting costs are known): pet chat 1, analysis 2, "I'm stuck"/"teach me" 1, card drafting 1, explain-it-back 1, roadmap 5
- Checked and deducted server-side before each call, refunded on failure: the free quota is used first, then bought credits. Both are reserved atomically in Postgres (`ai_usage_daily`, `credit_balances`), and every bought-credit change is a row in the append-only `credit_ledger`
- Running out never blocks capture: the item is saved and its analysis records "out of credits"; the user can retry it later
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

### Flow 12: Plan with time blocks

```
Focus item started → its steps go into blocks
  → Each block: a day + a start time (or a habit anchor like "after coffee") + optional place
  → Today shows today's block first; the pet nudges at its time or anchor
  → Drag a block to move it
  → Missed a block → the pet offers to move it (never silently) and rebuilds today
  → Missed a whole day → never miss twice: tomorrow opens with the step's 2-minute version
  → Every plan change is remembered (plan, plan_change)
```

### Flow 13: Fit a new idea in

```
A note, link or voice idea arrives while a plan is running
  → Pet recalls the plan and the related Focus item
  → Offers: add it as a step · swap a planned day · park it until a set day · write it down for 5 minutes, then back
  → "You set Tue–Thu for the contact page. Park this until Friday?"
  → Nothing changes without your OK; the choice is remembered (idea_parked / idea_merged / plan_change)
  → Stop and continue: pausing keeps progress, and the pet says where you left off when you return
```

### Flow 14: Just yap (voice)

```
Hold the mic in the PWA or extension and ramble
  → Audio transcribed (audio + transcript stay in Postgres)
  → Split into separate ideas, each sorted: new item · step for a Focus item · journal note · learning goal
  → Each idea goes through Flow 13; you approve what's added
  → A short summary goes to memory (voice_ideas)
```

### Flow 15: Pay for a Pro answer with USDC on Sui

```
Ask the pet on the Plus/Pro tier without enough credits
  → Server answers with an MPP payment request
  → Wallet pays USDC on Sui
  → Tatum's Sui RPC confirms the payment on-chain
  → Ledger row recorded, then the answer is generated
  → A failed or unconfirmed payment never charges and never generates
```

### Flow 16: Help me choose

```
A step needs a tool choice, or the user asks the pet ("Figma or Penpot?")
  → Goal read from the item: learning or building
  → Live web search for 2–4 options (prices, free tiers, what each gives)
  → Side-by-side comparison for this goal, with sources and "checked on" dates
  → One pick with a short reason → added to the plan, remembered (tool_choice)
```

### Flow 17: Daily shutdown

```
Shutdown time (set by the user) → pet: "Wrap up today?"
  → What got done (from sessions and steps)
  → What moves (unfinished blocks offered new slots)
  → What's first tomorrow (one block, with its 2-minute version)
  → Snack for the pet; summary saved to memory (session_summary / plan_change)
```

---

## Tech Stack

| Layer              | Choice                                                           |
| ------------------ | ---------------------------------------------------------------- |
| App                | SvelteKit (Svelte 5), Tailwind CSS v4, PWA (service worker + IndexedDB) |
| Extension          | Manifest V3, Svelte popup (exists)                               |
| Hosting            | **Cloudflare Workers** (`adapter-cloudflare`), replacing Vercel  |
| Database           | **Neon Postgres** through **Cloudflare Hyperdrive**              |
| ORM / driver       | Drizzle over `node-postgres` (`pg`) through Hyperdrive, one short-lived client per request (Neon's recommendation for Cloudflare). Confirmed 30 Oct against Neon via local Hyperdrive emulation |
| Auth               | **Better Auth**: Google sign-in + email magic links (Resend); optional 2FA the user turns on (authenticator app + backup codes). Built near the end; until then everything runs as one dev user (`src/lib/server/user.ts`). Apple later |
| Files              | **Cloudflare R2** (captures, sounds, pet assets), replacing Uploadcare |
| Cache              | Cloudflare KV (weather per city, model config)                   |
| Background jobs    | Cloudflare **Queues** (analysis, imports, exports, notifications) + **Cron Triggers** |
| AI                 | **AI Gateway** → Workers AI, DeepInfra / Groq, premium via OpenRouter |
| Color palettes     | **Material Color Utilities** (Google's Material You quantizer). Pixels come from a canvas in the browser for screenshots/uploads, and from pure-JS decoders (`jpeg-js`, `fast-png`) on Workers for link images. WebP links fall back to the vision model |
| Abuse protection   | Turnstile + rate limiting                                        |
| Email              | Resend                                                           |
| Push               | Web Push (VAPID) from Workers                                    |
| Weather            | Provider to choose (Open-Meteo commercial plan likely), cached per city |
| Web search         | For help-me-choose comparisons: live prices and features with sources (provider to choose) |
| 3D pet             | Designed in **Spline**; real-time 3D on capable devices, lightweight pre-rendered fallback on low-power phones and the extension |
| Audio              | Web Audio (generated noise + mixing), loops in R2                |
| Assistant memory   | **Walrus Memory** (`@mysten-incubation/memwal` 0.1.12, hosted mainnet relayer; needs `@mysten/sui` + `@mysten/seal` installed) |
| Voice transcription| Workers AI speech-to-text (Whisper), to confirm                  |
| Sui reads          | **Tatum** Sui gRPC gateway through `TatumGrpcTransport` (see Hackathon section) + Data API |
| Crypto payments    | USDC on Sui via **MPP** (`@suimpp/mpp`)                          |
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

- **Local development runs fully local** (decided 31 Oct): the `local` Wrangler environment has the database and queue bindings but no Workers AI, so `npm run dev` and `npm run dev:worker` never open a remote session to Cloudflare. Locally, analysis uses **Gemini** (`gemini-3.5-flash-lite`, reads images; 2.5 Flash-Lite is retired for new keys) then Groq; Workers AI is used once deployed. Gemini's free tier may train on prompts, so it runs only in local development on your own test data; production uses it only when `GEMINI_PAID_TIER=true` (decided 31 Oct).
- **Privacy rule:** only providers or tiers that don't train on your data (no Gemini free tier, no `:free` models)
- Structured JSON output is tested per model before it's used for roadmaps and cards
- OpenCode Zen's free models can't be used: they only work inside OpenCode

### Code layout and module rules

```
src/lib/
├─ shared/            Browser-safe code and types (the PWA and extension may import these)
├─ components/        UI components
└─ server/
   ├─ platform/       env.ts (runtime secrets; fails with the key name), bindings.ts (typed Cloudflare
   │                  bindings), http.ts (zod validation, id params), user.ts (dev user until auth)
   ├─ db/             index.ts (withDb: one client per request via Hyperdrive) + schema/ (one file per domain)
   ├─ ai/             generateJson with the provider fallback chain; providers/ (Workers AI, Gemini, Groq)
   ├─ jobs/           queues.ts (queue names + bindings), registry.ts (queue → handler), enqueue()
   ├─ integrations/   External services: walrus/, tatum/, notion/, scraper/ (arena/ and web search later)
   └─ features/       One folder per product feature: service.ts (logic + DB), input.ts (zod), helpers.
                      Now: items/, analysis/. Later: plan/, pet/, memory/, payments/ and so on
src/routes/api/       Thin: validate input → call a feature service → return JSON
```

**Rules**

1. **Routes only translate HTTP.** No SQL or business logic in `+server.ts`; call a feature service.
2. **Features own their logic** and may use `db`, `ai`, `jobs`, `integrations` and `platform`. A feature may call another feature's service, never its tables directly.
3. **`ai`, `jobs`, `integrations` and `platform` never import features**, except `jobs/registry.ts`, which maps queues to feature handlers.
4. **Env and bindings only through `platform/`.** Nothing else imports `$env` or reads `platform.env` untyped.
5. **Every request body is validated with zod** (`features/*/input.ts` + `platform/http.ts`).
6. **A new queue** is one entry in `jobs/queues.ts` and one in `jobs/registry.ts`, plus its binding in `wrangler.jsonc` (top level and `env.local`).
7. **Schema changes** go in the matching `db/schema/<domain>.ts`, then `npm run db:generate`.

### Queues inside SvelteKit

SvelteKit's Cloudflare adapter only builds a `fetch()` worker. After `vite build`, `scripts/wrap-worker.mjs` swaps in `scripts/worker-entry.js`, which adds `queue()`: each message is handed in-process to `POST /api/internal/queue/[queue]` with a flag only the queue handler sets, so all job code lives in SvelteKit (`$lib`, `$env`). A failed job is retried with backoff, then dead-lettered (`createthings-analysis` → `createthings-analysis-dlq`, 3 retries). Under `npm run dev` there is no consumer, so jobs run inline in the dev server instead.

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

Postgres tables (main columns only). The Drizzle schema is `src/lib/server/db/schema.ts`; migrations are in `drizzle/`. `user_id` columns hold Better Auth user ids; their foreign keys are added with auth (Phase 0 #4).

| Table                | Columns                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `users`, `sessions`, `accounts` | Managed by Better Auth                                       |
| `user_settings`      | user_id, focus_limit, daily_review_cap, liveliness, tone, pomodoro (focus/break/long), sounds_on, quiet_hours, timezone (for quiet hours and local time), shutdown_time, weather_mode (auto/city/off), city, runaway_days, death_days, timeline_changed_at, rest_until |
| `items`              | id, user_id, title, source_url, author, platform, capture_type (screenshot/url/upload/note/voice), image_key, note, status (inbox/ready/shortlist/focus/paused/done/archived), size, difficulty, is_learning_goal, arena_block_id, title_from_user, analysis_error, saved_at, last_active_at |
| `analyses`           | id, item_id, summary, technique, colors (palette + notes), typography, layout, mood[], style, components, for_developers, for_creators, brief, skills[] (feeds the roadmap), attribution, model |
| `roadmaps`           | id, item_id, style (project/skill), skills, resources, progress         |
| `roadmap_steps`      | id, roadmap_id, milestone, position, title, minutes, two_minute (smallest start), search_terms[], tools[], done_at |
| `projects`           | id, user_id, item_id, title, status, content (editor JSON), started_at, completed_at |
| `journal_entries`    | id, user_id, project_id, body, source (manual/pomodoro/check-in/voice), created_at |
| `pomodoro_sessions`  | id, user_id, step_id, started_at, ended_at, completed, note             |
| `knowledge_cards`    | id, user_id, item_id, source_type (roadmap_step/journal/pomodoro/lesson/manual), source_id, type (qa/explain), prompt, answer, interval_days, next_review_at, last_rating, review_count |
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
| `plan_slots`         | id, user_id, step_id, day, start_time, anchor (e.g. "after coffee"), place, position, missed_at (a Focus step placed in a time block) |
| `comparisons`        | id, user_id, item_id, step_id, question, goal (learning/building), options (JSON: gives, price, fit, sources), pick, reason, checked_at |
| `memories`           | id, user_id, type, summary, source_type, source_id, status (queued/sent/failed), attempts, last_error, walrus_job_id, created_at, deleted_at (local copy + outbox for Walrus) |
| `voice_captures`     | id, user_id, audio_key (R2), transcript, ideas (JSON), created_at       |
| `sui_payments`       | id, user_id, tx_digest, amount, coin (usdc/sui), purpose (credits/request), confirmed_at |
| `notifications`      | id, user_id, kind, channel, sent_at                                     |

---

## API Routes

| Route                              | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `/api/auth/*`                      | Better Auth                                     |
| `/api/items`, `/api/items/[id]`    | Capture (queues analysis), list, read with analysis |
| `/api/items/[id]/analyze`         | Retry the analysis of an item still in the inbox |
| `/api/internal/queue/[queue]`      | Queue messages land here (internal only)        |
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
| `/api/credits/*`                   | Balance and today's free usage (`GET /api/credits`); history and checkout later |
| `/api/weather`                     | City weather (KV cached)                        |
| `/api/arena/*`                     | Connect, channels, import, sync                 |
| `/api/export/*`                    | Notion connect + run, Obsidian zip              |
| `/api/push/*`                      | Subscribe / unsubscribe                         |
| `/api/webhooks/payments`           | Add credits after confirmed payment             |
| `/api/plan`                        | Place steps in time blocks, move them, reshuffle, daily shutdown |
| `/api/choose`                      | Help me choose: compare options for a step (web search) |
| `/api/ideas/fit`                   | Suggest how a new idea fits the current plan    |
| `/api/voice`                       | Upload a voice ramble → transcript → ideas      |
| `/api/memory/*`                    | List, delete one, forget all; receipts from Sui |
| `/api/pay/sui/*`                   | MPP payment, confirmation via Tatum             |
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
DATABASE_URL=                 # Neon pooled URL (pulled by `neon deploy`)
DATABASE_URL_UNPOOLED=        # Neon direct URL: what Hyperdrive connects to (locally and in production)
NEON_BRANCH=                  # Neon branch the env vars came from

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
GEMINI_PAID_TIER=             # true only for a paid-tier key; otherwise Gemini runs in local development only

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

# Walrus Memory (server-side only)
MEMWAL_PRIVATE_KEY=           # delegate private key
MEMWAL_PUBLIC_KEY=            # public delegate key = MEMWAL_AGENT_ID on the hackathon form
MEMWAL_ACCOUNT_ID=            # 0x… memory account object on Sui
MEMWAL_SERVER_URL=            # https://relayer.memory.walrus.xyz (mainnet)

# Tatum
TATUM_API_KEY=

# Dev only: turns on /api/dev/checks under `wrangler dev` (always on in `vite dev`)
DEV_CHECKS=

# Sui payments
SUI_PAYMENTS_ADDRESS=         # where USDC/SUI payments are received
```

Workers AI, R2, KV, Queues and Hyperdrive are Cloudflare **bindings** in `wrangler.toml`, not keys.

---

## Hackathon: Tatum × Walrus "Total Recall"

[tatum.io/hackathon/total-recall](https://tatum.io/hackathon/total-recall) · submissions close **10 Nov 2026, 17:00 UTC** · judging 11–16 Nov · winners 17 Nov · one submission per person · existing projects allowed if they show new progress since 20 Oct

### Track

**Track 02: Smart Agents for Real Life.** The brief: "Agents that monitor inboxes, expenses, habits, or workflows. Portable memory means they pick up where they left off across tools and sessions." For "anyone who wished their assistant remembered last Tuesday." createthings fits: the pet is an agent that monitors habits and plans, and its memory follows you across the extension, the PWA and voice.

### Prizes we're going for

| Prize                       | Amount            | How we compete                                                        |
| --------------------------- | ----------------- | --------------------------------------------------------------------- |
| Track 02                    | $500 / $300 / $200 | The whole entry                                                      |
| Best Walrus Memory          | $500              | "Deepest learning loop. Memories that visibly change the product": the pet's picks, plan changes and answers change because of memory, and it says why. Uses Walrus's own AI too: `withMemWal` around pet chat, `analyze` on summaries, `embed` for fit-it-in |
| Best Use of Agent Payments  | $500              | Plus/Pro AI requests paid per call with USDC on Sui via MPP, confirmed through Tatum |
| Best Tatum AI Builder App   | $500              | Skipped: it's for apps built primarily with ai.tatum.io               |

Bonus points for X and LinkedIn posts.

### Judging

| Criterion                  | Weight | What it means for us                                           |
| -------------------------- | ------ | -------------------------------------------------------------- |
| Walrus + Tatum integration | 30%    | "Meaningful and creative use of Walrus Memory, as well as building with Tatum RPCs or Data APIs" |
| Technical quality          | 30%    | "Clean code and successful Tatum Sui RPC integration"           |
| Creativity                 | 20%    | The pet as an accountability partner that remembers            |
| Presentation               | 20%    | Demo, video, blog post                                          |

### Where Tatum is used

| Use                          | Tatum product           | Why it scores                                                     |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------- |
| Memory receipts              | Sui RPC                 | Reads the Walrus Memory account on Sui: ties Tatum and Walrus together; satisfies "successful Tatum Sui RPC integration" |
| Payment confirmation         | Sui RPC                 | Every MPP payment is checked on-chain (transaction + balance change) before credits are added; needed for the Agent Payments prize |
| SUI → credits rate           | Data API (exchange rate) | Live SUI/USD price for pay-with-SUI                               |
| Payment notifications        | Not used                | Tatum Notifications don't support Sui (checked 30 Oct); payments are confirmed by querying Tatum's Sui gRPC endpoint |

All Tatum calls go through one server module with the API key (`src/lib/server/tatum`); nothing on the client.

**How Tatum Sui access works (tested 30 Oct from the Workers runtime):**

- Tatum's Sui JSON-RPC endpoint is gone (HTTP 404 on mainnet and testnet). Only the gRPC gateway works: `sui-mainnet-grpc.gateway.tatum.io` / `sui-testnet-grpc.gateway.tatum.io`.
- The gateway speaks native gRPC, not gRPC-web, so the Sui SDK's default client can't use it. It does answer plain HTTP/1.1 requests with normal gRPC message frames, so `TatumGrpcTransport` sends unary gRPC over `fetch` and plugs into the official `SuiGrpcClient`. Workers can't read HTTP trailers, so a call counts as OK when a message arrives and no error status is sent.
- The same API key works on mainnet and testnet.
- Free plan limit: **3 requests per second** (paid: 200). Cache reads and keep payment checks to a few calls.
- Data API `GET /v4/data/rate/symbol?symbol=SUI&basePair=USD` supports SUI (source: CoinGecko).

### Memory types (10+ required on mainnet)

`goal` · `learning_goal` · `plan` · `plan_change` · `idea_parked` · `idea_merged` · `session_summary` · `stuck_topic` · `lesson_learned` · `review_weakness` · `pick_feedback` · `work_pattern` · `expansion` · `voice_ideas` · `tool_choice`

### Submission checklist

- [ ] Walrus Memory integrated and writing on **mainnet**
- [ ] Tatum RPC used for on-chain data
- [ ] At least 10 memories stored on mainnet
- [ ] Blog post: what it does, how it uses Tatum + Walrus, **how it learned over time** (link goes in the description)
- [ ] Working demo and public repo
- [ ] 2–3 minute demo video
- [ ] Form: Tatum account ID, SUI address, Sui account ID, `MEMWAL_AGENT_ID` (the public delegate key, `MEMWAL_PUBLIC_KEY` in `.env`), feedback
- [ ] X / LinkedIn posts

### What the demo needs

The memory loop has to run end to end: capture or voice → items → Pick for me → plan with days → steps + pomodoro → journal/session note → pet remembers → a new idea arrives mid-plan → the pet fits it in using memory → pay for a Pro answer with USDC on Sui → memory receipts on Sui.

From the build order that means: Phase 0 (without R2 if needed), Phase 1 capture + analysis, Phase 2 choosing, Phase 3 steps + pomodoro, Phase 4 pet (fallback render is enough), the pet chat from Phase 6, plus sections 13 and 14.

### Hackathon build order (agreed 30 Oct)

| Stage              | Work                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| A · Foundations    | Phase 0 #1 (Cloudflare adapter) · H1 Walrus SDK live test · H10 Tatum client · MPP payment test · Phase 0 #2–3, #7–9 |
| B · Core loop      | Phase 1 #10–14 · H2 memory outbox · Phase 2 #17–21 · Phase 3 #24–26 · H5 plan with days · Phase 4 #31–36, #38 · Phase 6 #48 pet chat |
| C · Memory at work | H3 memory types · H4 recall + citations · H6 fit-it-in + reshuffle + never miss twice · H7 voice · H8 next things · H9 + H11 memory page and receipts |
| D · Payments       | Phase 10 #79 Plus/Pro tiers · H12 Pro answer per request · H13 credit packs in USDC/SUI |
| E · Auth + submit  | Phase 0 #4–5 auth (Google, magic links, optional 2FA; extension sign-in) · H15 full loop on a fresh account · H16 README + public repo · H17 blog · H18 video, posts, form |

Not needed for the demo loop and left for later unless chosen: Phase 0 #5 (extension sign-in), #6 (R2); Phase 1 #15 (Turnstile); Phase 3 #27–29; Phase 4 #37, #39.

---

## Build Order

### What already exists and carries over

SvelteKit app, the extension's capture logic, AI prompts and analysis logic, roadmap generation, the project editor and journal, stale and digest logic. The Notion code is reused for the Notion export.

**The UI is being redesigned.** The v1 Zine look (and `ui-todolist.md`, which describes it) does not carry over. The new design direction is still to be decided.

### Phase 0: Platform move

1. Switch to `adapter-cloudflare`, set up `wrangler.toml` with bindings
2. Neon + Hyperdrive + ORM schema and migrations
3. Better Auth (Google + magic links, optional 2FA); extension signs in against the new API. Built near the end (decided 30 Oct); a single dev user stands in until then
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

14. Roadmaps as navigation: ≤30-minute steps with a 2-minute version, search terms and tools; project and skill styles; adaptive "what next"
15. Pomodoro with end-of-session note
16. Focus sounds: generated noise, R2 loops, mixer, starter set
17. Journal reflection prompts; plan time blocks with anchors; start ritual and daily shutdown

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
28. Level 3 assistant (chat via Groq), wrapped with Walrus `withMemWal`, replacing the stuck/teach buttons
29. Onboarding timeline, running away, death, memorial, revive, earn an egg
30. Shared attachment points, earned accessories, room decor, toys and break games
31. Micro-interactions + liveliness setting
31b. Help me choose: comparisons with live web search, sources and one pick

### Phase 7: Living interface + weather

32. Neglect overlays (dust, cobwebs, bones, empty bed, skeleton) and the sweep-clean animation
33. Weather provider, city-level cache, IP location + manual city + weather-from-anywhere
34. Weather visuals, day/night, seasons, pet weather reactions, sound suggestions

### Phase 8: PWA + notifications

35. Installable PWA, offline cache + IndexedDB sync queue
36. Extension badge (pet mood, reviews due)
37. Email + web push from the pet, quiet hours, weekly digest (focused hours first, identity language)

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
| New UI design direction (replaces the v1 Zine look)      | Before building v2 screens |
| ~~`node-vibrant` and `metascraper` run on Workers~~ Checked 30 Oct: `metascraper` works; `node-vibrant` fails at runtime (its image decoder breaks on Workers: "Class constructor Inflate cannot be invoked without new"). Replaced 30 Oct by Material Color Utilities + `jpeg-js` / `fast-png` (see Tech Stack) | Phase 0     |
| ~~ORM choice (Drizzle) with Hyperdrive~~ Done 30 Oct locally (`wrangler dev` and `vite dev`); still create the real Hyperdrive config with `wrangler hyperdrive create` using DATABASE_URL_UNPOOLED | Phase 0     |
| Which Workers AI models return reliable structured JSON  | Phase 1     |
| Spline export: live sliders, performance on phones, fallback renders | Phase 4 |
| iPhone PWA background audio when the screen locks        | Phase 3     |
| Weather provider and commercial plan price               | Phase 7     |
| Are.na API endpoints, auth and rate limits               | Phase 9     |
| Payment provider availability in your country            | Phase 10    |
| Web search provider for help-me-choose (price, quality, whether results can be shown with sources) | Phase 6 |
| Workers AI rate limit increase                           | Phase 11    |
| ~~Walrus Memory SDK runs on Workers~~ Done 30 Oct: health, a real mainnet save and a recall all work under `wrangler dev`. A save takes ~30 s to confirm, so saves must go through the queue | Hackathon |
| Workers AI speech-to-text quality for rambling voice notes (Whisper, Whisper v3 Turbo, Deepgram Nova-3 / Flux available; test with real recordings in H7) | Hackathon |
| ~~Which x402 / MPP package settles USDC on Sui mainnet~~ Done 30 Oct: `@suimpp/mpp` 0.9.0. `@t2000/x402` was removed from npm; `@t2000/mpp-sui` doesn't exist. Still check: browser-wallet payments, and Tatum's key header on its custom endpoint | Hackathon |
| ~~Tatum Notifications support Sui address events~~ Done 30 Oct: not supported | Hackathon |

---

## After Launch

- **Bears**, the first species drop, then more species and seasonal limited editions
- Desktop app (Tauri or Electron)
- General notes (any page, links between notes), moving toward a Notion/Obsidian alternative
- Two-way Notion/Obsidian sync
- Official licensing for popular characters, once big enough
- Apple sign-in and iOS push
- Bring-your-own-key, if users ask
