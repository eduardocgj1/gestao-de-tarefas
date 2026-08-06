# Visão do Dia v2 — Ritual de Planejar e Fechar o Dia

> Evolução da feature já implementada (ver `spec.md` para o escopo original da v1).
> Este documento substitui funcionalmente o `spec.md` a partir da implementação; o `spec.md` fica como registro histórico do que foi entregue na v1.

---

**Status:** `[x] Discovery` → `[x] Design` → `[x] Discovery Técnico` → `[x] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Branch:** `feature/visao-do-dia-v2`
**Criado em:** 2026-08-06
**Última atualização:** 2026-08-06

---

## Premissas

Duas decisões tomadas fora desta spec, das quais ela depende:

1. **O pomodoro e o controle de tempo por atividade serão removidos do app.** Nenhuma funcionalidade descrita aqui usa cronômetro, tempo real ou tempo gasto.
2. **O campo `duration` (estimativa em minutos) deixa de existir.** A noção de carga do dia passa a ser por **quantidade de tarefas**, não por horas. A barra `Previsto Xmin · Feito Xmin · Resta Xmin` da v1 é removida.

---

## v1 — Discovery

### Objetivo

Transformar a Visão do Dia de um painel que **espelha** o board em um **ritual diário** com três momentos — planejar, executar e fechar — onde o usuário decide o que importa, captura o que aparece e encerra o dia com um plano para o dia seguinte.

### Problema

A Visão do Dia existe e funciona, mas não é usada como comando central do dia. Quatro causas concretas:

**1. Não oferece nada que o board já não ofereça.** Mostra as mesmas tarefas, no mesmo formato de lista, filtradas por data. Não existe motivo funcional para abrir o painel em vez de olhar a coluna do dia.

**2. É read-only na prática.** Criar tarefa está explicitamente fora do escopo da v1. Quando algo surge durante o dia, o usuário precisa fechar o painel para capturar — quebrando exatamente o foco que o painel deveria proteger.

**3. O fechamento é uma faxina, não um fechamento.** O "Fechar o Dia" atual só empurra pendências para frente. Não mostra resultado, não registra reflexão e não deixa nada preparado para amanhã. O usuário termina o ritual sem sensação de encerramento.

**4. A densidade visual afoga o conteúdo.** Cada board renderiza cinco blocos empilhados (nome + select de agrupamento + barra de carga + eventos + seção MIT + grupos). Com dois boards visíveis, são dez blocos de cromo antes da primeira tarefa. A decisão de v1 "boards nunca se misturam" produz repetição estrutural — mas o dia do usuário é **um dia**, não N boards.

### Solução

Um painel único com **três modos**, alternando conforme o momento do dia:

| Modo | Quando | O que entrega |
|---|---|---|
| **Planejar** | Abertura do dia | Define teto de tarefas, escolhe até 3 prioridades, puxa pendências atrasadas, captura novas tarefas |
| **Executar** | Durante o dia | Painel encaixado na lateral, enxuto: prioridades, próximo evento, captura rápida |
| **Fechar** | Fim do dia | Mostra resultado, decide destino das pendências com motivo, registra nota do dia, escolhe as prioridades de amanhã e marca o dia como fechado |

A estrutura passa a ser **um dia unificado** — as tarefas de todos os boards visíveis convivem na mesma lista, com o board representado apenas pelo `dot` colorido na linha.

**Fundamentação:**

- **Prioridades limitadas a 3** — método Ivy Lee. Já existe na v1, mas está no meio do painel; passa a ser o primeiro bloco.
- **Campo "quando" nas prioridades** — implementation intentions. Meta-análise com 642 testes independentes mostra efeito robusto (`.27 ≤ d ≤ .66`) quando o plano tem formato contingente ("quando X, então Y"). Custo: um campo de texto curto.
- **Escolher as prioridades de amanhã dentro do fechamento** — Baumeister & Masicampo (2011): o alívio do efeito Zeigarnik vem de *ter um plano* para a tarefa inacabada, não de completá-la. Adiar sem decidir não fecha nada mentalmente.
- **Gesto simbólico de encerramento** — ritual de shutdown do Cal Newport. Estado `dia fechado` visível no board e no calendário.
- **Aviso de sobrecarga no planejamento** — padrão do Sunsama: o app avisa quando o plano excede a capacidade declarada.

### Escopo

**Dentro do escopo**

*Estrutura*
- Painel com três momentos — Planejar, Executar, Fechar. Tecnicamente são 2 modos (`plan` | `close`) mais a flag `expanded`: docked (`expanded: false`) sempre renderiza o conteúdo enxuto de Executar, independente do modo por trás; expandido (`expanded: true`) renderiza Planejar ou Fechar
- Lista unificada do dia **dentro do painel** (todos os boards visíveis na mesma lista, board como `dot` colorido na linha). **A view principal do board não muda**: continua um board por vez (`activeBoardId`), colunas por dia, cada coluna só com as tarefas do board selecionado — a unificação é exclusiva do painel da Visão do Dia
- Redução de densidade visual do painel: linha de tarefa ~34px, título do dia 20px, hierarquia vertical única
- Seletor de boards visíveis sai do topo do painel e vai para um menu de configuração (⚙)
- Clima em uma linha no cabeçalho, não em bloco
- Select de agrupamento aparece apenas quando o dia tem mais de 8 tarefas
- Drawer encaixado = Executar (padrão durante o dia, sempre `expanded: false`); modal expandido = Planejar e Fechar (`expanded: true`)

*Modo Planejar*
- Teto de tarefas do dia (`capacity`), definido pelo usuário, com padrão configurável
- Indicador de carga por contagem: `7 de 6 tarefas` com estado visual verde / âmbar / vermelho
- Bloco de prioridades no topo, antes da lista geral: até 3 tarefas
- Campo `quando` opcional por prioridade — texto curto livre ou atalho `manhã` / `tarde` / `noite`
- Bandeja "puxar para hoje": tarefas atrasadas (data anterior, não concluídas) e sem data, com ação de trazer para o dia
- Captura inline: input no topo do painel que cria tarefa no dia aberto, com seletor de board

*Modo Executar*
- Versão enxuta no drawer encaixado: prioridades do dia, próximo evento de calendário com hora, captura inline
- Alternância entre encaixado e expandido (já existe)

*Modo Fechar*
- Bloco de resultado: `X de Y tarefas concluídas · Z de 3 prioridades`
- Destino de cada pendência: `amanhã` / `outra data` / `arquivar` / `ignorar`
- Etiqueta de motivo por pendência, de 1 clique: `faltou tempo` / `bloqueado por terceiro` / `mudei de prioridade`
- Nota do dia: campo de texto livre, com prompts opcionais ("o que travou?", "o que foi bem?")
- Seleção das prioridades de amanhã dentro do próprio fechamento
- Estado `dia fechado`: marca visível na coluna do board (a mesma coluna de sempre, de um board por vez — pill "✓ Fechado" no cabeçalho + coluna a 60% de opacidade) e na célula do calendário (✓ ao lado do número do dia + tint de fundo)
- Reabertura do dia fechado (o estado é reversível)

*Dados*
- Nova tabela `day_logs` no Supabase, persistindo: teto, prioridades, `quando` de cada prioridade, nota, prioridades de amanhã e marca de fechamento
- Migração do MIT de `localStorage` para o servidor

**Fora do escopo**

- Pomodoro, cronômetro, tempo real ou qualquer contagem de minutos — será removido do app
- Estimativa de duração por tarefa (`duration`) — removida
- Time-blocking com calendário arrastável (padrão Akiflow / Motion) — custo alto em JS vanilla e o app já tem a view de calendário; o campo `quando` textual entrega a maior parte do benefício
- Agendamento automático ou sugestão de prioridades por IA — a decisão é o valor do ritual
- Criar ou editar eventos de calendário pelo painel — permanecem read-only
- Editar campos customizados da tarefa no painel — continua abrindo `openModal(id)`
- Reordenar tarefas por drag-and-drop dentro do painel
- Relatório ou visão agregada das notas dos dias (revisão semanal) — próxima iteração; a spec apenas garante que o dado fica persistido e legível

### Jornada do usuário

**Planejar (manhã)**

1. Usuário clica no cabeçalho da data no board ou numa célula do calendário
2. Painel abre expandido, em modo Planejar, com a data e o clima em uma linha no topo
3. Primeiro bloco: **teto do dia** — "Quantas tarefas hoje?" com o último valor usado pré-preenchido
4. Segundo bloco: **prioridades do dia** — o usuário marca até 3 tarefas com ⭐; cada prioridade marcada ganha um campo `quando` opcional
5. Terceiro bloco: **agenda** — eventos de calendário do dia, com hora, read-only
6. Quarto bloco: **demais tarefas do dia**, lista unificada com o `dot` do board em cada linha
7. Quinto bloco: **bandeja de pendências** — atrasadas e sem data, recolhida por padrão, com ação `→ hoje` por item
8. A qualquer momento, o input de captura no topo cria uma tarefa nova no dia
9. Se o total de tarefas do dia ultrapassa o teto, o indicador de carga fica vermelho e exibe `7 de 6 tarefas — acima do teto`
10. Usuário fecha o painel; tudo já foi persistido

**Executar (durante o dia)**

11. Usuário reabre o painel e clica em `⤡` para encaixar na lateral
12. O painel encaixado exibe apenas: prioridades do dia, próximo evento com hora e o input de captura
13. Marcar uma prioridade como concluída atualiza o board por trás em tempo real

**Fechar (fim do dia)**

14. Usuário clica em **Fechar o Dia**; o painel muda para o modo Fechar
15. Topo: **resultado** — `6 de 9 tarefas concluídas · 2 de 3 prioridades`
16. Meio: **pendências**, uma por linha, cada uma com destino (`amanhã` pré-selecionado / `outra data` / `arquivar` / `ignorar`) e três chips de motivo
17. Abaixo: **nota do dia**, campo livre com dois prompts clicáveis que inserem o texto no campo
18. Abaixo: **amanhã** — lista das tarefas já datadas para o dia seguinte (incluindo as que acabaram de ser adiadas), onde o usuário marca até 3 prioridades
19. Usuário clica em **Encerrar o dia**: as pendências são movidas, a nota e as prioridades de amanhã são salvas, o dia recebe a marca de fechado e o painel fecha
20. No board e no calendário, o dia fechado aparece com marca visual distinta
21. Reabrir um dia fechado é possível: o painel abre em modo Planejar com a marca removida ao confirmar

**Bifurcações**

- Dia sem nenhuma pendência: o bloco de pendências mostra estado vazio e o fechamento vai direto para nota + amanhã
- Dia sem nenhuma tarefa: o modo Planejar abre com a bandeja de pendências já expandida
- Fechar um dia que não é hoje: permitido, sem alteração de comportamento

### Perguntas em aberto

*O design responde.*

- O `quando` da prioridade é campo livre, três botões fixos (manhã/tarde/noite) ou input de hora?
- O teto de tarefas é global do usuário ou por dia da semana (sexta rende menos que terça)?
- As pendências arquivadas vão para onde? Novo estado `archived` na tarefa ou reaproveitam `completed` com flag?
- A marca de "dia fechado" no board é um ícone no cabeçalho da coluna, uma mudança de cor da coluna inteira, ou ambos?
- A bandeja de pendências deve limitar quantos dias para trás olha (ex.: últimos 14 dias) para não crescer indefinidamente?
- Os chips de motivo são obrigatórios ou opcionais por pendência?

---

## v2 — Design

*Preencher após protótipo.*

### Experiência e visual

**Protótipo:** `Visao-do-Dia-v2.dc.html` (abrir no browser) — detalhes de tokens, telas e interações em `README-v2.md`

Diretrizes de densidade já acordadas — o painel precisa de escala própria, hoje ele herda `.card` e `col-header`, feitos para cartões espaçados do board:

- Linha de tarefa em ~34px de altura, fonte 13/14px
- Título do dia em 20px (hoje ~28px)
- Uma hierarquia vertical única, sem repetição por board
- Board representado apenas pelo `dot` colorido já existente na linha
- Cromo de configuração (seletor de boards, agrupamento) escondido atrás de ⚙ ou condicionado a volume

### Decisões de UX tomadas

- **Lista unificada em vez de seção por board** → o usuário vive um dia, não N boards; a separação por board era a maior fonte de repetição estrutural e altura desperdiçada
- **Prioridades antes da lista geral** → força a decisão de foco antes de o usuário se perder na lista completa
- **Drawer encaixado como modo de execução** → o drawer já existe e é subutilizado; separar "ritual" (expandido) de "acompanhamento" (encaixado) dá função a cada estado
- **Carga por contagem, não por horas** → o usuário não quer controlar tempo; contagem de tarefas é a métrica que ele consegue e quer manter
- **Motivo da pendência com 3 opções fixas** → mais de 3 vira formulário e o ritual morre; 3 chips de 1 clique preservam a fluidez

### Estados da interface

- **Vazio** — dia sem tarefas: modo Planejar abre com a bandeja de pendências expandida e o input de captura em foco
- **Com dados** — estado principal descrito na jornada
- **Sobrecarregado** — total acima do teto: indicador vermelho com `X de Y tarefas — acima do teto`
- **Fechado** — dia já encerrado: painel abre em modo leitura com o resultado e a nota, e um botão `Reabrir o dia`
- **Carregando** — não se aplica. `day_logs` viaja dentro do mesmo payload de `GET /api/tasks` (junto com `boards`, `tasks`, `calendarEvents` etc.), então o painel continua síncrono sobre estado em memória, igual hoje. Decisão: evita um novo estado de loading só para esta feature e mantém a arquitetura de upsert total já documentada no `CLAUDE.md`
- **Erro** — sem tratamento dedicado, mesmo padrão do resto do app: `save()` é fire-and-forget (`fetch` sem `.catch`, ver `app.js:286-292`); não introduzir um caso especial só para `day_logs`

### Perguntas respondidas pelo design

- **Campo `quando` da prioridade** → três botões fixos (manhã/tarde/noite), seleção única, sem texto livre nem input de hora. Um toque, sem parsing.
- **Teto de tarefas** → global por usuário, não por dia da semana. Um único número em "Teto padrão" (menu ⚙), pré-preenchido no modo Planejar com o último valor usado. Um teto por dia da semana exigiria 7 configurações para um ganho marginal — o usuário sempre pode ajustar manualmente num dia atípico.
- **Pendências arquivadas** → novo campo `archived BOOLEAN` em `tasks`, não reaproveita `completed`. Reaproveitar `completed` exigiria uma segunda flag pra diferenciar "concluída" de "arquivada" de qualquer forma; um campo próprio é mais direto de ler e filtrar.
- **Marca de dia fechado** → as duas formas ao mesmo tempo: pill "✓ Fechado" no cabeçalho da coluna do board + coluna a 60% de opacidade; no calendário, ✓ ao lado do número do dia + tint de fundo. Reforço visual duplo sem custo de interação — é só CSS condicional.
- **Janela da bandeja de pendências** → limitada aos últimos 14 dias. Evita crescer sem limite conforme o histórico do usuário aumenta; pendências mais antigas já perderam relevância prática.
- **Chips de motivo** → opcionais. Obrigar preenchimento quebra o ritual de fechamento rápido, que é o objetivo central da feature — motivo é dado de reflexão, não bloqueio de fluxo.

---

## v3 — Discovery Técnico

### Visão geral técnica

Reescrita da seção de Visão do Dia em `app.js` (hoje ~linhas 2592–2980, função `renderDayPopup` e vizinhas) para suportar **dois modos** (`plan` | `close`) mais a flag `expanded` — não três modos — e a lista unificada dentro do painel. `day_logs` é uma tabela nova no Supabase, mas **sem rotas próprias**: viaja dentro do payload já existente de `GET/POST /api/tasks` (mesmo upsert total usado hoje para `boards`/`tasks`/`calendarEvents`/`people`), preservando as "apenas 2 rotas" do `CLAUDE.md`. Isso tira o MIT do `localStorage`. Em paralelo, remoção de `duration` e do pomodoro do app inteiro (pré-requisito, ver `cl-*`).

### Arquivos a modificar

| Arquivo | O que muda | Impacto |
|---|---|---|
| `public/app.js` | **Painel da Visão do Dia:** reescrita de `renderDayPopup`, `dayPopupBoardSectionHtml` (vira a lista unificada), `shutdownPanelHtml`/`applyShutdown` (viram o modo `close`); `dayPopupMode` passa a assumir `'plan'`\|`'close'` (hoje é `'plan'`\|`'shutdown'`); a flag `expanded` já existe como `dayDrawerExpanded` — reaproveitar a variável, não criar uma nova; `attachDayPopupPanel()` já garante que o drawer encaixado (`expanded:false`) sempre monta o mesmo painel, então o corpo enxuto de "Executar" é só uma renderização condicional dentro de `renderDayPopup()`, não um terceiro valor de `mode`. Captura inline, bandeja de pendências e nota do dia são lógica nova. Migração de MIT: `getMitIds`/`setMitIds`/`toggleMit` (hoje por `localStorage`, chave `mit-{boardId}-{date}`) são **substituídas** por leitura/escrita em `day_logs` (chave por data, não mais por board). **Board view:** duas mudanças pontuais em `columnHtml()` (linha ~1170) — (1) cosmética: pill "✓ Fechado" + coluna a 60% de opacidade quando o dia está fechado; (2) funcional e obrigatória: a linha 1181 hoje lê `getMitIds(activeBoardId, key)` para pintar a estrela ⭐ nos cards (`cardHtml()` linha 1233, classe `mit`) — como essa fonte deixa de existir, é preciso decidir o que fazer com essa leitura (ver Riscos). Nenhuma das duas mudanças reestrutura colunas por board — continua um board por vez, uma coluna por dia. **Calendário:** marca de dia fechado em `monthBlockHtml()` (linha ~2415), na `.day-cell` (linha ~2428) — ✓ ao lado do número do dia + tint de fundo. **Captura inline:** `addTask(dateKey, name)` (linha 1247) hoje sempre grava em `currentBoard().tasks` — não aceita board por parâmetro; precisa aceitar um board opcional para a captura do painel poder gravar num board diferente do `activeBoardId`. **Remoção:** pomodoro (linhas ~26–446, ~2113–2186) e `duration` (linhas 1176–1177, 1196, 1237, 1251, 1530, 1555, 1747, 1880, 2704–2708, 2720) | **Alto** |
| `public/index.html` | Nova estrutura do painel (blocos de teto, captura, prioridades, agenda, tarefas, bandeja, nota, amanhã) dentro de `#dayPopupPanel`/`#dayPopupBody`/`#dayPopupFooter` (linhas 141–158) e `#dayPopupModalHost` (linha 443); remoção do widget de pomodoro (`.sidebar-pomodoro-wrap`/`#pomodoroWidget`, linha ~55, e painel de configuração "Pomodoro", linha ~401); remoção do campo `#f-duration` (linha 274) do formulário de tarefa | Médio |
| `public/styles.css` | Escala própria do painel (linha 34px, título 20px) substituindo/ajustando o bloco `.day-popup-*`/`.shutdown-*`/`.mit-star`/`.mit-badge` existente (linhas ~1261–1481); estados de carga (verde/âmbar/vermelho), chips de motivo, marca de dia fechado no `.col-header` do board e na `.day-cell` do calendário; remoção do CSS do pomodoro | Médio |
| `server.js` | `day_logs` incorporado a `loadState()`/`saveState()` (linhas 162–334) — mesmo padrão upsert total já usado para `boards`/`tasks`/`calendarEvents`/`people` (sem rotas novas); novo par `appDayLogToDb()`/`dbDayLogToApp()`; `appTaskToDb()`/`dbTaskToApp()` (linhas 337–395) perdem `duration` e ganham `deferral_reason`/`archived` | Médio |
| `schema.sql` | Nova tabela `day_logs` com índice único em (`user_id`, `date`) + índice de `user_id` (mesmo padrão das demais tabelas, ver bloco "Multi-usuário" no fim do arquivo); em `tasks`: remover `duration`, adicionar `deferral_reason` e `archived` | Médio |

