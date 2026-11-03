# createthings — Design PRD

**For:** the product designer (human or agent) designing createthings v2
**Version:** 1.0 · 1 November 2026 · Source of truth for product rules: [Project Breakdown.md](Project%20Breakdown.md) · Stories: [user-stories.md](user-stories.md) · Pet model spec: [pet-state-machine.md](pet-state-machine.md)

---

## 0. How to use this document

- **Part A** explains the product, who it's for and the rules every screen must follow.
- **Part B** describes the systems that appear on many screens (the pet, the living interface, cards, the confirm card, costs, citations).
- **Part C** goes process by process. Each one has: what it's for, how the user gets there, the screens and steps, every state (empty, loading, error, success), example copy, the data the screen receives from the server, and edge cases.
- **Part D** lists open questions only the product owner can answer, and an appendix of data shapes.
- **Build status** is marked on every process: **Built** (the server is done and tested; only the screens are missing), **Designed** (rules decided, not built yet) or **Later**.
- **Visual direction is open.** The previous "Zine" look (yellow/black, brutalist) is retired. **There will be 5 visual themes at launch** (3 Nov 2026); the product owner is briefing them directly. Every screen must work in all five, so build on shared tokens (colour, type, spacing, radius, motion), never on one theme's look. This PRD defines behaviour, hierarchy and content, not a visual style. Where a visual idea is part of the product itself (dust, cobwebs, weather, the 3D pet), it's described as a requirement.

---

# Part A — The product

## A1. In one paragraph

createthings is an **active partner for scattered people**: people with a long list of things they want to make, learn or try, who keep doing none of them. It turns a pile of saved links, screenshots and notes into **one clear next step**, plans small steps around real life, **bends the plan when life gets in the way** instead of letting it break, and keeps what they learn so it compounds. A **3D pet** lives in the app: it pushes them toward the next step, remembers their goals and habits (on Walrus decentralised memory), eats when they do real work, and gets hungry, runs away or dies when they don't.

## A2. Who it's for

Anyone who is scattered: designers, developers, writers, students, hobbyists, people learning a language, an instrument, gardening or cloud engineering. Not tied to a profession. The AI adapts to **what they're trying to do** (learn, make, follow a course, try something, tend something, build a habit), not to a job title.

Design for someone who:

- opens the app tired, distracted, or after a week away, and feels a little guilty
- freezes when shown many options
- needs to know **exactly** what to do in the next 2 minutes
- is on a phone as often as a laptop

## A3. The problems we solve (in the order they stop people)

1. **Too many options**: the pile becomes guilt.
2. **No idea where to go next**: no next step, no idea what to search for or which tool to use.
3. **Nothing pushes them**: to-do lists are passive.
4. **Plans break**: something comes up and reshuffling feels like starting over.
5. **Learning doesn't stick**: the next attempt starts from zero.

**North star:** momentum when plans change. Always a next step, a push to take it, and a plan that bends instead of breaking.

## A4. Design principles (and what they mean on screen)

| # | Principle | On screen |
|---|---|---|
| 1 | **Fewer choices, not more** | One thing at a time. Today shows one block. Pick for me shows one suggestion. Triage shows one card. |
| 2 | **Starting beats planning** | Every screen leads to a first action within a minute. The primary button is always "do it now". |
| 3 | **There is always a next step** | No dead ends. Every finished state shows what's next; every empty state has a way forward. |
| 4 | **Plans bend, they don't break** | Missed things are offered new slots, never shown as failures. No red "overdue" lists. |
| 5 | **Never miss twice** | After a missed day, the smallest version of the step is the hero of Today. |
| 6 | **Obvious, easy, satisfying** | Every step has a **2-minute version** shown prominently; completing anything gives an immediate reward (pet eats). |
| 7 | **Protect focus** | During focus sessions the interface goes calm; new ideas are parked, not followed. |
| 8 | **Letting go counts as progress** | "Let it go" is a positive, celebrated action, never a delete with a warning tone. |
| 9 | **Limit what's in progress** | 1–3 items in Focus (default 1). Starting another means pausing one. |
| 10 | **Learning compounds** | Recall questions, flashcards, "what carries over" shown when finishing. |
| 11 | **Identity over outcomes** | Celebrate who they're becoming ("12 sessions: you're someone who designs now"), not just numbers. |
| 12 | **No guilt, real consequences** | Neglect shows (dust, a hungry pet), but copy is warm and there's always a free way back. |
| 13 | **Showing up beats skipping** | Two minutes or two lines always counts and is rewarded. |
| 14 | **The interface shows how you've been doing** | You can tell at a glance (dust, the pet's mood) without reading a number. |
| 15 | **You can't buy your way out** | Paid things are cosmetic or extra AI, never progress. |
| 16 | **Plan in layers, act on one thing** | Year → quarter → month → week → day, but Today shows only #1. |
| 17 | **Learn the way brains learn** | Breaks are framed as part of thinking; recall beats rereading. |
| 18 | **Everything you see explains itself** (2 Nov 2026) | Every number, badge, dot and state says what it is and leads to it: the badge's 5 opens the 5 reviews; "Saved to your inbox" links to the inbox; every save shows what was saved. Nothing appears without a way to see why and act on it. |

## A5. Voice and tone

- **Plain words.** Short sentences. No jargon, no productivity-speak, no blockchain words in the main UI.
- **The pet speaks** for the app in bubbles, notifications and chat. Its personality (species, breed, a gentle↔savage **tone slider**) changes *how* it says things, never *what* it advises.
- **Warm, never guilt-tripping.** "Missing once is fine. Let's not miss twice: just open the piano app today." Never "You failed to…".
- **Honest.** When something can't be fully done (Walrus can't erase data), say so plainly.
- **No deadline pressure language** ("hurry", "only X days left") unless the user set a target date themselves, and even then gentle.

## A6. Surfaces and platforms

| Surface | Role | Notes for design |
|---|---|---|
| **PWA (web app)** | The main app: Today, pet, plans, roadmaps, chat, memory, settings | Installable on phone and desktop; **mobile-first**; partly offline (last synced state readable) |
| **Browser extension** | Quick capture on laptops; badge shows pet mood and reviews due; lightweight pet in the popup | Popup is small (~360×560); capture must take under 5 seconds |
| **Desktop app** | Later: the PWA wrapped | No separate design |

