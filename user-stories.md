# createthings — User Stories

**v2.0 · October 2026** · Source of truth: [Project Breakdown.md](Project%20Breakdown.md)

83 stories across 16 areas. Every story is written for one user: someone scattered, with too many things they want to do.

## Keys

- **Status:** `[ ]` not started · `[~]` partly exists in the old code and needs porting or changing · `[x]` done
- **Phase:** the build phase in Project Breakdown.md

---

## 01 · Accounts & Onboarding

| ID     | Story                         | Phase | Status |
| ------ | ----------------------------- | ----- | ------ |
| US-001 | Sign in                       | 0     | `[ ]`  |
| US-002 | Brain-dump what's on my mind  | 2     | `[ ]`  |
| US-003 | Choose and name my pet        | 4     | `[ ]`  |
| US-004 | Set my pet's timeline         | 6     | `[ ]`  |
| US-005 | Adjust my settings            | 2     | `[~]`  |

### US-001 — Sign in

> As a new user, I want to sign in quickly so that I can start without setting anything up.

- AC-01 Sign in with an email magic link or Google
- AC-05 Optional 2FA: the user can turn on an authenticator app (with backup codes) in settings; it is never forced
- AC-02 The extension signs in against the same account
- AC-03 No Notion account is needed
- AC-04 Turnstile runs on signup

### US-002 — Brain-dump what's on my mind

> As someone with too many ideas, I want to dump them all in at the start so that the app knows what I'm juggling.

- AC-01 Onboarding asks "What's on your mind?" and accepts 3+ quick entries (text or links)
- AC-02 Option to import an Are.na channel instead
- AC-03 Entries are saved as items and analysed in the background
- AC-04 Onboarding ends on Today with "Let's pick one thing"

### US-003 — Choose and name my pet

> As a new user, I want to pick a pet that feels like mine so that I care about feeding it.

- AC-01 Choose from dog, cat, fluffy monster, dragon, each with breeds
- AC-02 Set the fluffy ↔ tough slider and colors with a live preview
- AC-03 Name the pet; rename any time
- AC-04 Each species and breed shows a sample of its personality

### US-004 — Set my pet's timeline

> As a new user, I want to choose how long my pet can go without food so that the pressure matches my pace.

- AC-01 Defaults: runs away after 30 days, dies after 60
- AC-02 Minimums: run away ≥ 10 days, death ≥ 21 days
- AC-03 Earlier hunger stages scale to fit the chosen timeline
- AC-04 Later changes: more lenient any time; stricter at most once a month

### US-005 — Adjust my settings

> As a user, I want one place to tune the app so that it fits how I work.

- AC-01 Focus limit (1–3), daily review cap, pomodoro lengths, liveliness, tone slider
- AC-02 Notifications per channel, quiet hours
- AC-03 Weather mode (auto / city / off), focus sounds on/off
- AC-04 Connections: Are.na, Notion export, Obsidian download

---

## 02 · Capture

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-006 | Capture from the browser extension     | 1     | `[~]`  |
| US-007 | Capture from my phone                  | 8     | `[ ]`  |
| US-008 | Connect Are.na channels                | 9     | `[ ]`  |
| US-009 | Keep Are.na in sync                    | 9     | `[ ]`  |

### US-006 — Capture from the browser extension

> As a laptop user, I want to save anything I find in one click so that I don't break my flow.

- AC-01 Screenshot (full or area), current URL, pasted URL, image upload, note
- AC-02 Optional quick note on every capture
- AC-03 Saved to our database (Status: Inbox) in under 3 seconds; images to R2
- AC-04 Analysis is queued automatically

### US-007 — Capture from my phone

> As a phone user, I want to share things into createthings so that ideas don't stay stuck in other apps.

- AC-01 The installed PWA appears in the share sheet for links and images
- AC-02 Quick-add note or link on Today
- AC-03 Works offline; the capture syncs when back online

### US-008 — Connect Are.na channels

> As an Are.na user, I want my channels brought in so that I don't save things twice.

- AC-01 Connect Are.na and see my channels
- AC-02 Choose channels; per channel pick "triage these" (default) or "already curated"
- AC-03 Blocks map to items: Image → upload, Link/Media/Attachment → url, Text → note
- AC-04 Curated channels go straight to Shortlist; others to Inbox
- AC-05 Nothing is written back to Are.na

### US-009 — Keep Are.na in sync

> As an Are.na user, I want new blocks to show up automatically so that I don't have to re-import.

- AC-01 Daily sync plus a "Sync now" button
- AC-02 Already-imported block IDs are skipped
- AC-03 Imports are queued so large channels don't slow the app

---