### Novos campos no banco

**Nova tabela `day_logs`** — uma linha por usuário por data:

| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | gerado com `uid()`, mesmo padrão de `boards.id`/`tasks.id`/`calendar_events.id` — **não** é UUID |
| `user_id` | `TEXT` | isolamento por usuário, mesmo tipo usado nas demais tabelas (`sub` do login Google, ver `schema.sql:254-264`) |
| `date` | `DATE` | chave única junto com `user_id` |
| `capacity` | `INTEGER DEFAULT NULL` | teto de tarefas do dia |
| `mit_ids` | `JSONB DEFAULT '[]'` | ids das prioridades do dia (substitui `localStorage`) |
| `mit_when` | `JSONB DEFAULT '{}'` | `{ taskId: "manhã" }` |
| `note` | `TEXT DEFAULT NULL` | nota do dia |
| `next_day_mit_ids` | `JSONB DEFAULT '[]'` | prioridades escolhidas para o dia seguinte |
| `closed_at` | `TIMESTAMPTZ DEFAULT NULL` | `NULL` = dia aberto |

**Alterações em `tasks`:**
- **Remover** `duration`
- **Adicionar** `deferral_reason` `TEXT DEFAULT NULL` — motivo registrado no fechamento (`time` / `blocked` / `reprioritized`)
- **Adicionar** `archived` `BOOLEAN DEFAULT FALSE` — se a decisão do design for estado próprio em vez de reaproveitar `completed`

