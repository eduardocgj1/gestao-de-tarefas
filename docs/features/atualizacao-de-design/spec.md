# Handoff: Modernização visual — Bússola

## Overview
Redesign visual e de interação do app de gestão de tarefas existente (board por colunas-de-dia, calendário mensal, pomodoro, boards múltiplos) + implementação da feature nova "Visão do Dia" (popup de planejamento/fechamento do dia). O app roda hoje em Node/Express (`server.js`) com estado em `data.json` — **isso não muda**. Este handoff é só sobre a camada de UI (`public/index.html`, `public/styles.css`, `public/app.js`).

## About the Design Files
O arquivo `prototype-reference.dc.html` incluído aqui é uma **referência de design construída em HTML/React** (Design Component), não código de produção. Ele existe só para mostrar visual e comportamento pretendidos. A tarefa é **recriar esse design dentro do app real**, que hoje é vanilla JS (DOM manipulation direta) + Express — ou seja: reescrever `public/styles.css` e ajustar `public/index.html`/`public/app.js` para bater com este visual e essas interações, usando os padrões que já existem no arquivo (DOM manipulation, `save()`/`load()`, `fetch('/api/tasks')`), sem introduzir um framework novo. Não copie a sintaxe React/JSX do arquivo de referência — ele é só para leitura visual/comportamental.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento e interações abaixo são finais — implemente pixel a pixel.

## Design Tokens

**Cores**
- Fundo da página: `#FAF7F2`
- Superfície (cards, sidebar, header): `#FFFFFF`
- Borda padrão: `#ECE6D8` (borda mais forte/hover: `#F1ECE0` / `#F5F1E8`)
- Texto primário: `#262420`
- Texto secundário: `#7A766C`
- Texto terciário/placeholder: `#B3AE9F` / `#8B8778`
- Verde primário (marca, estados ativos, botão "Adicionar", board "Trabalho"): `#3A6604` — fundo suave: `#EAF0DE` (hover: `#DCE7C9`)
- Terracota (urgente, board "Pessoal"): `#C1622D` — fundo suave: `#F7E9DF` / `#FBEEE6`
- Azul (uso pontual em eventos multi-board): `#3E6FBD`
- Neutro escuro (botões primários "Fechar o dia", "Encerrar", avatar do app): `#262420` (hover `#3A3630`)
- Card de tarefa **normal** (sem urgência/prioridade): quase P&B — borda esquerda `#3A3630`, fundo `#FBFAF7`
- Card de tarefa **urgente**: borda esquerda `#C1622D`, fundo `#FBEEE6`
- Card de tarefa **concluída**: borda esquerda `#D8D2C2`, fundo `#F3F1EA`, opacidade 0.55, texto com `line-through`

**Tipografia**
- Fonte: **Sora** (Google Fonts, pesos 400/500/600/700/800) — substitui a fonte de sistema atual
- Títulos de seção/página: 700–800, 17–19px
- Corpo/labels: 600, 12.5–13px
- Legendas/meta: 600, 10.5–11px, cor secundária, uppercase com `letter-spacing: .04–.06em` quando for rótulo de seção

**Cantos / sombras** (estilo "Toggl": generoso, não excessivo)
- Cards de coluna e painéis: `border-radius: 16px`
- Botões e inputs: `border-radius: 9–11px`
- Chips/pills (board selector, tags): `border-radius: 20px` (pill)
- Sombra padrão de card/painel: `0 1px 2px rgba(38,36,32,.05)`
- Sombra de modal/drawer expandido: `0 20-24px 50-60px rgba(38,36,32,.2-.28)`

**Ícones**
- Nada de emoji para navegação (ex: calendário). Ícone de calendário = quadrado `14x13px`, `border: 1.5px solid currentColor`, `border-radius: 3px`, com uma linha horizontal a ~3px do topo (`height: 1.5px; background: currentColor`) representando o cabeçalho do calendário.
- Emojis mantidos apenas em contexto de conteúdo (⭐ prioridade/MIT, 📌 evento se aplicável) — não em botões de navegação/ação.

## Screens / Views

### 1. Sidebar (nova — substitui as abas horizontais de boards)
- Fixa à esquerda, `background:#FFFFFF`, `border-right:1px solid #ECE6D8`
- **Fechada por padrão**: `width:64px`, mostra só os dots coloridos de cada board (ícones), botão `›` centralizado abre
- **Aberta**: `width:236px` (transição de width, `.18s ease`), mostra nomes; botão `‹` no topo fecha
- Conteúdo: logo/app (quadrado verde `#3A6604` com "T"), lista de boards (dot colorido + nome; ativo = fundo `#EAF0DE`/texto `#3A6604`), "+ Novo board" (clique vira input inline para digitar o nome, com botão ✕ pra cancelar), separador, item "Calendário" (ícone minimalista acima), e no rodapé um card do Pomodoro (clicável para expandir/colapsar controles: tabs Foco/Pausa curta/Pausa longa, botão play redondo preto, reset, 4 dots de ciclo)

### 2. Board (colunas por dia)
- Header fixo no topo: título do board ativo à esquerda; nav (‹‹ ‹ intervalo Hoje › ››) à direita quando em modo board; botão de engrenagem (Configurações) sempre visível
- Colunas: `width:236px`, `background:#fff`, `border-radius:16px`, cabeçalho com data + anel de progresso (`border:3px solid #F1ECE0` com `border-top-color:#3A6604`), duas linhas de stats (contagem/percentual, tempo previsto/feito/resta)
- Eventos de calendário do dia aparecem como chips acima das tarefas (fundo `#EAF0DE`, dot colorido, nome, e span "1/2" se o evento durar mais de um dia)
- Cards de tarefa: ver paleta acima (normal quase P&B / urgente terracota / concluída cinza com strike-through); badge "URGENTE" em terracota; ⭐ se marcada como MIT do dia; meta-linha com duração e tag
- Input "+ Nova tarefa" no rodapé de cada coluna
- **Clicar no título da data (`col-header`)** abre o drawer "Visão do Dia" (ver seção 4)
- **Clicar num card** abre o modal de edição de tarefa (ver seção 5)

