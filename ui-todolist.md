# UI Todolist — Zine Theme Implementation

Design system: **Zine**
Core: `#FFE600` yellow · `#0D0D0D` black · `#F7F7F4` off-white
Accents: `#00FC40` neon green · `#9400CA` purple
Type: Space Grotesk ALL CAPS (headlines/labels) · Inter (body/mono system labels)
Rules: 0px border-radius · 2-3px structural borders · hard-drop shadows (4px 4px, 0 blur) · editorial grid layouts
Voice: "UNFILTERED" · "CREATIVE ANARCHY" · screaming headlines · dispatch/system labels

> **Note:** Neon Brutalist, Vivid Logic, and Zine were consolidated into a single theme.
> Yellow/black/white is the primary palette. Green and purple are accent-only.

---

## Web App

### Layout & Navigation

- [ ] App shell — left sidebar (OPERATOR_01 profile label, role links: Designer / Developer / Photographer / Creator, SCANNING/INDEX/OUTPUT sections, Settings at bottom)
- [ ] Top bar — UNFILTERED logo badge (yellow on black) + ARCHIVE · LABS · NETWORK nav links + settings gear
- [ ] Active nav item — yellow background highlight
- [ ] Mobile nav — collapse sidebar to icon bar
- [ ] NEW_ENTRY action button (yellow, full-width, hard shadow) in sidebar

### Home / Landing (`/`)

- [ ] "CREATIVE ANARCHY" hero headline, yellow word highlight block
- [ ] Sub-copy block (small caps, Inter)
- [ ] Primary CTA button (yellow, hard shadow)
- [ ] "Connect Notion" prompt if not authenticated

### Inspiration Dashboard — `INSPIRATION STREAM_V#` (`/inspiration`)

- [ ] "INSPIRATION STREAM_V5" header — yellow text highlight on STREAM_V5
- [ ] LIVE_FEED / RE-FILTERED filter tabs
- [ ] Editorial card grid — dark cards (quote/text), image cards, system-label cards
  - Quote cards: large pull-quote text + source tag
  - Image cards: full-bleed image + tag badge
  - System cards: monospace label + status dot (green/yellow indicator)
- [ ] "FETCH_MORE_SAMPLES" CTA button (yellow, hard shadow)
- [ ] DISPATCH_HQ footer label
- [ ] Empty state — no Notion DB connected

### Project Editor — Think & Create Space (`/projects/[id]`)

- [ ] Split layout: white main editor (left) · REFERENCED panel (right, dark BG)
- [ ] Editor: `H1` headline style, Inter body, breadcrumb path (PANEL_NO / SUB_OPERATOR)
- [ ] REFERENCED panel: bookmarked thumbnail cards with yellow accent dot, image previews
- [ ] Toolbar (heading / image / embed / publish actions)
- [ ] Inline image / YouTube embed blocks
- [ ] ARCHIVE/LABS/NETWORK top bar tabs
- [ ] Save indicator

### Projects List (`/projects`)

- [ ] CASE_STUDIES header with search icon
- [ ] Project cards — asymmetric grid, black/white photographic thumbnails
- [ ] Yellow accent badge per card (status: ACTIVE / VAULT / etc.)
- [ ] "New Project" action button

### Publish Queue (`/publish`)

- [ ] COMMUNICATION_CHANNELS header
- [ ] Channel rows — platform icon tab (STAT_NET · EMAIL_NET · BROADCAST)
- [ ] Publish action per row (yellow button or ghost)
- [ ] Empty state

### Settings (`/settings`)

- [ ] Dark section headers in Space Grotesk caps, 2px bottom border
- [ ] Input fields — 2px black border, yellow focus ring, 0px radius
- [ ] Destructive actions — purple accent border
- [ ] Section labels as system monospace tags (e.g., `CONFIG_NODE`)

### Error Page (`+error.svelte`)

- [ ] "REDACTED" watermark treatment
- [ ] System-label error code + short message
- [ ] Return home button (yellow)

---

## Portfolio (Public — `/portfolio/[username]`)

### Shared Portfolio Shell

- [ ] Left sidebar nav — OPERATOR profile label, role list (highlights active with yellow), no Settings on public view
- [ ] Top bar — CREATETHINGS logo · WORK · TECH · GALLERY · CONTENT nav links · CONNECT button (yellow)
- [ ] Footer — `createthings.co` credit + STAY_VOID / UNFILTERED watermark treatment
- [ ] Social links in mono-label format

### Default / Generic Portfolio

