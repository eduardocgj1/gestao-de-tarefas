# Visualizar o Dia em um Popup

## Objetivo da Feature
Permitir que o usuário veja, planeje e encerre o dia de forma concentrada, sem precisar navegar entre boards ou perder contexto.

---

## Descrição Detalhada

**Ideia da Feature**
Um popup modal acessível ao clicar em qualquer cabeçalho de data (no board ou no calendário). Ele agrega tarefas e eventos de calendário do dia selecionado, com controle de quais boards exibir, agrupamento customizável, e dois modos de uso: planejamento (abertura do dia) e revisão (fechamento do dia).

**Problema Identificado**
O usuário precisa alternar entre boards e visualizações para ter noção do dia completo, o que gera carga mental, interrupções e dificuldade em priorizar o que realmente importa.

**Solução Desenhada**
Um painel único e rápido que reúne tudo do dia — com destaque para as prioridades (MIT), controle de carga horária e uma ação de "fechar o dia" que move pendências para outro dia.

---

## Escopo

**Dentro do Escopo**
- Popup abre ao clicar no cabeçalho de uma coluna de data no board (`col-header`) ou em uma célula de dia no calendário (`day-cell`)
- Seletor de boards visíveis no popup (checkboxes; persiste em `localStorage`)
- Tarefas separadas por board (boards nunca se misturam)
- Agrupamento customizável dentro de cada board: por campo (`Projeto`, `Modo`, ou qualquer campo do board), sem agrupamento, ou múltiplas dimensões com ordem de prioridade definida pelo usuário
- Destaque de MIT: o usuário marca até 3 tarefas do dia como "Mais Importantes"; ficam em seção própria no topo, acima dos grupos
- Ações inline: marcar tarefa como concluída (toggle `completed`), marcar/desmarcar como MIT, adiar tarefa para o dia seguinte (muda `date` + `deliveryDate`)
- Barra de carga do dia por board: soma das `duration` das tarefas não concluídas
- Eventos de calendário do dia visíveis (read-only), agrupados por board associado (`boardIds`)
- Modo "Fechar o Dia": botão que lista tarefas não concluídas e permite adiá-las em lote (escolher nova data)
- O estado de MIT por dia é salvo em `localStorage` com chave `mit-{boardId}-{date}` (array de task ids)

**Fora do Escopo**
- Criar nova tarefa dentro do popup (usa o formulário do board)
- Editar campos da tarefa (nome, link, duração, campos customizados) — abre o modal existente ao clicar no nome
- Criar ou editar eventos de calendário — eventos são read-only aqui
- Reordenar tarefas via drag-and-drop dentro do popup
- Sincronização de MIT com servidor (local apenas)

---

## Jornada

### Abertura (Planejamento do Dia)

1. Usuário clica no título da data (`col-header .col-title`) no board, ou em uma `day-cell` no calendário
2. Popup abre em cima do conteúdo existente (overlay com `z-index` alto); exibe a data selecionada no topo
3. Topo do popup: seletor de boards (checkboxes com a cor de cada board); boards desmarcados ocultam suas seções
4. Para cada board selecionado, aparece uma seção com:
   - Nome e cor do board
   - Barra de carga: `Previsto Xh · Feito Xh · Resta Xh` (usando `duration`)
   - Eventos de calendário vinculados ao board (chips read-only)
   - Seção **Prioridades do Dia** (MIT): tarefas marcadas como MIT ficam aqui; se vazia, exibe placeholder "Marque até 3 prioridades"
   - Tarefas agrupadas conforme configuração de agrupamento
5. Controle de agrupamento: dropdown/toggle no cabeçalho de cada seção de board — opções: "Sem agrupamento", campos do board (ex: "Por Projeto", "Por Modo"); se múltiplos campos selecionados, usuário ordena por drag ou botões ↑↓
6. Cada tarefa exibe: checkbox de conclusão, nome, duração, tags de campos, ícone ⭐ para marcar/desmarcar como MIT
7. Clicar no nome da tarefa abre o modal de edição existente (`openModal(id)`)
8. Ícone de adiar (→ próximo dia) ao passar o mouse na tarefa

### Fechamento (Shutdown Ritual)

9. Botão "Fechar o Dia" no rodapé do popup
10. Abre sub-painel listando todas as tarefas não concluídas do dia, por board
11. Usuário escolhe para cada tarefa: adiar para amanhã, adiar para outra data (date picker), ou ignorar
12. Botão "Encerrar" aplica as alterações, fecha o popup e persiste via `save()` existente

### Fechamento do Popup

13. Botão ✕ ou clique fora fecha o popup sem salvar estado de MIT (MIT já foi salvo ao clicar)

---

## Referências Técnicas

- **Gatilho no board**: adicionar listener no `col-header .col-title` em `board.addEventListener('click', ...)` (linha ~693 de `app.js`)
- **Gatilho no calendário**: adicionar listener na `day-cell` além do `openEventModal` existente (linha ~1065)
- **Dados disponíveis**: `boards[]`, `calendarEvents[]`, `tasksFor(key)` já existe, `eventsForBoardDate(boardId, key)` já existe
- **Persistência**: usar `save()` existente para alterações de `completed` e `date`; MIT fica só em `localStorage`
- **Estilo**: seguir a paleta e classes existentes (`modal-overlay`, `modal`, `card`, `dot`, `col-stats`); popup pode ter largura maior que o modal atual (~700px)