### O que reutilizar

- `save()` / `load()` → padrão de upsert total; `day_logs` deve seguir o mesmo modelo de mapeamento (mas ver risco de exclusão abaixo — não copiar o padrão "delete o que não veio no payload" sem pensar)
- `tasksFor(key, board)` → base da lista do dia; passa a ser chamada em loop (um por board visível) e concatenada para montar a lista unificada
- `getTasksForDateAndBoard(boardId, dateKey)` → já cobre tarefas próprias do board + tarefas de checklist promovidas; é a função por trás de `tasksFor`, útil se a bandeja de pendências precisar de acesso direto sem ordenação
- `eventsForBoardDate(boardId, key)` → bloco de agenda
- `openModal(id, board)` → clique no nome da tarefa continua abrindo o modal existente (já é chamado assim a partir do painel hoje, linha ~2898)
- `addTask(dateKey, name)` → generalizar para `addTask(dateKey, name, board = currentBoard())`: hoje grava sempre em `currentBoard().tasks` (linha 1247) e só é chamada de um lugar (linha 1980, form "+ nova tarefa" da coluna). Adicionar o parâmetro opcional preserva esse único call site e permite a captura inline do painel escolher outro board pelo seletor — **não** criar uma função nova paralela
- `attachDayPopupPanel()` / `toggleDayDrawerExpand()` / `dayDrawerExpanded` → toda a infraestrutura de drawer encaixado vs modal já existe (inclusive a variável que implementa a flag `expanded` do design) e deve ser preservada, não recriada
- `markExceptionIfMoved(t, prevDate)` → continua sendo chamado ao mover tarefa recorrente no fechamento
- `refreshCalendarAndBoard()` → após qualquer alteração
- `getHiddenBoardIds()` / `isBoardVisibleInPopup(boardId)` → filtro de boards visíveis, usado tanto pela lista unificada quanto pelo modo Fechar
- `monthBlockHtml()` / `.day-cell` → ponto de inserção da marca de dia fechado no calendário
- `fieldTagHtml()`, `escapeHtml()`, `toKey()`, `addDays()`, `label()`, `compare()` → helpers existentes
- Feature flag `visao-do-dia` no PostHog (`openDayPopup()`, linha 2645) → manter como kill switch
- **Não reutilizar:** `getMitIds()` / `setMitIds()` / `toggleMit()` (linhas 770–787) — são substituídas por leitura/escrita em `day_logs`, não adaptadas; a assinatura muda de `(boardId, dateKey)` para algo por `dateKey` apenas

