# createthings

> Pick one thing. Start it. Keep what you learn. Don't let your pet starve.

createthings helps scattered people (too many ideas, can't choose, end up doing nothing) pick **one** thing and actually start. It collects what you save, helps you sort it, suggests one thing to focus on, breaks it into 15–30 minute steps, turns what you learn into spaced-review cards, and gives you a 3D pet that eats when you do the work and gets hungry when you don't.

The app is a complete digital experience: pomodoros with focus sounds, weather and day/night that match your city, and an interface that gathers dust and cobwebs when you stay away.

## Status

The product was redesigned in October 2026 (v2). v2 stores data in **Neon Postgres** on **Cloudflare**; Notion is only an optional export.

The code in this repo hasn't been migrated yet. It's the old v1 build, which stored data in users' Notion workspaces, ran on Vercel and had publish and portfolio features. Phase 0 of the build replaces all of that.

| Doc | What it covers |
| --- | --- |
| [Project Breakdown.md](Project%20Breakdown.md) | The full v2 concept, architecture, data model, costs and build order |
| [user-stories.md](user-stories.md) | 70 user stories with acceptance criteria |
| [todolist.md](todolist.md) | Build checklist by phase |
| [workflow.md](workflow.md) | Current status and how the docs fit together |

## v2 stack

SvelteKit (Svelte 5) PWA · Manifest V3 extension · Cloudflare Workers, R2, KV, Queues, Workers AI, AI Gateway · Neon Postgres via Hyperdrive · Better Auth · Resend · Web Push · 3D pet designed in Spline

## Developing (v1 code)

```sh
npm install
npm run dev          # web app
npm run dev:ext      # extension build in watch mode
```

Copy `.env.example` to `.env` and fill in the keys it lists. The v2 environment variables are listed in [Project Breakdown.md](Project%20Breakdown.md#environment-variables).

```sh
npm run check        # type check
npm run lint
npm test             # unit + e2e
```
