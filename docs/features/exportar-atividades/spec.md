# Handoff: Exportar atividades para report semanal

## Overview
Feature for the **Bússola** app (a day-column task board, Node/Express backend +
vanilla JS/DOM frontend — see `public/index.html`, `public/app.js`,
`public/styles.css`, `server.js`, `data.json` in the main repo). It lets a user
select a week and generate a formatted, PPT-ready list of that week's
activities, split into **Progresso** (done) and **Próximos passos** (not
done), plus supporting screens: a task-card "Equipe" (team) editor and a
Settings → "Pessoas" (people) manager.

## About the Design Files
The file in this bundle — `Exportar Atividades.dc.html` — is a **design
reference prototype**, not production code. It was built with an internal
component-streaming format (custom `<x-dc>`/`<sc-for>`/`<sc-if>` tags, a
`DCLogic` class, `{{ }}` template bindings) that only runs inside the design
tool. **Do not port that markup or its custom tags into the app.** Treat it as
a functional spec of layout, states, and copy, and reimplement it as plain
DOM/JS following `public/app.js`'s existing patterns (the real app has no
React/Vue — it's direct DOM manipulation) — or in whatever framework the team
decides to adopt, if migrating. You can still open the `.dc.html` file directly
in a browser to click through the working prototype.

## Fidelity
**High-fidelity.** Colors, type, spacing, radii, and copy below are final
(taken from the bound Tarefas Design System tokens). Treat pixel values as the
target, not a rough guide.

## Screens / Views

### 1. Board (context only)
Existing screen, included in the prototype only so the export entry point and
task cards have somewhere to live. Not part of this feature's scope beyond:
- Header right side gets a new **"Exportar report ↗"** button (neutral
  variant, opens the export pop-up) next to the existing settings gear.