### Riscos e pontos de atenção

- **Migração do MIT** — hoje as prioridades vivem em `localStorage` na chave `mit-{boardId}-{date}`. Ao subir para `day_logs`, a chave muda de escopo: deixa de ser por board e passa a ser por dia (`mit_ids` é uma lista única, cruzando boards). **Decisão: aceitar a perda do histórico local, sem migração.** É dado de baixíssimo valor retroativo (só ids de tarefas marcadas como prioritárias em dias já passados) e escrever um migrador one-off só para isso não se paga — o usuário simplesmente começa a marcar prioridades de novo a partir do dia em que a v2 for ao ar.
- **MIT órfão no board view (achado nesta revisão)** — `columnHtml()` linha 1181 (`getMitIds(activeBoardId, key)`) e `cardHtml()` linha 1233 (badge `⭐`/classe `mit`) hoje pintam a estrela de prioridade também na coluna do board, lendo do `localStorage` por board. Depois da migração, essa chave nunca mais é escrita — a leitura fica órfã. **Decisão: remover a leitura/badge do board view** (task `fe-16`) — a estrela vira informação exclusiva do painel da Visão do Dia. Mais simples, sem leitura cross-board dentro de `columnHtml()`, e consistente com "a view principal não muda estruturalmente".
- **`day_logs` e o padrão upsert+delete** — `boards`/`tasks`/`calendar_events`/`people` em `saveState()` fazem upsert e depois **deletam** do banco tudo que não veio no payload (`.not('id', 'in', ...)`). Isso funciona porque o frontend sempre mantém o array completo em memória. `day_logs` é um registro histórico que cresce um item por dia. **Decisão: `day_logs` faz upsert apenas, sem delete-missing** — diferente do padrão dos outros arrays. Mais simples de implementar (não precisa manter o histórico completo carregado em memória o tempo todo) e mais seguro (nenhum `save()` parcial consegue apagar um dia fechado antigo).
- **Captura inline e board oculto** — **Decisão: o seletor de board da captura inline lista todos os boards, não só os visíveis no painel.** Ocultar um board da Visão do Dia é uma preferência de visualização, não deveria impedir criar tarefa nele.
- **Remoção de `duration`** — usado na barra de carga da v1 (`columnHtml()` linhas 1176–1177/1196, `dayPopupLoadBarHtml()` linhas 2704–2708), no `cardHtml()` (linha 1237), no formulário de tarefa (`#f-duration`) e nos defaults de criação (`addTask`, promoção de checklist). **Não** é usado em `docs/features/exportar-atividades` (confirmado por busca — só aparece como campo de exemplo em `data-example.json`, nunca em lógica); a remoção não afeta essa feature. A remoção do banco (`schema.sql`) deve vir depois da remoção no frontend, para não quebrar payloads em trânsito durante o deploy.
- **Remoção do pomodoro** — `app_state` guarda hoje as chaves `pomodoroSettings` e `pomodoro` (ver `saveState()` linhas 326–331). Depois da remoção, `saveState()` simplesmente para de escrevê-las; as linhas antigas no Supabase ficam órfãs mas inofensivas (não é preciso um `DELETE` explícito, mas vale citar a opção no registro de desenvolvimento).
- **`applyShutdown` e tarefas recorrentes** — a lógica de exceção (`markExceptionIfMoved`) já existe e deve ser preservada. **Decisão: arquivar uma ocorrência (`archived = true`) também marca `is_exception = true`**, mesmo padrão já usado quando uma instância é movida ou editada individualmente (`docs/features/tarefas-recorrentes/spec.md`) — a ocorrência arquivada sai da série e passa a se comportar como uma tarefa comum; o resto da série não é afetado.
- **Lista unificada e boards ocultos** — `getHiddenBoardIds()` continua valendo; a lista unificada só inclui boards visíveis.
- **Reabrir dia fechado** — decidir se limpar `closed_at` desfaz também os adiamentos já aplicados. **Decisão: não desfaz** — reabrir só remove a marca, os movimentos de tarefa permanecem.
- **Fuso horário** — `closed_at` é `TIMESTAMPTZ` mas `date` é `DATE`; o app já trabalha com chaves `YYYY-MM-DD` locais via `toKey()`. Não introduzir conversão UTC nesse ponto.
- **View principal do board não muda estruturalmente** — a lista unificada e o `dot` por linha existem só dentro do painel da Visão do Dia. `columnHtml()` (`app.js:1170`) continua renderizando um board por vez; as duas mudanças nela são a marca de dia fechado (pill + opacidade) e a decisão sobre o badge de MIT órfão (ver acima) — nenhuma delas introduz lista cross-board na coluna.

