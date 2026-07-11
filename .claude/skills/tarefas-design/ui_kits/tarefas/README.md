# Tarefas — UI Kit

Interactive recreation of the "Tarefas" day-management app: sidebar navigation,
day-column board, monthly calendar, the "Visão do Dia" drawer (docked +
expanded modes, resizable, with shutdown flow), and task/event/settings modals.

Built from this design system's `components/` primitives (Button, IconButton,
Input, Checkbox, TaskCard, BoardPill, EventChip, ProgressRing, Modal, Badge, Fab).

Files:
- `index.html` — app shell + state (React, no build step)
- `Sidebar.jsx`, `BoardView.jsx`, `CalendarView.jsx`, `DayDrawer.jsx`, `Modals.jsx` — screen-level composition (plain globals, not bundled DS components)

Source: `Atualização de design/prototype-reference.dc.html` + `README.md` (attached handoff package, Portuguese).