- Clicking any task card opens the Task modal (see #3).

### 2. Exportar atividades (main feature — modal/pop-up)
**Purpose:** review, edit, filter, and copy the week's activities into two
PPT-ready lists.

**Layout:** centered modal, `920px` wide (`max-width: 94vw`), `max-height:
88vh`, white surface, `border-radius: 20px` (`--radius-modal-lg`), shadow
`--shadow-modal-lg`. Scrim `rgba(38,36,32,.32)` (`--overlay-scrim-strong`),
`fadeIn .15s ease`; panel entrance `modalIn .18s ease`.

Vertical structure (top to bottom):
1. **Header row** — padding `22px 26px 16px`, border-bottom `1px solid
   var(--border-subtle)`.
   - Title "Exportar atividades" — `font: 800 19px 'Sora'`, color
     `--text-primary`.
   - Subtitle "Report semanal · formato pronto para colar no PPT" — `font: 600
     12px 'Sora'`, color `--text-muted` (ink-200/400 family), `margin-top: 2px`.
   - Week switcher (right-aligned, before the close button): `‹` icon button →
     week label chip (`font: 700 12.5px`, background `--surface-sunken`,
     `border-radius: 9px`, `padding: 6px 10px`, `min-width: 132px`, centered) →
     `›` icon button. Default week: **previous complete week (Mon–Fri)**. If
     opened on a Monday, still loads last week (Mon–Fri).
   - `×` close icon button, `30×30px`.
2. **Project filter row** — padding `14px 26px`, border-bottom `1px solid
   var(--border-subtle)`, `display:flex;gap:10px;flex-wrap:wrap`.
   - Label "PROJETOS" — uppercase, `font: 700 11px`, letter-spacing `.05em`,
     color muted.
   - One pill per **project** present in the selected week's activities
     (checkbox pill: dot + name + checkbox, `border-radius: 20px`, `padding: 6px
     12px 6px 8px`, checked = full opacity + `--surface-sunken` bg, unchecked =
     `opacity: .5` + white bg). **Important:** "project" here is the **"Projeto"
     custom field on task cards** (e.g. Portal NAC, Autagend., Processo IA,
     Marisa.Care, First Layer, Stage, Memed, or "Sem projeto" when unset) — it
     is *not* the board (Trabalho/Pessoal). Default: all projects present in
     the week are checked. Toggling updates both columns live.
3. **Two-column list area** — `flex:1`, scrolls vertically only
   (`overflow-x: hidden`), split into two equal panels separated by a 1px
   `--border-subtle` line.
   - **Each column header** (padding `16px 22px 10px`): column title (`font:
     700 13.5px`) — "Progresso" (left) / "Próximos passos" (right) — a count
     pill (`font: 600 11px`, background `--surface-sunken`, pill radius,
     padding `2px 8px`), then a right-aligned **"Copiar"** button (brand-soft,
     small). On click: copies all rows in that column (newline-joined) to the
     clipboard and the button label flips to **"Copiado ✓"** for 1.5s.
   - **Empty state** (only when the column has zero rows after filtering):
     centered dashed box, `1px dashed #E3DDCF`, `border-radius: 11px`, `padding:
     16px`, muted `12px` text — "Nenhuma atividade concluída nesta semana"
     (Progresso) / "Nenhuma atividade pendente nesta semana" (Próximos
     passos). No error styling — just a quiet blank state.
   - **Row** (per activity): small `6px` colored dot (the activity's project
     color) + an auto-growing **textarea** (not a single-line input — long
     text must wrap onto multiple lines, never truncate/scroll horizontally)
     showing the generated text, editable inline, `font: 500 12.5px`,
     transparent background, focus state shows a hairline border + white bg + `--surface-sunken`
     otherwise + a small `×` delete button (muted, turns `--danger` on hover)
     that removes the row **from the export list only** (never from the
     board).
   - **Sort:** chronological, most recent first, by the task's board date.
   - **Classification:** completed tasks → Progresso; not completed →
     Próximos passos.
   - **Generated text format:** `Descrição (Responsável | Área – DD/MM)` —
     see "Responsible-name formatting" below for the exact grouping rule.
4. **Footer** — padding `14px 26px`, border-top `1px solid var(--border-subtle)`.
   - Left: small muted caption reminding the format string.
   - Right: **"Salvar visualização"** button (neutral). On click, flips to
     "Visualização salva ✓" for 1.5s. Saves the current week's edits,
     deletions, and project filter so reopening the same week restores them.

### 3. Card da tarefa (task modal) — "Equipe" addition
**Purpose:** let a task/card carry a list of team members so the export text
can attribute it correctly.

**Layout:** centered modal, `380px` wide, `max-height: 85vh`, `border-radius:
18px` (`--radius-modal`), shadow `--shadow-modal`, padding `22px`.
- `×` close icon, top-right, `28×28px`.
- Task name — `font: 700 17px`, `padding-right: 30px` to clear the close button.
- Meta row: project dot (project color) + `"{Projeto} · {Dia da semana} ·
  DD/MM"` — `font: 600 11.5px`, muted.
- **"EQUIPE" section** (label uppercase, `700 11px`, muted, `.04em` tracking):
  - If no team member is set: one line of muted `12px` copy — "Sem equipe
    cadastrada — usa **{pessoa principal}** como responsável." (fills in the
    live principal-person name from Settings).
  - Each existing member renders as a row: `background: --surface-sunken`,
    `border-radius: 9px`, `padding: 7px 10px` — bold name, then " · área" in
    muted regular weight if an área/empresa was given, and a small `×` remove
    (muted → danger on hover) that removes just that member from the card.
  - **"+ Adicionar equipe"** button (brand-soft, small) — same visual pattern
    as the pre-existing "Adicionar delegado"-style affordances in the app.
    Clicking swaps it for the add-member form:
    - Bordered card (`1px solid --border-default`, `border-radius: 11px`,
      `padding: 12px`).
    - **Nome** text input (autofocus). As the user types, a same-width
      suggestion list appears directly beneath it (white bg, `1px solid
      --border-default`, `border-radius: 9px`, rows `padding: 7px 10px`,
      hover = `--surface-sunken`) — filtered case-insensitively from people
      saved in Settings, max 4 shown, each showing "Nome · Área" (or just
      Nome). Clicking a suggestion fills both Nome and Área fields.
    - **Área / empresa** text input below.
    - Two buttons side by side: **"Adicionar"** (brand, confirms — no-op if
      Nome is empty) and **"Cancelar"** (neutral, discards and closes the
      form).
    - On confirm: if the typed name doesn't match an existing saved person
      (case-insensitive), it is auto-added to the Settings → Pessoas list.
      The member (name + área) is appended to the card's team. Multiple
      members can be added one at a time; each add re-shows the "+ Adicionar
      equipe" button afterward.