## 03 · Analyze

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-010 | See an analysis of what I saved        | 1     | `[~]`  |
| US-011 | Know how big and hard something is     | 1     | `[ ]`  |
| US-012 | Have learning goals recognised         | 1     | `[ ]`  |

### US-010 — See an analysis of what I saved

> As a user, I want to understand what makes a saved thing work so that I know what I'd be getting into.

- AC-01 Images/URLs: colors, typography, layout, mood, components, technical and content notes
- AC-02 Notes: concept, direction, starting brief
- AC-03 Source attribution (author, URL, platform)
- AC-04 Runs through AI Gateway on a queue; status moves Inbox → Ready
- AC-05 Uses the free quota or credits; failed runs are refunded

### US-011 — Know how big and hard something is

> As someone who can't decide, I want an estimate of size and difficulty so that I can pick something that fits my time.

- AC-01 Size: afternoon / weekend / week / month
- AC-02 Difficulty: easy / medium / hard
- AC-03 Shown on the item card and used by Pick for me

### US-012 — Have learning goals recognised

> As someone trying to learn something hard, I want "learn X" notes treated as skills so that I get a learning path, not a copy-this brief.

- AC-01 Notes like "learn Blender" or "learn Spanish" are marked as learning goals
- AC-02 Learning goals get skill roadmaps (US-018)
- AC-03 The user can switch the type if it's wrong

---

## 04 · Sort

| ID     | Story                      | Phase | Status |
| ------ | -------------------------- | ----- | ------ |
| US-013 | Triage my pile quickly     | 2     | `[ ]`  |

### US-013 — Triage my pile quickly

> As someone with a huge pile, I want to sort it one card at a time so that I end up with a short list.

- AC-01 Today shows "Sort N new things (about X min)" when more than ~10 are unsorted
- AC-02 One card at a time: Keep → Shortlist, Let go → Archived, Later → stays Ready
- AC-03 Keyboard and swipe support
- AC-04 End screen: "Kept 3, let go of 8", framed as progress

---

## 05 · Focus

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-014 | Open to one clear thing                | 2     | `[ ]`  |
| US-015 | Let the app pick for me                | 2     | `[ ]`  |
| US-016 | Stay limited to a few things           | 2     | `[ ]`  |
| US-079 | Never miss twice                       | Hackathon | `[ ]`  |
| US-080 | Close the day with a shutdown          | 3     | `[ ]`  |

### US-014 — Open to one clear thing

> As a scattered person, I want the app to open on just what matters today so that I'm not overwhelmed.

- AC-01 Today shows: pet room, one Focus item, its current step, Start Pomodoro, reviews due
- AC-02 Nothing else competes for attention
- AC-03 With no Focus item, the main action is Pick for me
- AC-04 Works offline from the last synced state

### US-015 — Let the app pick for me

> As someone who freezes when choosing, I want the app to suggest one thing so that I can just start.

- AC-01 Asks time available (15 / 30 / 60+ min) and energy (low / normal / high)
- AC-02 Suggests one Shortlist item that fits, with its first step
- AC-03 Start · Not today (next suggestion) · Let it go
- AC-04 Start sets Status: Focus, creates the project page, and generates a roadmap if missing

### US-016 — Stay limited to a few things

> As someone who starts too many things, I want a limit on what's in progress so that I finish something.

- AC-01 Focus limit default 1, up to 3 (settings)
- AC-02 Starting another item at the limit asks me to pause or finish one first
- AC-03 Pause returns an item to Shortlist with progress kept


### US-079 — Never miss twice

> As someone who falls off after one bad day, I want the app to catch me after a miss so that one missed day doesn't become a lost week.

- AC-01 A missed block is offered a new slot by the pet, never moved silently
- AC-02 After a missed day, the next day opens with the step's 2-minute version as the top priority, and the pet says why ("Missing once is fine. Let's not miss twice.")
- AC-03 Today's plan is rebuilt around what's left; nothing makes me start over
- AC-04 Misses and recoveries are remembered, so the pet learns my patterns ("drifts after 3 days off")

### US-080 — Close the day with a shutdown

> As someone whose head keeps spinning at night, I want a short end-of-day wrap-up so that I stop with a clear plan for tomorrow.

- AC-01 At my shutdown time (set in settings) the pet offers a 1-minute wrap-up
- AC-02 It shows what got done, offers new slots for unfinished blocks, and sets one first block for tomorrow with its 2-minute version
- AC-03 Finishing it is a snack for the pet; skipping it costs nothing
- AC-04 The wrap-up is saved to memory as a session summary

---

## 06 · Roadmaps

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-017 | Get steps small enough to start        | 3     | `[~]`  |
| US-018 | Get a learning path for a skill        | 3     | `[ ]`  |
| US-019 | Get unstuck                            | 6     | `[ ]`  |
| US-020 | Get taught one thing                   | 6     | `[ ]`  |
| US-081 | Always know the next step              | 3     | `[ ]`  |
| US-082 | Start with a 2-minute version          | 3     | `[ ]`  |
| US-083 | Help me choose between tools           | 6     | `[ ]`  |

