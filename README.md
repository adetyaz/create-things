# createthings — A Creative OS Built on Notion MCP

_This is a submission for the [Notion MCP Challenge](https://dev.to/challenges/notion-2026-03-04)_

---

## Developing

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in:

- `NOTION_CLIENT_ID` + `NOTION_CLIENT_SECRET` + `NOTION_REDIRECT_URI` — Notion OAuth app
- `GEMINI_API_KEY` — Google AI Studio
- `GROQ_API_KEY` — Groq console
- `OPENROUTER_API_KEY` — OpenRouter (free-tier vision fallback)
- `PUBLIC_UPLOADCARE_PUBLIC_KEY` + `PUBLIC_UPLOADCARE_CDN_BASE` — Uploadcare dashboard
- `WEBHOOK_SECRET` — any random string, must match what you set in the Notion automation
- `FIGMA_ACCESS_TOKEN` — Figma personal access token (optional)

## Building

```sh
npm run build
npm run preview
```

---

There is a folder on almost every creative's computer.

Sometimes it is a bookmark list. Sometimes it is a Pinterest board, a Notion page, a camera roll full of screenshots, a browser tab that has been open for six weeks. The contents are always the same: things they loved when they found them and have not touched since. Landing pages they were going to study. Threads that made them stop scrolling. Interfaces they meant to reverse-engineer. Designs they were going to recreate on the weekend.

The weekend never comes.

I built createthings because I got tired of my own inspiration graveyard. But the more I talked to designers, developers, and content creators, the more I realized the graveyard was not the core problem. The core problem was that saving something and acting on it had no connection. There was no bridge between the moment of being inspired and the moment of doing something about it. No thread between the thing that excited you and the work that came out of it. No record of the journey from one to the other.

This is that bridge.

---

## What I Built

createthings is a creative operating system for designers, developers, and content creators. It lives across two surfaces: a browser extension that captures inspiration from anywhere on the web, and a SvelteKit web app where that inspiration gets analyzed, understood, acted on, and shared with the world.

The core loop is straightforward to describe and non-trivial to build:

**Capture** what excites you — a screenshot, a URL, an uploaded image, or even a typed note when the inspiration is more feeling than visual. **Analyze** it with AI — not just what it looks like but what makes it work, what you can learn from it, what skills it requires. **Think** through your process in a creative journal tied to every project. **Create** your own version with an AI-generated brief as your starting point. **Publish** it to your connected social platforms directly from the app with platform-specific captions and proper credit to the original creator. **Share** your full creative journey via an auto-generated public portfolio page.

Notion is the backbone of all of it.

I made a deliberate decision early in the build. I did not want Notion to be a sync target or a convenient place to dump data. I wanted it to be the actual brain of the system — the place where everything lives, where the AI pipeline is triggered, where results are written, where the publish queue is managed, where the portfolio reads from. Every piece of inspiration lives in Notion. Every AI analysis is written back to Notion via the MCP adapter. The automations that trigger the AI pipeline are Notion database automations firing webhooks. The portfolio page is assembled from Notion data in real time.

Remove Notion from createthings and the product does not exist. That is not a selling point. It is a design constraint I imposed on myself deliberately, and it made every subsequent decision sharper.

### Who It Is For

createthings is built for three types of creators, and the experience adapts to each:

**Designers** get color palette extraction, typography identification, layout and composition breakdown, component analysis, and a Figma export that sends any captured screenshot directly to their Figma workspace as a named frame.

**Developers** get UI architecture hints, pattern recognition, likely tech stack indicators, and component structure breakdown — the things you want to know when you see an interface you admire and want to understand how it was built.

**Content creators** get hook analysis, tone breakdown, narrative structure identification, and an explanation of why a piece likely performed well — the things that turn a saved post into a teachable moment.

All three get the same learning roadmap generator, the same creative journal, the same publish pipeline, and the same portfolio page. The AI output changes based on what was captured and who is asking. The system stays the same.

### The Feature Set

| Feature           | What It Does                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser extension | Captures via URL, screenshot (full page or selected area), image upload, URL paste, or typed note                    |
| AI analysis       | Visual and content breakdown — colors, typography, layout, mood, components, attribution                             |
| Learning roadmap  | AI-generated skill path from the analysis — what you need to learn to build something like this                      |
| Creative journal  | Per-project thought space with AI reflection prompts                                                                 |
| Publish queue     | Platform-specific captions drafted by AI — direct share to Twitter/X, LinkedIn, Reddit; one-click copy for Instagram |
| Remix tagging     | Inspired by / Remixed from / Recreated — ethical attribution built into every publish                                |
| Figma export      | Sends captured screenshots to Figma as named frames                                                                  |
| Portfolio page    | Auto-generated public page from Notion data, shareable via single link                                               |
| Stale reminders   | Smart nudges for inspiration that has been sitting untouched past a threshold                                        |
| Weekly digest     | Summary of what was saved, created, published, and learned                                                           |

---

## The Thought Behind It

The feature I am most proud of is not the AI analysis. It is the attribution system.

Every creative tool lets you save inspiration. Almost none of them think about what happens when you share something you made from that inspiration. The default in the creative community is either no credit at all or a vague "inspired by" in the caption if you remember to add it. Neither is good enough. The internet has a credit problem — creators build on each other's work constantly, because that is how culture moves, but the infrastructure for acknowledging that debt is almost nonexistent.

I built a remix tagging system with three states: **Inspired by**, **Remixed from**, and **Recreated**. Each carries a different level of creative debt to the original. Inspired by means the piece influenced your direction but the output is substantially your own. Remixed from means you took the original seriously as a reference and your work shows it. Recreated means you reproduced it deliberately as a learning exercise. The distinction is honest and it is mine to make — no tool forces it on me.

The attribution itself is captured automatically at save time, pulled from the page metadata by my scraper. The creator's name, the origin URL, the platform — all of it is stored in the Notion entry the moment you save. By the time you are ready to publish your own work, the credit line is already written. You just have to choose how honest you want to be about the relationship between your work and the work that inspired it.

### The Roadmap Insight

The learning roadmap came from a different observation. When you analyze a piece of work that is better than what you can currently make, there is always a gap. Most tools stop at showing you the gap. They surface the analysis and leave you to figure out what to do with it. I wanted to name the gap, measure it, and give you a path across it.

The roadmap generator takes the AI analysis and turns it into a curriculum. Skills you need to develop, milestones to work toward, resources to start with — all of it specific to the piece you saved, not generic design advice. The roadmap lives in Notion as a linked page, connected to the source inspiration, trackable over time. As you complete milestones and mark skills done, the gap closes visibly.

That is not just a feature. It is a different philosophy about what an inspiration tool is for.

### The Note Capture

I almost cut the note capture. It felt like an edge case compared to screenshot and URL capture. A text input in a browser extension — what creative problem does that solve that a notes app doesn't already handle?

I kept it because of a conversation with a content creator who said something I could not argue with: "Sometimes the inspiration isn't a thing I've seen. It's a feeling I'm chasing."

The note capture lets you type "I want to make something that feels like 3am in a city that never sleeps" and get a structured creative brief back from it. The AI extracts the concept, identifies the mood and emotional direction, suggests visual references to go find, and drafts a starting brief from a feeling that had no visual form yet. Every content creator I showed it to responded immediately. The tool needed to handle inspiration that wasn't visual. Now it does.

---

## The User Flow — Amara's Story

Let me walk through the full product experience with one user. Amara is a designer. It is a Tuesday morning.

She is browsing Dribbble and finds a landing page that stops her. The color system is unusual — warm neutrals with a single deep teal accent. The typography is doing something she has not seen before: a serif headline paired with a monospaced body at small size. The whole thing feels editorial in a way that does not take itself too seriously. She opens the createthings extension. The current page URL is already filled in. She types a quick note — "the mono body is the thing" — and taps Save to Notion.

She goes back to browsing. The extension has done its job.

Thirty seconds later, without her doing anything else, a Notion automation has detected the new entry in her Inspiration Vault, fired a webhook to the createthings server, and the AI analysis is complete. She opens the app and finds the card waiting for her.

The analysis shows the full color palette with hex values. It has identified the font pairing — a custom serif for display, Space Mono for body text — and noted why the combination works: the mechanical quality of the mono contrasts against the warmth of the serif in a way that creates productive tension. The layout section shows the F-pattern grid structure with generous whitespace. Mood tags: editorial, warm, considered. Under components: card pattern, sticky navigation, hover state on the CTA with a subtle underline reveal. At the bottom, the attribution: the original designer's name and a link back to the Dribbble shot, captured automatically.

She taps Build my roadmap. Twenty seconds later there is a page in her Notion Roadmaps database: type pairing theory, editorial grid systems, micro-interaction design, color accent strategy. Each skill has a milestone and a starting resource. The page is linked back to the Dribbble inspiration entry.

Two weeks later she has built her own version — a landing page for a fictional jazz club. She uploads it, selects Remixed from, and taps Prepare to publish. The AI writes her a Twitter caption — punchy, 240 characters, with three relevant hashtags. A LinkedIn post — professional framing, a short reflection on what she learned from the typographic experiment. An Instagram caption — visual-first language with emoji, hashtags at the end. Each has the credit line already written: "Remixed from [designer name] — original at [Dribbble URL]."

She edits the Twitter caption, clicks the POST → button next to it — Twitter opens in a new tab with the caption pre-filled, ready to publish. She does the same for LinkedIn. For Instagram, she taps COPY → and the caption is in her clipboard. She clicks Mark Published and the entry is logged in Notion.

Her portfolio page updates automatically. The published piece shows the finished work, the original inspiration it was based on, the remix tag, the credit line, and the two journal entries she wrote while building it — one about why she chose the jazz club concept, one about how she solved the mobile breakpoint problem. Visitors to her portfolio do not just see what she made. They see how she thinks.

That is the full loop.

---

## The Technical Architecture

createthings is built on SvelteKit (with Svelte 5 runes) for both the web app and the server-side API routes. The browser extension is built with Manifest V3 for cross-browser compatibility — Chrome, Firefox, Edge, and Safari — with Svelte components compiled for the popup. Notion is the primary database, with six linked databases forming the data layer. AI runs on Google Gemini 2.0 Flash for visual analysis, with automatic fallback through OpenRouter free-tier vision models and Groq text-only analysis if no vision model responds. Groq handles all text-only generation (roadmaps, captions, note analysis). Image uploads are handled via Uploadcare.

### The Data Flow

The extension's job is small by design. It captures and writes to Notion via the Notion REST API — creating a new page in the Inspiration Vault database with status set to Pending. That is all it does. It does not call the AI. It does not process the image. It saves and gets out of the way.

From there, a Notion database automation detects the new entry and fires a webhook to the SvelteKit server at `/api/webhook/notion`. This is the moment the AI pipeline starts. The server fetches the full entry, identifies the capture type — screenshot, URL, upload, or note — and routes accordingly.

Image and URL captures go to Gemini 2.0 Flash for visual analysis (falling back to `gemini-2.0-flash-lite`, then `gemini-1.5-flash-8b`, then OpenRouter free-tier vision models, then Groq text-only if no vision model responds). Before the Gemini call, `node-vibrant` extracts the color palette locally from the image, so I am not spending tokens on color data the model can compute more accurately from the raw pixel values anyway. Note captures go to Groq with a different prompt — concept extraction, mood identification, brief generation, visual reference suggestions. The AI does not see the note the way a human reads it. It treats it as a creative direction brief waiting to be articulated.

Results are written back to Notion via the MCP adapter layer. The entry status updates to Ready. The user sees the analysis card the next time they open the app.

The publish pipeline surfaces the drafted captions in the app's Publish Queue. Each platform caption has a direct action next to it: Twitter/X and LinkedIn open the platform's compose URL pre-filled with the caption and hashtags. Reddit opens the submit page with title and body pre-filled. Instagram copies the caption to clipboard (Instagram has no web compose URL). Once the user has posted, they click Mark Published and the Notion entry is updated to Published.

### The Six Databases

All six Notion databases are created automatically when a user connects their workspace for the first time. The setup runs in two passes — first creating all six databases to get their IDs, then patching the relations between them. You cannot add a relation to a database that does not exist yet, and you cannot know the target database ID before you create it. Two API passes. Not elegant, but fast and reliable.

| Database          | Purpose                                         |
| ----------------- | ----------------------------------------------- |
| Inspiration Vault | Every saved piece — the source of truth         |
| Analysis Results  | AI breakdown linked to each inspiration         |
| Roadmaps          | Learning paths generated from analyses          |
| Projects          | Work created — linked to inspirations           |
| Publish Queue     | Drafted and approved social posts               |
| User Profile      | Preferences, platform connections, Creative DNA |

### Technology Choices

I chose Gemini 2.0 Flash for visual analysis because its free tier is generous enough for a real product at demo scale, its vision capabilities handle the range of input quality I see from screenshots and uploads, and its structured output makes parsing the analysis reliable. The fallback chain — `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-1.5-flash-8b` → OpenRouter free vision models — means the pipeline keeps working even when one model is rate-limited. I chose Groq because the inference speed matters — when a user taps Build my roadmap, they should not wait more than fifteen seconds. Groq on `llama-3.3-70b-versatile` delivers that.

For social publishing I chose direct platform compose URLs rather than building OAuth API integrations first. Twitter's `/intent/tweet`, LinkedIn's `/shareArticle`, and Reddit's `/submit` all accept pre-filled content as URL parameters and open in a new tab — no API approval, no tokens, no rate limits. The user sees exactly what they are posting before it goes out. Instagram does not have a web compose URL, so I copy the caption to clipboard instead. Build the direct integrations when you have approvals, not when you have a deadline.

---

## How I Used Notion MCP

I made a rule early in the build: Notion should be the brain of the system, not a sync target. Every intelligent write-back goes through an MCP adapter layer — a set of functions in `src/lib/server/notion/mcp.ts` that wrap the Notion SDK calls for all agent actions.

The distinction between the REST API layer and the MCP layer is intentional. The REST API handles database operations: creating structure, querying records, managing schemas. The MCP layer handles agent actions: an AI system reading context from a workspace and writing back purposefully — the same pattern a person working inside Notion would follow.

### The Specific Operations

**`writeAnalysisResults`** — called after every analysis completes. Creates a page in the Analysis Results database with the full breakdown — color palette, typography notes, layout analysis, mood tags, component identification, attribution — and links it back to the source inspiration entry.

**`createRoadmap`** — called when a user requests a roadmap. Creates a structured Notion page in the Roadmaps database — not just a database row, but a full page with sections, skill descriptions, milestone checkboxes, and resource links. The page is created with the correct parent relation to the source inspiration, so the connection is permanent and navigable.

**`writePublishDrafts`** — called by the caption generation pipeline. Writes platform-specific captions to the Publish Queue entry — Twitter, LinkedIn, Instagram, Reddit — all with the credit line assembled from the stored attribution data.

**`updateInspirationStatus`** — moves entries through their lifecycle: `Pending → Ready → Active → Stale → Archived`.

### Why a Dedicated MCP Layer

This is the question worth answering directly.

When the AI system writes results back to Notion, it is not inserting records — it is making decisions: what to name the page, how to structure the sections, which properties to set, what relations to create, how to format the skill descriptions so they are useful when the user opens the page later. That is an agent action. The MCP layer is the right abstraction for it. The REST API would require pre-specifying every structural decision in code. The MCP layer lets those decisions happen in context.

Having a clean adapter layer also makes the path to the hosted Notion MCP remote server straightforward. Every call goes through one place. The connection is established once per user session with their OAuth token and reused across all operations.

---

## What I Learned

The hardest part was not the AI integration. It was the database setup order.

Notion relations between databases require both databases to exist before you can create the relation. That sounds obvious until you are writing the setup script at 1am and realize you cannot add the relation from Inspiration Vault to Analysis Results until Analysis Results exists — but you also cannot add it to a database you have not created yet. The solution was simple once I saw it: create all six databases first, collect their IDs, then make a second pass to patch the relations in. Two API calls where I wanted one. Not elegant but reliable.

The social API reality was the other hard lesson. I knew Instagram Graph API required Facebook app approval. I knew Twitter/X v2 could take time. What I underestimated was how much value there is in the compose URL approach first — `twitter.com/intent/tweet`, `linkedin.com/shareArticle`, `reddit.com/submit`. The user sees exactly what they are about to post. There is no abstraction between the caption and the publish. Add the server-side API integrations when you have time and approvals; start with the compose URLs and let the user be in control.

The thing that surprised me most was the note capture.

I almost cut it three separate times. It felt like scope creep. A text input in a browser extension — what problem does that solve that a notes app does not? I kept it because the use case would not leave me alone: what do you do when the inspiration is not a URL or an image? What do you do when you are in a meeting and you think "I want to make something that feels like the opposite of corporate" and you want to capture that before the meeting ends and you forget?

When I showed it to content creators during testing, the response was immediate. Every one of them used it first. Not the URL capture. Not the screenshot. The note. Because for content creators, inspiration is almost never a visual thing — it is a tone, a voice, a feeling, a reaction to something they read or heard. The tool needed to handle that. I am glad I kept it.

I also learned that the creative journal resonates more with experienced creators than with beginners. Beginners want to capture and analyze. Experienced creators want to document their process because they know the process is the portfolio, not just the output. That insight is shaping how I think about onboarding — meeting users where they are rather than assuming everyone is ready for the same features at the same time.

---

## The Code

The full repository is at [GitHub link].

Three moments in the code worth highlighting:

### The Webhook Handler

The entry point to the entire AI pipeline. When Notion fires the automation webhook, this is what receives it:

```typescript
// src/routes/api/webhook/notion/+server.ts

export const POST: RequestHandler = async ({ request }) => {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { page_id, notion_token, db_ids } = await request.json();
  const client = createNotionClient(notion_token);
  const page = await client.pages.retrieve({ page_id }) as any;
  const props = page.properties;

  const captureType = props['Capture Type']?.select?.name;
  const noteText = props.Notes?.rich_text?.[0]?.text?.content || '';
  const imageUrl = props.Image?.files?.[0]?.file?.url
    || props.Image?.files?.[0]?.external?.url || '';
  const sourceUrl = props['Source URL']?.url || '';

  if (captureType === 'note') {
    const analysis = await analyzeNote(noteText);
    await writeAnalysisResults(client, db_ids, { inspirationPageId: page_id, ...analysis });
    return json({ success: true, type: 'note' });
  }

  // Image / URL path — scrape metadata, extract colors, call Gemini
  const metadata = sourceUrl ? await scrapeMetadata(sourceUrl) : null;
  const imageSource = imageUrl || metadata?.image || '';
  const colors = imageSource ? await extractColors(imageSource) : null;
  const analysis = await analyzeImage({ imageUrl: imageSource, sourceUrl, colors, metadata });

  await writeAnalysisResults(client, db_ids, { inspirationPageId: page_id, ...analysis });
  await updateInspirationStatus(client, page_id, 'Ready');
  return json({ success: true, type: captureType });
};
```

Clean routing. The webhook does one thing: identify what was captured and hand it to the right AI. The MCP adapter writes the results back.

### The MCP Write-Back

```typescript
// src/lib/server/notion/mcp.ts

export async function writeAnalysisResults(client: Client, dbIds: DatabaseIds, data: AnalysisData) {
  // Update the inspiration entry status
  await client.pages.update({
    page_id: data.inspirationPageId,
    properties: {
      Status: { select: { name: 'Ready' } },
      Attribution: { rich_text: richText(data.attribution) }
    }
  });

  // Create the linked Analysis Results page
  await client.pages.create({
    parent: { data_source_id: dbIds.analysisResults },
    properties: {
      Title:          { title: richText(data.title) },
      Colors:         { rich_text: richText(data.colors) },
      Typography:     { rich_text: richText(data.typography) },
      Layout:         { rich_text: richText(data.layout) },
      Mood:           { multi_select: data.mood.map(name => ({ name })) },
      Components:     { rich_text: richText(data.components) },
      Attribution:    { rich_text: richText(data.attribution) },
      'Inspiration':  { relation: [{ id: data.inspirationPageId }] },
      'For Developers': { rich_text: richText(data.forDevelopers) },
      'For Creators':   { rich_text: richText(data.forCreators) }
    }
  });
}
```

### The Screenshot Area Select

The content script that handles the area selection UX in the extension:

```typescript
// extension/src/content/screenshot.ts

export function initAreaSelect() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: rgba(0,0,0,0.5); cursor: crosshair;
  `;
  document.body.appendChild(overlay);

  let startX: number, startY: number;
  let selection: HTMLDivElement | null = null;

  overlay.addEventListener('mousedown', (e) => {
    startX = e.clientX;
    startY = e.clientY;
    selection = document.createElement('div');
    selection.style.cssText = `
      position: fixed; border: 2px solid #1D9E75;
      background: rgba(255,255,255,0.1);
    `;
    overlay.appendChild(selection);
  });

  overlay.addEventListener('mousemove', (e) => {
    if (!selection) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    Object.assign(selection.style, {
      left: x + 'px', top: y + 'px',
      width: Math.abs(e.clientX - startX) + 'px',
      height: Math.abs(e.clientY - startY) + 'px'
    });
  });

  overlay.addEventListener('mouseup', () => {
    const rect = selection!.getBoundingClientRect();
    overlay.remove();
    captureRegion(rect);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.remove();
  });
}
```

The full codebase includes the Notion setup script, all six database schemas with property types, the Gemini and Groq prompt templates, the publish queue page with direct platform share links, the portfolio assembly route, and the stale check logic.

---

## Video Demo

[Video link]

The demo runs through nine moments in order:

1. Opening the extension on a Dribbble shot — showing the URL auto-filled
2. Using select area screenshot — dragging to capture just the hero section
3. Saving to Notion — watching the entry appear in the Inspiration Vault live
4. Opening the app — the analysis card with the full AI breakdown
5. Tapping Build my roadmap — the roadmap page appearing in Notion
6. Writing a journal entry — process notes in the project's block editor
7. Preparing to publish — the AI-drafted captions with the auto-credit line
8. Clicking POST → on the Twitter caption — compose window opens pre-filled
9. Opening the portfolio link — the public page showing work, process, and inspiration

The demo is recorded against a real Notion workspace. Every database entry you see in the video is real data, not mocked.

---

## What's Next

The MVP proves the loop works. What I am building toward is larger.

**Creative DNA** is the feature I am most excited about. As a creator saves more inspiration over time, the system builds a profile of their aesthetic — recurring color tendencies, layout preferences, the moods they are consistently drawn to. Not as a novelty feature but as a mirror. Something that shows you your own taste before you have consciously named it. That profile becomes part of your public portfolio, shareable as a card, useful to clients and collaborators who want to understand how you see the world before they work with you.

**Trend Pulse** is the multi-user feature I want to build next. When enough users independently save similar things in the same time window, the system surfaces it as a signal — not an algorithm optimizing for engagement, but a genuine read on what the creative community is drawn to right now. Bottom-up, not top-down. The opposite of a trending page.

**Voice notes** are coming for the capture layer. A creator in a meeting, on a walk, in the shower — inspiration does not wait for a keyboard. A voice note captured in the extension gets transcribed and treated the same as a typed note: analyzed, structured, turned into a brief.

**Direct social API integrations** are the natural next step for publishing. The current compose URL approach is intentional and user-controlled, but server-side posting via the Twitter/X v2, LinkedIn, and Instagram Graph APIs would let creators publish in one click without leaving the app. The infrastructure is already shaped for it — the caption drafting, the attribution, the queue management all stay the same. It is the last mile that changes.

The bigger thing I am working toward is making ethical attribution the default in creative tools rather than an afterthought. The internet has a credit problem. Creators build on each other constantly — that is how culture moves, how aesthetics evolve, how craft is transmitted across generations. The infrastructure for acknowledging that honestly is almost nonexistent. createthings is one piece of that infrastructure. Not the whole answer. But a real one, built into the workflow instead of bolted on at the end.

I want to make the graveyard impossible. Every piece of inspiration you save should either become something or teach you something on its way to becoming something. That is the product I am building.

---

_Built with SvelteKit, Svelte 5, Notion MCP, Google Gemini, Groq, and a lot of conviction that creative tools should be more honest._

_Tags: `devchallenge` `notionchallenge` `mcp` `ai`_
