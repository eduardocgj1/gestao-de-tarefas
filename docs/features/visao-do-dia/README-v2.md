# Handoff: Visão do Dia v2 — Ritual de Planejar e Fechar o Dia

## Overview
Redesign of the "Visão do Dia" feature in **Bússola** (task-management app, vanilla JS/Express, no framework). Evolves the panel from a read-only mirror of the board into a daily ritual with three modes — **Planejar**, **Executar**, **Fechar** — per `uploads/spec-v2.md` (bundled in this folder). Full functional spec, open-question resolutions, data model, and task breakdown live in that document — treat it as the source of truth for scope; this README documents the UI that was designed on top of it.

## About the Design Files
The bundled `.dc.html` file is a **design reference built in HTML** (a "Design Component" — internal prototyping format, not a production framework). It shows the intended layout, states, copy, and interactions with real (mocked) data and working click-through logic, but it is **not code to import into the app**. The task is to **recreate this UI in the existing codebase** — vanilla JS + DOM manipulation (`public/app.js`, `public/index.html`, `public/styles.css`), following the patterns already in place (`renderDayPopup`, `attachDayPopupPanel`, `toggleDayDrawerExpand`, etc. — see `spec-v2.md` §"O que reutilizar" for the exact functions to keep).

Open the `.dc.html` file directly in a browser to click through every state.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii and copy below are final — pull them directly. Layout and interaction structure are final; exact pixel positions inside blocks (e.g. inner padding of a task row) can be adjusted slightly to match the real board's existing CSS scale, but the ~34px task-row height and 20px day title from the spec should hold.

## Design Tokens
Reuses the existing design system tokens — do not introduce new values.

**Colors**
- Page bg `#FAF7F2`, surface `#FFFFFF`, sunken surface `#FBF9F4`
- Borders: default `#ECE6D8`, subtle `#F1ECE0`, dashed `#E3DDCF`
- Text: primary `#262420`, secondary `#7A766C`, tertiary `#9A9488`/`#B3AE9F`, meta `#8B8778`
- Brand (Trabalho board, primary actions) `#3A6604`, hover `#2F5303`, soft bg `#EAF0DE`
- Terracotta (Pessoal board, danger) `#C1622D`, soft bg `#F7E9DF`
- Dark action (Fechar o dia / Encerrar) `#262420`, hover `#3A3630`
- Priority/MIT card: bg `#FBF6E9`, border `#F0E4C0`
- Load indicator: ok = brand soft (`#EAF0DE`/`#3A6604`), warn = gold (`#FBF6E9`/`#C99A2E`), over = danger soft (`#F7E9DF`/`#C1622D`)
- Overlay scrim `rgba(38,36,32,.32)`

**Type**: Sora, weights 400–800. Modal title 19px/800. Column/day title 16–17px/800. Section eyebrow labels 11px/700 uppercase, letter-spacing .05em. Body/task rows 12.5–13px/600. Buttons 11–13px/700.

**Radii**: buttons/inputs 9px, task/priority cards 11px, panels/columns 16px, modals 20px, chips/pills full (20px).

**Shadows**: cards `0 1px 2px rgba(38,36,32,.05)`, modal `0 20px 50px rgba(38,36,32,.2)`, expanded drawer modal `0 24px 60px rgba(38,36,32,.28)`.

**Spacing**: task row ~34px tall; panel section gap 16–20px. Board view column width is unchanged (existing 236px) — the panel has its own denser scale, the board view does not.

## Screens / Views

### 1. Board view (context screen) — unchanged structure
Boards stay apart: the main board view still shows **one board at a time** (`activeBoardId`), 5 day columns (Mon–Fri), each column listing only that board's tasks for the day — no change to `columnHtml()`'s per-board scoping. The **only** addition is the closed-day mark: a closed day gets **both** a small "✓ Fechado" pill (brand-soft bg, brand text) in the column header, and the whole column dimmed to 60% opacity. Today's column header keeps its existing brand-soft tint. The unified cross-board list (dot per row, no sub-sections) is exclusive to the Day panel (screens 3–5) — it does not extend to this screen.