### US-017 — Get steps small enough to start

> As someone who stalls on big tasks, I want every milestone broken into small steps so that the next one always feels doable.

- AC-01 Each step takes 15–30 minutes
- AC-02 Only the current step is prominent; the rest are collapsed
- AC-03 Steps can be marked done; progress shown per milestone
- AC-04 Completing a step feeds the pet (meal) and offers card drafts

### US-018 — Get a learning path for a skill

> As someone learning something hard, I want a skill roadmap so that I build up from basics to doing it myself.

- AC-01 Structure: basics → practice → a small project
- AC-02 More knowledge cards drafted along the way than a project roadmap
- AC-03 Resources listed per milestone

### US-019 — Get unstuck

> As someone who quits when stuck, I want help on the spot so that I keep going.

- AC-01 Ask the pet "I'm stuck" on any step
- AC-02 Reply is a smaller step or a short explanation, in the pet's voice
- AC-03 Cost shown before sending; uses free quota first

### US-020 — Get taught one thing

> As a learner, I want a short lesson on any point so that I understand it before moving on.

- AC-01 "Teach me this" on any analysis point or step, asked through the pet
- AC-02 3–5 short paragraphs, tied to my item, not generic
- AC-03 Offers to turn the lesson into knowledge cards


### US-081 — Always know the next step

> As someone who stalls because I don't know where to go, I want the roadmap to tell me exactly what to do next so that I keep moving.

- AC-01 Every step shows what to search for (actual search terms) and the tools and resources it needs
- AC-02 There is always one clear next step; the roadmap never ends on "now figure it out"
- AC-03 When I finish a topic or milestone, the roadmap re-plans what comes next from what I now know, what I keep forgetting and my goals
- AC-04 Past choices (tools I picked, topics I struggled with) shape the next steps

### US-082 — Start with a 2-minute version

> As someone who freezes at the start, I want the smallest possible version of each step so that starting feels effortless.

- AC-01 Every roadmap step has a 2-minute version ("open Blender and add a cube")
- AC-02 Today and nudges lead with the 2-minute version when I've been away or missed a day
- AC-03 Doing just the 2-minute version counts and feeds the pet

### US-083 — Help me choose between tools

> As someone stuck between options, I want a clear comparison for my goal so that I can pick and move on.

- AC-01 When a step needs a tool choice, or I ask the pet, it compares 2–4 options side by side: what each gives for my goal, price (free, one-off, subscription, free or student tiers), learning curve, fit and trade-offs
- AC-02 Learning goals favour free, beginner-friendly, well-documented options; building goals favour what gets the result fastest and holds up
- AC-03 Prices and features come from a live web search, each with a source and "checked on" date
- AC-04 It always ends with one pick and a short reason; the pick goes into my plan and is remembered
- AC-05 Uses the free quota, then credits; the cost is shown before it runs

---

## 07 · Project Space, Journal & Export

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-021 | Work in a project space                | 3     | `[~]`  |
| US-022 | Journal what I'm learning              | 3     | `[~]`  |
| US-023 | Get reflection prompts                 | 3     | `[ ]`  |
| US-024 | Export to Notion                       | 9     | `[ ]`  |
| US-025 | Download as an Obsidian vault          | 9     | `[ ]`  |

### US-021 — Work in a project space

> As a user, I want one page for my Focus item so that my work and references are together.

- AC-01 Editor with headings, images, embeds
- AC-02 Linked inspirations shown alongside
- AC-03 Autosave, with offline drafts

### US-022 — Journal what I'm learning

> As a learner, I want to write down what I tried and learned so that I remember and my pet gets fed.

- AC-01 Dated entries, newest first
- AC-02 Sources: manual, pomodoro note, check-in
- AC-03 AI checks the entry relates to my Focus item and sizes the feed (free)
- AC-04 Offers to draft knowledge cards from the entry

### US-023 — Get reflection prompts

> As someone who struggles to reflect, I want a question after a session so that I notice what I learned.

- AC-01 Prompts after a pomodoro or step, based on the item and step
- AC-02 Answer as a journal entry or dismiss

### US-024 — Export to Notion

> As a Notion user, I want my work copied to Notion so that it's documented where I keep everything.

- AC-01 Connect Notion in settings
- AC-02 Scheduled one-way export of items, journal entries and knowledge cards
- AC-03 Edits in Notion are not synced back

### US-025 — Download as an Obsidian vault

> As an Obsidian user, I want my work as Markdown files so that I own a copy.