Accessibility is required everywhere: WCAG AA contrast, full keyboard use, screen-reader labels for the pet's state ("Biscuit is hungry"), and **reduced-motion** settings respected (the pet, dust and weather calm down or go static).

---

# Part B — Systems used across screens

## B1. The item and its life

Everything the user saves is an **item**. An item moves through statuses; the designer should give each a clear, calm visual identity.

| Status | Meaning | Where it lives |
|---|---|---|
| Inbox | Just captured, being analysed | Inbox / "new things" |
| Ready | Analysed, waiting to be sorted | Inbox / triage |
| Shortlist | Kept: something they want to do | Shortlist |
| Focus | Being worked on now (1–3 max) | Today, project space |
| Paused | Stopped, progress kept | Shortlist (marked paused) |
| Done | Finished | Library / history (celebrated) |
| Archived | Let go | Hidden; recoverable |

Extra flags an item can carry:

- **Parked until a date** ("not this month", or parked from fit-it-in): shown as quietly set aside, with the date it comes back
- **Intent**: learn a skill · make something · follow a course · try it out · grow or tend something · build a habit (each could have an icon)
- **Kind of practice**: body and hands · knowledge · real world and living things · creative · people and language
- **Goal**: "By the end you'll be able to…"
- **Target date** (optional): exam day, trip, deadline
- **Size** (afternoon / weekend / week / month) and **difficulty** (easy / medium / hard)

## B2. The pet (present on almost every screen)

The full model spec (life states, activities, reactions, animation list) is in [pet-state-machine.md](pet-state-machine.md). **The pet exists in the product, not only on screen:** its state, meals, hunger and feed history live on the server; the design makes them visible. Design needs:

- **A room on Today** (its home: bed, bowl, toys, memorial shelf) and **a roaming mode** on other screens where it walks along edges.
- **Rules:** it moves away from the cursor, never covers text being typed, goes quiet during focus sessions, can be **minimised** or **shooed**.
- **Speech bubbles** (Level 1, free): the next step, tips, reminders. One bubble at a time, dismissible, never blocking a button.
- **Click/tap the pet** (Level 2, free): a small radial or sheet of actions: start a pomodoro, log a 5-minute check-in, open reviews, pick my focus, **talk to me**.
- **Chat** (Level 3, costs credits): see process C13.
- **Moods follow hunger**, which is calculated from time since last fed:

| Days without food (default) | State | What you see |
|---|---|---|
| 0–2 | Happy | Lively pet, clean app |
| 3–6 | Peckish | Light dust |
| 7–13 | Hungry | Cobwebs, food-scrap bones |
| 14–29 | Starving | Heavy dust, empty bowl, pet weak |
| 30–59 | Ran away | Empty bed, pawprints |
| 60+ | Died | Skeleton, the pet becomes a memorial |

- **Personality** (set by species and breed: a golden retriever is eager to help, a husky is dramatic, a cat is sarcastic, a dragon is proud and blunt) plus a **tone slider** from gentle to savage. Personality changes **how** the pet says things, never **what** it advises. Every bubble, nudge and chat reply is written in it.
- **What feeds it** (only real work on Focus items; saving never feeds it):

| Action | Food |
|---|---|
| Pomodoro completed / stopped after 10+ min | Meal / snack |
| Roadmap step done | Meal |
| Journal entry about Focus work | Snack or meal, by depth |
| Check-in ("did 5 minutes") | Snack |
| Card created / review session finished | Snack |
| Focus item finished | Feast |

- **Daily food limit**, so one marathon day can't cover a week. A full pet says so (*"I'm stuffed, come back tomorrow"*).
- **Feed history, always visible** (principle 18): tapping the pet or its bowl shows what fed it and when (*"Ate: step done, Tue · journal, Wed · reviews, Thu"*) and why it's hungry (*"Last fed 3 days ago"*). Hunger never looks random.
- **Hunger follows your rhythm** (proposed, B10): measured in missed check-ins, not days, so someone who checks in weekly isn't punished on day 3.
- **Feeding moments** need a satisfying animation: food flies from the completed thing (step card, pomodoro timer, journal) into the pet's mouth, happy hop. Sizes: snack, meal, feast.
- **Species at launch:** dog, cat, fluffy monster, dragon, each with breeds. 3D, fluffy↔tough sliders, accessories on shared attachment points (head, face, neck, back, hand).
- **Micro-interactions:** see Breakdown §10 (cursor nearby → ears perk; drag → wriggle; typing → walks over and "reads"; long idle → bats at a card; late night → sleepy, suggests stopping).
- **Liveliness setting:** calm / normal / chaotic.
- The app must **work fully without a pet** (after death, or if hidden).

**Data (built 3 Nov 2026):** `GET /api/pet` → `{ pet: { pet: { name, species, breed, personality, food, growth }, mood: happy|peckish|hungry|starving|ran_away|dead|resting, daysWithoutFood, why, next, today: { eaten, limit, full }, comingHome: { done, needed } | null, history: [{ label, size, at }] } | null }` (`why`: *"Last fed 3 days ago (step done: sketch the layout)."*; `next`: *"Gets hungry in 4 days without food"*). `POST /api/pet { species, breed, name }` adopts; `GET /api/pet/species` lists species and breeds with personality and gentle/savage sample lines. Actions that feed return `fed`: `{ status: fed|full|coming_home|already|no_pet|dead, size, … }` so the feeding animation knows what to show.

## B3. The living interface (neglect and weather)

- **Neglect** follows the hunger states: dust → cobwebs → bones → empty bed/pawprints → skeleton. Only on **Today, the project space and the extension**; settings, help and account stay clean.
- Interactive: hovering a cobweb sways it, clicking tears it, dust lifts where the cursor moves.
- **Coming back is the reward:** the first feed after a gap plays a **sweep-clean animation**.
- **Weather** from the user's city (no permission prompt; city only): rain streaks, fog, snow building on cards, sun rays, lightning, wind moving cobwebs. Day/night and seasons. The pet reacts (raincoat, hides from thunder, sunbathes).
- **Never block buttons or hide text.** Reduced motion turns effects off or static.
- Options: "weather from anywhere" (Tokyo rain while in Lagos) or off.

## B4. Card patterns

Design a consistent card family:

- **Item card**: title, image or colour palette (extracted from what was saved), intent icon, size and difficulty, status, goal line.
- **Step card**: the roadmap's unit of work (see C6). Must surface, in order of prominence: the **2-minute start**, the step title, minutes, then **what to search for** and **tools**, and the **recall question** after.
- **Proof card** ("prove it" / proving ground): a real song, lab or piece at the end of a milestone. Visually special (it's the reward of a milestone), with "how to find it" search terms. Never shows sheet music or lyrics.
- **Block card**: a step placed in time, written as a sentence: *"I will spend 25 minutes on chord shapes on Tue at 08:00 at my desk."* States: planned, today's #1, done, missed, "before Tue's class".
- **Memory card**: one thing the pet remembers, in plain words, with its group and date.

## B5. The confirm card ("Is this what you meant?")

A recurring pattern. When the user starts something or picks it for the month, the pet shows what it understood:

> *Looks like you want to **learn a skill**: Learn jazz piano chords. Goal: play Autumn Leaves with shell voicings. Right?*

- **One tap confirms.** Each part (intent, kind of practice, goal, target date) is **tappable to change** from a short list (all choices come from the server).
- Nothing is planned until confirmed, so this must feel light, not like a form.
- A correction is remembered; no need to tell the user that explicitly beyond a small "Got it" acknowledgement.

## B6. Costs, credits and the free quota

- AI actions cost **credits**: chat 1, Pick for me 1, next-thing 1, analysis 2, re-plan 3, reading a syllabus 3, roadmap 5. A **free daily quota** (20/day in production) is used first.
- **Show the cost before** any paid action that the user starts directly (chat send, regenerate roadmap, change goal). Automatic ones (analysis after capture) don't need a prompt.
- A small, always-reachable **credit meter** (free left today + bought balance). Never alarming.
- **Running out never blocks** capture or anything already made: the item is saved and shows "waiting for credits" with a retry.
- Many things are **free by design** and should feel instant: week filling, reshuffle offers, fit-it-in offers, the free fallback of Pick for me.

## B7. Citations ("why the pet said that")

Chat replies, Pick for me and next-thing suggestions return **the memories they used**. Show them as small, expandable chips under the reply ("Based on: you struggled with left-hand stretches · your goal: Blue Bossa"). This is a key trust (and hackathon) moment: the pet visibly uses memory.

## B8. Honest notes

When the system can't do what a word implies, say it plainly in a calm note component. Main case: deleting a memory (see C18): *"Removed from what your pet uses. Walrus can't erase data, so the encrypted copy there is never read again and expires on its own."*

## B9. Universal states

Every screen needs: **empty** (always with a way forward, often the pet suggesting it), **loading** (AI work can take 10–60 seconds: show the pet "thinking", never a frozen spinner), **error** (plain words + retry; planning errors come back from the server as text), **success** (with the pet reacting).

---

## B10. User types and templates — *Designed (3 Nov 2026); options tested with A/B variants*

Different people use the app differently: making jewelry, learning a concept and following a course each need their own rhythm, prompts and idea of "done". A **template** is a bundle of starting settings picked in onboarding; **everything in it stays editable**, and each goal can override it.

**A template sets:** check-in rhythm (daily, every N days, weekly, chosen days, and a time) · journal prompts · what feeds the pet · what "done" looks like (proof, proving grounds) · plans (weekly plan day, daily shutdown on/off) · reviews (on/off, daily cap) · likely goals (intents) · suggested sources · how lenient the pet is.

| User type | Rhythm | Journal prompt | Feeds the pet | Reviews |
|---|---|---|---|---|
| Jewelry / crafts | Every 2 days | What did you make? Photo of the piece | Pieces, techniques | Off |
| Photography | Daily photo or weekly shoot | What did you shoot? One you're proud of, and why | Shots logged, challenges | Off |
| Illustration / art | Daily sketch | What did you draw? What's still hard? | Sketches, pieces | Off |
| Designer (UI, brand) | Weekly | What did you design? What did you borrow from? | Pieces, reference studies | Off |
| Music (instrument) | Daily practice | What did you practise, at what tempo, what's still rough? | Practice sessions, songs | On |
| Writing | Daily | How many words? What surprised you? | Words, pieces | Off |
| Learning a concept | Daily, short | Explain it in two lines, as if to a friend | Sessions, explanations | On |
| Following a course | The class schedule | What from today's class is still fuzzy? | Classes prepped, units | On + quizzes |
| Exam / certification (e.g. cloud engineer) | Daily 25 min | What did you build or break in the lab? | Labs, practice exams | On + quizzes |
| Language | Daily | Three new words, used in a sentence | Practice sessions | On |
| Fitness / habit | Daily one-tap check-in | Did it? How did it feel? | Check-ins | Off |
| Garden / tending | Weekly + seasonal | What changed? What needs doing? | Tend sessions, harvests | Off |
| Explorer ("I'm scattered") | Weekly | What did you try? Keep, park or let go? | Tasters | Off |
| Custom | You choose | Your own prompts | You choose | You choose |

**Editing:** Settings → Your rhythm (template, check-in rhythm and time, prompts, reviews, pet leniency); each goal has its own rhythm (*"jewelry every 2 days, cloud cert daily"*). Changing a template never deletes anything.

**Tested, not guessed (A/B variants):** where there's no clear right answer, new users get one of a few variants as their *defaults*, and we keep what works better (first step done, check-ins kept, coming back after a week). They can always change their own settings. First experiments: how onboarding asks (pick types / describe in a sentence / both), a short or full template list, one type or several, hunger counted in days or in missed check-ins, gentle or firmer default pet timeline.

**Design:** every variant needs its own screen state (e.g. the type grid, the sentence box, or both); template cards with an illustration per type; a plain-words summary (*"You'll check in every 2 days at 7pm. Your pet eats when you log a piece. Weekly plan on Sundays."*); a rhythm picker (Daily · Every [2] days · Weekly · Pick days, plus a time).

---

# Part C — Processes

Each process lists the data the server already provides. Field names are given so the designer knows exactly what can be shown.

---

## C1. Onboarding — *Designed* (auth is built last)

**Goal:** from first open to "one thing picked" in under 3 minutes, with an app that already fits how this person works.

**Steps:**

1. **Sign in:** magic link or Google; optional 2FA later in settings.
2. **"What brings you here?"** Pick 1–3 user types (B10 cards), or describe yourself in a sentence (*"I make silver rings and want to sell them"*) and the app suggests a template.
3. **Your rhythm, in plain words:** the template's summary (*"You'll check in every 2 days at 7pm…"*) with everything changeable on the spot: rhythm (daily / every N days / weekly / pick days), time, reviews on or off.
4. **Meet your pet:** pick a species and breed. **Each choice shows its personality**: the pet animates and says the same advice in its own voice (golden retriever: *"Let's go! Just 5 minutes on the chords?"*; cat: *"Five minutes. Even you can manage that."*), and the **tone slider** (gentle ↔ savage) changes the sample line live. Then name it and set fluffy↔tough.
5. **How lenient is it?** The pet's timeline, explained gently, in check-ins for the chosen rhythm (defaults: runs away after 30 days' worth, dies after 60; minimums 10 and 21 shown). Rest mode mentioned.
6. **"What's on your mind?":** add 3–5 things (type, paste links, voice, import a course or Are.na). Each becomes an item; the confirm card checks the first one.
7. **Land on Today:** the pet in its room, a bubble in its personality: *"Let's pick one thing."*
8. **Install the extension** (an optional card on Today, not a step): connect it in one tap once sign-in exists.

