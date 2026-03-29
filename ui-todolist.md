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
- [x] Top bar — UNFILTERED logo badge (yellow on black) + ARCHIVE · LABS · NETWORK nav links + settings gear
- [x] Active nav item — yellow background highlight
- [x] Mobile nav — collapse sidebar to icon bar
- [ ] NEW_ENTRY action button (yellow, full-width, hard shadow) in sidebar

### Home / Landing (`/`)

- [x] "CREATIVE ANARCHY" hero headline, yellow word highlight block
- [x] Sub-copy block (small caps, Inter)
- [x] Primary CTA button (yellow, hard shadow)
- [x] "Connect Notion" prompt if not authenticated

### Inspiration Dashboard — `INSPIRATION STREAM_V#` (`/inspiration`)

- [x] "INSPIRATION STREAM_V5" header — yellow text highlight on STREAM_V5
- [x] LIVE_FEED / RE-FILTERED filter tabs
- [ ] Editorial card grid — dark cards (quote/text), image cards, system-label cards
  - Quote cards: large pull-quote text + source tag
  - Image cards: full-bleed image + tag badge
  - System cards: monospace label + status dot (green/yellow indicator)
- [ ] "FETCH_MORE_SAMPLES" CTA button (yellow, hard shadow)
- [x] DISPATCH_HQ footer label
- [x] Empty state — no Notion DB connected

### Project Editor — Think & Create Space (`/projects/[id]`)

- [x] Split layout: white main editor (left) · REFERENCED panel (right, dark BG)
- [x] Editor: `H1` headline style, Inter body, breadcrumb path (PANEL_NO / SUB_OPERATOR)
- [x] REFERENCED panel: bookmarked thumbnail cards with yellow accent dot, image previews
- [x] Toolbar (heading / image / embed / publish actions)
- [x] Inline image / YouTube embed blocks
- [ ] ARCHIVE/LABS/NETWORK top bar tabs
- [x] Save indicator

### Projects List (`/projects`)

- [x] CASE_STUDIES header with search icon
- [x] Project cards — asymmetric grid, black/white photographic thumbnails
- [x] Yellow accent badge per card (status: ACTIVE / VAULT / etc.)
- [x] "New Project" action button

### Publish Queue (`/publish`)

- [x] COMMUNICATION_CHANNELS header
- [x] Channel rows — platform icon tab (STAT_NET · EMAIL_NET · BROADCAST)
- [x] Publish action per row (yellow button or ghost)
- [x] Empty state

### Settings (`/settings`)

- [x] Dark section headers in Space Grotesk caps, 2px bottom border
- [x] Input fields — 2px black border, yellow focus ring, 0px radius
- [x] Destructive actions — purple accent border
- [x] Section labels as system monospace tags (e.g., `CONFIG_NODE`)

### Error Page (`+error.svelte`)

- [x] "REDACTED" watermark treatment
- [x] System-label error code + short message
- [x] Return home button (yellow)

---

## Portfolio (Public — `/portfolio/[username]`)

### Shared Portfolio Shell

- [ ] Left sidebar nav — OPERATOR profile label, role list (highlights active with yellow), no Settings on public view
- [x] Top bar — CREATETHINGS logo · WORK · TECH · GALLERY · CONTENT nav links · CONNECT button (yellow)
- [x] Footer — `createthings.co` credit + STAY_VOID / UNFILTERED watermark treatment
- [x] Social links in mono-label format

### Default / Generic Portfolio

- [ ] "CREATIVE ANARCHY" hero style — dark hero, yellow highlight word
- [ ] Featured Projects (CASE_STUDIES) grid
- [ ] THE_SKETCH_ARCHIVE section — template/document thumbnails
- [ ] CTA / contact section

### Developer Variant

- [x] Hero — "ARCHITECTING THE [KINETIC]" — KINETIC in yellow highlight block
- [ ] Active Stack panel (right) — tech counts: Figma / Svelte / Node.js / TypeScript
- [ ] Repositories section — dark repo cards, green `●` indicators, language + stars
- [ ] Tech Stack icons grid (React / Svelte / Node / Notion)
- [ ] CTA footer — black full-width band, "READY TO BUILD THE FUTURE?", HIRE ME (yellow) + STACK INFO (ghost) buttons

### Content Creator Variant

- [x] Hero — "CURATING THE CULTURE" — yellow accent, SUBSCRIBE button + count
- [ ] Latest Videos grid (featured large + 2-up right)
- [ ] VIEW ALL → header link pattern
- [ ] Threads & Articles cards (4-up, yellow tag badges, category labels)
- [ ] Newsletter Archives list (monospace labels)

### Photographer Variant

- [x] Hero — full-bleed portrait photo, "THE UNFILTERED LENS" overlaid in white/yellow
- [x] Role tags — URBAN EXPLORATION · BRUTALIST SPACES (yellow badge style)
- [ ] Featured Works — asymmetric grid (large left, 2-up small right)
- [x] Statement block + "BOOK A SHOOT" CTA (neon green)

### Designer Variant

- [x] Hero — "CRAFTING VISUAL [LOGIC]" — VISUAL in italic purple highlight
- [x] Short bio + FULL BREAKDOWN (yellow) + VIEW MANIFESTO (ghost) buttons
- [ ] Selected Work — fullwidth dark project cards, title overlay, type tag
- [ ] Process section — numbered steps 01 / 02 / 03 with descriptions
- [ ] Tech tags strip at footer

---

## Browser Extension

### Capture Popup

- [x] UNFILTERED badge logo (yellow on black) in top-left
- [x] Top nav tabs — ARCHIVE · LABS · NETWORK (active = yellow underline)
- [x] Left sidebar — OPERATOR_01 profile, SCANNING / INDEX / OUTPUT links
- [x] Capture card — QUICK*CAPTURE_V1 label, SOURCE_ID: DISPATCH*### tag
- [x] URL preview image with yellow corner bracket overlay (viewfinder treatment)
- [x] CAPTURE_ORIGIN URL input (2px border, 0px radius)
- [x] OBSERVATIONS textarea — "REDACTED NOTES HERE..." placeholder
- [x] ASSIGNED_LABELS — chip tags, yellow background on active
- [x] CAPTURE button (yellow, full-width, hard drop shadow)
- [x] NEW_ENTRY sidebar button (yellow)
- [x] TERMINAL_GRIP_DOME + INITIAL_TRAP footer labels
- [x] "REDACT" watermark text in background

---

## Theme Infrastructure (later)

- [x] CSS custom property tokens (`--zine-yellow`, `--zine-black`, `--zine-white`, `--zine-green`, `--zine-purple`)
- [x] Theme applied globally via `layout.css` + Tailwind config
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