- AC-01 Download a zip of Markdown files with front matter
- AC-02 One file per item, journal entry set and knowledge card set, with links between them

---

## 08 · Pomodoro & Focus Sounds

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-026 | Focus in pomodoros                     | 3     | `[ ]`  |
| US-027 | Log what I did after a session         | 3     | `[ ]`  |
| US-028 | Play and mix focus sounds              | 3     | `[ ]`  |
| US-029 | Hear my pet while I focus              | 4     | `[ ]`  |
| US-030 | Unlock more sound packs                | 10    | `[ ]`  |

### US-026 — Focus in pomodoros

> As someone easily distracted, I want timed focus sessions so that I work in bursts I can manage.

- AC-01 Start from the current step
- AC-02 Defaults 25 / 5 / 15 (long break after 4), adjustable
- AC-03 Focus: pet sleeps, interface calm. Break: pet wakes and plays; light interaction allowed for the break's length
- AC-04 Full session = meal; stopping after 10+ minutes = snack
- AC-05 Timer keeps running offline and across tabs

### US-027 — Log what I did after a session

> As a user, I want a quick note when the timer ends so that progress is recorded without effort.

- AC-01 One-line "What did you do?" prompt at the end of focus
- AC-02 Feeds the pet; can be saved as a journal entry
- AC-03 Can draft knowledge cards

### US-028 — Play and mix focus sounds

> As someone who focuses better with sound, I want ambient sounds so that I get into the zone.

- AC-01 Off by default; remembered once switched on
- AC-02 Noise (white/pink/brown) generated in the browser; nature, places and music loops from R2
- AC-03 Mix several sounds with separate volumes
- AC-04 Fade in on focus, fade out on break; optional break sound
- AC-05 Cached for offline use

### US-029 — Hear my pet while I focus

> As a pet owner, I want my pet's sleeping sounds as a focus sound so that it feels like it's next to me.

- AC-01 Breathing, purring or snoring matched to species (dragon: rumbles and crackle)
- AC-02 Optional end chime in the pet's voice

### US-030 — Unlock more sound packs

> As a regular user, I want more sound packs so that I don't get bored.

- AC-01 Free starter set: noise, rain, café, your pet
- AC-02 More packs earned at growth milestones or bought with credits
- AC-03 Weather suggests a mix ("It's raining in Lagos. Rain + fireplace?")

---

## 09 · Knowledge Review

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-031 | Turn completed steps into cards        | 5     | `[ ]`  |
| US-032 | Turn journal entries into cards        | 5     | `[ ]`  |
| US-033 | Review cards on a schedule             | 5     | `[ ]`  |
| US-034 | Explain it back in my own words        | 5     | `[ ]`  |
| US-035 | Browse everything I've learned         | 5     | `[ ]`  |

### US-031 — Turn completed steps into cards

> As a learner, I want cards drafted from what I just did so that it sticks.

- AC-01 1–3 cards drafted per completed step (more for skill roadmaps)
- AC-02 Keep, edit or discard each one
- AC-03 Each kept card is a snack for the pet

### US-032 — Turn journal entries into cards

> As a learner, I want cards suggested from what I wrote so that my reflections become memory.

- AC-01 Suggested from journal entries and pomodoro notes
- AC-02 Only saved after I approve them
- AC-03 Manual cards can be added any time

### US-033 — Review cards on a schedule

> As someone who forgets, I want cards to come back at the right time so that I keep what I learned.

- AC-01 Intervals 1, 3, 7, 14, 30, 60 days
- AC-02 Got it → next interval; Shaky → repeat; Forgot → back to 1 day
- AC-03 Due reviews on Today, capped (default 5/day)
- AC-04 Finishing a review session is a snack
- AC-05 Downloaded reviews work offline

### US-034 — Explain it back in my own words

> As a learner, I want to test real understanding so that I'm not just memorising.

- AC-01 "Explain" cards ask me to write the idea in my own words
- AC-02 AI compares it with the source and points out gaps
- AC-03 Uses free quota or credits

### US-035 — Browse everything I've learned

> As a learner, I want to see all my knowledge in one place so that I can see I'm growing.

- AC-01 Library grouped by item or topic, with search
- AC-02 Each card links to its source item, step or journal entry

---