- **Urgente** checkbox row (read-only display in this scope) and
  **Concluída** checkbox row (toggling reflects immediately on the board
  card and in the export lists, since classification is completed-based).

### 4. Configurações — "Pessoas" (settings modal)
**Purpose:** manage the people directory used to fill team member
autocomplete, and designate the default/"pessoa principal" responsible.

**Layout:** centered modal, `460px` wide, same modal chrome as the task
modal (`18px` radius, `22px` padding, `×` close top-right).
- Title "Configurações" — `font: 800 18px`.
- "PESSOAS" section label (uppercase, `700 11px`, muted).
- One row per person: `background: --surface-sunken`, `border-radius: 10px`,
  `padding: 9px 11px` — bold name + muted área/empresa line beneath (if set).
  - If this person is the **pessoa principal**: a brand `Badge` reading
    "Principal" on the right, no delete affordance (principal can't be
    deleted directly in this scope — reassign principal first).
  - Otherwise: a text button **"Definir principal"** (brand-colored,
    `font: 700 11px`) + a muted `×` remove (turns danger on hover).
- **"+ Adicionar pessoa"** button (brand-soft, small) → same
  Nome/Área-inputs-plus-Adicionar/Cancelar pattern as the team-member add
  form (no autocomplete needed here — this *is* the source list). New people
  default to non-principal.
- The **pessoa principal** is the fallback "Responsável" used in the export
  format whenever a task/card has no team members registered.

## Interactions & Behavior
- Opening the export pop-up always loads the previous complete week (Mon–Fri)
  by default; the `‹›` arrows step one week at a time and re-run
  classification/sort/filtering for that week's data.
- Project filter, row edits, and row deletions are **local to the export
  view** — they never write back to the underlying task/board data.
- "Copiar" copies only that column's current rows (post-filter, post-edit,
  post-deletion), newline-joined, one activity per line.
- "Salvar visualização" persists the current week's row edits, deletions, and
  project filter, keyed to that week, so reopening the same week restores
  them exactly (see State Management).
- Toggling a task's "Concluída" state (from the board card or the task
  modal) moves it live between Progresso/Próximos passos the next time the
  export pop-up is open for that week.
- Textareas auto-size to the content on the item's initial render (rows
  estimated from character count) so long descriptions are never clipped or
  horizontally scrolled — implement as a proper auto-grow textarea (e.g.
  resize on `input`) in production rather than a static row estimate.
- All copy is Brazilian Portuguese; no first-person "I" phrasing; imperative/
  infinitive voice ("Marque", "Adicionar", "Salvar visualização").
- No navigation-icon emoji. The only emoji in this feature's scope would be
  the ⭐ MIT marker and 🎉 empty-state marker inherited from the rest of the
  app — this feature introduces none of its own.

## Responsible-name formatting (core business logic)
Format string: **`Descrição (Responsável | Área – DD/MM)`**

1. If the task/card has one or more **team members** registered:
   - Group members by their área/empresa, preserving first-seen order.
   - Within a group, join names with commas and " e " before the last:
     `"Kenzo, Aron e Natan"`, `"Karina"`, `"Karina e Jean"`.
   - Render each group as `"{names} | {área}"` (omit `" | {área}"` entirely if
     área is blank).
   - Join all groups with `", "`.
   - Example (multiple orgs): `Kickoff e validação de cronograma (Kenzo, Aron
     e Natan | Wigoo, Marcus | Front, Renan e Matheus | Design, Akad | DL e
     Gamboa | Produtos – 22/06)`.
2. If the task/card has **no team members**: the whole "Responsável | Área"
   slot is replaced by just the **pessoa principal**'s name (no área shown).
3. The `– DD/MM` suffix always uses the task's **board date** (the date the
   card lives on), not its delivery date, creation date, or completion date.
4. Sorting for both columns is by this same board date, descending (most
   recent first).