**States:** every step after sign-in can be skipped with sensible defaults (template: Explorer; pet: the default species). Skipping the brain dump gives an empty Today with "Save your first idea". The timeline step explains consequences gently, never threatening.

---

## C2. Capture — *Built* (links, notes, screenshots and images; uploads wait for file storage)

**Goal:** save anything in seconds, see exactly what was saved, and undo a wrong save in one tap; analysis happens in the background.

**Entry points:**
- **Extension:** popup (save page, screenshot, pick area, "I want to…"), right-click a link / image / selected text / the page, **Alt+Shift+S** (save page) and **Alt+Shift+A** (pick area), and a Save button on posts on X, Pinterest, Are.na, YouTube, Instagram, Dribbble, Behance, Reddit and GitHub
- **App:** quick add on Today, **"I want to…"** sentence (typed, or spoken as a voice ramble), course import (PDF, photos, pasted text)
- **Phone:** PWA share sheet

**Every save shows what was saved** (one pattern everywhere, extension toast and in-app alike):
- A small card: a **thumbnail** (the screenshot, the saved image, or the page's own preview image) or, with no image, a square saying the kind (Link, Text, Image); the **title**; a detail line (the site, the start of a note or the selected text, "Watch from 4:12")
- Clicking the thumbnail shows it bigger, so a screenshot can be checked
- Under it: **"Saved. Keep as reference instead · Undo"** (or "Kept as a reference. Make it a to-do instead · Undo"); stays 6 seconds, longer while hovered
- Voice and course import show their own review step instead (what was heard / the units found) before anything is saved

**Flow:** save → card + Undo → item appears as **Inbox** (or **Reference**) with an "analysing" state → when ready (usually seconds), status becomes **Ready** and the card fills in (title, colours, summary, intent, size). The pet sniffs the new card next time the app opens.

**Data:** `POST /api/items` → `{ item, analysis: 'queued' | 'running inline (dev)' }`. Then `GET /api/items/[id]` → `{ item, analysis }`. Undo: `DELETE /api/items/[id]`. Switch: `PUT /api/items/[id]/reference { reference }`.

**States:** analysing; ready; **analysis failed** (`item.analysisError`, retry via `POST /api/items/[id]/analyze`); **out of credits** (saved, "waiting for credits"); **couldn't save** (the reason, e.g. not connected); **offline** (extension: "Saved on this device; sends when you're online").

**Copy:** quick add placeholder: *"What do you want to make, learn or try?"*

---

## C3. Item detail (analysis view) — *Built*

**Goal:** understand what was saved and what it would take, without overwhelm.

**Shows:** title, source and author, image or palette, one-line summary, intent + kind of practice + goal + target date, size and difficulty, skills needed. For visual captures: technique, colours, typography, layout, mood, components, notes for developers and for creators, and a starting **brief**.

**Primary actions:** Start (→ confirm card) · Keep for later · Let it go. If it has a roadmap: open roadmap.

**Design note:** the analysis has many fields; lead with summary, goal and size. Put the deep breakdown (typography, layout…) behind "See the breakdown".

**Data:** `GET /api/items/[id]` → `item` (title, intent, practiceKind, goal, targetDate, size, difficulty, status, parkedUntil…) and `analysis` (summary, technique, colors {palette, notes}, typography, layout, mood[], style, components, forDevelopers, forCreators, brief, skills[]).

---

## C4. Triage (sort the pile) — *Built*

**Goal:** turn a pile into a short Shortlist fast.

**Flow:** Today shows "Sort 12 new things" → one card at a time, full screen on mobile: **Keep · Let go · Later** (swipe or buttons) → summary: *"Kept 3, let go of 8. Nice clearing."* (letting go is celebrated).

**Data:** `POST /api/triage { itemId, decision: keep | let_go | later }`.

---

## C5. Pick for me + Start — *Built*

**Goal:** remove the choice. One suggestion they can start now.

**Flow:**

1. Today with nothing in Focus → **Pick for me**.
2. Two quick questions: **time** (15 / 30 / 60+ min) and **energy** (low / normal / high). Big tappable chips.
3. One suggestion: item title, **why** (a sentence), **first step**, **2-minute start**, and **citations** (memories used).
4. **Start** · **Not today** (next suggestion) · **Let it go**.
5. Start → **confirm card** (B5) if not confirmed yet → once confirmed, the roadmap is planned in the background (show the pet "planning", 20–60 s) → Focus.

**At the Focus limit:** a sheet: *"You're working on Beginner Guitar. Pause it to start this?"* with the current Focus items and Pause buttons.

**Stop and continue:** starting a paused item again shows *"Welcome back to Learn Jazz Piano Chords. You'd done 1 of 9 steps; next up: …"* with its 2-minute start.

**Data:**
- `POST /api/focus/pick { minutes: 15|30|60, energy, exclude[] }` → `{ item, reason, firstStep, twoMinuteStart, memoriesUsed[], pickedBy }` (`pickedBy: "rule"` means the free fallback was used).
- `POST /api/focus/decide { itemId, decision: start | not_today | let_go }` → `started` with `{ item, resumeAt, confirm }` or `at_limit` (409) with `{ limit, focus[] }`.
- `POST /api/focus/pause { itemId }`. `GET /api/focus`.

---

## C6. The roadmap (navigation) — *Built*

**Goal:** always answer "what now?", including what to search for and which tool to use.

**Structure:** a **goal** at the top ("By the end you'll be able to…"), then **milestones**, each a list of **steps**, ending (for learning goals) with **proof** steps (proving grounds). Only the **current step** is prominent; the rest collapse.

**The current step card shows:**

- the **2-minute start** (the easiest way in) as the hero
- the step title and minutes (15–30)
- **What to search for**: tappable search terms (open a web search)
- **Tools**: chips
- **Recall question** (learning steps): shown after the step: *"Close the tab: what are the 3rd and 7th of Cmaj7?"*
- Done button (the pet eats), "I'm stuck" (→ C13), "Teach me this" (→ C13)

**Goal options:** the goal shows **2 alternative goals** to switch to, or "write your own". Switching re-plans (show cost: 5 credits if nothing is done yet, 3 if some is).

**Proving grounds:** real songs, labs, pieces, harvests, celebrated as milestone finales, with search terms to find chords or instructions.

**Re-planning:** when a milestone is finished, later milestones are rewritten in the background from what was learned. Show a gentle "Your plan just adjusted to what you've done" with what changed.

**Course roadmaps:** milestones are the course's units, in order, with their class dates (see C11).

**Taster roadmaps:** a single milestone of 2–3 sessions (see C12).

**Finish:** when the last step is done → *"That's the whole roadmap. Finish it?"* (→ C14).

**States:** planning (pet working; can take up to a minute); **planning failed** (`planError` text + retry); no roadmap yet ("Plan it" button, cost 5).

**Data:**
- `GET /api/items/[id]/roadmap` → `{ roadmap: { roadmap: { goal, goalOptions[], style, skills, resources, progress }, milestones: [{ title, done, steps: [{ id, title, minutes, twoMinute, searchTerms[], tools[], recall, kind: 'step'|'proof', doneAt }] }], currentStep, doneSteps, totalSteps }, planError }`
- `POST /api/items/[id]/roadmap` (plan from scratch) · `PATCH /api/items/[id]/roadmap { goal }` (switch goal)
- `POST /api/steps/[id]/complete` → `{ roadmap, milestoneDone, replanning, decide (tasters), readyToFinish, quizReady, fed }`

---

## C7. Today (home) — *Built (data); screen not built*

**Goal:** open the app and know the one thing to do now.

**Shows, in this order:**

1. The **pet's room** (mood, neglect, weather).
2. **Today's #1**: the first block not done, as a sentence ("I will … at 08:00 at my desk") with its 2-minute start and a big **Start** (pomodoro) or **Done**.
3. If nothing is planned: the current Focus step, or **Pick for me**.
4. Small entry points: reviews due, "Sort 12 new things", the plan for the week.

**Never** show the whole list of today's blocks by default; #2 and #3 appear after #1 is done (or behind "see today").

**Special states:**
- **Never miss twice** (after a missed day): the hero becomes yesterday's step's **2-minute version** with the pet's line: *"Missing once is fine. Let's not miss twice: just open the piano app today."*
- **Missed blocks** waiting: a calm strip "2 blocks moved? Let's place them" → C9.
- **New month / new week**: the pet offers the month or week plan (C8).
- **Coming back after a gap**: sweep-clean animation, pet runs to the screen.

**Data:** `GET /api/plan/day?date=` → `{ day, blocks: [{ slotId, position, startTime, anchor, place, missed, intention, step {id,title,minutes,twoMinute,recall,done}, item {id,title} }], first }`. `GET /api/plan/reshuffle` for misses (C9).

---

## C8. Planning: year → half → quarter → month → week → day — *Built*

**Goal:** plan in layers without feeling like planning; each layer feeds the next.

### C8.1 Month (two lists) — offered on the first open of a new month

1. **Quick look back** (skippable): what moved, what you learned, anything to let go. Free text.
2. **"Which 1–3 matter this month?"**: pick from **suggested** (the quarter's goals) first, then Focus and Shortlist.
3. Everything else goes on **"not this month"**, parked until next month (never deleted; a calm list they can bring items back from).
4. Cards to confirm any unconfirmed goals (B5).

Data: `GET /api/plan/month` → `{ month, name, planned, goals[], notThisMonth[], suggested[] }`; `POST /api/plan/month { goalItemIds, review? }` → `{ month, parked, toConfirm[] }`; `PATCH /api/plan/month { itemId }` (bring back).

### C8.2 Week — on the weekly plan day (default Sunday 18:00)

1. *"How many blocks do you have this week?"* and **when**: for each block a day plus a time **or** a habit anchor ("after coffee"), and optionally a place.
2. The pet **fills them** with the next steps (free, instant). Each block reads as a sentence.
3. User drags, swaps or removes; blocks before a class are marked ("before Tue's class"). Nothing saves until **OK**.

Data: `POST /api/plan/week { blocks: [{day, startTime|anchor, place}] }` → `{ weekOf, blocks: [{…, step, intention, beforeClass}], classes[], needsRoadmap[] }`; `PUT /api/plan/week { blocks: [{…, stepId}] }`; move one block `PATCH /api/plan/slots/[id]`, unplan `DELETE`.

**Design challenge:** block creation must be fast on a phone (quick-add rows, common anchors as chips: after coffee, after lunch, after dinner, before bed).

### C8.3 Day (Ivy Lee) — in the daily shutdown (C16)

Rank **up to 3** blocks for tomorrow (pre-filled from the week). Today shows only #1.

Data: `POST /api/plan/tomorrow { stepIds: [1–3, in order] }`.

### C8.4 Year, half-year, quarter — optional

- **Year:** 1–3 **themes** in their words, **who they want to become** (one sentence), 1–3 goals, and a **yearly review** with integrity-report questions (*What went well? What didn't? What did you learn? Did you live by what matters to you?*).
- **Half-year:** pick goals from the year's.
- **Quarter:** pick 1–3 goals from the half's; each gets a **due date at the quarter's end**.
- Each period's goals become the shortlist of the one below.

Data: `GET/POST /api/plan/periods/[year|half|quarter]` → `{ name, startsOn, endsOn, planned, goals[], themes[], intention, review: { of, questions[] }, shortlist[], maxGoals }`.

**Design note:** these are reflective moments; they can be more spacious and calm than daily screens. Never force them.

---

## C9. Reshuffle (plans bend) — *Built*

**Goal:** missed things get new homes without guilt.

**Missed blocks:** a sheet listing each missed block with a **suggested new slot** (day, same time/anchor). One tap accepts all; each can be changed or **dropped** (back to the roadmap, not deleted). Nothing moves silently.

**Never miss twice:** if yesterday's blocks were all missed, offer yesterday's top step as **today's #1** in its 2-minute version (see C7).

**Busy week:** *"Only 1 block free this week? Here's what moves to next week: …"* user gives the blocks they really have → sees what stays and what moves → OK.

Data: `GET /api/plan/reshuffle` → `{ today, missed: [{…block, day, suggestion}], neverMissTwice: { slotId, stepTitle, twoMinute, message } | null }`; `POST /api/plan/reshuffle { moves[], drop[], firstToday? }`; `POST/PUT /api/plan/busy`.

**Copy:** never "overdue", "failed", "late". Use "moved", "new slot", "let's place it".

---

## C10. Fit a new idea in — *Built*

**Goal:** a new idea mid-plan doesn't derail focus or get lost.

**Trigger:** something is captured while a plan is running.

**Shows:** which goal it relates to (found by meaning), then up to four offers in the pet's voice:

- *"This is about Learn Jazz Piano Chords. Add it as a step there?"*
- *"You set Sat–Mon for it. Swap Mon for this?"*
- *"Park it until Sunday?"*
- *"Write it down for 5 minutes now, then back to drop-2 voicings."*

The user picks one (or picks a different goal from the list). Nothing changes without a tap.

Data: `POST /api/plan/fit { itemId }` → `{ item, related {id,title,score} | null, candidates[], offers: [{ choice, label, relatedItemId?, day?, parkUntil? }] }`; `PUT /api/plan/fit { itemId, choice, relatedItemId?, parkUntil? }`.

---

## C11. Follow a course (syllabus upload) — *Built*

**Goal:** a course's own structure becomes the plan, with our help around it.

**Flow:**

1. "Add a course" → upload a **PDF** or **up to 10 photos/screenshots** (in order; let them reorder thumbnails before sending).
2. The pet reads it (10–40 s): show the pages being "read".
3. Result: course title, provider, **units in order with dates**, exam or end date → confirm card → roadmap with **one milestone per unit**.
4. In the week plan, classes appear as markers, and blocks before a class are tagged.

**States:** unreadable ("No units could be read. Try clearer photos, or the PDF itself." — refunded); reading; done.

Data: `POST /api/courses { files: [{ mime, data(base64) }], title?, note? }` → `{ item, units: [{ title, topics[], date }] }` (422 if unreadable).

---

## C12. Try it out (tasters) — *Built*

**Goal:** try something lightly before it becomes a big plan.

**Flow:** a "try it out" item gets **2–3 taster sessions** (each a different side, the cheapest way to try it). After the last one, the pet asks: *"That's your taster sessions for pottery done. Keep going with it, park it for later, or let it go?"*

- **Keep it** → becomes a full plan (choose what it becomes; default "learn a skill") → new roadmap (5 credits).
- **Park it** → choose a date (default next month).
- **Let it go** → celebrated, archived.
- Optional "why?" field (remembered).

Data: step complete returns `decide { message, choices }`; `POST /api/items/[id]/tasters { choice: keep|park|let_go, intent?, until?, note? }`.

---

## C13. Talk to the pet: chat, "I'm stuck", "Teach me this" — *Built*

**Goal:** help on the spot, using what the pet remembers.

**Entry:** click the pet → "Talk to me"; or on a step card: **I'm stuck** / **Teach me this** (these open chat in that mode with the step as context).

**Modes:**

- **Chat:** short answers (2–5 sentences), points at the next step.
- **I'm stuck:** first suggests a **short break away** (5–10 min), then **one** of a smaller step (under 10 minutes) or a completely different angle.
- **Teach me:** 3–5 short paragraphs with one concrete example, ending with "Turn this into flashcards?"

**Every reply** can show **citations** (memories used, B7) and, when the pet saved something, a tiny "Remembered: got stuck on drop-2 stretches" note.

**Cost:** 1 credit per message, shown on the send button or near the input when not covered by the free quota.

**Design:** the chat should feel like talking to the pet (its avatar, its voice), not a generic AI chatbot. It goes quiet during focus sessions.

Data: `POST /api/chat { mode: chat|stuck|teach, itemId?, stepId?, messages: [{role: user|pet, text}] }` → `{ reply, memoriesUsed: [{ text, distance, createdAt }], saved, model }`.

---

## C14. Finish and what's next — *Built*

**Goal:** finishing feels big, and what was learned carries into the next thing.

**Flow:**

1. Roadmap complete → *"That's the whole roadmap. Finish it?"* (+ optional note: "anything you learned?").
2. **Feast** animation (the biggest feeding moment), summary of steps done and skills built.
3. **What's next:** one suggestion with *why* and **what carries over** (skill chips), plus up to 3 alternatives. **Start** goes to C5's start flow.

Data: `POST /api/items/[id]/finish { note? }` → `{ item, next: { item, reason, carriesOver[], pickedBy, alternatives: [{id, title, shared[]}] }, fed }` (`fed`: the feast); `GET /api/items/[id]/next`.

---

## C15. Pomodoro + focus sounds — *Designed*

**Goal:** focused work sessions that feed the pet.

**Flow:** from a step → Start pomodoro (25/5/15 defaults, adjustable) → **the pet curls up and sleeps, the interface goes calm** (neglect and weather effects dim) → focus sounds fade in (optional) → end: *"What did you do?"* one-line note → feed (meal; stopping after 10+ min is a snack) → optional journal entry and card drafts → break: the pet wakes and plays (pet it, throw a toy, limited to break length).

**Focus sounds:** a mixer: noise (white/pink/brown), places (rain, café, library, train…), music (lo-fi, ambient), **your pet** (sleeping breath, purring, snoring by species). Volume per sound; weather suggests a mix (*"It's raining in Lagos. Rain + fireplace?"*). Starter set free; packs cost credits or are earned.

---

## C16. Daily shutdown — *Built (server); screen not built*

**Goal:** stop the day with a clear plan for tomorrow.

**At the user's shutdown time:** pet: *"Wrap up today?"* → what got done (sessions, steps) → what moves (unfinished blocks offered new slots) → **rank tomorrow's top 3** (pre-filled; drag to order) → #1 shows its 2-minute version → snack for the pet. Skippable, never nagging.

---

## C17. Knowledge review, flashcards and quizzes — *Built (server); in the extension popup; app screen not built*

**Goal:** what they learn comes back until it sticks.

- **Cards** come from finished learning steps (their recall questions become flashcards automatically), journal entries, pomodoro notes, or by hand. Types: question/answer and **explain it back** (they write it in their own words; AI points out gaps).
- **Daily review:** "3 reviews due" on Today (capped at 5/day) → one card at a time → **Got it / Shaky / Forgot** → next date set → snack. Cards from different topics are mixed.
- **Practice quizzes:** 5–10 questions at the end of a milestone and in the days before a target date (exam prep). Answers explained immediately; wrong answers become cards.
- **Knowledge library:** everything learned, by item or topic.
- **In the extension popup** (built): the badge shows today's reviews; the popup's Reviews box explains them (*"5 to review today: quick questions from steps you finished, so they stick"*) and runs them right there (question → Show answer → Forgot / Shaky / Got it).

---

## C18. What your pet knows (memory) — *Built*

**Goal:** trust. The user sees and controls what the pet remembers.

**Screen (in Settings or the pet's room):**

- Memories in **plain-word groups**: **Your goals · Plans and changes · What you learned · How you work**, newest first, with dates.
- Each memory: **Delete**. Top-level: **Forget everything** (strong confirmation).
- After deleting, show the **honest note** (B8). If the memory was part of a daily summary, the note says that summary is removed too.
- **Memory receipts** (later, with Sui): the account, how many memories, last change, link to view on-chain.

**Design note:** this is a privacy and trust screen; keep it calm and clear, never technical (no "namespace", "blob", "Walrus" in the main copy except in the honest note and an optional "how this works" explainer).

Data: `GET /api/memories` → `{ memories[], groups: [{ label, memories[] }] }` (each memory: `summary, type, createdAt, status`); `DELETE /api/memories/[id]` → `{ hiddenFacts, note }`; `POST /api/memories/forget { confirm: true }` → `{ forgotten, note }`.

---

## C19. Credits and the free quota — *Built*

**Goal:** costs are clear and never scary.

- A **credit meter**: "Free today: 14 of 20 · Credits: 120".
- A **buy credits** sheet: packs (e.g. $5 / $10 / $20, bonus on bigger). Payment method designed in C20.
- **Out of credits:** inline, calm: what still works for free (everything except AI extras), and buy or wait-until-tomorrow.

Data: `GET /api/credits`.

---

## C20. Payments with USDC on Sui (no gas, no wallet setup) — *Designed; decisions pending*

**Goal:** paying never shows gas, SUI or wallet jargon.

**Proposed flow:** sign in with Google → the app has a Sui address for them behind the scenes (zkLogin) → buy credits: pay with **USDC** (gasless transfer) or a card via an **on-ramp** widget (Coinbase or Stripe) → confirmed on-chain → credits arrive. **Pro answers** can be paid per request.

**Design:** one "Buy credits" flow with two clear options ("Card" and "USDC"), a pending state while the payment is confirmed (seconds), success, and a failed/unconfirmed state that **never charges and never generates**. Any crypto detail lives behind "details".

---

## C21. Neglect and return; the pet's life — *Designed*

- **Neglect** visuals per B2/B3; notifications from the pet (quiet hours respected).
- **Return:** starving → one feed sweeps clean; **ran away** → empty bed, *"3 days of activity bring Biscuit home"* with a visible progress of those days; **died** → memorial + skeleton, two choices: **revive** (credits) or **earn a new egg** (~7 days of activity, shown as an egg slowly warming).
- **Rest mode:** pause the clock for holidays or sickness (a calm "Biscuit is resting" room state).
- **Memorial shelf** in the room with each lost pet's signature item.

---

## C22. Notifications and the weekly digest — *Designed*

- Channels: extension badge, email, web push. **All in the pet's voice.**
- Types: block nudges at its time or anchor; stale items (*"You saved this 3 weeks ago, still want it?"* → Start / Let it go / Later); hunger; pomodoro end; reviews due.
- **Weekly digest:** focused hours and sessions first, then steps done, blocks kept and reshuffled, cards reviewed, how much the pet ate. **Identity language** (*"12 sessions: you're someone who designs now"*). Encouraging when the week was empty.
- Quiet hours (default 22:00–08:00) and per-channel settings.

---

## C23. Settings — *Partly built*

Sections: account (sign-in, optional 2FA) · pet (timeline, rest mode, liveliness, tone slider, sounds) · planning (Focus limit 1–3, weekly plan day and time, shutdown time, timezone) · reviews (daily cap) · notifications and quiet hours · weather (auto / city / off) · **what your pet knows** (C18) · credits and purchases · connections (Are.na, Pinterest later, Notion export, Obsidian download).

---

## C24. Collections and social accounts (X, Pinterest, Are.na) — *Designed (3 Nov 2026); built after the extension work*

- **Collections:** the app **groups similar saves for you** and suggests one (*"You've saved 9 riso posters. Keep them together?"*): one tap keeps, one ignores. Never a chore. Are.na channels, Pinterest boards and X bookmark folders arrive as ready-made collections.
- **Build from a collection:** find the thread (what connects it) · spark 3–5 ideas (each showing which items it came from) · make one · learn what's behind it · new items that fit are noticed.
- **Copy as you go** (per site, off until switched on): bookmarking on X or saving a pin also saves it here. What copies become is the user's choice: **ask me each time** (default), reference, or to-do. "Ask me" shows the prompt: *"From your X bookmarks: [card]. Do this · Keep as reference · Fit into a goal · Later"*, with Undo.
- **Bring in what you have:** on the X bookmarks page, "Import into createthings" (folders become collections); on a Pinterest board, "Import this board"; Are.na and later Pinterest connect as real accounts (choose channels or boards; daily sync).
- **Cost, always shown:** copies and imports are saved **without analysis** (free); the full analysis runs when the user picks Do this, triages, links to a goal or starts it. Going through an import: "Analyse next" / "Analyse 20" with the cost shown first.
- **Settings → Connections:** each account's state (connected, last sync, what it brings in), Connect / Disconnect, per-site choices, extension devices.

---

## C25. Help me choose — *Later*

When a step needs a tool choice (*"Figma or Penpot?"*): 2–4 options side by side **for this goal** (what each gives, price incl. free/student tiers, learning curve, trade-offs), each with a source and "checked on" date, ending with **one pick and a reason** that goes into the plan.

---

## C26. Voice ("just yap") — *Built (server); screen not built*

Hold the mic (PWA or extension) and ramble → transcribed → split into separate ideas → each sorted (new item · step for a Focus item · journal note · learning goal) → each goes through **fit-it-in** (C10) → the user approves what's added. A short summary is remembered. Audio and transcript stay private.

**Design:** a big, forgiving mic button; live waveform; a review list of the ideas found, each with its suggested destination and Approve / Change / Skip.

---

## C27. Journal and project space — *Designed (3 Nov 2026); not built*

**Goal:** writing down what you did is quick, feeds the pet, and turns into learning.

**What you journal is up to you:** a Focus item, any goal, or your day in general. The template sets the default (a crafts template opens on today's piece; a learning template on what you learned), and the journal can be pointed anywhere. **What feeds the pet** stays real work: entries about a goal you're working on.

**Ways to journal** (all land in the same journal, linked to whatever it's about):
- **Typed entry** in the project space or from the pet's actions
- **One-line check-in** (*"did 5 minutes on the chords"*), one tap from Today, the pet, the popup or a nudge
- **End of a pomodoro:** *"What did you do?"* (C15)
- **Daily shutdown line** (C16)
- **Voice ramble** (C26): journal notes are one of its destinations

**Prompts** come from the user's template (B10) and the step: *"What did you make? Photo of the piece"* for crafts, *"Explain it in two lines"* for learning a concept. Never more than one prompt at a time; a blank entry is always allowed.

**Feeding:** an entry about Focus work feeds the pet, snack or meal by depth. A free check decides: simple rules first (mentions the item or step, length), a small AI check only when unclear. Shown right away in the feed animation and history (B2).

**Learning:** "what I learned" entries can suggest flashcards (Approve / Skip), so journal → cards → reviews (C17). Entries about a Shortlist item ask *"Make this your focus?"*.

**Project space:** one page per Focus item: the roadmap, its journal, linked references, photos of what you made, the proof pieces.

**Privacy:** journal text stays in the app. The pet's memory gets short summaries only (*"Practised ii-V-I, still slow on the F"*), never the entry itself.

**Design:** the check-in is a single line with a send button; the journal reads like a dated timeline with photos; each entry shows what it fed (*"+ meal for Mochi"*).

---

## C28. Browser extension — *Built (capture, popup, reviews); more in build*

**Goal:** save from anywhere, see exactly what was saved, and see what the pet wants from you, without opening the app.

- **Connect:** paste a token now (made in Settings → Connections); one "Sign in with createthings" button once sign-in exists.
- **Popup**, top to bottom:
  - **Today's reviews** (the badge number), explained and doable right there (C17)
  - **Today's #1** with its 2-minute version (next)
  - **Save:** this page / screenshot / pick an area / "I want to…", with a note and "keep as a reference"
  - **Recent saves:** the last 8, each with its state (*Inbox · not analysed yet*, *Ready to sort*, *Reference*) and Undo
  - **The pet** (next): mood and why (*"Mochi is peckish: last fed 3 days ago"*), one-tap check-in
- **Saving anywhere:** right-click (link, image, selected text, page), Alt+Shift+S and Alt+Shift+A, Save buttons on posts (X, Pinterest, Are.na, YouTube, Instagram, Dribbble, Behance, Reddit, GitHub). Every save shows the toast with **what was saved** (C2).
- **Badge:** today's reviews; the pet's mood once shown; *!* when not connected. Every badge state is explained in the popup (principle 18).
- **When things go wrong:** offline (saves wait and send later; the popup shows what's waiting), out of credits (the save happens; analysis waits for the free quota), disconnected (back to Connect, nothing lost).
- **Settings in the popup:** per-site copy as you go and what copies become (C24).

---

# Part D — Open questions and appendix

## D1. Open questions for the product owner

1. **Visual direction** for v2 (the Zine theme is retired): **5 launch themes**, briefed by the product owner. Open: their names and looks, whether the user picks one in onboarding or Settings, and whether themes affect the pet's room and the living interface (weather, dust).
2. **Navigation model**: bottom tabs on mobile (e.g. Today · Plan · Inbox · Pet · Me) or a single Today hub with sheets?
3. **The pet's default species** for first impressions and marketing screens.
4. **How much of the plan to show on Today**: only #1 (current principle) or a collapsed list.
5. **Payments**: user's own wallet vs app-managed zkLogin address (affects C20 copy).
6. **Desktop layout**: does the pet's room stay large on wide screens, or become a side panel?
7. ~~User types, blending, hunger counting, "describe yourself"~~ → decided 3 Nov 2026: test the options as A/B variants (B10).
8. ~~Journal scope~~ → decided 3 Nov 2026: users journal whatever they choose; the template sets the default (C27).

## D2. Item fields (for every item card)

`id, title, sourceUrl, author, captureType (url|note|screenshot|upload|voice), status, intent, practiceKind, goal, targetDate, size, difficulty, parkedUntil, intentConfirmedAt, analysisError, planError, savedAt, lastActiveAt`

## D3. Plain labels

| Data value | Show as |
|---|---|
| intent: learn / make / course / try / tend / habit | Learn a skill / Make something / Follow a course / Try it out / Grow or tend something / Build a habit |
| practiceKind: body / knowledge / real_world / creative / people | Body and hands / Knowledge / Real world and living things / Creative / People and language |
| size: afternoon / weekend / week / month | An afternoon / A weekend / About a week / About a month |
| step kind: proof | "Prove it" / proving ground |
| memory groups | Your goals / Plans and changes / What you learned / How you work |

## D4. What's built vs designed (summary)

| Built (server ready, screens needed) | Designed (rules set) | Later |
|---|---|---|
| Capture (links, notes, screenshots, images), the extension (saving everywhere, the toast with what was saved, popup with reviews and recent saves), analysis, triage, Pick for me, Focus, confirm card, roadmaps (goals, proving grounds, re-plan), month/week/day + year/half/quarter plans, reshuffle, fit-it-in, courses, tasters, pet chat, finish + next, reviews/flashcards/quizzes, daily shutdown, voice, what your pet knows, credits | Onboarding with user types and templates, auth, the pet's life and feeding (server next), journal and project space, pomodoro + sounds, neglect visuals, weather, notifications/digest, payments, collections and social accounts | Help me choose, desktop app |