## 10 · The Pet

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-036 | Have my pet live in the app            | 4     | `[ ]`  |
| US-037 | Get a pet with personality             | 6     | `[ ]`  |
| US-038 | Be guided by my pet                    | 4     | `[ ]`  |
| US-039 | Do things by clicking my pet           | 4     | `[ ]`  |
| US-040 | Chat with my pet                       | 6     | `[ ]`  |
| US-041 | Feed my pet by doing the work          | 4     | `[ ]`  |
| US-042 | See my pet get hungry                  | 4     | `[ ]`  |
| US-043 | Pause hunger when I need a break       | 4     | `[ ]`  |
| US-044 | Win back a pet that ran away           | 6     | `[ ]`  |
| US-045 | Remember a pet that died               | 6     | `[ ]`  |
| US-046 | Revive or hatch a new pet              | 6     | `[ ]`  |
| US-047 | Watch my pet grow                      | 6     | `[ ]`  |
| US-048 | Shape my pet's body                    | 6     | `[ ]`  |
| US-049 | Dress up my pet                        | 6     | `[ ]`  |
| US-050 | Decorate the room and play             | 6     | `[ ]`  |
| US-051 | Have my pet react to what I do         | 6     | `[ ]`  |

### US-036 — Have my pet live in the app

> As a user, I want my pet to be around while I work so that it feels like company.

- AC-01 Own room on Today; walks on other screens
- AC-02 Idles, walks, sleeps, purrs, eats, gets sad
- AC-03 Real-time 3D on capable devices; lightweight fallback on low-power phones and the extension
- AC-04 Can be minimised or shooed

### US-037 — Get a pet with personality

> As a user, I want my pet to have its own character so that talking to it is fun.

- AC-01 Personality set by species and breed (eager dog, dramatic husky, sarcastic cat, proud dragon)
- AC-02 Tone slider from gentle to savage
- AC-03 Personality changes how things are said, never the advice

### US-038 — Be guided by my pet

> As a scattered person, I want my pet to tell me what's next so that I don't have to think about it.

- AC-01 Speech bubbles: next step, onboarding tips, reminders
- AC-02 Free; no AI cost
- AC-03 Moves away from the cursor, never covers text being typed, quiet during pomodoros

### US-039 — Do things by clicking my pet

> As a user, I want quick actions on my pet so that starting is one click.

- AC-01 Click the pet: start pomodoro, check in, open reviews, pick focus
- AC-02 Free

### US-040 — Chat with my pet

> As a learner, I want to ask my pet questions so that help feels personal.

- AC-01 Chat replaces the stuck / teach buttons (US-019, US-020)
- AC-02 Replies in the pet's personality; fast (Groq)
- AC-03 Free daily quota, then credits; cost shown before sending
- AC-04 Built on Walrus `withMemWal`: relevant memories are recalled into each reply, and new facts from the chat are saved

### US-041 — Feed my pet by doing the work

> As someone who needs a reason to show up, I want my work to feed my pet so that small efforts feel worth it.

- AC-01 Only Focus work counts: pomodoros, steps, journal entries, cards, review sessions, check-ins, finishing an item
- AC-02 Saving things never feeds it; journaling about a Shortlist item prompts "Make this your focus?"
- AC-03 Food sizes: snack, meal, feast; the AI journal check is free
- AC-04 Daily food cap
- AC-05 Food flies to the pet with an animation; the food type matches the species

### US-042 — See my pet get hungry

> As someone who drifts away, I want to see my pet suffer a little so that I come back.

- AC-01 Hunger calculated from time since last fed and my timeline
- AC-02 Happy → Peckish → Hungry → Starving, each with its own look
- AC-03 One feed always moves it up at least one state

### US-043 — Pause hunger when I need a break

> As someone going on holiday or ill, I want to pause the clock so that a real break isn't punished.

- AC-01 Rest mode with an end date
- AC-02 Hunger and neglect stop while it's on; the pet is shown resting

### US-044 — Win back a pet that ran away

> As someone returning after a long gap, I want a way to get my pet back so that it's not over.

- AC-01 After the run-away threshold: empty bed, pawprints
- AC-02 3 days of activity bring it home, with a reunion animation
- AC-03 Growth and items are kept

### US-045 — Remember a pet that died

> As someone whose pet died, I want it remembered so that the loss means something.

- AC-01 After the death threshold: a skeleton in the room, then a memorial
- AC-02 Every dead pet gets a memorial on the shelf, with its signature item
- AC-03 All other items stay in my account

### US-046 — Revive or hatch a new pet

> As someone coming back after my pet died, I want a way to start again so that I don't quit.

- AC-01 Revive the same pet with credits, keeping growth (cheaper for bought pets)
- AC-02 Or earn a new egg with about 7 days of activity; the new pet is free and starts fresh
- AC-03 The whole app works without a pet

### US-047 — Watch my pet grow

> As a long-term user, I want my pet to grow with my effort so that I can see how far I've come.

- AC-01 Growth from total food eaten; visible growth stages
- AC-02 Milestones unlock earned accessories, sounds and looks

### US-048 — Shape my pet's body

> As a user, I want to make my pet cute or tough so that it feels like mine.

- AC-01 Free sliders: fluffy ↔ tough, fur length, size, colors, patterns, eyes, horns/armor
- AC-02 Live preview; change any time