---

## Tasks de implementação

### 🧹 Limpeza (pré-requisito)

- [x] `cl-01` Mapear todos os usos de `duration` em `app.js` (linhas 1176–1177, 1196, 1237, 1251, 1530, 1555, 1747, 1880, 2704–2708, 2720) e `server.js` (`appTaskToDb`/`dbTaskToApp`). Confirmado: `docs/features/exportar-atividades` não usa `duration` em lógica (só aparece como dado de exemplo em `data-example.json`) — não precisa de mudança
- [x] `cl-02` Remover o widget e a lógica do pomodoro de `index.html` (`.sidebar-pomodoro-wrap`/`#pomodoroWidget` linha ~55, painel de configuração "Pomodoro" linha ~401), `app.js` (linhas ~26–446 e ~2113–2186) e `styles.css`; parar de escrever `pomodoroSettings`/`pomodoro` em `saveState()` (`server.js`)
- [x] `cl-03` Remover `duration` do frontend: campo `#f-duration` do formulário de tarefa, `col-stats`/barra de carga em `columnHtml()`, `dayPopupLoadBarHtml()`, tag `⏱` em `cardHtml()`/`dayPopupTaskRowHtml()`, defaults em `addTask()`
- [x] `cl-04` Remover `duration` do mapeamento em `server.js` (`appTaskToDb`/`dbTaskToApp`) e a coluna em `schema.sql` — só depois de `cl-03` estar mergeado

