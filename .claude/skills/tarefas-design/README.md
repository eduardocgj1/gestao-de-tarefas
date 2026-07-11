# Tarefas Design System

Design system for **Tarefas**, a personal/team day-based task-management app
(board of day-columns, monthly calendar, Pomodoro timer, multiple boards) plus
its in-progress "Visão do Dia" (Day View) feature — a planning/close-of-day
drawer.

## Sources
- Attached local folder `Atualização de design/` (via File System Access API), containing:
  - `README.md` — Portuguese handoff spec: "Modernização visual — Tarefas 2026" (hi-fi redesign brief, design tokens, screen-by-screen spec, interaction notes)
  - `prototype-reference.dc.html` — a Design Component reference build implementing the full spec (sidebar, board, calendar, resizable/expandable day drawer, task/event/settings modals) with working interactivity
- No Figma file or link, and no production codebase (the real app is vanilla JS/Express, described but not attached) were provided. Everything here is derived from the two files above.
- Store for reference (not fetched by this project): the handoff mentions the real app lives at `public/index.html`, `public/styles.css`, `public/app.js`, `server.js`, `data.json` (Node/Express, DOM-manipulation frontend) and a functional spec at `Features/visao-do-dia.md` — neither was attached here.

## Product
Single product: **Tarefas** ("Tasks"), a day-column task board — think a
lightweight Kanban-by-weekday tool with a monthly calendar view, a Pomodoro
focus timer, multiple named boards (color-coded), and a planned "Visão do Dia"
day-planning/closing drawer. UI language and copy are Brazilian Portuguese.

## Index
- `styles.css` — root stylesheet; imports everything under `tokens/`
- `tokens/colors.css` — base sand/ink/green/terracotta/blue palette + semantic aliases
- `tokens/typography.css` — Sora font import + type scale
- `tokens/spacing.css` — spacing scale + component width/height tokens
- `tokens/effects.css` — radius scale, shadows, keyframes
- `guidelines/` — foundation specimen cards (colors, type, spacing, radius, shadows, brand)
- `components/forms/` — Button, IconButton, Input, Checkbox
- `components/data/` — TaskCard, BoardPill, EventChip, ProgressRing
- `components/overlay/` — Modal
- `components/feedback/` — Badge, Fab
- `ui_kits/tarefas/` — full interactive recreation of the app (sidebar, board view, calendar view, day drawer, task/event/settings modals)
- `SKILL.md` — portable skill wrapper for use in Claude Code

### Components (11)
Badge, BoardPill, Button, Checkbox, EventChip, Fab, IconButton, Input, Modal, ProgressRing, TaskCard.

### Intentional additions
The source is a single reference screen, not a componentized library — so the
component list was derived by decomposing repeated visual patterns in that
screen (buttons, chips, cards, forms, overlay) rather than an enumerated
inventory. `IconButton` and `Modal` are structural wrappers not explicitly
named in the source but needed to compose the screens faithfully.

## Content Fundamentals
- **Language**: Brazilian Portuguese throughout — labels, placeholders, button copy, dates ("06 jul – 10 jul", "Julho 2026").
- **Voice**: direct, imperative, task-first. Buttons are verbs: "Adicionar", "Salvar evento", "Excluir tarefa", "Fechar o dia", "Encerrar". Section labels are nouns: "Boards no dia", "Prioridades do dia".
- **Person**: mostly impersonal/infinitive rather than "you" — e.g. "Marque até 3 prioridades" (imperative "mark", addressing the user directly but without pronouns). No first-person "I" copy.
- **Casing**: sentence case for body copy and buttons; UPPERCASE with wide letter-spacing (`.04–.06em`) reserved for section eyebrow labels ("BOARDS", implicitly via CSS text-transform) and the "URGENTE" badge.
- **Emptystates are warm, brief**: "Marque até 3 prioridades" (dashed border, centered, muted), "Nenhuma tarefa pendente 🎉" — the only emoji used in copy, celebratory, in an empty state.
- **Emoji**: reserved strictly for content, never navigation/actions — ⭐ marks a "priority of the day" (MIT) task, 🎉 celebrates an empty pending-list. The calendar icon is hand-built with CSS borders, explicitly *not* an emoji, per the source spec.
- **Tone**: calm, low-friction productivity tool — no exclamation-heavy marketing voice, no jargon. Feels like a personal planning tool, not enterprise software.