### US-049 — Dress up my pet

> As a user, I want accessories so that I can show off my pet's style.

- AC-01 Slots: head, face, neck, back, held item
- AC-02 Shared attachment points so items fit every species; some premium items are species-only
- AC-03 Earned at milestones or bought with credits; purely cosmetic
- AC-04 Items belong to my account and move between pets

### US-050 — Decorate the room and play

> As a user, I want to make my pet's room nice and play with it on breaks so that breaks are fun.

- AC-01 Room items: bed, bowl, wallpaper, floor, plants, memorial shelf
- AC-02 Toys (ball, yarn, laser dot, bone), each adding a break game
- AC-03 Earned or bought; cosmetic only

### US-051 — Have my pet react to what I do

> As a user, I want my pet to notice me so that it feels alive.

- AC-01 Reactions: cursor, click, drag, typing, pomodoro start/break, step done, review got it, new capture, idle, late night, coming back
- AC-02 Liveliness setting: calm / normal (default) / chaotic
- AC-03 Calms down automatically during pomodoros and typing
- AC-04 Respects reduced-motion settings

---

## 11 · Living Interface & Weather

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-052 | See neglect in the interface           | 7     | `[ ]`  |
| US-053 | See the app come back to life          | 7     | `[ ]`  |
| US-054 | Get my local weather                   | 7     | `[ ]`  |
| US-055 | Live through weather, day and seasons  | 7     | `[ ]`  |
| US-056 | See my pet react to the weather        | 7     | `[ ]`  |
| US-057 | Choose or turn off weather             | 7     | `[ ]`  |

### US-052 — See neglect in the interface

> As someone who drifts away, I want the app to look neglected so that I feel the gap without reading numbers.

- AC-01 Dust → cobwebs → food-scrap bones → empty bed/pawprints → skeleton, following the pet's state
- AC-02 Only on Today, project space and extension; settings stay clean
- AC-03 Cobwebs sway on hover and tear on click; dust lifts under the cursor
- AC-04 Never blocks buttons or hides text

### US-053 — See the app come back to life

> As someone returning, I want my first action to clean everything up so that coming back feels rewarding.

- AC-01 First feed after a gap plays a sweep-clean animation
- AC-02 The pet runs to the screen

### US-054 — Get my local weather

> As a user, I want the app's weather to match mine so that it feels connected to my day.

- AC-01 City from the IP address, no permission pop-up
- AC-02 Option to type a city
- AC-03 Only the city is stored
- AC-04 Weather cached per city for about an hour

### US-055 — Live through weather, day and seasons

> As a user, I want the app to feel like a place so that it's somewhere I want to be.

- AC-01 Rain, fog, snow on cards, sun rays, lightning, wind
- AC-02 Day/night lighting from local time; seasons by hemisphere; seasonal touches
- AC-03 Mixes with neglect (abandoned + rain is extra gloomy)
- AC-04 Never affects hunger or progress; respects reduced motion

### US-056 — See my pet react to the weather

> As a pet owner, I want my pet to react to the weather so that it feels real.

- AC-01 Raincoat, hides from thunder, sunbathes, shakes off wet fur, builds a snowman on breaks
- AC-02 Real weather moments unlock accessories (scarf on first snow)
- AC-03 Weather suggests focus sound mixes

### US-057 — Choose or turn off weather

> As a user, I want control over weather so that it suits my mood.

- AC-01 "Weather from anywhere": pick any city, or always sunny
- AC-02 Turn weather off

---

## 12 · Notifications & Digest

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-058 | See my pet's mood in the extension     | 8     | `[ ]`  |
| US-059 | Get nudged by my pet                   | 8     | `[~]`  |
| US-060 | Control when I'm nudged                | 8     | `[ ]`  |
| US-061 | Get a weekly digest                    | 8     | `[~]`  |

### US-058 — See my pet's mood in the extension

> As a laptop user, I want to see my pet while browsing so that I'm reminded without being nagged.

- AC-01 Extension icon badge shows mood and reviews due
- AC-02 Popup shows the pet (lightweight render) and a link to the app

### US-059 — Get nudged by my pet

> As someone who forgets, I want reminders from my pet so that they feel personal, not like spam.

- AC-01 Email and web push, written in the pet's voice
- AC-02 Triggers: hunger stages, stale Shortlist/Focus items, pomodoro end, reviews due
- AC-03 Stale nudge offers Start / Let it go / Later

### US-060 — Control when I'm nudged

> As a user, I want to control notifications so that they don't annoy me.

- AC-01 Per-channel on/off
- AC-02 Quiet hours (default 22:00–08:00 local)

### US-061 — Get a weekly digest

> As a user, I want a weekly summary so that I can see my progress.