### 2. Calendar view (context screen)
Month grid, 7×N cells. Each day cell: day number, up to 3 small board-colored dots for that day's tasks. A closed day gets a small ✓ mark next to the day number and a brand-soft cell background. Today's cell has a sunken-surface tint. Click any cell to open the day panel for that date.

### 3. Day panel — Executar mode (docked drawer, default while a day is "in progress")
400px-wide panel docked at the right edge (pushes layout, does not overlay). Header: day title (16px/800) + "Executar · painel encaixado" subtitle, `⤢` (pop out to modal) and `×` (close) buttons. Body, top to bottom: **Prioridades** (⭐ cards, name + optional manhã/tarde/noite tag, or dashed empty state "Marque até 3 prioridades"), **Próximo evento** (single upcoming event, dot + name + time, read-only), **Captura rápida** (text input + `+` button, enter-to-submit, creates a task dated today). Footer: full-width dark "Fechar o dia" button that switches the panel to expanded modal + Fechar mode.

### 4. Day panel — Planejar mode (expanded modal)
700×84vh centered modal over a scrim, `modalIn` pop animation. Header: day title (19px/800) + "Planejando o dia · weather" subtitle, `⚙` (settings popover), `⤡` (dock to sidebar), `×` (close).
Body blocks, in order:
1. **Captura rápida** — board `<select>` (dot-colored options) + text input + "Adicionar" button.
2. **Teto do dia** — "Quantas tarefas hoje?" + number input (the day's `capacity`), with a load pill on the right: `N de M tarefas` in green (< teto), amber (== teto), or red with " — acima do teto" suffix (> teto).
3. **⭐ Prioridades do dia** — up to 3 task cards (gold bg), each with a manhã/tarde/noite one-letter toggle group; clicking the ⭐ on a card removes it from priorities. Empty state: dashed border, "Marque até 3 prioridades na lista abaixo".
4. **Agenda** — read-only list of the day's calendar events (dot + name + time).
5. **Demais tarefas do dia** — unified list (all visible boards, dot per row) excluding priorities; each row: checkbox (toggles done, strikethrough on complete), dot, name, and a ⭐ button to promote it into priorities (disabled/dimmed once 3 are already picked).
6. **Pendências (N)** — collapsible section (▼/▲ toggle), collapsed by default. Lists overdue (up to 14 days back) and dateless tasks from visible boards, each with a "→ hoje" button that pulls it onto today (this can push the load indicator into the amber/red state live).

Footer: full-width dark "Fechar o dia" button → switches to Fechar mode (same modal).

**Settings popover** (from `⚙`): board-visibility checkboxes (dot + name, unchecked = hidden from every list/column/cell) and a "Teto padrão" number input (default capacity seeded into new days).

**Reopen banner**: if the opened day is already closed, a brand-soft banner sits at the top of Planejar mode: "Este dia foi fechado dd/mm/aaaa." + "Reabrir o dia" button (clears the closed mark only; any moved/archived tasks stay moved).

### 5. Day panel — Fechar mode (same modal, mode switch)
Same header, subtitle becomes "Fechando o dia". Body blocks:
1. **Resultado** — sunken card, bold 15px line: `X de Y tarefas concluídas · Z de 3 prioridades`.
2. **Pendências** — one row per still-open task dated today: dot + name, then 4 choice buttons (`Amanhã` pre-selected / `Outra data` / `Arquivar` / `Ignorar` — dark pill when active), a date input appears only when "Outra data" is active, and 3 optional one-click reason chips (`faltou tempo` / `bloqueado por terceiro` / `mudei de prioridade`, brand-soft when active, toggle off by clicking again). Empty state: dashed card, "Nenhuma tarefa pendente 🎉".
3. **Nota do dia** — two pill prompt buttons (`o que travou?` / `o que foi bem?`) that append their own label as a text stub into the textarea below; free-text textarea underneath.
4. **Amanhã — escolha até 3 prioridades** — list of tasks already dated for tomorrow (including ones just deferred to "Amanhã" above); ⭐ toggle per row, max 3, dimmed/disabled past that.

Footer: "Voltar" (neutral, returns to Planejar) + "Encerrar o dia" (dark, full-width-ish, finalizes).

## Interactions & Behavior
- **Opening**: click a board column header or a calendar cell → panel opens **expanded**, in **Planejar** mode, for that date.
- **Dock/expand toggle**: `⤢`/`⤡` swap between the floating modal and the docked sidebar drawer without closing the panel or losing state. Docked view always shows the lean Executar content regardless of Planejar/Fechar mode underneath.
- **Priorities**: max 3; toggling a 4th is a no-op (star dims/disables) until one is removed. `manhã/tarde/noite` is a single-select per priority, click again to clear.
- **Load indicator**: recomputed live from the count of today's tasks vs `capacity`; pulling a pendência into today can flip it from green/amber to red immediately (no page reload).
- **Capture**: Enter key or the `+`/"Adicionar" button both submit; input clears on submit; new task is dated to the open day and tagged with the selected board.
- **Fechar o dia → Fechar mode**: pre-seeds one pending-row choice per open task, all defaulting to `Amanhã` with `outra` date defaulting to the next calendar day.
- **Encerrar o dia**: applies every pendency's choice (move date / archive / no-op), saves the note text, saves next-day priorities into *tomorrow's* `day_logs` entry (so they appear pre-marked when tomorrow is opened), stamps `closedAt`, closes the panel. Board and calendar immediately reflect the closed mark.
- **Reabrir o dia**: only clears the closed timestamp; does not undo any date moves/archiving from the original close.
- **Animations**: modal — 0.18s `modalIn` (translateY + scale) on open; scrim — 0.15s fade. No other motion (matches design system: minimal, functional only).

## State Management
Suggested state shape (mirrors the prototype, adapt to the app's existing in-memory + upsert-on-save model):
- `openDate: string | null` — which day's panel is open
- `expanded: boolean` — modal vs docked drawer
- `mode: 'plan' | 'close'` — only meaningful while expanded; docked always renders the lean "run" content
- `dayLogs: { [date]: { capacity, mitIds: string[], mitWhen: {[taskId]: 'manha'|'tarde'|'noite'}, note, nextDayMitIds: string[], closedAt: string|null } }` — one entry per day, persisted server-side (see Data model)
- `closeChoices: { [taskId]: { choice: 'amanha'|'outra'|'arquivar'|'ignorar', reason: string|null, customDate } }` — transient, built when entering Fechar mode, applied on Encerrar
- `hiddenBoardIds: string[]`, `defaultCapacity: number` — settings popover
- Per-task fields: existing `date`, `completed`, plus new `archived: boolean` and `deferralReason: string|null`

State transitions match the "Interactions & Behavior" section above. No async/loading state was designed beyond what's already `[A DEFINIR]` in `spec-v2.md` — the spec notes the panel is synchronous over in-memory state today and only becomes relevant once `day_logs` loads on demand.

## Data model
See `spec-v2.md` §"v3 — Discovery Técnico" for the authoritative schema — summarized here:
- New table `day_logs` (one row per user per date): `id TEXT` (via `uid()`, same as every other table's id — not a UUID), `user_id TEXT`, `date`, `capacity`, `mit_ids JSONB`, `mit_when JSONB`, `note`, `next_day_mit_ids JSONB`, `closed_at`.
- `day_logs` rides the existing `GET/POST /api/tasks` upsert-total payload — no new REST routes, matching the "apenas 2 rotas" architecture in `CLAUDE.md`.
- `tasks` table: **remove** `duration`; **add** `deferral_reason TEXT`, `archived BOOLEAN DEFAULT FALSE`.
- MIT priorities move from `localStorage` (`mit-{boardId}-{date}`) to `day_logs` (scoped by date, not board).
- Pomodoro and all duration/time-based UI are removed app-wide — out of scope for this panel but a hard dependency per the spec's cleanup tasks (`cl-01`…`cl-04`).

## Assets
No images/icons — everything is Unicode glyphs (⭐ ⚙ × ⤢ ⤡ ▲ ▼) or plain color dots, per the design system's no-icon-library rule. Font is Google-hosted Sora (already loaded by the app's existing stylesheet).

## Files
- `Visao-do-Dia-v2.dc.html` — the interactive prototype (open in any browser; click through board → calendar → panel → all 3 modes).
- `spec-v2.md` — full functional spec this design implements (problem, scope, data model, task breakdown, open questions and their resolutions).