### 🗄️ Banco de dados

- [x] `db-01` Criar tabela `day_logs` no `schema.sql` (`id TEXT PRIMARY KEY`, `user_id TEXT`) com índice único em (`user_id`, `date`) e índice de `user_id`, seguindo o padrão do bloco "Multi-usuário" no fim do arquivo
- [x] `db-02` Adicionar `deferral_reason TEXT DEFAULT NULL` e `archived BOOLEAN DEFAULT FALSE` na tabela `tasks` no `schema.sql`
- [x] `db-03` Atualizar `appTaskToDb()` / `dbTaskToApp()` em `server.js` para os novos campos de `tasks` (`deferralReason`/`archived`)

### ⚙️ Backend

- [x] `be-01` Criar `appDayLogToDb()` / `dbDayLogToApp()` em `server.js` — mapeamento camelCase ↔ snake_case dos campos de `day_logs`, no mesmo estilo dos pares existentes (`appEventToDb`/`dbEventToApp`)
- [x] `be-02` Incluir `day_logs` em `loadState()`/`saveState()` de `server.js` (linhas 162–334) — upsert total, filtrado por `user_id` como as demais tabelas, **sem** o padrão delete-missing usado para `boards`/`tasks`/`calendarEvents`/`people` (ver risco "`day_logs` e o padrão upsert+delete"); sem rotas novas

### 🎨 Frontend — estrutura

- [x] `fe-01` Reestruturar o HTML do painel em `index.html` (`#dayPopupBody`/`#dayPopupFooter`): blocos de teto, captura, prioridades, agenda, tarefas, bandeja, e o modo Fechar; remover a marcação antiga de `dayPopupBoardSectionHtml`/`shutdownPanelHtml` (seções por board)
- [x] `fe-02` Criar a escala própria do painel em `styles.css` (linha de tarefa ~34px, título do dia 20px, hierarquia vertical única), substituindo o bloco `.day-popup-*`/`.shutdown-*` existente
- [x] `fe-03` Estilizar estados de carga (verde/âmbar/vermelho), chips de motivo e marca de dia fechado (`.col-header` no board, `.day-cell` no calendário)

### ⚡ Frontend — lógica

- [x] `fe-04` Implementar `loadDayLogs()` / `saveDayLog()` sobre `day_logs`; renomear `dayPopupMode` de `'plan'|'shutdown'` para `'plan'|'close'`; reaproveitar `dayDrawerExpanded` como a flag `expanded` do design (não criar variável nova); substituir `getMitIds`/`setMitIds`/`toggleMit` (que liam `localStorage` por board) por leitura/escrita em `day_logs` (por data, cruzando boards)
- [x] `fe-05` Implementar lista unificada do dia (concatenar `tasksFor` dos boards visíveis via `getHiddenBoardIds()`, ordenar, `dot` por linha)
- [x] `fe-06` Implementar modo Planejar: teto (`capacity`), indicador de carga por contagem, prioridades no topo, campo `quando` (manhã/tarde/noite)
- [x] `fe-07` Implementar captura inline: generalizar `addTask(dateKey, name, board = currentBoard())` (linha 1247, hoje sem parâmetro de board) para aceitar um board explícito sem quebrar o único call site existente (linha 1980); painel ganha input + seletor de board reutilizando essa função generalizada
- [x] `fe-08` Implementar bandeja de pendências (atrasadas até 14 dias + sem data, dos boards visíveis) com ação `→ hoje`
- [x] `fe-09` Implementar o conteúdo enxuto do drawer encaixado (`expanded:false`): prioridades, próximo evento, captura rápida. **Não** é um terceiro valor de `mode` — é a renderização que `renderDayPopup()` sempre usa quando `expanded` é `false`, independente de `mode` ser `'plan'` ou `'close'` por trás
- [x] `fe-10` Implementar modo Fechar: bloco de resultado (`X de Y tarefas concluídas · Z de 3 prioridades`)
- [x] `fe-11` Implementar destinos de pendência (`amanhã`/`outra data`/`arquivar`/`ignorar`, `archived` em vez de reaproveitar `completed`) e chips de motivo (`deferral_reason`, opcionais)
- [x] `fe-12` Implementar nota do dia com prompts clicáveis
- [x] `fe-13` Implementar seleção das prioridades de amanhã dentro do fechamento (grava em `nextDayMitIds` do `day_logs` de amanhã)
- [x] `fe-14` Implementar marca de dia fechado: pill + opacidade em `columnHtml()`/`.col-header`, e ✓ + tint em `monthBlockHtml()`/`.day-cell`; reabertura limpa só `closed_at`, sem desfazer adiamentos
- [x] `fe-15` Mover o seletor de boards para o menu ⚙ e condicionar o select de agrupamento a >8 tarefas
- [x] `fe-16` Remover a leitura órfã de MIT em `columnHtml()`/`cardHtml()` (linhas 1181/1233, `getMitIds(activeBoardId, key)` + badge ⭐/classe `mit`) — decisão final: a estrela de prioridade passa a ser exclusiva do painel da Visão do Dia, o board view não lê mais `day_logs`