- AC-01 Focused hours and sessions first, then steps done, blocks kept and reshuffled, items started, finished and let go, cards reviewed, food eaten
- AC-02 Card on Today plus email
- AC-03 Encouraging message when the week was empty
- AC-04 Written as identity, not a scorecard ("12 sessions: you're someone who designs now")

---

## 13 · Credits & Store

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-062 | Use AI free every day                  | 1     | `[ ]`  |
| US-063 | See what AI costs before I use it      | 1     | `[ ]`  |
| US-064 | Choose a stronger model                | 10    | `[ ]`  |
| US-065 | Buy credits                            | 10    | `[ ]`  |
| US-066 | Buy items in the store                 | 10    | `[ ]`  |
| US-067 | Get limited-edition pets               | 10    | `[ ]`  |

### US-062 — Use AI free every day

> As a free user, I want some AI every day so that I can use the app fully without paying.

- AC-01 Daily free quota on Basic models, reset every day
- AC-02 The pet's journal check, guide and actions never use quota

### US-063 — See what AI costs before I use it

> As a user, I want to know the cost of an AI action so that I'm never surprised.

- AC-01 Cost shown next to AI actions ("1 credit")
- AC-02 Balance and history in settings
- AC-03 Failed calls are refunded
- AC-04 Out of credits: actions explain what's needed; nothing created is locked

### US-064 — Choose a stronger model

> As a power user, I want better models for important things so that I get better roadmaps and explanations.

- AC-01 Tiers: Basic (1×), Plus (3×), Pro (10×)
- AC-02 Choose per action or set a default

### US-065 — Buy credits

> As a user, I want to buy credits so that I can use more AI and customise my pet.

- AC-01 One-off packs (e.g. $5 / $10 / $20, bonus on bigger packs)
- AC-02 Credits arrive after the payment webhook confirms
- AC-03 Credits never expire

### US-066 — Buy items in the store

> As a user, I want to buy accessories, decor and sounds so that my pet and room feel special.

- AC-01 Catalog of premium accessories, decor, fur colors, toys, sound packs
- AC-02 Paid with credits; all cosmetic
- AC-03 Revives are also bought here

### US-067 — Get limited-edition pets

> As a collector, I want seasonal pets so that there's always something new.

- AC-01 Seasonal drops, available for a limited time
- AC-02 Original designs only; no copyrighted characters
- AC-03 Same death rules, but cheaper to revive

---

## 14 · PWA & Platform

| ID     | Story                                  | Phase | Status |
| ------ | -------------------------------------- | ----- | ------ |
| US-068 | Install the app                        | 8     | `[ ]`  |
| US-069 | Keep working offline                   | 8     | `[ ]`  |
| US-070 | Stay protected from abuse              | 1     | `[ ]`  |

### US-068 — Install the app

> As a phone or desktop user, I want to install createthings so that it feels like a real app.

- AC-01 Installable PWA with icon, splash and app-like behaviour
- AC-02 Share sheet target (US-007)

### US-069 — Keep working offline

> As someone on the move, I want the core to work offline so that a bad connection doesn't break my habit.

- AC-01 Offline: Today, pomodoro, pet (last state), journal drafts, notes, downloaded reviews, cached sounds
- AC-02 Changes sync automatically when back online
- AC-03 Online-only actions say so clearly

### US-070 — Stay protected from abuse (system)

> As the owner, I want bots and abuse blocked so that free AI doesn't bankrupt the app.

- AC-01 Turnstile on signup and on free-quota AI use
- AC-02 Per-user and per-IP rate limits
- AC-03 Per-user AI spending caps in AI Gateway

---

## 15 · Assistant Memory & Voice

| ID     | Story                                        | Phase     | Status |
| ------ | -------------------------------------------- | --------- | ------ |
| US-071 | Have my pet remember my goals and plan        | Hackathon | `[ ]`  |
| US-072 | Fit a new idea in without killing the vibe    | Hackathon | `[ ]`  |
| US-073 | Plan my steps in time blocks                 | Hackathon | `[ ]`  |
| US-074 | Yap my ideas by voice                         | Hackathon | `[ ]`  |
| US-075 | Get told what to do next and how it connects  | Hackathon | `[ ]`  |
| US-076 | See and delete what my pet knows              | Hackathon | `[ ]`  |

### US-071 — Have my pet remember my goals and plan

> As someone juggling many things, I want my pet to remember what I'm aiming for and what I'm doing so that its help fits my life.

- AC-01 Goals, learning goals, the plan, how I work, what tripped me up and what I learned are saved as memories
- AC-02 Memories are short summaries; raw journal text and transcripts stay in our database
- AC-03 Pick for me, roadmaps, "I'm stuck" answers and nudges use these memories, and the pet says which one ("Last Tuesday kerning tripped you up…")
- AC-04 Saving a memory never slows the app; failed saves retry from a queue
- AC-05 Summaries become memories through Walrus `analyze`, which extracts the individual facts