- [ ] "CREATIVE ANARCHY" hero style — dark hero, yellow highlight word
- [ ] Featured Projects (CASE_STUDIES) grid
- [ ] THE_SKETCH_ARCHIVE section — template/document thumbnails
- [ ] CTA / contact section

### Developer Variant

- [ ] Hero — "ARCHITECTING THE [KINETIC]" — KINETIC in yellow highlight block
- [ ] Active Stack panel (right) — tech counts: Figma / Svelte / Node.js / TypeScript
- [ ] Repositories section — dark repo cards, green `●` indicators, language + stars
- [ ] Tech Stack icons grid (React / Svelte / Node / Notion)
- [ ] CTA footer — black full-width band, "READY TO BUILD THE FUTURE?", HIRE ME (yellow) + STACK INFO (ghost) buttons

### Content Creator Variant

- [ ] Hero — "CURATING THE CULTURE" — yellow accent, SUBSCRIBE button + count
- [ ] Latest Videos grid (featured large + 2-up right)
- [ ] VIEW ALL → header link pattern
- [ ] Threads & Articles cards (4-up, yellow tag badges, category labels)
- [ ] Newsletter Archives list (monospace labels)

### Photographer Variant

- [ ] Hero — full-bleed portrait photo, "THE UNFILTERED LENS" overlaid in white/yellow
- [ ] Role tags — URBAN EXPLORATION · BRUTALIST SPACES (yellow badge style)
- [ ] Featured Works — asymmetric grid (large left, 2-up small right)
- [ ] Statement block + "BOOK A SHOOT" CTA (neon green)

### Designer Variant

- [ ] Hero — "CRAFTING VISUAL [LOGIC]" — VISUAL in italic purple highlight
- [ ] Short bio + FULL BREAKDOWN (yellow) + VIEW MANIFESTO (ghost) buttons
- [ ] Selected Work — fullwidth dark project cards, title overlay, type tag
- [ ] Process section — numbered steps 01 / 02 / 03 with descriptions
- [ ] Tech tags strip at footer

---

## Browser Extension

### Capture Popup

- [ ] UNFILTERED badge logo (yellow on black) in top-left
- [ ] Top nav tabs — ARCHIVE · LABS · NETWORK (active = yellow underline)
- [ ] Left sidebar — OPERATOR_01 profile, SCANNING / INDEX / OUTPUT links
- [ ] Capture card — QUICK*CAPTURE_V1 label, SOURCE_ID: DISPATCH*### tag
- [ ] URL preview image with yellow corner bracket overlay (viewfinder treatment)
- [ ] CAPTURE_ORIGIN URL input (2px border, 0px radius)
- [ ] OBSERVATIONS textarea — "REDACTED NOTES HERE..." placeholder
- [ ] ASSIGNED_LABELS — chip tags, yellow background on active
- [ ] CAPTURE button (yellow, full-width, hard drop shadow)
- [ ] NEW_ENTRY sidebar button (yellow)
- [ ] TERMINAL_GRIP_DOME + INITIAL_TRAP footer labels
- [ ] "REDACT" watermark text in background

---

## Theme Infrastructure (later)

- [ ] CSS custom property tokens (`--zine-yellow`, `--zine-black`, `--zine-white`, `--zine-green`, `--zine-purple`)
- [ ] Theme applied globally via `layout.css` + Tailwind config
- [ ] Onboarding screen — connect Notion flow in full Zine style
- [ ] Portfolio sub-theme picker in settings (Zine base + variant accent per portfolio type)

---

## Stitch Screen Reference

| Screen                          | File                                  | Status |
| ------------------------------- | ------------------------------------- | ------ |
| Public Portfolio (Zine)         | `zine-portfolio-1.png`                | Viewed |
| Capture Extension (Zine)        | `zine-extension-1.png`                | Viewed |
| Think & Create Space (Zine)     | `zine-workspace.png`                  | Viewed |
| Inspiration Dashboard (Zine)    | `zine-dashboard.png`                  | Viewed |
| Developer Portfolio             | `developer-portfolio-vivid.png`       | Viewed |
| Content Creator Portfolio       | `content-creator-portfolio-vivid.png` | Viewed |
| Photographer Portfolio          | `photographer-portfolio-vivid.png`    | Viewed |
| Designer Portfolio              | `designer-portfolio-vivid.png`        | Viewed |
| Public Portfolio (old Zine)     | `.stitch/` (prior session)            | Viewed |
| Capture Extension (old Zine)    | `.stitch/` (prior session)            | Viewed |
| Inspiration Dashboard (Kinetic) | `.stitch/` (prior session)            | Viewed |
| Think & Create Space (Kinetic)  | `.stitch/` (prior session)            | Viewed |
