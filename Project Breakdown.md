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
| Plan        | Month → week → day: pick what matters this month, fill the week's blocks, rank tomorrow's top 3. Each block has a day, time, place, or what it follows ("after coffee") |
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
16. **Plan in layers, act on one thing.** A month of 1–3 goals, a week of blocks, a day of up to 3 ranked tasks, and Today shows only the first. (James Clear: two lists, implementation intentions, the Ivy Lee method)
17. **Learn the way brains learn.** Recall beats rereading, breaks are part of thinking, small chunks build into skill, and practice mixes old with new. (*Learning How to Learn*)

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

**Browser extension** (ported to v2 on 2 Nov 2026: connect, save page, screenshot, pick area, "I want to…", keep as reference, X button, badge)

*Ways to save* (every one asks the same question: do this, or keep as reference):

| Way | What it saves | Status |
| --- | --- | --- |
| Popup | The page, a screenshot, a picked area, or "I want to…" | Built |
| Right-click a link | That link (not the page you're on) | Next (E5) |
| Right-click an image | The image, analysed with the vision model | Next (E5) |
| Right-click selected text | The text as a note, with the page as its source | Next (E5) |
| Right-click the page | The page | Next (E5) |
| Shortcut **Alt+Shift+S** | The page, no popup; **Alt+Shift+A** picks an area | Next (E6) |
| Site savers | A small Save button on posts and pins on sites people save from (below) | X built; more next (E8) |

*After every save, a small toast on the page* (bottom corner, 6 seconds): **"Saved. Keep as reference instead · Undo"**. Undo removes the item (and hides any memory it made); the switch turns it into a reference. If the item fits a goal, the toast later says so ("Fits your riso goal. Add it?"), using fit-it-in. Free: no AI call beyond the analysis the save already pays for.

*Site savers* are a registry like the intents: each site is one small file (where its posts are, how to read the link, the text and the image). Adding a site is adding a file.

| Site | What it saves | Status |
| --- | --- | --- |
| X | Post link + text | Built |
| Pinterest | Pin image + its link + board name | Next |
| Are.na | Block (until the account is connected; then sync does it) | Next |
| YouTube | Video link + the time you're at ("watch from 4:12") | Next |
| Instagram | Post link + caption (images need the post open) | Next |
| Dribbble / Behance | Shot image + link + designer | Next |
| Reddit | Post link + title + text | Next |
| GitHub | Repo link + description (a "try" or "learn" item) | Next |
| Articles (any page) | Reader-mode text, so analysis reads the article, not the menus | Next |

*The flow:*

1. **First time:** install → the popup says "Connect to createthings" → the app's Settings → Connections shows a one-time token → paste it → connected (after sign-in exists: one "Sign in with createthings" button instead)
2. **Saving:** any way above → toast → the item appears in the inbox (or references) and is analysed
3. **Popup, once connected:** today's #1 at the top ("Next: 25 min on the zine layout"), then the save buttons; a link to open the app
4. **Badge:** how many reviews are due now; the pet's mood once the pet exists
5. **When things go wrong:**
   - *Offline or the app is down:* saves wait in the extension and send when it's back (the toast says "Saved on this device; sends when you're online")
   - *Out of credits:* the save still happens; analysis waits until the free quota returns (the toast says so)
   - *Token revoked or wrong:* the popup goes back to Connect; nothing is lost from the waiting list
   - *Pages it can't read* (browser pages, the store): Save page is greyed out; a screenshot still works

Privacy: the extension reads only what you click. Site savers add a button; nothing is collected in the background.

**PWA capture**

- Share sheet target on phones (share a link or image to createthings)
- Quick-add note or link from the Today screen

### 2. Are.na Import

**Are.na is a founding request, so it comes right after the hackathon wrap-up, before the UI** (decided 2 Nov 2026).

- **Connect** with Are.na's OAuth (v3 API, PKCE): `read` scope to import; `write` only if write-back is switched on. Tokens don't expire; stored encrypted in `source_connections`
- **Choose channels**, and for each one what its blocks are:
  - **Things to do** (default): blocks go to triage
  - **Already curated**: straight to the Shortlist
  - **References**: kept as a collection, never tasks (§2b)
- **Block mapping:** Image → its image, Link → url, Text → note, Embed / Attachment → url
- **Sync** on demand and daily (one Cloudflare Cron Trigger); known block ids are skipped; imports go through a queue so Are.na's rate limits hold (per minute: 30 without an account, 120 free, 300 Premium, 600 Supporter)
- **Link a channel to a goal:** new blocks in it become references for that goal; its roadmap reads the channel's thread ("your channel leans toward two-colour prints, so start with a two-colour test")
- **Write back** (opt-in, needs `write`): finishing an item can add a block to a "made with createthings" channel (what you made and its link), always with your OK first
- **What you're drawn to:** once a week, one `expansion` memory summarises what you saved and where ("saved 9 blocks to 'riso' this week: grainy two-colour prints"), so picks, chat and what's next can use it (one memory a week, never one per block)
- **The same pattern for every source:** Pinterest boards and X bookmarks work the same way (references, linking to a goal, what you're drawn to) as plug-in source adapters

### 2b. Collections: build from a group of things

**References** (decided 2 Nov 2026): most saved things aren't things to *do*. A typeface, a palette or a layout you love can be **kept as a reference**: it lives in a collection, never enters the to-do funnel, never goes stale and never counts as unfinished. Reference items have status `reference`.

- References feed the work: a roadmap step can point at them ("study these 3 before sketching"), and a project space shows the references linked to it
- A collection can be **linked to a goal** (an Are.na channel, a Pinterest board or an in-app collection), so new references flow into that goal

A collection is a group of things that mean something together: an Are.na channel, a Pinterest board, or a group in the app. A curriculum is an ordered collection.

**Never a chore.** Nobody has to organise anything:

- **The app groups for you.** Similar saves are grouped by meaning (Walrus `embed`), and the pet suggests a collection: *"You've saved 9 riso posters. Keep them together?"* One tap keeps it, one ignores it.
- **Collections from Are.na and Pinterest arrive ready-made.**
- Making or editing a collection by hand is possible but never required

**Build from this collection**

1. **Find the thread:** what connects it ("two-colour riso prints with bold type and grain"), using the colour palettes already extracted from each item
2. **Spark ideas:** 3–5 ideas that combine items, each showing which items it came from
3. **Make one:** an idea becomes an item (Make intent); its roadmap uses the collection's items as references
4. **Learn what's behind it:** the skills shared across the collection become a Learn goal
5. **Keep it growing:** when a sync brings in new items, the pet notices ("3 new pins fit your zine idea")

Accepted ideas are saved as `expansion` memories. Finding the thread and sparking ideas use the free quota, then credits.

### 2c. Connections: what plugs into createthings

Everything is one of three kinds, all in **Settings → Connections**:

**1. Accounts you connect** (sign in once; createthings pulls from them on its own)

| Account | How it connects | What comes in | What goes out | Status |
| --- | --- | --- | --- | --- |
| Are.na | OAuth (PKCE) | Channels → items, references, collections; daily sync | A "made with createthings" block, opt-in | Next (S2–S8) |
| Pinterest | Our own library or MCP | Boards → collections; daily sync | Nothing | Later (S9) |
| X bookmarks | Official X API, if pricing allows | Bookmarks and folders | Nothing | Check first (S10) |
| Calendar | ICS link (any calendar), Google Calendar later | Busy times, so plans go around them | Your blocks as a calendar feed | Next (C1–C2) |
| Sui wallet | zkLogin or your own wallet | Payments, receipts | USDC payments | Hackathon (H12–H13) |

**2. Places you save from** (no account; you send things in)

| Place | How |
| --- | --- |
| Browser extension | Popup, right-click, shortcut, site savers (§1) |
| Phone | Share sheet into the PWA (Phase 8) |
| In the app | Quick add, voice ramble, course import (PDF, photos, text) |

**3. Behind the scenes** (users never connect these; they power the app)

Walrus Memory (the pet's memory), Tatum (receipts and Sui calls), Workers AI and Gemini (AI), Neon (data), Cloudflare (hosting, queues, cron).

**The connections screen:** one row per account with its state (connected, last sync, what it brings in), a Connect / Disconnect button, and, for the extension, the device tokens (create, see where each was last used, revoke). Disconnecting stops new imports; what already came in stays.

**The calendar gap** (found 2 Nov 2026): plans today only know the blocks you give them; they can't see your real busy times, so a block can land on a meeting.

- **C1. Read busy times:** paste an ICS link (Google, Apple, Outlook all give one). The daily and weekly plans skip times that are busy; a class from a course is busy too. Read only, refreshed when the plan is read (at most hourly); only start, end and "busy" are kept, never titles
- **C2. Your blocks as a calendar:** a private ICS link of your planned blocks, so they show up in the calendar you already use. Moving a block in createthings moves it there
- **Later:** Google Calendar OAuth for two-way changes, if people ask

### 3. Analyze (exists, changed)

Runs automatically after every capture, through a queue.

- Images and URLs: colors, typography, layout, mood, components, technical patterns, content structure (hook, tone)
- Notes: concept, direction, a starting brief
- **Learning goals** (e.g. "learn Blender") are detected and marked so they get a skill-style roadmap
- Source attribution (author, URL, platform) from metadata
- **New:** size estimate (afternoon / weekend / week / month) and difficulty (easy / medium / hard), used by the picker
- **New:** a guess at the intent, the kind of practice and a goal (§3b), confirmed later, never asked at capture

### 3b. Understand: what you're trying to do

Every input answers two questions: **what are you trying to do?** and **how did it come in?** The app guesses both and you confirm in one tap. Capture stays instant.

**Intents** (what you're trying to do). Each one plans differently and works toward a different kind of goal:

| Intent | Examples | How the plan works | The goal you work towards | Plan shape | When |
|---|---|---|---|---|---|
| **Learn a skill** | Guitar, Spanish, jazz chords, knife skills | Practise, repeat, build up | Something real you can do: a song, a 5-minute conversation, a dish | Roadmap (skill) | Now |
| **Make something** | A website, a chair, a zine, an album | Steps toward a finished thing | The finished thing and where it goes (live site, gift, shop) | Roadmap (project) | Now |
| **Follow a course** | AWS cert, a uni class, a guitar course | The course's units in its order, with our support added | Pass or finish, plus one project that uses it | Roadmap (course) | Phase 3 |
| **Try it out** | Pottery, climbing, "see if I like coding" | 2–3 short taster sessions | A decision: keep it, park it or let it go | Tasters | Phase 3 |
| **Grow or tend something** | A garden, a small farm, sourdough, training a dog | Recurring care tied to seasons, weather and place; checking in | A state of things: a first harvest, a starter that rises | Recurring | Later |
| **Build a habit** | Running, reading, journaling | The same small thing on set days, no end date | Who you're becoming ("I'm a runner") with a floor (2 minutes counts) | Recurring | Later |

Any intent can have a **target date** ("by March", "exam on 12 Dec"); the plan then works backwards from it.

**Possible later intents** (each is one registry entry, see Code layout rule 8): research or understand a topic · prepare for an event (exam, interview, trip, talk) · fix or repair something · teach or share what you know · get fit or recover · change careers · collect and curate.

**Kinds of practice** (worked out by the AI, never asked). The same intent practises differently by subject:

| Kind | Examples | What practice looks like | Proving ground |
|---|---|---|---|
| **Body and hands** | Guitar, dance, woodworking | Slow then faster, repetition | Songs, routines, a small build |
| **Knowledge** | Cloud, history, law | Recall, explain it back, labs | Practice exams, a hands-on lab, a mini project |
| **Real world and living things** | Gardening, farming, cooking | Tasks set by season, weather and place; observing | A herb box, a harvest, a meal |
| **Creative** | Design, writing, music production | Study great work, then make your own | An original piece |
| **People and language** | Spanish, public speaking | Real conversations, recordings | Ordering food in Spanish, a 3-minute talk |

Possible later kinds: maths and logic, sport, care work. Each is a registry entry.

**The goal and proving grounds**

- **Every roadmap opens with a goal**: "By the end you'll be able to…". The AI suggests 2–3 concrete targets (a song, a finished site, a passed exam); you pick or write your own. The roadmap builds toward it, and re-plans keep it.
- **Proving grounds** (learning intents): after each milestone, 1–3 real things to do that use only what you've learned so far, getting harder each time: songs for jazz chords, a lab for cloud, a herb box for gardening. Each has search terms to find the chords, tabs or instructions. The app names songs and pieces; it never copies sheet music or lyrics.

**Ways things come in** (sources). Each is a plug-in (Code layout rule 8):

| Source | Shape | Status |
|---|---|---|
| Quick capture: link, screenshot, upload, note | One thing | Built |
| Voice ("just yap") | One thing, or several split out | Hackathon (H7) |
| **"I want to…"**, typed or spoken | One thing | Phase 3 |
| **Curriculum from a PDF or photos/screenshots** | A course with ordered units | Phase 3 |
| Brain dump at onboarding | Several things | Phase 2 |
| Are.na channel | Collection | Phase 9 |
| Pinterest board (through a library or MCP built for createthings) | Collection | Phase 9 |
| X (Twitter) bookmarks: a "Save to createthings" button on any post (extension) and the phone share sheet first; full import of bookmarks and folders through the official X API if its pricing allows (folders become collections). Not reading the bookmarks page by script (against X's rules) | One thing, then collections | Save button soon; import Phase 9 |
| A collection made in the app (§2b) | Collection | Phase 9 |

Possible later sources: YouTube or Spotify playlists, browser bookmark folders, Notion pages, GitHub repos, Kindle or Readwise highlights, podcast episodes, Instagram or TikTok saves, newsletters, photos of handwritten notes.

**Confirm card.** When you Start something or pick it for the month, one card shows what the app understood: *"Looks like you want to **learn** jazz piano. Goal: play Autumn Leaves with drop-2 voicings. Right?"* Intent, goal and date can each be changed with one tap. The choice is remembered.

- **How it works:** Start on an item that isn't confirmed yet moves it into Focus and makes its project, and returns the card instead of planning straight away. Confirming (as is, or changed) plans the roadmap toward the confirmed intent and goal, so nothing is planned twice. Items already confirmed plan at Start as before. Picking month goals returns cards for any that aren't confirmed
- Changing a confirmed item later re-plans it: a fresh roadmap if nothing is done yet, otherwise the milestones ahead
- Remembered either way; a correction ("this is a habit, not a learning goal") is remembered as one, so future guesses improve

**Trying something out (tasters)**

- A "try it out" item gets **2–3 taster sessions** instead of a full roadmap, each trying a different side of it (pottery: hand-building at home, a drop-in wheel class, glazing), with the cheapest way to try it (a drop-in class, a starter kit, a video) and no proving grounds
- After the last session the pet asks: **keep it** (it becomes a full plan as a learning goal, or another intent you choose), **park it** (back on the Shortlist until a day, default next month) or **let it go** (archived; letting go counts as progress)
- **How it works:** the `tasters` plan shape makes the roadmap job plan one milestone of 2–3 sessions. Finishing the last one returns the decision in the step-complete reply; `POST /api/items/[id]/tasters` applies it. Keeping it plans a fresh roadmap (5 credits). What you decided, and why, is remembered

**Following a course**

- Upload the syllabus as a PDF or one or more photos/screenshots
- The course's units become the milestones, **in the course's order**. The roadmap adds what courses don't give you: 2-minute versions, search terms, recall questions and proving grounds
- Re-plans add support around the course but never reorder or drop its units
- **Class dates** from the syllabus go into the plan: the weekly plan puts practice blocks before each class, and exam dates become the target date
- **How it works:** `POST /api/courses` takes a PDF or up to 10 photos/screenshots. Gemini reads them once (the file isn't stored until R2 storage exists) and returns the course title, its units in order (topics and dates where given) and any exam date. That becomes an item with the course intent (exam date as the target date) and its units in `course_units`. Its roadmap has one milestone per unit, in order, with the unit's title; re-plans keep the remaining units in order. Week proposals mark blocks that come before a unit's class. Reading a syllabus costs 3 credits

### 4. Sort: Triage

- One card at a time: **Do this** (→ Shortlist), **Keep as reference** (→ a collection, §2b), **Let go** (→ Archived), **Later** (stays Ready)
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
- **How a pick is made:** the candidates are the newest 20 Shortlist items (minus any "Not today" ones). The pet recalls the user's most relevant memories from Walrus, then the AI picks one with a reason, a first step that fits the time, a 2-minute start, and the memories it used (shown as citations). Costs 1 credit; if the AI fails or credits run out, a simple rule still picks (best fit for time and energy, then the item waiting longest), so the user is never blocked
- **Every decision is remembered** (`pick_feedback`): starting, skipping for today and letting go all teach future picks

**Plan in three layers: month → week → day** (James Clear; *Deep Work*)

Each layer feeds the next, and each review is remembered, so the next plan learns from the last one. Every layer can be skipped; nothing breaks if you never plan a month.

- **Month: two lists** (the Buffett story James Clear tells): "Which 1–3 matter this month?" Those become the month's goals and the only items Pick for me and the weekly plan draw from. Everything else on the Shortlist goes on the **not this month** list: parked until next month, never deleted.
  - Offered the first time the app is opened in a new month
  - Starts with a **monthly review** (a small version of James Clear's yearly review): what moved, what you learned, what to let go. Saved as memory (`lesson_learned`, `plan_change`)
- **Week: fill the blocks** on a day you choose (default Sunday evening; if missed, the first time the app is opened that week)
  - "How many blocks do you have this week?" plus when (days and times, or habit anchors)
  - **The pet fills them** with the next roadmap steps from the month's goals; you adjust (drag, swap, remove). A blank week is where scattered people stall, so you never start from empty
  - Each block is written as an **implementation intention**: "I will [step] at [time / after coffee] at [place]"
  - The week's review is the weekly digest (§12)
- **Day: Ivy Lee method.** In the daily shutdown you rank **up to 3** blocks for tomorrow (pre-filled from the week). Today shows only #1; the next appears when it's done

**Longer horizons: year, half-year, quarter** (optional; each sits above the month and feeds it)

| Period | What you decide | Review |
| --- | --- | --- |
| **Year** | 1–3 themes or big goals ("this year: play jazz, ship my portfolio"), with who you want to become | A yearly review and "integrity report" in the style James Clear writes his: what went well, what didn't, what you learned, whether you lived by your values |
| **Half-year** | Which year goals this half carries | Halfway check: still the right goals? |
| **Quarter** | 1–3 goals for the next 12 weeks, each with a target date at the quarter's end (short enough to feel urgent) | What got done in 12 weeks; what carries over |
| **Month → week → day** | As above, now drawing from the quarter's goals | As above |

- Each period offers its goals as the shortlist for the one below it, so the year shapes the month without extra work
- Nothing forces the long horizons: someone who only plans weeks never sees them
- **Plug and play:** periods are a registry (`features/plan/periods.ts`: length, how many goals, review questions, when it's offered); adding "season" or "semester" is one entry (Code layout rule 8)

**Plan: time blocks** (*Deep Work* time blocking, *Atomic Habits* implementation intentions)

- Focus steps are placed into **blocks**: a day, a start time, and optionally a place ("Tue 8:00, desk")
- A block can follow a **habit anchor** instead of a clock time: "after morning coffee", "after lunch" (habit stacking)
- The pet nudges at the block's time or anchor, in its own voice

**Reshuffle: when life happens**

- **Missed a block:** the pet offers to move it, never silently. Today's plan is rebuilt around what's left.
- **Never miss twice:** after a missed day, the next day starts with the step's **2-minute version** as the top priority, and the pet says so
- **New idea or plan mid-week:** goes through fit-it-in (§13): add as a step, swap a block, park it, or a 5-minute note
- **Busy week:** "Only 2 blocks free this week? Here's what moves."
- **How reshuffle works:** a block is **missed** once its day has passed and its step isn't done. Misses are found whenever the plan is read, so no background job is needed. The pet gets the missed blocks, each with a suggested new slot (the first day from today with fewer than 3 blocks, keeping the time, anchor and place). After a missed day it also gets the **never-miss-twice** pick: yesterday's top missed step, offered as today's #1 with its 2-minute version. Nothing moves until you OK it; you can also drop a block (its step goes back to unplanned). **Busy week:** give the blocks you really have; missed steps come first, then the week's order, and whatever doesn't fit moves to next week. Free: no AI call
- **How fit-it-in works:** the new item and each Focus item and month goal are embedded with Walrus `embed` and compared; the closest match (if close enough) is the related item. The offers are built from your plan, so they cost nothing:
  - **Add as a step:** goes into the related roadmap right after its current step
  - **Swap a block:** the idea takes the related item's last planned block this week; that block's step goes back to unplanned
  - **Park it until a day:** the day after the related item's last planned block this week, else next Monday
  - **5-minute note:** nothing in the plan changes; the idea waits on the Shortlist
  - Remembered as `idea_merged`, `idea_parked` or `plan_change`. If `embed` fails, the offers still come, with the goals listed to choose from

**Rituals** (*Deep Work*)

- **Start ritual:** starting a block runs the same steps every time: sounds, pet sleeps, distractions parked
- **Daily shutdown:** at the end of the day (time set by the user) the pet runs a 1-minute wrap-up: what got done, what moves, and tomorrow's **top 3, ranked** (Ivy Lee). Finishing it is a snack for the pet.

### 6. Start Small: Roadmaps as Navigation (exists, changed)

A roadmap works like navigation: it always answers "what now?", including when someone doesn't know what to search for or which tool to use.

- Generated from an item's analysis, shaped by its intent and kind of practice (§3b)
- **Opens with a goal** ("by the end you'll be able to…") that every milestone builds toward
- **Styles:**
  - **Project roadmaps** for things to make or recreate
  - **Skill roadmaps** for learning goals: basics → practice → small project, with more knowledge cards along the way, and **proving grounds** after each milestone (real songs, labs, pieces that use what you've learned so far)
  - **Course roadmaps** that follow an uploaded curriculum's units in order (§3b)
- Every milestone is split into **steps of 15–30 minutes**. Only the current step is prominent.
- **Each step comes with:**
  - a **2-minute version**, the smallest possible start (*Atomic Habits* two-minute rule)
  - **what to search for**: actual search terms, because "I don't know what to Google" is a real blocker
  - **tools and resources** for that step; when there's a real choice of tools, **help me choose** (below)
- **Adaptive, not fixed:** when a topic or milestone is done, the roadmap re-plans what comes next from what you now know, what you keep forgetting and your goals
- **"I'm stuck"** gives a smaller step or a short explanation. **"Teach me this"** gives a short lesson tied to the item. Both are asked through the pet (see Pet assistant).
- Progress tracking per step and milestone
- **How a roadmap is made:** Start creates the project and queues a roadmap job (`createthings-roadmap`). The AI gets the item's analysis plus the user's recalled memories (what they know, what tripped them up) and returns 3–5 milestones of 15–30 minute steps, each with a 2-minute version, search terms and tools, plus resources. Learning goals get the skill shape. Costs 5 credits; saved as a `plan` memory
- **Goal and proving grounds:** the roadmap job also returns 2–3 goal options ("By the end you'll be able to…"); the first is used unless the user chose one. For learning intents, each milestone ends with 1–3 proving grounds, saved as steps of kind `proof`, shaped by the practice kind (songs, labs, a harvest). They count as steps for progress and the weekly plan. Changing the goal re-plans toward it
- **Re-planning:** when the last step of a milestone is completed, a re-plan job rewrites the not-yet-done steps of the later milestones from what's been done and remembered. Done steps are never changed

**Learning the way brains learn** (*Learning How to Learn*, Barbara Oakley and Terrence Sejnowski)

| Idea | How it shows up |
| --- | --- |
| **Chunking** | Skill roadmaps build chunks: understand it → practise it → use it somewhere new. Each milestone is one chunk |
| **Recall beats rereading** | Each learning step ends with a quick recall: "Close the tab. What do you remember?" The answer drafts the knowledge cards |
| **Illusion of competence** | Before a learning step is marked done, the pet offers a quick self-check or an explain-it-back. Encouraged, never required |
| **Focused and diffuse thinking** | Breaks are part of learning. When stuck after a session, the pet first offers "walk away for 10 minutes", then a smaller step |
| **Einstellung** (stuck on one approach) | "I'm stuck" can suggest a completely different angle, not only a smaller step |
| **Interleaving** | Practice steps and review sessions mix in older topics instead of one topic at a time |
| **Deliberate practice** | Re-plans lean into topics remembered as hard (`stuck_topic`, `review_weakness`) |
| **Process over product** | Steps are framed as time on something ("25 minutes on chord shapes"), not "finish X", which takes the dread out of starting |
| **Spaced repetition** | Knowledge review (§9) |

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
- **Interleaved:** a review session mixes cards from different items and topics, not one deck at a time (*Learning How to Learn*)
- **Flashcards from recall questions:** every learning step's recall question becomes a flashcard automatically when the step is done, so practice starts without writing cards
- **Practice quizzes:** a 5–10 question quiz (multiple choice, short answer, "which comes next") made from a milestone's steps and recall questions:
  - offered at the end of a milestone, as an in-app proving ground for knowledge goals, and in the days before a target date (exam prep)
  - questions mix older milestones in (interleaving); answers are explained right away
  - wrong answers become flashcards and are remembered as `review_weakness`, so re-plans and "teach me" lean into them
  - uses the free quota, then credits
- Reviews due appear on Today, **capped at 5 per day** (adjustable)
- Each card links to its source item, step or journal entry
- **Knowledge library:** browse everything learned, by item or topic
- **How it works** (1 Nov 2026):
  - Roadmap steps now come with a short `recallAnswer` next to their recall question. Finishing a step with a recall question creates a flashcard (question/answer; an "explain it back" card when an older step has no answer)
  - `GET /api/reviews` returns today's due cards, mixed across items (interleaved), up to the daily cap (default 5). `POST /api/reviews/[id] { rating }` sets the next date: **Got it** moves up the ladder 1 → 3 → 7 → 14 → 30 → 60 days, **Shaky** repeats the same gap, **Forgot** goes back to 1 day. Free
  - **Quizzes:** finishing a milestone of a learning goal returns `quizReady`. `POST /api/items/[id]/quiz { milestone? }` makes 5–8 multiple-choice questions (including "which comes next") from that milestone's steps and recall questions, with a couple from earlier milestones mixed in; each has its explanation, so answers are explained right away. 2 credits. `POST /api/items/[id]/quiz/result { wrong[] }` turns wrong answers into flashcards and saves one `review_weakness` memory (`remember`) naming the topics
  - `GET /api/cards` is the knowledge library: every card, grouped by item

### 10. The Pet

The full state machine for building the model (life states, activities, reactions, inputs and the animation checklist) is in [pet-state-machine.md](pet-state-machine.md).

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

**How chat works** (decided 1 Nov 2026):

- `POST /api/chat { mode: chat | stuck | teach, itemId?, stepId?, messages }`; the app sends the last few messages, so nothing is stored per conversation yet
- Before answering, the pet recalls the memories closest to the latest message (our recall: current namespace, deleted memories hidden, distance cutoff) and puts them in the prompt as context. Each reply says which memories it used, shown as citations
- **"I'm stuck"** first suggests a short break away from it (focused and diffuse thinking), then a smaller step or a completely different angle. The topic is saved as `stuck_topic` with `remember`
- **"Teach me this"** gives 3–5 short paragraphs tied to the item and step, and offers to turn it into cards later
- In plain chat the pet saves a fact only when it learns something lasting about how you work ("prefers video tutorials"), at most one per message, with `remember`
- Cost: 1 credit per message (free quota first) and 1 Walrus recall point; saving is 5 points and only when there's something worth keeping
- **Why not `withMemWal`** (the Walrus SDK's chat wrapper): it saves with `analyze` (10 points) after every reply, which would use the whole app's Walrus allowance (500 points an hour, shared) at about 50 messages an hour; and it recalls straight from Walrus, so it would bring back memories the user deleted. Our recall does the same job (recall → inject → cite) while respecting deletes and the cost rules

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

#### Showcase: well-fed pets, not a leaderboard (decided 2 Nov 2026)

No ranking of people: show care and personality, never a score (principles 11, 12, 15).

- **Pet card:** a shareable card with the 3D pet, its name, growth stage, a care line ("Well fed for 42 days"), its signature accessory and, if the user wants, their year's "who I'm becoming". Share to X and Instagram
- **Pet park** (opt-in): other people's pets wander in a shared space in no order; tap one to see its card; wave or toss a toy (cosmetic only, never feeds or helps)
- **Earned vs limited accessories:** earned items are badges of real behaviour ("never missed twice for 30 days" → a scarf) and **can't be bought**; limited editions are seasonal drops bought with credits and numbered ("#132 of 500"). Effort is the prestige
- **Community goals:** cooperative milestones ("everyone's pets ate 10,000 meals this week → a winter hat for every pet")
- **Accountability pairs:** optionally share your pet's mood (never goals or memories) with a friend who can nudge you
- **Guardrails:** everything opt-in; only the pet and chosen fields are public; pet names moderated; a neglected pet is never shown publicly
- **Option:** limited editions as account-bound (non-tradeable) items on Sui, proving the edition number, with the receipt read through Tatum; crypto details stay behind "details"
- **When:** after the pet (Phases 4 and 6); the pet card first

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
   - **How it works:** finishing an item (`POST /api/items/[id]/finish`, offered when its roadmap is complete) marks it done and remembers what it built (`lesson_learned` with its skills, via `analyze`). The suggestion (`GET /api/items/[id]/next`) ranks the Shortlist and current goals by **skills in common** and **closeness in meaning** (cached embeddings, cost rule 4), then the AI picks one from the top few with a reason and the skills that carry over. 1 credit; if the AI fails, the best-ranked one is suggested with its shared skills. Accepting it is just Start
   - The next roadmap skips what they know because its plan recalls the finished item's `lesson_learned` memory
4. **Gets better visibly.** Pick for me, roadmaps, "I'm stuck" answers and nudges all use what it remembers, and the pet says so ("Last Tuesday kerning tripped you up…").

**Voice mode ("just yap")**

- Hold the mic in the PWA or extension and ramble ideas
- Transcribed, then split into separate ideas and sorted: new item, step for a current Focus item, journal note, or learning goal
- Each idea goes through the fit-it-in flow above; nothing is added without your OK

**Walrus's own AI** (part of the Walrus Memory SDK)

| Feature       | What it does                                                        | Used for                                             |
| ------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `withMemWal`  | Wraps any AI SDK model: recalls relevant memories into the prompt before each reply and saves new facts after | **Not used for pet chat** (1 Nov): it saves with `analyze` after every reply and can't hide deleted memories. Pet chat does the same recall → inject → cite with our recall instead (§10 "How chat works"). Chat model: Workers AI in production; locally Gemini, or OpenCode on the laptop |
| `analyze`     | The relayer extracts individual facts from text and stores each one | Turning our **summaries** (session notes, plan changes) into memories |
| `embed`       | Embedding vector only, nothing stored                               | **Fit-it-in**: matching a new idea to the right Focus item |

- Auto-save in `withMemWal` is limited to chat; journal text and transcripts never go through it
- Saves and `analyze` calls go through the memory queue and respect the relayer's rate limits

**Rules**

- **Postgres stays the source of truth** (items, steps, journal, cards, pet). Walrus holds only what the assistant has learned.
- **Summaries, not raw text.** The hosted Walrus relayer can read what it receives, so journal entries and transcripts stay in Postgres; Walrus gets short summaries ("struggled with kerning, prefers short steps"), and `analyze` only ever runs on those summaries.
- Saves go through a queue (Walrus rate limits) and never block the app
- **How saving works:** a feature calls `remember()`, which writes a `memories` row (status `queued`) and puts its id on the `createthings-memory` queue. The consumer sends the summary to Walrus with `analyze` (one message at a time, so the relayer's rate limits hold), stores the job ids and marks the row `sent`. Failures before Walrus accepts the text are retried with backoff (5 tries, then the dead-letter queue); after acceptance it's never re-sent, because `analyze` has no idempotency key. Under `vite dev` there's no queue retry, so a memory whose send failed is queued again when the user's next memory is saved (if it failed more than 15 minutes ago)
- **Network and cost:** Walrus Memory runs on **mainnet** (the hackathon needs mainnet memories). The hosted relayer's wallet pays storage, so it costs nothing beyond its rate limits and a 1 GB cap per account
- **Namespaces:** one per user, so recall never mixes users: `createthings-<userId>` in production, `createthings-dev-<userId>` when running locally (`MEMORY_NAMESPACE_PREFIX` overrides)
- **First source:** when an item's analysis finishes, its summary is remembered as a `goal` or `learning_goal`
- **"What the pet knows about you"** in Settings: see every memory (grouped in plain words: your goals, plans and changes, what you learned, how you work), delete one, or forget everything
- **⚠ Walrus memories can't be erased (important).** Walrus storage is append-only and the Walrus Memory SDK has no delete or forget call (checked 31 Oct 2026, `@mysten-incubation/memwal` 0.1.12). Memories are SEAL-encrypted blobs that stay on Walrus until their paid storage period ends. So deleting works by **no longer reading** them:
  - Each user has a **namespace version**. Recall, pet chat, roadmaps and picks only read the current namespace (`createthings-<userId>-v<n>`)
  - **Forget everything:** every memory is marked deleted in Postgres and the user moves to a fresh namespace. The pet stops using all of it at once
  - **Delete one:** it's marked deleted and the Walrus blob ids of its facts are looked up from its stored job ids (reads only). Recall then **leaves those facts out**. Nothing is re-sent and nothing new is stored, so it costs no storage and no rate limit
  - The old encrypted data is never read again and disappears when its storage ends. **The app says this plainly** ("removed from what your pet uses; the encrypted copy on Walrus expires on its own"), never just "deleted"
  - Each memory records the namespace it was sent to (`memories.namespace`) and, once deleted, its facts' blob ids (`memories.blob_ids`). If a future SDK adds deletion, those can be erased properly
  - **Edge cases:** a memory deleted while Walrus is still processing it has no blob ids yet, so recall looks them up again later; deleting a small event that's already in a day's digest also hides that digest (the app says so)
- Memory is part of the assistant: guide/actions stay free; recalls inside chat count toward the chat quota

#### Cost rules for Walrus and Tatum (and why)

Checked 31 Oct 2026 against the Walrus Memory relayer docs, the `@mysten-incubation/memwal` 0.1.12 SDK and Tatum's plan docs. These rules exist because the limits below are shared by the whole app, not per user.

**Why: the limits**

- **Walrus relayer rate limit, per account:** 60 points a minute and 500 points an hour. Points per call: `analyze` 10, `remember` 5, `restore` 3, `recall` 1 (bulk, embed and status lookups aren't published). Source: [docs.wal.app/walrus-memory/relayer/overview](https://docs.wal.app/walrus-memory/relayer/overview)
- **The whole app uses one Walrus account** (the server's delegate key), so those 500 points an hour are shared by every user: about 50 `analyze` calls an hour for everyone
- **Storage:** 1 GB per account; every stored fact is a separate encrypted blob, and `analyze` can split one summary into several facts (one test summary became 6 blobs)
- **No delete:** the relayer has no documented delete endpoint, so anything stored stays until its storage ends (see "Walrus memories can't be erased" above)
- **Tatum free plan:** 3 requests a second and a monthly credit cap (Tatum's pages disagree: 100K on [docs.tatum.io/docs/plans-limits](https://docs.tatum.io/docs/plans-limits), 1M on [tatum.io/price](https://tatum.io/price); the dashboard is authoritative). Per-call credit costs for Sui aren't published

**The rules**

1. **Small events go in a daily digest.** Starts, skips and pauses (`pick_feedback`, small `plan_change`s) are kept in Postgres and sent as one memory per day: a day's digest goes out with the user's first memory on a later day (a scheduled daily job can replace that later). *Why:* they're frequent and low-value one by one; dozens of `analyze` calls per user become one `remember` a day
2. **`remember` for one-fact memories, `analyze` for rich ones.** Plans, plan changes, parked and merged ideas use `remember` (5 points, one blob). Goals, learning goals, reviews, lessons and session summaries keep `analyze` (10 points), which splits them into searchable facts. *Why:* half the cost and fewer blobs, while Walrus's own AI still runs where it adds value (a hackathon judging point)
3. **`dedupe: true` and an idempotency key on every `remember`.** *Why:* identical text reuses the existing blob, and a retried send can't store a duplicate
4. **Embeddings are cached in Postgres** (per item, keyed by a hash of its text). *Why:* fit-it-in otherwise re-embeds every goal for each new idea
5. **Batch lookups:** blob ids for a delete come from one bulk status call. *Why:* one request instead of one per fact
6. **Recall uses a distance cutoff** (`maxDistance` 0.8, the SDK's suggested start). *Why:* fewer, more relevant memories in prompts means shorter AI calls
7. **Deleting never re-sends** (filter from recall instead). *Why:* re-sending ~80 memories would cost ~800 points, more than an hour's allowance for the whole app
8. **Tatum (when payments and receipts are built):** cache the SUI/USD rate for 10 minutes and memory receipts per user; confirm a payment by looking up its transaction with backoff that stops once found, never by tight polling; stay under 3 requests a second. *Why:* the free plan's per-second and monthly caps
9. **Test scripts state their cost** (credits, AI calls, Walrus writes) and reuse existing items

### 14. On-chain Proof + Payments (Tatum on Sui)

The chain stays invisible unless you go looking.

- **Memory receipts:** Settings shows your memory's Sui account, how many memories are stored and when they last changed, read through **Tatum's Sui RPC**, with an explorer link
  - **How it works** (1 Nov 2026): `GET /api/memories/receipts` reads the Walrus Memory account object on Sui mainnet through Tatum's gRPC gateway (its type, owner and version; it's a shared object, so the version jumps and isn't a count), then the transaction that last changed it (digest and time), with Suiscan links. The account isn't changed when a memory is saved: memories are Walrus blobs, so the receipt also shows your latest memory's blob with a Walruscan link (one relayer lookup, no Tatum call). Your count and namespace come from our database. The on-chain part is cached for 10 minutes, so it's 2 Tatum calls at most every 10 minutes (cost rule 8). The account is the app's memory account; your namespace keeps your memories apart
- **Pay with USDC on Sui:** credit packs and per-request **Plus/Pro** AI calls can be paid with USDC on Sui using **MPP** (`@suimpp/mpp`; no x402 package settles on Sui mainnet). Tatum's Sui gRPC endpoint confirms each payment on-chain before credits are added. Card payments (Breakdown §Monetisation) still come later.
- **SUI price:** paying with SUI is converted to credits at the live rate from **Tatum's Data API**

**Gasless USDC and getting money in (checked 31 Oct 2026)**

- **Gasless stablecoin transfers are built into Sui** (launched May 2026): users can send allowlisted stablecoins, including **USDC** and **USDsui**, without holding SUI for gas. Only simple balance/coin transfers qualify, the minimum is 0.01, and fee-paying transactions get priority when the network is busy ([Sui blog](https://blog.sui.io/sui-launches-gasless-stablecoin-transfers/), [Sui docs](https://docs.sui.io/onchain-finance/choose-payments-model)). Sui's developer page still says testnet, while the announcements say mainnet: **confirm on mainnet before relying on it**, and check whether an MPP payment counts as a qualifying transfer
- **Sponsored transactions** cover everything else (we pay the gas): **Enoki** (Mysten) runs a gas pool with a fiat billing option, so we don't need to hold SUI; **Shinami** runs a gas station funded in SUI ([Shinami vs Enoki](https://docs.shinami.com/docs/shinami-vs-enoki))
- **No wallet needed:** Enoki's zkLogin gives a Sui address from a Google sign-in, which fits the planned Google auth, so a scattered user never has to set up a wallet
- **Fiat on-ramps on Sui** ([Sui docs list](https://docs.sui.io/onchain-finance/asset-custody/fiat-on-ramps)): Coinbase Onramp (SUI, USDC; fee-free USDC inside Slush wallet), Stripe (SUI, USDsui), Banxa (SUI, USDC), plus Onramper, Meld, Alchemy Pay, OnRamp.money, Bridge.xyz and CoinVoyage. **Ramp** reportedly added USDC on Sui in May 2026 (not in Sui's list yet; confirm with Ramp). **Rampnow** isn't on Sui's list; confirm with them directly
- **Proposed setup** (to decide at H12–H13): Google sign-in → zkLogin address (Enoki) → buy USDC with an on-ramp widget (Coinbase or Stripe) → pay with a gasless USDC transfer (or an Enoki-sponsored MPP payment if MPP doesn't qualify) → Tatum confirms it on-chain → credits arrive. The user never touches gas or SUI

---

## Monetisation

### Free for everyone

- Capture, triage, Focus, Today, roadmaps viewing, journal, reviewing cards, pomodoro, starter sounds, the pet (feeding, the journal check, levels 1–2), body sliders, weather
- A **daily free AI quota** on Basic models: 20 credits a day by default in production, 1,000 when running locally so testing on free AI isn't blocked (`FREE_DAILY_CREDITS` overrides both), resetting at 00:00 UTC (the user's own timezone later). Unused free credits don't carry over

### Credits

One currency for everything. **Credits never expire.**

**AI usage** (the main reason to buy)

- Each action has a base cost, multiplied by model tier: **Basic** 1× · **Plus** 3× · **Pro** 10×
- Example base costs (numbers to set once hosting costs are known): pet chat 1, Pick for me 1, analysis 2, "I'm stuck"/"teach me" 1, card drafting 1, explain-it-back 1, roadmap 5
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
Extension (popup / right-click / Alt+Shift+S / site saver) / share sheet / quick add
  → Item saved (Inbox, or Reference) → analysis job queued
  → Toast on the page: "Saved. Keep as reference instead · Undo"
  → Worker: metadata + colors + vision/text model
  → Analysis saved, size + difficulty set, Status: Ready (references stay references)
  → If it fits a goal: "Fits your riso goal. Add it?"
  → Offline: the save waits in the extension and sends when back online
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

### Flow 12b: Plan the week

```
Weekly plan day (default Sunday evening) → pet: "How many blocks this week?"
  → You give a number and when (days + times, or anchors like "after coffee")
  → The pet fills the blocks with the next steps from this month's goals
  → Each block reads as "I will [step] at [time] at [place]"
  → You drag, swap or remove; nothing is saved until you OK it
  → Saved as a plan memory
```

### Flow 12c: Plan the month

```
First open in a new month → pet: "New month. Quick look back?"
  → Monthly review: what moved, what you learned, anything to let go (skippable)
  → "Which 1–3 matter this month?" (picked from Focus and the Shortlist)
  → Everything else goes on the not-this-month list (parked until next month, not deleted)
  → Pick for me and the weekly plan only draw from the month's goals
  → Saved to memory (lesson_learned, plan_change)
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

**How voice works** (1 Nov 2026): `POST /api/voice { audio (base64), mime }`, up to about 3 minutes. In production Workers AI's Whisper turns speech into text, then a text model splits it into ideas; locally (no Workers AI) Gemini does both in **one call** from the audio file. Each idea comes back with a title, its text and a suggested place: new item, step for a Focus item, journal note or learning goal. Nothing is added automatically: approving an idea captures it (and fit-it-in offers where it goes). The transcript and ideas are kept in `voice_captures`; the audio isn't stored until file storage (R2) exists. One `voice_ideas` memory per ramble, in our words (the idea titles), never the transcript. Cost: 2 credits


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
  → Tomorrow's top 3, ranked (Ivy Lee), pre-filled from the week's plan; #1 shows its 2-minute version
  → Snack for the pet; summary saved to memory (session_summary / plan_change)
```

**How the shutdown works** (1 Nov 2026): `GET /api/plan/shutdown` returns whether it's due (the user's shutdown time has passed today, in their timezone), the steps finished today, today's blocks that weren't done with a suggested new slot each (from tomorrow), and tomorrow's top 3 pre-filled (tomorrow's planned blocks first, then the current step of each Focus item). `POST /api/plan/shutdown { moves, drop, tomorrow, note? }` moves the unfinished blocks, ranks tomorrow (Ivy Lee) and saves one `session_summary` memory in our words. No AI call, so it's free; the snack for the pet comes with the pet (Phase 4)


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
| Voice transcription| Workers AI speech-to-text (Whisper) in production; Gemini from the audio file locally |
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

#### Free AI until the app is paid (checked 31 Oct 2026)

Free tiers change without notice, so the app keeps a fallback chain and caps spend per user. Options, in the order we'd use them:

| Option | What's free | Fit | Watch out for |
| --- | --- | --- | --- |
| **Workers AI** (production primary) | 10,000 Neurons a day on the free plan, then $0.011 per 1,000 Neurons; shared across models ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)) | Runs next to our Workers, no keys, JSON mode on supported models; already wired | The daily allowance is small for many users; per-model Neuron costs vary |
| **AI Gateway** (in front of every provider) | Free caching, rate limiting and logs | **Caches identical requests**, so repeated prompts cost nothing | Only helps when the exact same request repeats |
| **Groq** | Per-model limits, e.g. ~1,000 requests a day on some models ([comparison](https://openrouter.ai/blog/tutorials/free-llm-apis-compared/)) | Fast replies for pet chat | Our key is invalid today; check its data policy before production |
| **Gemini Flash / Flash-Lite** | Free tier (Pro models left the free tier in April 2026) | Reads images and PDFs; our local default | Free tier may train on prompts: **local only** (privacy rule); production only on a paid key |
| **Mistral, Cerebras** | Mistral's free plan with usage limits; Cerebras gives signup credits rather than a lasting free tier ([BenchLM](https://benchlm.ai/md/free-tier.md)) | Extra fallbacks | Check each one's training policy against the privacy rule |
| **OpenRouter `:free`** | ~50 requests a day (1,000 after a $10 purchase) | — | Excluded by the privacy rule |

**Hosting OpenCode in a container** (considered 31 Oct, not recommended):

- Cloudflare Containers need the Workers Paid plan ($5 a month) and bill for every 10 ms a container runs, so an always-on OpenCode server eats the included allowance ([pricing](https://developers.cloudflare.com/containers/pricing/))
- OpenCode Zen's free models only work inside OpenCode as a coding agent, so routing the app's requests through it isn't allowed, and with our own provider keys it adds nothing over calling the providers directly
- Keep OpenCode for **local experiments** on the laptop (connected as a provider during development), not for users

**Cheap and efficient by design:**

1. Workers AI first, AI Gateway caching in front of everything, then the free fallbacks
2. The smallest model that does the job per task (triage and picks on small models; roadmaps and courses on stronger ones)
3. Per-task reply limits (`maxTokens`: 1,500 for analysis, 6,000 for roadmaps) and short prompts (recall keeps only close memories)
4. Background work through queues, so bursts are smoothed and retries don't double-charge
5. Free daily credits per user and spend caps, so no single user can drain a free tier
6. Free rule-based paths when AI isn't needed (Pick for me's no-AI fallback, week filling, reshuffle and fit-it-in offers)

### Code layout and module rules

```
src/lib/
├─ shared/            Browser-safe code and types (the PWA and extension may import these)
├─ components/        UI components
└─ server/
   ├─ platform/       env.ts (runtime secrets; fails with the key name), bindings.ts (typed Cloudflare
   │                  bindings), http.ts (zod validation, id params), user.ts (dev user until auth)
   ├─ db/             index.ts (withDb: one client per request via Hyperdrive; one shared pool under
   │                  `vite dev`, where each new Neon connection costs ~2.6 s) + schema/ (one file per domain)
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
8. **Plug and play: intents, practice kinds, sources and plan shapes are registries.** Adding one is one entry in its registry file; nothing else changes and no migration is needed (they're stored as text ids, checked against the registry, not as Postgres enums).
   - `features/intents/registry.ts`: id, label, the confirm-card wording, plan shape, goal prompt, roadmap rules
   - `features/intents/practice.ts`: kind id, label, practice rules and proving-ground examples for the prompt
   - `features/sources/registry.ts`: each source is an adapter with an id, label, shape (one / collection / ordered) and, for connected services, `connect`, `list` and `sync`. Are.na and Pinterest are adapters; the Pinterest adapter wraps the library or MCP built for it
   - `features/plan/shapes.ts`: roadmap (now), tasters (Phase 3), recurring (later)
   - `features/plan/periods.ts`: year, half, quarter, month, week (each: length, goals allowed, review questions, when it's offered)

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
| `user_settings`      | user_id, focus_limit, daily_review_cap, liveliness, tone, pomodoro (focus/break/long), sounds_on, quiet_hours, timezone (for quiet hours and local time), shutdown_time, weekly_plan_day + weekly_plan_time (default Sunday 18:00), memory_namespace_version (bumped when memories are deleted, see §13), weather_mode (auto/city/off), city, runaway_days, death_days, timeline_changed_at, rest_until |
| `items`              | id, user_id, title, source_url, author, platform, capture_type (screenshot/url/upload/note/voice), image_key, note, status (inbox/ready/shortlist/focus/paused/done/archived/reference), size, difficulty, is_learning_goal, arena_block_id, title_from_user, analysis_error, plan_error (why the last roadmap job failed), saved_at, last_active_at, parked_until (not this month, or parked by fit-it-in), intent + practice_kind (registry ids, §3b; replaces is_learning_goal), intent_confirmed_at, goal, target_date |
| `analyses`           | id, item_id, summary, technique, colors (palette + notes), typography, layout, mood[], style, components, for_developers, for_creators, brief, skills[] (feeds the roadmap), attribution, model |
| `roadmaps`           | id, item_id, style (project/skill), skills, resources, progress, goal ("by the end you'll be able to…"), goal_options (the 2–3 suggested) |
| `roadmap_steps`      | id, roadmap_id, milestone, position, title, minutes, two_minute (smallest start), search_terms[], tools[], recall (learning steps: the recall question that ends the step), kind (step / proof: a proving ground), done_at |
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
| `collections`        | id, user_id, title, source (registry id: arena, pinterest, x, app), external_id (e.g. the Are.na channel id), mode (do / curated / references), goal_item_id (the goal it feeds, optional), suggested (grouped by the app, not yet kept), kept_at, thread (what connects it), last_synced_at, created_at |
| `collection_items`   | collection_id, item_id, position                                        |
| `course_units`       | id, item_id, position, title, topics[], unit_date (a course's units in order, read from its syllabus) |
| `source_connections` | id, user_id, source (registry id), token_encrypted, scopes, write_back (on/off), last_synced_at (one row per connected service; replaces `arena_connections`) |
| `exports`            | user_id, target (notion), token (encrypted), last_run_at                |
| `push_subscriptions` | id, user_id, endpoint, keys                                             |
| `plan_slots`         | id, user_id, step_id, day, start_time, anchor (e.g. "after coffee"), place, position (the day's rank: 1–3 is tomorrow's top 3), missed_at (a Focus step placed in a time block) |
| `plan_periods`       | id, user_id, kind (registry id: year, half, quarter, month, week), starts_on, goal_item_ids[] (the period's 1–3), blocks_wanted (week), review (short summary), themes[] + intention (year: themes and who they want to become), created_at (one row per month or week planned) |
| `comparisons`        | id, user_id, item_id, step_id, question, goal (learning/building), options (JSON: gives, price, fit, sources), pick, reason, checked_at |
| `memories`           | id, user_id, type, summary, source_type, source_id, status (queued/sent/failed), attempts, last_error, walrus_job_id, namespace (where it was sent), blob_ids (its facts, looked up on delete), created_at, deleted_at (local copy + outbox for Walrus) |
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
| `/api/triage`                      | Keep (→ Shortlist) / let go (→ Archived) / later |
| `/api/focus/pick`                  | Suggest one Shortlist item from time, energy and recalled memories; cites the memories used |
| `/api/focus`, `/api/focus/decide`, `/api/focus/pause` | Current Focus items; Start / Not today / Let it go; pause back to the Shortlist |
| `/api/items/[id]/finish`           | POST { note? }: mark done, remember what it built, and return the next-thing suggestion |
| `/api/items/[id]/next`             | GET: what to do next after this item and what carries over (1 credit) |
| `/api/items/[id]/tasters`          | POST { choice: keep / park / let_go, intent?, until?, note? } after the taster sessions |
| `/api/reviews`                     | GET today's due cards (interleaved, capped); `POST /api/reviews/[id] { rating: got_it / shaky / forgot }` |
| `/api/items/[id]/quiz`             | POST: a practice quiz for a milestone (2 credits); `/quiz/result` POST { wrong[] } → flashcards + a review_weakness memory |
| `/api/cards`                       | GET the knowledge library, grouped by item |
| `/api/courses`                     | POST a syllabus (PDF or up to 10 photos, base64) → a course item with its units in order |
| `/api/items/[id]/understanding`    | GET the confirm card (intent, kind of practice, goal, date, and the choices); PUT to confirm or change it |
| `/api/items/[id]/roadmap` (PATCH)   | Choose or write the goal: re-plans toward it (a fresh roadmap if nothing is done yet, else the milestones ahead) |
| `/api/items/[id]/roadmap`          | Read the roadmap (GET) or regenerate it (POST); also generated on Start |
| `/api/steps/[id]/complete`         | Complete a step; finishing a milestone re-plans the rest |
| `/api/projects`, `/api/journal`    | Project content + journal                       |
| `/api/pomodoro`                    | Start / finish sessions                         |
| `/api/knowledge/*`                 | Draft, review, explain-it-back                  |
| `/api/pet/*`                       | State, feed, rename, sliders, equip, revive, rest mode |
| `/api/assistant`                   | Pet chat (stuck, teach me, questions)           |
| `/api/store/*`                     | Catalog, buy with credits                       |
| `/api/credits/*`                   | Balance and today's free usage (`GET /api/credits`); history and checkout later |
| `/api/weather`                     | City weather (KV cached)                        |
| `/api/sources/[source]`            | Connect (OAuth start/callback), disconnect, list channels or boards; `POST /api/sources/[source]/sync` imports now |
| `/api/collections`                 | List collections; set a channel's mode (do / curated / references) and the goal it feeds |
| `/api/extension/token`             | Create or revoke a device connection token for the extension (until sign-in exists) |
| `/api/export/*`                    | Notion connect + run, Obsidian zip              |
| `/api/push/*`                      | Subscribe / unsubscribe                         |
| `/api/webhooks/payments`           | Add credits after confirmed payment             |
| `/api/plan`                        | Place steps in time blocks, move them, reshuffle, daily shutdown |
| `/api/plan/periods/[kind]`         | Year, half-year, quarter (any generic period): GET goals, themes, review questions and the shortlist from the period above; POST the plan |
| `/api/plan/month`                  | GET the month's goals and not-this-month list; POST the review and the 1–3 picks; PATCH to bring one item back |
| `/api/plan/week`                   | POST the blocks you have (day + time or anchor + place) → the pet's filled week to adjust (free, no AI); PUT to save it |
| `/api/plan/day`                    | GET a day's blocks in rank order (default today) and the one Today shows |
| `/api/plan/shutdown`               | GET the wrap-up (done today, what moves, tomorrow's top 3 pre-filled, whether it's due); POST to apply it and save a session summary |
| `/api/plan/tomorrow`               | POST up to 3 step ids, most important first: tomorrow's top 3 (Ivy Lee) |
| `/api/plan/slots/[id]`             | PATCH to move a block (day, time or anchor, place); DELETE to unplan it |
| `/api/plan/reshuffle`              | GET missed blocks with suggested slots and the never-miss-twice pick; POST the moves you OK |
| `/api/plan/busy`                   | POST the blocks you really have this week → what stays and what moves; PUT to apply |
| `/api/plan/fit`                    | POST { itemId } → the related item and the fit-it-in offers; PUT { itemId, choice } to apply one |
| `/api/choose`                      | Help me choose: compare options for a step (web search) |
| `/api/ideas/fit`                   | Suggest how a new idea fits the current plan    |
| `/api/voice`                       | Upload a voice ramble → transcript → ideas      |
| `/api/memories/receipts`           | GET the memory receipt: the Walrus Memory account on Sui read through Tatum (type, owner, version, last change with time), plus how many of your memories reached Walrus |
| `/api/memories`                    | GET what the pet knows, grouped; `DELETE /api/memories/[id]` removes one (its facts are left out of recall); `POST /api/memories/forget { confirm: true }` forgets all. Receipts from Sui come with H11 |
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
MEMORY_NAMESPACE_PREFIX=       # optional; default createthings-dev locally, createthings in production

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
| Best Walrus Memory          | $500              | "Deepest learning loop. Memories that visibly change the product": the pet's picks, plan changes and answers change because of memory, and it says why. Uses Walrus's own AI too: `analyze` on rich summaries, `remember` for one-fact memories, `recall` before every AI decision with citations, `embed` for fit-it-in and what's next (pet chat uses our own recall instead of `withMemWal`, see §10) |
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
17b. Intents and practice kinds as registries; confirm card at Start; roadmap goal and proving grounds; "I want to…" input; follow a course from a PDF or photos (with class dates); try-it-out tasters
17c. Longer horizons: year, half-year and quarter plans as a period registry, each feeding the one below, with reviews (yearly integrity report)

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
38b. Sources as plug-in adapters; collections (suggested by the app, kept in one tap); build from a collection (thread, ideas, make, learn, keep growing); Pinterest adapter on the library or MCP built for it
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
