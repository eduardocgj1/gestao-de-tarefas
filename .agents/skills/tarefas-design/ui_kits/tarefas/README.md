# Tarefas — UI Kit

Recriação interativa do app Tarefas: sidebar de navegação, board de colunas por dia, calendário mensal, drawer "Visão do Dia" (modos encaixado e expandido, redimensionável, com fluxo de fechamento do dia) e modais de tarefa, evento e configurações.

Construído a partir dos componentes primitivos em `components/` (Button, IconButton, Input, Checkbox, TaskCard, BoardPill, EventChip, ProgressRing, Modal, Badge, Fab).

## Arquivos

- `index.html` — shell do app + estado (React, sem build step)
- `Sidebar.jsx` — navegação lateral colapsável
- `BoardView.jsx` — board de colunas por dia
- `CalendarView.jsx` — calendário mensal
- `DayDrawer.jsx` — drawer "Visão do Dia" (encaixado + expandido + fluxo de fechamento)
- `Modals.jsx` — modais de tarefa, evento e configurações

## Como usar

Abra `index.html` diretamente no browser para ver o app interativo completo.

Fonte: `docs/features/atualizacao-de-design/prototype-reference.dc.html` + spec em `docs/features/atualizacao-de-design/spec.md`.
