# A pet that remembers: building createthings on Walrus Memory and Tatum

*Draft for the Tatum × Walrus "Total Recall" submission (H17). Numbers marked ⟨check⟩ should be confirmed from the live app before posting.*

I save things all day: a riso poster on Pinterest, a thread about cloud certifications on X, a jazz chord video on YouTube. I almost never do anything with them. createthings started from that pile. It's an **active partner for scattered people**: it turns saved links into one clear next step, plans small steps around real life, bends the plan when life gets in the way, and keeps what you learn so it compounds.

A pet lives in it. The pet eats when you do real work (a finished step is a meal, finishing a goal is a feast) and gets hungry when you don't. It's also the agent: it picks what to do next, plans with you, and talks you through being stuck. For that to work, it has to **remember you**, and that's where Walrus comes in.

## What the pet remembers, and why it matters

Every decision the pet makes starts with **recall**. Before it picks your next thing, plans a roadmap, re-plans after a milestone, or answers in chat, it asks Walrus Memory what it knows: your goals, what tripped you up last time, how you actually work. And it says what it used. A reply ends with small "based on" notes: *you struggled with left-hand stretches · your goal: Blue Bossa*.

That changes the product in ways you can see:

- **Roadmaps skip what you know.** Finish a guitar course and start jazz piano: the plan doesn't re-teach rhythm basics, because the pet remembers you built them.
- **Re-plans learn.** After each milestone, the rest of the plan is rewritten from what actually happened.
- **"I'm stuck" isn't generic.** The pet remembers you got stuck on the same stretch before, and suggests a break first, then a smaller step.
- **What's next carries knowledge forward.** Finishing one thing suggests another with what carries over.

We used Walrus's own AI pieces deliberately: `analyze` splits rich summaries (goals, lessons, reviews) into searchable facts; `remember` stores one-fact memories; `recall` runs before every AI decision; `embed` matches a new idea to the goal it belongs to by meaning, so "fit it in" can offer *add it as a step to your jazz goal* instead of starting a new pile.

Fourteen kinds of memory are written, from `goal` and `plan_change` to `review_weakness` and `expansion` (what you've been drawn to: *"Brought in 42 X bookmarks into 'Riso': mostly poster, grain"*). ⟨check: count on mainnet⟩

## Being honest about memory

Two things shaped the design:

1. **Walrus storage is append-only, and the SDK has no delete.** We didn't pretend otherwise. "What your pet knows" lets you delete any memory; the app hides its facts from every recall (looked up once in bulk) and says plainly that the encrypted copy is never read again and expires on its own. "Forget everything" moves you to a fresh namespace.
2. **Only summaries in our words go to Walrus.** Never journal text, never voice transcripts. A check-in becomes *"Checked in on 'Learn jazz piano chords'"* in a daily digest, not your words.

## Keeping it cheap enough to be free

The relayer allows 500 points an hour per account, shared by the whole app, and the app has to be free to use. So: small events go out as **one daily digest**; one-fact memories use `remember` with dedupe and idempotency keys; embeddings are cached; recall has a distance cutoff; imports write **one** memory per import, never one per item. Most of the product (planning, reshuffling, reminders, the pet's hunger) needs no AI at all.

## Tatum: Sui from a Worker

createthings runs on Cloudflare Workers. Tatum's Sui gateway speaks gRPC, which the Sui SDK can't use from a Worker, so we wrote a small transport that sends unary gRPC over `fetch` and plugs into the official `SuiGrpcClient`. Through it:

- **Memory receipts:** the Walrus Memory account object read from Sui, with its last change and explorer links, so you can check the pet's memory exists where we say it does.
- **Payments:** credit packs and one-off Pro answers paid in USDC (no gas on Sui) or SUI at Tatum's live rate. The app reads the transaction through Tatum and checks it succeeded, is recent, and sent enough to the right address before any credits arrive; a transaction counts once.

## What we'd do next

The server and the browser extension are built; the screens come next, designed around five visual themes, with a 3D pet. Sign-in, Are.na, Google Calendar and email reminders are built and waiting on their keys. The part we're proudest of is small: every number and badge in the app explains itself. The pet never just says "hungry". It says *"last fed 3 days ago, by finishing 'sketch the layout'"*.

*Repo: ⟨link⟩ · Demo: ⟨link⟩*
