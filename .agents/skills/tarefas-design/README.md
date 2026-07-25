# Tarefas — Design System

Sistema de design do **Bússola**, um app pessoal de gestão de tarefas por colunas de dia (board semanal, calendário mensal, timer pomodoro, múltiplos boards) com a feature "Visão do Dia" — um drawer de planejamento e fechamento do dia.

## Índice de arquivos

- `styles.css` — stylesheet raiz; importa tudo de `tokens/`
- `tokens/colors.css` — paleta base areia/tinta/verde/terracota/azul + aliases semânticos
- `tokens/typography.css` — importação da fonte Sora + escala tipográfica
- `tokens/spacing.css` — escala de espaçamento + tokens de largura/altura de componentes
- `tokens/effects.css` — escala de border-radius, sombras, keyframes de animação
- `guidelines/` — cards de referência visual de cada token (cores, tipo, espaçamento, radius, sombras, marca)
- `components/forms/` — Button, IconButton, Input, Checkbox
- `components/data/` — TaskCard, BoardPill, EventChip, ProgressRing
- `components/overlay/` — Modal
- `components/feedback/` — Badge, Fab
- `ui_kits/tarefas/` — recriação interativa completa do app (sidebar, board, calendário, drawer do dia, modais)

### Componentes (11)
Badge, BoardPill, Button, Checkbox, EventChip, Fab, IconButton, Input, Modal, ProgressRing, TaskCard.

---

## Produto

**Bússola** — board de tarefas por dia da semana, pense num Kanban leve organizado por dia útil, com visualização mensal, timer pomodoro, múltiplos boards coloridos e o drawer "Visão do Dia" para planejamento e fechamento do dia. Interface e textos em português brasileiro.

---

## Fundamentos visuais

**Paleta:** neutros quentes areia (`#FAF7F2` página, `#FFFFFF` superfícies, `#ECE6D8` bordas) — não cinza frio. Duas cores de identidade de board: verde marca `#3A6604` (ações primárias, board "Trabalho", estados ativos) e terracota `#C1622D` (urgente, board "Pessoal", ações destrutivas usam fundo terracota suave com texto terracota, nunca vermelho sólido). Azul `#3E6FBD` aparece apenas em eventos multi-board no calendário. Preto quase-puro `#262420` é a cor de "ação escura" reservada para os CTAs de maior comprometimento (Fechar o dia / Encerrar).

**Tipografia:** família única, Sora (Google Fonts, pesos 400–800). O peso faz a maior parte da hierarquia — 800 para títulos de modal, 700 para títulos de página/coluna e botões, 600 para corpo/labels. Tamanhos entre 9.5px e 19px — UI densa e utilitária, não editorial.

**Espaçamento:** compacto e consistente — escala 2/4/6/8/10/12/14/16/18/20/22/26px. Largura de coluna fixa em 236px; drawer do dia padrão em 400px, redimensionável de 320px a 720px.

**Animação:** mínima e funcional — transição de largura da sidebar em 0.18s ease, fade-in de scrims em 0.15s, e um sutil translate+scale (`modalIn`, 0.18s ease) para modais. Sem bounce, sem spring physics. O resize do drawer desativa a transição de largura durante o arraste para seguir o cursor sem lag.

**Sombras:** muito suaves — cards/painéis usam `0 1px 2px rgba(38,36,32,.05)`. Modais: `0 20px 50px rgba(38,36,32,.2)`. Drawer expandido: `0 24px 60px rgba(38,36,32,.28)`. FAB: `0 8px 20px rgba(38,36,32,.25)`.

**Border-radius:** generoso mas contido — 9–11px para botões/inputs, 16px para painéis/colunas, 18–20px para modais, pill completo (20px/50%) para chips e FAB.

**Cards de tarefa:** superfície branca, radius 16px, sombra quase invisível, sem borda lateral. Cards de tarefa dentro das colunas usam **borda esquerda colorida** (3px) + fundo tintado — o único lugar onde a borda-esquerda colorida é intencional neste design.

---

## Iconografia

Sem icon font, sem SVG, sem biblioteca de ícones. Todos os glifos são **caracteres Unicode** (‹ › ‹‹ ›› para navegação, ⚙ para configurações, × para fechar, ⤢/⤡ para expandir/colapsar, ↺ ▶ para controles do pomodoro) ou **formas CSS puras** — o ícone de calendário é uma caixa `13×12px` com borda `1.5px solid currentColor` e uma linha horizontal no topo, construído com `<span>` + CSS, não um glifo ou SVG.

**Emoji** aparecem apenas em conteúdo, nunca em navegação: ⭐ (tarefa MIT/prioridade do dia), 🎉 (estado vazio de pendências). A spec define explicitamente "Nada de emoji para navegação".

Identidade de board e estado de tarefa/evento são comunicados com **pontos coloridos sólidos** (círculos de 8–9px).

---

## Voz e tom

- **Idioma:** português brasileiro em tudo — labels, placeholders, botões, datas ("06 jul – 10 jul", "Julho 2026")
- **Voz:** direta, imperativa, orientada à tarefa. Botões são verbos: "Adicionar", "Salvar evento", "Excluir tarefa", "Fechar o dia", "Encerrar"
- **Pessoa:** impessoal/infinitivo — "Marque até 3 prioridades" (imperativo sem pronomes). Sem primeira pessoa
- **Casing:** sentence case para corpo e botões; MAIÚSCULAS com espaçamento amplo para labels de seção e o badge "URGENTE"
- **Estados vazios:** curtos e acolhedores — "Marque até 3 prioridades" (borda tracejada, centralizado, muted), "Nenhuma tarefa pendente 🎉"
- **Tom:** ferramenta de produtividade calma e de baixo atrito — sem exclamações de marketing, sem jargão

---

## Fonte

Sora (Google Fonts, pesos 400/500/600/700/800) carregada via `@import` em `tokens/typography.css`. Se o projeto precisar ser totalmente offline, substituir por `@font-face` local com os arquivos de fonte.