### US-072 — Fit a new idea in without killing the vibe

> As someone who gets new ideas mid-task, I want help fitting them in so that I don't lose the idea or my momentum.

- AC-01 When a note, voice idea or link arrives while I have a plan, the pet recalls the plan and offers options: add as a step to a related Focus item, swap a planned day, park it until a set day, or write it down for 5 minutes and go back
- AC-02 It names the related item and days ("You set Tue–Thu for the contact page")
- AC-03 Stop and continue: pausing keeps progress, and the pet tells me where I left off when I return
- AC-04 Nothing changes in the plan without my OK
- AC-05 The related Focus item is found by meaning with Walrus `embed`, not by keywords

### US-073 — Plan my steps in time blocks

> As someone who loses track, I want my steps placed in time blocks so that I know what's on and when.

- AC-01 Place Focus steps in blocks: a day plus a start time, or a habit anchor ("after coffee"), plus an optional place; drag to move them
- AC-02 Today shows today's block first; the pet nudges at its time or anchor
- AC-03 Skipped blocks move forward with an offer from the pet, never silently (see US-079)
- AC-04 Plan changes are remembered
- AC-05 A busy week reshuffles in one go: "Only 2 blocks free this week? Here's what moves."

### US-074 — Yap my ideas by voice

> As someone whose ideas come out messy, I want to just talk so that I don't have to organise them myself.

- AC-01 Hold the mic in the PWA or extension and speak freely
- AC-02 Transcribed, split into separate ideas, each sorted: new item, step for a Focus item, journal note or learning goal
- AC-03 Each idea goes through the fit-it-in flow (US-072); I approve what's added
- AC-04 Audio and transcript stay private; only summaries go to memory

### US-075 — Get told what to do next and how it connects

> As someone who wants to do lots of things, I want suggestions that build on each other so that what I learn carries forward.

- AC-01 When I finish or near the end of an item, the pet suggests a next one from my Shortlist and goals
- AC-02 It says what carries over ("Your layout skills from the website help with the motion course")
- AC-03 The next roadmap skips or shortens what I already know

### US-076 — See and delete what my pet knows

> As a user, I want to see my pet's memory so that I trust it.

- AC-01 Settings → "What your pet knows": every memory, newest first, with its status
- AC-02 Delete one, or forget everything (with a confirm)
- AC-03 Memory receipts: the Sui account, memory count and last change, read through Tatum, with an explorer link

---

## 16 · Sui Payments

| ID     | Story                                        | Phase     | Status |
| ------ | -------------------------------------------- | --------- | ------ |
| US-077 | Pay for a Pro answer with USDC on Sui         | Hackathon | `[ ]`  |
| US-078 | Buy credits with USDC or SUI                  | Hackathon | `[ ]`  |

### US-077 — Pay for a Pro answer with USDC on Sui

> As a user without credits, I want to pay for one stronger answer so that I don't have to buy a pack.

- AC-01 Plus/Pro requests can be paid per call with USDC on Sui via MPP
- AC-02 The payment is confirmed on-chain through Tatum's Sui RPC before the answer is generated
- AC-03 A failed or unconfirmed payment never charges and never generates

### US-078 — Buy credits with USDC or SUI

> As a crypto user, I want to pay with what I hold so that buying is easy.

- AC-01 Credit packs payable in USDC or SUI on Sui
- AC-02 SUI is converted at the live rate from Tatum's Data API, shown before paying
- AC-03 Credits are added only after Tatum confirms the transaction; recorded in the credit ledger

---

## Summary

| Area                         | Stories | Partly exists |
| ---------------------------- | ------- | ------------- |
| 01 Accounts & Onboarding     | 5       | 1             |
| 02 Capture                   | 4       | 1             |
| 03 Analyze                   | 3       | 1             |
| 04 Sort                      | 1       | 0             |
| 05 Focus                     | 5       | 0             |
| 06 Roadmaps                  | 7       | 1             |
| 07 Project, Journal & Export | 5       | 2             |
| 08 Pomodoro & Sounds         | 5       | 0             |
| 09 Knowledge Review          | 5       | 0             |
| 10 The Pet                   | 16      | 0             |
| 11 Living Interface & Weather| 6       | 0             |
| 12 Notifications & Digest    | 4       | 2             |
| 13 Credits & Store           | 6       | 0             |
| 14 PWA & Platform            | 3       | 0             |
| 15 Assistant Memory & Voice  | 6       | 0             |
| 16 Sui Payments              | 2       | 0             |
| **Total**                    | **83**  | **8**         |