### ✅ Critérios de conclusão

- [ ] Os dois modos (`plan`, `close`) e a flag `expanded` funcionam e alternam conforme a jornada — o drawer encaixado sempre mostra o conteúdo enxuto de "Executar", independente do modo por trás
- [ ] É possível criar uma tarefa em qualquer board sem sair do painel
- [ ] O indicador de carga fica vermelho ao ultrapassar o teto
- [ ] O fechamento mostra resultado, aceita nota, aceita motivo por pendência (opcional) e permite escolher as prioridades de amanhã
- [ ] Um dia fechado aparece marcado no board e no calendário, e pode ser reaberto sem desfazer os adiamentos já aplicados
- [ ] Prioridades, teto e nota persistem após recarregar a página **em outro navegador** (ou seja, não estão mais em `localStorage`)
- [ ] Fechar/reabrir vários dias seguidos não apaga `day_logs` de dias anteriores (valida a decisão de não usar delete-missing)
- [ ] Nenhum resquício de pomodoro ou de `duration` no app
- [ ] Nenhuma funcionalidade existente foi quebrada (board, calendário, finanças, atividades, exportar report)
- [ ] Testado com dois boards (Trabalho e Pessoal), incluindo um board oculto
- [ ] Testado com tarefa recorrente sendo adiada e arquivada no fechamento

---

## Registro de desenvolvimento

### Desvios da spec

- **`day_logs.id` não é gerado no frontend.** A spec diz que `id` é "gerado com `uid()`, mesmo padrão de `boards.id`/`tasks.id`" — mas o estado em memória do frontend guarda `dayLogs` indexado só por `dateKey` (sem campo `id`, exatamente como o protótipo `Visao-do-Dia-v2.dc.html` modela `dayLogs: { [date]: {...} }`). Para não inventar um id no cliente sem necessidade, o `id` da linha é derivado **no servidor**, em `appDayLogToDb()`, como `` `${userId}:${dateKey}` `` — mesma convenção já usada para as chaves de `app_state` (`` `${userId}:activeBoardId` ``). Isso mantém o upsert idempotente por `(user_id, date)` via `onConflict: 'id'` sem exigir uma segunda constraint de conflito multi-coluna.
- **Select de agrupamento (>8 tarefas) usa correspondência por nome do campo, não por id.** A lista unificada mistura tarefas de boards diferentes, cada um com seus próprios campos customizados (ids diferentes mesmo quando o campo é conceitualmente "o mesmo", ex. "Projeto"). O protótipo não modela esse cruzamento (o mock de dados nunca passa de 8 tarefas/dia, então esse ramo condicional nunca aparece renderizado no `.dc.html`). Decisão conservadora: `dayGroupFieldOptions()` faz a união dos campos de todos os boards visíveis **casando por `name`**, e `groupRestItems()` bucketiza cada tarefa pelo campo do próprio board dela com aquele nome — tarefas cujo board não tem um campo com o mesmo nome (ou sem valor definido) caem em "Sem classificação". É a interpretação mais simples que não exige um novo conceito de "campo compartilhado entre boards".
- **Estado "Fechado" não ganhou um modo de leitura separado.** A prosa da v2 ("Estados da interface") descreve o dia fechado como abrindo "em modo leitura com o resultado e a nota". O protótipo final (`Visao-do-Dia-v2.dc.html`), que o README marca como fonte da verdade de interação, não implementa isso: `openPanel()` sempre entra em `mode: 'plan'` e só acrescenta o banner "Este dia foi fechado… Reabrir o dia" no topo do próprio modo Planejar. Implementado exatamente como o protótipo (banner + modo Planejar normal), não como a prosa mais antiga.
- **Weather do painel não foi comprimido para uma linha no cabeçalho.** O bullet de escopo v1 ("Clima em uma linha no cabeçalho, não em bloco") não tem task correspondente em `fe-*`, e o bloco `#dayPopupWeather` (com busca de cidade, loading, erro) é significativamente mais rico que o `weatherLine` estático do protótipo. Mudança de risco desproporcional ao ganho para uma tarefa não explicitamente atribuída — mantido como bloco próprio abaixo do topbar (já compacto), só oculto quando o painel está encaixado (`expanded:false`), que é o único ajuste que os `fe-*` realmente pedem.
- **`addTask()` chama `refreshCalendarAndBoard()` em vez de `render()`.** O único call site pré-existente (form "+ nova tarefa" da coluna) só precisava de `render()` porque só é alcançável a partir da própria board view. A captura inline do painel pode ser usada com o calendário aberto atrás do drawer; troquei para `refreshCalendarAndBoard()` (que já engloba `render()` quando a view é `board`) para os dots do calendário também atualizarem. Sem efeito no call site antigo.
- **`duration: 0` também removido de dois pontos não listados em `cl-01`** (criação de tarefa de checklist em `af-add-checklist-form` e na importação de atividade sugerida por IA) — a spec listou linhas específicas de uma revisão anterior do arquivo; a busca teve mais dois acertos com o mesmo padrão. Removidos por consistência (não faz sentido remover `duration` de todo o resto do app e deixar esses dois pontos escrevendo `duration: 0` para uma coluna que deixa de existir).