## Visual Foundations
- **Palette**: warm paper/sand neutrals (`#FAF7F2` page, `#FFFFFF` surfaces, `#ECE6D8` borders) — not cold gray. Two board-identity colors: brand green `#3A6604` (primary actions, "Trabalho" board, active states) and terracotta `#C1622D` (urgent flags, "Pessoal" board, destructive actions use a *soft* terracotta background with terracotta text, never solid red). A single accent blue `#3E6FBD` appears only for multi-board calendar events. Near-black `#262420` is the "dark action" color for the highest-commitment actions (Fechar o dia / Encerrar) — reserved, not overused.
- **Type**: single family, Sora (Google Fonts, 400–800). Weight does most of the hierarchy work — 800 for modal titles, 700 for page/column titles and buttons, 600 for body/labels. Sizes are all sub-20px (9.5–19px) — this is a dense, utilitarian UI, not an editorial one.
- **Spacing**: tight and consistent — 2/4/6/8/10/12/14/16/18/20/22/26px scale, no giant whitespace. Column width is fixed at 236px; the day drawer defaults to 400px and is user-resizable 320–720px.
- **Backgrounds**: flat color only. No photography, no illustration, no gradients, no textures/patterns. The only "image-like" surface is the warm sand page background against white cards.
- **Animation**: minimal and functional — a 0.18s ease sidebar width transition, a 0.15s fade-in for overlay scrims, and a subtle translate+scale "pop" (`modalIn`, 0.18s ease) for modals/expanded drawer. No bounce, no spring physics, no looping/decorative animation. Drawer resize disables the width transition entirely while dragging (`resizing` state) so it tracks the cursor with zero lag.
- **Hover states**: neutral buttons darken one step (`#F5F1E8` → `#ECE6D8`); brand-soft buttons darken (`#EAF0DE` → `#DCE7C9`); dark/black buttons darken slightly (`#262420` → `#3A3630`). Always a same-hue darken, never a lighten or opacity change.
- **Press/active states**: not explicitly specified beyond hover; treat as the hover color persisting on `:active` (no scale/shrink effects observed).
- **Borders**: thin 1–1.5px hairlines in the sand-400 (`#ECE6D8`) family; slightly lighter (`#F1ECE0`) for internal dividers (column header/task-list separators). Icon glyphs (the calendar icon) use `1.5px solid currentColor`.
- **Shadows**: very soft and low-contrast — cards/panels use `0 1px 2px rgba(38,36,32,.05)` (barely-there elevation, warm-tinted not pure black). Modals step up to `0 20px 50px rgba(38,36,32,.2)`, the expanded day-drawer modal to `0 24px 60px rgba(38,36,32,.28)`, and the FAB gets its own `0 8px 20px rgba(38,36,32,.25)`.
- **Corner radii**: generous but restrained ("Toggl-style") — 9–11px for buttons/inputs, 16px for panels/columns, 18–20px for modals, full pill (20px/50%) for chips and the FAB/dots. Never sharp corners, never a heavy "squircle" look.
- **Cards**: white surface, 16px radius, near-invisible shadow, no border (relies on shadow + page-background contrast alone). Task cards inside columns use a colored **left border only** (3px) plus a tinted background — this is the one place a color-coded left-border pattern is intentional and source-verified, not a generic AI-slop habit.
- **Protection gradients / capsules**: none observed — no fade-out scroll gradients; overflow is handled with a plain scrollbar (custom-styled 8px thumb, sand-colored).
- **Transparency & blur**: overlay scrims are a flat `rgba(38,36,32,.3–.32)` — no backdrop-blur. No frosted-glass surfaces anywhere.
- **Imagery**: none. No photography, no icon illustrations — this is a fully vector/typographic UI.
- **Layout rules**: sidebar is fixed-width and collapsible (64px ⇄ 236px); the day drawer is "docked" (participates in flex layout, pushes board content, like a second sidebar) by default, and only becomes a true floating/backdrop modal when explicitly expanded via the ⤢ toggle.

## Iconography
- **No icon font, no SVG icon set, no CDN icon library.** Every glyph in the
  source is either a **Unicode/typographic character** (‹ › ‹‹ ›› for nav, ⚙
  for settings, × for close, ⤢/⤡ for expand/collapse, ↺ ▶ for pomodoro
  controls, ✕ for cancel/remove) or a **tiny hand-built CSS shape** — the
  calendar icon is explicitly specified as a `13×12px` box with a
  `1.5px solid currentColor` border and a horizontal rule near the top,
  built from a `<span>` + `::after`-style inline element, not a glyph or SVG.
- **Emoji** appear only in content, never chrome: ⭐ (priority/MIT task), 🎉
  (empty pending-list celebration). The source spec explicitly calls out
  "Nada de emoji para navegação" (no emoji for navigation).
- Board identity and event/task state are communicated with small **solid
  color dots** (`8–9px` circles) rather than icons.
- No logo file was supplied. Where a mark would go, this system renders the
  brand name in plain type (a rounded-square letterform "T" avatar + "Tarefas"
  wordmark) built from CSS only — see `guidelines/brand-mark.html`. **This is
  not a real logo** — treat it as a typographic placeholder until a real mark
  is supplied.

## Fonts
**Sora** (Google Fonts, weights 400/500/600/700/800) is loaded via
`@import url(fonts.googleapis.com/...)` in `tokens/typography.css` — no local
`.woff2`/`.ttf` files were included in the attached source, so this mirrors
exactly how the reference prototype loaded the font (a `<link>` to Google
Fonts). If your build needs to be fully offline, swap this for local
`@font-face` + copied font binaries.

## Caveats
- Only one reference screen + one written spec were provided — no Figma, no
  production codebase, no additional screens (e.g. onboarding, empty states
  beyond what's described, mobile layout). Everything not covered by those two
  files is an inference, flagged inline above.
- The "Visão do Dia" feature is itself unimplemented in the real app per the
  source handoff — this design system's `ui_kits/tarefas/` recreates the
  *intended* design, not a shipped screen.
- No logo, brand illustrations, or photography were provided — see Iconography above.