## State Management
Per export-view session, track:
- `weekIndex` / selected week (Mon–Fri range) — default previous complete week.
- `projectFilter: Record<projectId, boolean>` — default true for every project
  present in the selected week; unioned with "no explicit override = checked"
  so newly-appearing projects in a different week default on.
- `rowEdits: Record<taskId, string>` — inline-edited text, overrides the
  generated default.
- `rowDeletions: Set<taskId>` — removed from the export view only.
- **Saved view** — persisted per-week snapshot of the three items above
  (`projectFilter`, `rowEdits`, `rowDeletions`), restored when the same week
  is reopened. Not shared between users (out of scope per the spec).

Per task/card:
- `team: { name: string, area: string }[]`.
- Existing `completed` boolean (already in the data model) drives
  classification.

Global (Settings):
- `people: { id, name, area, principal: boolean }[]`, exactly one `principal
  = true` at a time.
- Adding a team member with a name not already in `people` auto-inserts them
  there (non-principal, área from whatever was typed on the card).

## Design Tokens
Pull these from the bound Tarefas Design System's `tokens/*.css` (also
summarized here for convenience):

**Colors**
- Page bg `#FAF7F2`, surface `#FFFFFF`, sunken surface `#FBF9F4`, neutral
  button `#F5F1E8`.
- Borders: default `#ECE6D8`, subtle `#F1ECE0`, dashed `#E3DDCF`.
- Text: primary `#262420`, secondary `#7A766C`, tertiary `#B3AE9F`, meta
  `#8B8778`.
- Brand green: `#3A6604` (hover `#2F5303`), soft bg `#EAF0DE` (hover `#DCE7C9`).
- Terracotta/danger: `#C1622D`, soft bg `#F7E9DF`, destructive button bg
  `#FBEAE0`.
- Dark action (Fechar/Encerrar-tier buttons): `#262420` (hover `#3A3630`).
- Overlay scrim: `rgba(38,36,32,.3)` normal / `rgba(38,36,32,.32)` strong (used
  by this feature's modals).
- Project chip colors used in the example data: Portal NAC `#38D9A9`,
  Autagend. `#FFA94D`, Processo IA `#FF6B6B`, Marisa.Care / First Layer
  `#F783AC`, Sem projeto `#D8D2C2` (neutral placeholder — pick any muted sand
  tone for "no project").

**Typography** — single family **Sora** (400–800), Google Fonts.
- Modal title: `800 19px`. Task name: `700 17px`. Column/section titles:
  `700 13.5px`. Body/labels/buttons: `600–700 11–12.5px`. Section eyebrow
  labels: `700 11px`, uppercase, `.04–.05em` tracking.

**Spacing** — scale `2/4/6/8/10/12/14/16/18/20/22/26px`. Modal padding `22px
26px`. Row padding `8–11px`. Column width (board) `236px`.

**Radii** — buttons/inputs `9–11px`, cards/rows `9–11px`, modals `18px`
(`20px` for the large export modal), pills full round.

**Shadows** — modal `0 20px 50px rgba(38,36,32,.2)`; the export modal (large)
uses `0 24px 60px rgba(38,36,32,.28)`. Cards use a barely-visible `0 1px 2px
rgba(38,36,32,.05)`.

**Motion** — scrim fade `.15s ease`; modal/panel entrance
`translateY(10px) scale(.98)→translateY(0) scale(1)`, `.18s ease`
(`modalIn`). No bounce/spring.

## Assets
No photography, illustration, or icon files. All glyphs are Unicode
characters (`‹ › × ⚙`) per the design system's iconography rules — do not
introduce an icon font or SVG icon set for this feature.

## Files in this bundle
- `Exportar Atividades.dc.html` — clickable design reference prototype for
  all four screens above (open directly in a browser).
- `spec-exportar-atividades.md` — original Portuguese product spec this
  design implements (scope, edge cases, user journey — same source used to
  build the prototype).
- `data-example.json` — a trimmed export of the real `data.json` shape
  (boards → tasks, including the `fields`/`fieldValues` mechanism used for
  the "Projeto" custom field) for reference when wiring the real data model.