### Problemas encontrados

- **Bug pré-existente no fallback de dev sem Supabase, achado ao testar manualmente.** `makeMemorySupabaseClient()` em `server.js` (usado só quando `SUPABASE_URL`/`SUPABASE_KEY` não estão configuradas, ex. rodando local sem `.env`) tinha o predicado do `delete().not('id','in',...)` invertido: mantinha exatamente as linhas que deveriam ser apagadas e apagava o resto — na prática, todo `POST /api/tasks` local sem Supabase real apagava `boards`/`tasks`/`calendar_events`/`people` inteiros logo depois de gravá-los. Não tem nenhuma relação com a Visão do Dia (a lógica é genérica, usada por todas as tabelas com o padrão upsert+delete), mas bloqueava qualquer teste manual da feature localmente. Corrigido com uma inversão de um `&&`/`||` (ver comentário no código); não haveria como validar `fe-14`/critérios de aceite sem esse fix. Vale confirmar contra o Supabase real de qualquer forma — esse fallback só roda em dev.
- **`schema.sql` mais antigo que o código.** `tasks.board_id` tem `NOT NULL` na criação original da tabela (linha ~17), mas já foi relaxado por um `ALTER TABLE ... DROP NOT NULL` no bloco "Gerenciar Lista de Atividades" mais abaixo no mesmo arquivo. Não é um problema desta feature, só uma observação de que o arquivo é cumulativo (create + alters em sequência) — o bloco novo da Visão do Dia v2 segue o mesmo padrão.

### O que ficou fora (e por quê)

- Revisão semanal agregando as notas dos dias — depende de `day_logs` existir; fica para a próxima iteração
- Integração da nota do dia com o `exportar-atividades` — mesma dependência

### Notas de sessão

**[2026-08-06]**
- Onde parei: v1 (Discovery), v2 (Design, com protótipo `Visao-do-Dia-v2.dc.html` + `README-v2.md`) e v3 (Discovery Técnico) completos e revisados; todas as perguntas em aberto e riscos têm decisão registrada; tasks de implementação prontas (`cl-*` → `db-*` → `be-*` → `fe-*`)
- Próximo passo: iniciar desenvolvimento pelas tasks de limpeza (`cl-01`…`cl-04`), que são pré-requisito de tudo o resto
- Contexto importante: pomodoro e `duration` saem do app; `day_logs` usa `id`/`user_id` `TEXT` (não UUID) e viaja no payload existente de `/api/tasks`, sem rotas novas; a view principal do board não é restruturada, só ganha a marca de dia fechado; MIT sai do board view (fica só no painel)

**[2026-08-06] — implementação completa**
- As 18 tasks (`cl-01`→`cl-04`, `db-01`→`db-03`, `be-01`→`be-02`, `fe-01`→`fe-16`) foram implementadas nesta sessão, na ordem da spec. Nenhuma foi pulada ou bloqueada.
- `schema.sql` ganhou um novo bloco `-- Feature: Visão do Dia v2` (tabela `day_logs` + `deferral_reason`/`archived` em `tasks`) e um bloco **separado e comentado como destrutivo**, com o `ALTER TABLE tasks DROP COLUMN IF EXISTS duration;` comentado (não roda sozinho) — precisa ser rodado manualmente no SQL Editor do Supabase depois de revisão humana, conforme pedido.
- `getDefaultCapacity()`/`setDefaultCapacity()` ("Teto padrão" do menu ⚙) usa `localStorage` (chave `dayPopupDefaultCapacity`), não `day_logs` nem `app_state` — a spec não define onde esse valor mora; segui o precedente já existente de `getHiddenBoardIds()` (preferência de visualização/uso pessoal do navegador, não dado que precisa sincronizar entre dispositivos). Se o requisito for esse valor acompanhar o usuário entre navegadores, precisa de uma chave nova em `app_state` — decisão fácil de reverter depois.
- Testado via `curl` contra o servidor local (fallback em memória, após o fix do bug acima): `GET/POST /api/tasks` preserva `boards`/`tasks` com `deferralReason`/`archived`, cria e lê `dayLogs` por data, e um segundo `POST` com payload de `dayLogs` menor **não apaga** o dia anterior — confirma a decisão de upsert sem delete-missing.

---

## Referências

- [Sunsama — Daily Planning and Shutdown](https://www.sunsama.com/features/daily-planning-and-shutdown)
- [Todoist — Why Everyone Should Have a Work Shutdown Ritual](https://www.todoist.com/inspiration/end-work-day)
- [Zeigarnik Effect: How Unfinished Tasks Ruin Your Evenings](https://www.joachimeeckhout.com/p/zeigarnik-effect)
- [The When and How of Planning: Meta-Analysis of Implementation Intentions in 642 Tests](https://www.tandfonline.com/doi/abs/10.1080/10463283.2024.2334563)
- [Implementation Intentions: Gollwitzer & Sheeran 2006 (d = 0.65)](https://goalsandprogress.com/implementation-intentions-gollwitzer-how-to/)
- [Best Daily Planner Apps for 2026 — Tool Finder](https://toolfinder.com/best/daily-planner-apps)