### 3. Calendário mensal
- Header: dots de legenda por board, "Julho 2026", botão "Hoje"
- Grid 7 colunas, células com número do dia (hoje = círculo preenchido `#3A6604`), eventos como chips coloridos por board (evento multi-board usa estilo neutro `#EFEDE6` com texto escuro)
- FAB "+" no canto inferior direito (círculo `52px`, fundo `#262420`) abre o modal de novo evento
- Clicar numa célula de dia também abre o drawer "Visão do Dia" daquele dia

### 4. Drawer "Visão do Dia" (feature nova, ainda não implementada no código — ver `Features/visao-do-dia.md` do próprio projeto para a spec funcional completa)
- **Modo padrão — encaixado**: painel à direita, dentro do layout (não é overlay/popup) — o board "encolhe" para acomodá-lo, igual à sidebar. `width` inicial `400px`.
- **Redimensionável**: existe uma alça invisível de `6px` na borda esquerda do painel (`cursor: col-resize`); arrastar ajusta a largura entre `320px` e `720px` em tempo real (sem transição durante o arraste, para não travar visualmente).
- **Botão de expandir (⤢)** no header do drawer: transforma o painel num modal centralizado (`680px`, `78vh`, `border-radius:20px`, backdrop escurecido `rgba(38,36,32,.32)`). Um botão (⤡) no modal expandido volta ao modo encaixado. O botão × sempre fecha tudo, em qualquer modo.
- **Conteúdo** (igual nos dois modos): título com a data por extenso, seletor de boards do dia (pills clicáveis com checkbox — desmarcar oculta as tarefas daquele board), seção "⭐ Prioridades do dia" (MIT — até 3 tarefas destacadas, placeholder "Marque até 3 prioridades" se vazia), por board: barra "Previsto Xh · Feito Xh · Resta Xh" e lista de tarefas com checkbox de conclusão
- **Botão "Fechar o dia"** (rodapé, preto `#262420`): troca o conteúdo do drawer para a **visão de fechamento** — lista as tarefas não concluídas do dia, cada uma com 3 botões de ação (Amanhã / Outra data / Ignorar — o botão escolhido fica com fundo preto/texto branco, os demais neutros). Rodapé muda para dois botões: "Voltar" (neutro, volta à visão normal) e "Encerrar" (preto, aplica as mudanças e fecha o drawer).
- Persistência esperada (da spec original): MIT em `localStorage` (`mit-{boardId}-{date}`), mudanças de `completed`/`date` via `save()` existente.

### 5. Modal de tarefa
- Centralizado, `360px`, `border-radius:18px`, overlay `rgba(38,36,32,.3)`
- Nome (input grande, 700/17px, sem borda), data de entrega, duração prevista, checkboxes Urgente/Concluída, botão "Excluir tarefa" (fundo `#FBEAE0`, texto `#C1622D`)
- (Campos existentes no app real como link, delegado, prioridade, campos customizados devem ser mantidos — o protótipo simplificou para foco visual; seguir o layout de `label` + `input` já usado no app atual, só restilizado)

### 6. Modal de evento
- Mesmo padrão visual do modal de tarefa; campos: nome, data início/fim lado a lado, checklist de boards relacionados (pill com dot colorido), botão "Salvar evento" (verde `#3A6604`) e "Excluir evento" (terracota suave)

### 7. Modal de Configurações
- `440px`, mesma estrutura de modal
- Seção "Campos personalizados": um cartão por campo (nome editável inline, botão ✕ excluir campo, valores como pills com dot colorido + "+ valor"), form "Novo campo personalizado" + botão "Adicionar" (verde)
- Seção "Pomodoro": três inputs numéricos lado a lado (Foco / Pausa curta / Pausa longa)

## Interactions & Behavior
- Sidebar: toggle abre/fecha com transição de `width` (`.18s ease`)
- Board ↔ Calendário: navegação troca o conteúdo principal e o header (calendário some a navegação de semana, mostra legenda + "Julho 2026" + Hoje)
- Drawer: abre ao clicar em `col-header .col-title` (board) ou em `day-cell` (calendário) — comportamento e gatilhos já documentados em `Features/visao-do-dia.md`
- Resize do drawer: `mousedown` na alça → `mousemove`/`mouseup` no `window` ajustam a largura ao vivo
- Pomodoro: mantém toda a lógica existente (`togglePomodoro`, `tickPomodoro`, beep, ciclos) — só a casca visual muda (widget agora vive na sidebar, expansível)
- Hover states: botões neutros (`#F5F1E8`) escurecem para `#ECE6D8` no hover; botão "Hoje"/ações primárias verdes escurecem para `#DCE7C9`/`#2F5303`; botão preto escurece para `#3A3630`

## Assets
Nenhum asset externo além da fonte Google "Sora". Ícones são CSS puro (sem SVG/emoji para navegação).

## Files
- `prototype-reference.dc.html` — protótipo de referência completo (sidebar, board, calendário, drawer redimensionável/expansível, modais de tarefa/evento/configurações) com toda a interatividade acima já funcionando em JS, para consulta visual e de comportamento.
- App real a ser modificado (no projeto do usuário, fora deste pacote): `public/index.html`, `public/styles.css`, `public/app.js` (lógica de dados, `server.js` e `data.json` não mudam).
