# Tarefas Recorrentes

**Status:** `[x] Discovery` → `[x] Design` → `[ ] Discovery Técnico` → `[ ] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Branch:** `feature/tarefas-recorrentes`
**Criado em:** 2026-07-11
**Última atualização:** 2026-07-11 (tasks de implementação decompostas pelo `task-planner`)

> **Nota sobre esta versão:** a spec original misturava conteúdo de discovery (v1) com modelo de dados (v3) e pulava a fase de design (v2). O protótipo (`prototype.html`) já foi gerado e seu conteúdo foi incorporado ao v2 abaixo, mas **ainda não passou pela skill `design-critic`** — recomendado rodar essa revisão antes de considerar o v2 definitivamente fechado. O conteúdo de v3 é **preliminar**: fica registrado para não perder as decisões técnicas já tomadas, mas deve ser revalidado depois do `design-critic`, já que o painel de recorrência pode revelar necessidades novas de estado/UI (ex.: os estados de erro e aviso de volume ainda não têm representação visual no protótipo).

---

## v1 — Discovery

### Objetivo
Permitir que o usuário crie uma tarefa uma única vez e defina uma regra de recorrência, eliminando o trabalho manual de recriar tarefas repetitivas toda semana.

### Problema
Tarefas que se repetem (reuniões semanais, revisões periódicas, rotinas diárias) precisam ser criadas manualmente toda vez, gerando atrito e risco de esquecimento.

### Solução
Ao criar uma tarefa, o usuário pode ativar uma recorrência e escolher um padrão (diário, semanal, mensal ou personalizado). O app gera automaticamente todas as instâncias da série como tarefas individuais no board, até uma data de término escolhida pelo usuário. Editar ou excluir uma instância pergunta se a ação vale só para aquela ocorrência ou para ela e todas as futuras da série.

### Escopo

**Dentro do Escopo**
- Flag de recorrência no formulário de criação de tarefa
- Painel de opções de recorrência com os padrões:
  - **Diário** — todos os dias ou apenas dias úteis (seg–sex, sem feriados)
  - **Semanal** — dias da semana selecionáveis (seg a dom, múltipla seleção)
  - **Mensal** — dia fixo do mês
  - **Personalizado** — intervalo fixo de 2 a 60 dias
- Data de início: sempre o dia em que o usuário clicou para criar a tarefa
- Data de término: escolhida pelo usuário, mínimo 1 dia após a data de início, máximo 31/12/2026
- Geração automática de todas as instâncias no board ao salvar
- Aviso de volume antes de confirmar, se a série gerar mais de 90 instâncias (ver [Riscos e pontos de atenção](#riscos-e-pontos-de-atenção))
- Ao editar uma instância: modal "Apenas esta ocorrência" ou "Esta e todas as futuras"
  - "Todas as futuras" propaga todos os campos, exceto a data de cada instância
  - Instâncias editadas individualmente recebem `is_exception = true` e saem da série
- Ao excluir uma instância: mesmo modal com as duas opções
  - "Esta e todas as futuras" remove a partir da instância selecionada (inclusive), **incluindo instâncias já marcadas `is_exception = true`** com data igual ou posterior; instâncias passadas permanecem
- Ao mover uma tarefa recorrente de dia (drag & drop, edição de data no modal, ou qualquer outro fluxo que altere `date`/`deliveryDate` — incluindo ações da feature Visão do Dia, quando existir): vira exceção (`is_exception = true`), sem afetar o restante da série
- Indicação visual (ícone 🔁) em todas as instâncias da série

**Fora do Escopo**
- Recorrências além de 31/12/2026
- Padrão de recorrência anual
- Integração com calendário externo (Google, Outlook)
- Notificações ou lembretes
- Alterar o padrão de recorrência de uma série já criada (deve-se excluir as futuras e recriar)
- Consideração de feriados no padrão "dias úteis"

### Jornada do usuário

**Criação de tarefa recorrente:**
1. Usuário clica para criar uma tarefa em um dia específico do board
2. Modal de criação abre com a data pré-preenchida (data do clique = data da 1ª instância)
3. Usuário preenche título e demais campos normalmente
4. Usuário ativa o toggle "Recorrente"
5. Painel de recorrência expande abaixo, com 4 opções de padrão:
   - **Diário:** radio "Todos os dias" ou "Apenas dias úteis (seg–sex)"
   - **Semanal:** checkboxes dos dias da semana (pelo menos 1 obrigatório)
   - **Mensal:** exibe "Todo dia **{N}** do mês", com N = dia da data de início, **não editável** (o app comunica que "o dia é definido automaticamente pela data de início" — ver decisão de UX no v2)
   - **Personalizado:** campo numérico "A cada ___ dias" (mín. 2, máx. 60)
6. Usuário define a data de término (picker, mínimo 1 dia após a data de início, máximo 31/12/2026); um resumo textual da regra aparece logo abaixo (ex.: "🔁 Toda seg, qua e sex · até 31/12/2026"), atualizado em tempo real conforme o usuário muda as opções
7. Se a combinação de padrão + intervalo de datas não gerar nenhuma instância além da primeira (ex.: semanal só às sextas, com término antes da próxima sexta), o botão salvar mostra estado de erro inline: "Esse padrão não gera nenhuma ocorrência antes da data de término" — usuário não consegue salvar até ajustar
8. Se a combinação gerar mais de 90 instâncias, exibe aviso não bloqueante antes de confirmar: "Isso vai criar N tarefas no board. Continuar?"
9. Usuário salva — o app gera todas as instâncias e exibe no board com ícone 🔁

**Edição de instância recorrente:**
1. Usuário clica para editar uma tarefa com ícone 🔁
2. Modal de confirmação: "Editar apenas esta ocorrência" ou "Esta e todas as futuras"
3. Se "apenas esta": edições aplicadas só nela; instância recebe `is_exception = true`
4. Se "esta e todas as futuras": todos os campos editados propagam para as instâncias subsequentes que ainda pertencem à série (a data de cada instância é preservada; instâncias já marcadas `is_exception = true` não são afetadas)

**Exclusão de instância recorrente:**
1. Usuário clica para excluir uma tarefa com ícone 🔁
2. Modal de confirmação: "Excluir apenas esta ocorrência" ou "Esta e todas as futuras"
3. Se "apenas esta": só essa instância é removida
4. Se "esta e todas as futuras": essa instância e todas as posteriores são removidas — inclusive as que já eram exceção (`is_exception = true`) com data igual ou posterior; instâncias anteriores permanecem intactas

**Mover tarefa recorrente de dia:**
1. Usuário move ou edita a data de uma instância recorrente (drag & drop, edição de data no modal, ação "adiar" ou "Fechar o Dia" da Visão do Dia)
2. A instância é desvinculada da série (`is_exception = true`, `series_id` mantido para rastreabilidade)
3. O restante da série não é afetado
4. O ícone 🔁 permanece para indicar que a tarefa pertencia a uma série

### Perguntas em aberto
*Respondidas no v2 pelo protótipo, exceto as marcadas como ainda pendentes.*

- ~~Como fica o layout do painel de recorrência dentro do modal de criação existente?~~ → respondida no v2.
- ~~Como o ícone 🔁 se posiciona no card sem colidir com os outros ícones já existentes?~~ → respondida no v2.
- ~~O modal "apenas esta / esta e todas as futuras" é um modal novo, ou reaproveita algum padrão existente?~~ → respondida no v2.
- **[Ainda pendente]** Qual o desenho visual do aviso de volume ("Isso vai criar N tarefas...")? Não está no protótipo atual.
- **[Ainda pendente]** Qual o desenho visual do estado de erro de "padrão não gera nenhuma ocorrência"? Não está no protótipo atual.
- **[Ainda pendente]** Como o painel mensal comunica visualmente o comportamento "pula meses que não têm o dia X"? O protótipo só informa que o dia é fixo pela data de início, não menciona o caso de meses curtos.

---

## v2 — Design
> Protótipo gerado e incorporado abaixo. **Ainda não revisado pela skill `design-critic`** — os dois pontos sinalizados como "pendente" em Estados da interface devem ser resolvidos nessa revisão antes de fechar o v2 definitivamente.

**Protótipo:** `prototype.html` (abrir no browser — tem navegação por cenário no rodapé: 1·Board, 2·Criar, 3·Editar, 4·Excluir)

### Decisões de UX tomadas
- **Painel por abas, não por seções empilhadas** → o toggle "Recorrente" expande um painel com borda verde contendo 4 abas (Diário/Semanal/Mensal/Personalizado); só a aba ativa mostra seus controles. Evita que o modal cresça demais mostrando os 4 padrões ao mesmo tempo.
- **Dia do mês do padrão "Mensal" não é editável** → o protótipo fixa o texto "Todo dia **{N}** do mês" (N = dia da data de início) com a nota "O dia é definido automaticamente pela data de início". Decisão tomada no design: editar o dia do mês separado da data de início criaria ambiguidade sobre qual data realmente vale como início da série. Isso **corrige** a spec original (v1 antigo dizia "editável") — a jornada do v1 acima já foi atualizada para refletir isso.
- **Resumo textual ao vivo** → abaixo do campo "Repetir até" existe uma linha de resumo (`recurrence-summary`) que traduz a regra escolhida em texto, ex. "🔁 Toda seg, qua e sex · até 31/12/2026", atualizada a cada mudança nas abas. Objetivo: reduzir erro de configuração antes de salvar.
- **Card de "pertence à série" no modal de edição** → ao abrir uma instância recorrente para editar, aparece uma barra verde no topo do modal (`🔁 Série: {nome} · {resumo da regra} até {data}`) antes dos campos editáveis, para deixar claro que a edição vai disparar a pergunta de escopo. O modal de edição em si **não** repete o painel de recorrência — só os campos normais (nome, data, link).
- **Confirmação de edição/exclusão é um modal novo e menor** (`confirm-modal`, 360px), não reaproveita o modal de tarefa (420px). Duas opções grandes em formato cartão-botão (título + descrição), não radio buttons — cada opção já mostra a data concreta afetada (ex. "Somente 14 jul será alterada"), não só o rótulo genérico. Isso resolve a pergunta em aberto sobre reaproveitar padrão existente: é um padrão próprio dessa feature, com ícone grande no topo (✏️ para editar, 🗑️ para excluir).
- **Excluir pula o modal de edição** → clicar em excluir uma instância recorrente vai direto para o modal de confirmação de exclusão (não abre o modal de edição antes). Editar só mostra a confirmação depois que o usuário clica "Salvar" no modal de edição.
- **Opção destrutiva com cor de risco** → em exclusão, "Esta e todas as futuras" usa a cor terracota (`--terracotta`) no hover/título, diferenciando visualmente de "Apenas esta ocorrência". Em edição, as duas opções são neutras (nenhuma é destrutiva).
- **Ícone 🔁 no card** → posicionado absoluto no canto superior direito do card (`top:7px; right:8px`), opacidade `.55`, `11px`. Não colide com os ícones existentes (👤, 🔗) porque esses ficam na linha de meta inferior do card, não no canto superior.

### Estados da interface
- **Vazio** — painel de recorrência fica oculto (classe `.hidden`) até o usuário ativar o toggle "Recorrente"; nenhum estado vazio adicional necessário
- **Com dados** — painel de recorrência com aba ativa preenchida + resumo textual ao vivo (estado principal, coberto pelo protótipo)
- **Editando instância de série** — barra verde "🔁 Série: ..." no topo do modal de edição (coberto pelo protótipo)
- **Confirmação de edição** — modal `✏️ Editar tarefa recorrente` com as duas opções (coberto pelo protótipo)
- **Confirmação de exclusão** — modal `🗑️ Excluir tarefa recorrente` com as duas opções, segunda opção em destaque de risco (coberto pelo protótipo)
- **[Pendente]** **Erro de validação** — combinação de padrão + data de término não gera nenhuma ocorrência; sem representação visual no protótipo atual
- **[Pendente]** **Aviso de volume** — série geraria mais de 90 instâncias; sem representação visual no protótipo atual
- **Carregando** — n/a (geração de instâncias é síncrona no cliente, antes do `save()`)

### Perguntas respondidas pelo design
- Layout do painel → abas por tipo de padrão, dentro de um painel com borda verde que expande abaixo do toggle, empurrando o campo "Link" para baixo.
- Posição do ícone 🔁 → canto superior direito do card, opacidade reduzida.
- Modal "apenas esta / esta e todas as futuras" → modal novo e mais compacto (`confirm-modal`), específico dessa feature, com opções em formato cartão em vez de radio.
- Editabilidade do dia do mês no padrão "Mensal" → não editável, sempre igual ao dia da data de início (mudança em relação à spec v1 original).
- Aviso de volume e erro de zero-ocorrências → **ainda não respondidas** — protótipo não cobre esses dois estados; precisa de uma iteração de design antes de considerar o v2 fechado.

---

## v3 — Discovery Técnico
> Conteúdo preliminar (ver nota no topo do documento) — revisar após o v2 ser aprovado.

### Visão geral técnica
Três novos campos em `tasks` (`series_id`, `recurrence_rule`, `is_exception`) permitem agrupar instâncias de uma mesma série. Cada ocorrência é gerada como uma linha independente no cliente (reaproveitando o padrão de `addTask()`) e enviada ao servidor pelo mecanismo de upsert total já existente — nenhuma mudança de protocolo é necessária.

### Arquivos a modificar

| Arquivo | O que muda | Impacto |
|---|---|---|
| `schema.sql` | Adicionar colunas `series_id`, `recurrence_rule`, `is_exception` em `tasks` | Baixo |
| `server.js` | Incluir os 3 campos em `appTaskToDb()` (linha ~160) e `dbTaskToApp()` (linha ~183) | Baixo |
| `public/index.html` | Toggle "Recorrente" + painel de opções de recorrência no formulário de criação/edição de tarefa; modal de confirmação "apenas esta / esta e todas as futuras" | Médio |
| `public/app.js` | Lógica de geração de instâncias, edição/exclusão em série, detecção de "virou exceção" nos fluxos de data (`finalizeOrder`, handler de `f.date`/`f.delegatedDate`, futura integração com Visão do Dia) | Alto |
| `public/styles.css` | Estilo do painel de recorrência e do ícone 🔁 no card | Baixo |

### Novos campos no banco
*Correção em relação à spec original: os ids das tarefas já são `TEXT` gerados por `uid()` (`app.js:82`, base36 + random), não UUID — `series_id` deve seguir o mesmo formato para consistência, e não exigir a extensão `pgcrypto`/`uuid-ossp` do Postgres.*

- Tabela `tasks`: `series_id TEXT DEFAULT NULL` — id da série (gerado com `uid()`), igual em todas as instâncias e nas exceções que saíram da série; `NULL` para tarefas não recorrentes (todas as existentes hoje)
- Tabela `tasks`: `recurrence_rule JSONB DEFAULT NULL` — regra da série, só preenchida na instância "âncora" ou replicada em todas (a definir no v3 final; ver risco abaixo)
- Tabela `tasks`: `is_exception BOOLEAN DEFAULT false` — `true` quando a instância foi editada/movida individualmente e saiu da série

**Estrutura do `recurrence_rule`:**
```json
{
  "type": "weekly",         // "daily" | "weekly" | "monthly" | "custom"
  "days": ["mon", "wed"],   // para type=weekly: dias da semana selecionados
  "workdaysOnly": true,     // para type=daily: se true, pula sábado e domingo
  "interval": 14,           // para type=custom: intervalo em dias (2–60)
  "dayOfMonth": 15,         // para type=monthly: dia fixo do mês
  "endDate": "2026-12-31"   // data de término da série
}
```
Campos não aplicáveis ao `type` escolhido ficam ausentes do objeto (não `null`).

### O que reutilizar
*Funções e padrões existentes que devem ser aproveitados — não reinventar.*

- `uid()` (`app.js:82`) → gerar `id` de cada instância e o `series_id` compartilhado
- `addTask(dateKey, name)` (`app.js:698`) → modelo para a função de geração em lote; precisa ser estendida para aceitar os demais campos do formulário (hoje só recebe `name`) e para ser chamada N vezes (uma por data calculada da regra)
- `patch(fn)` (`app.js:897`) → padrão de edição de campo único; a edição em massa ("esta e todas as futuras") deve reaproveitar a mesma forma de mutar o objeto `task`, mas iterando sobre todas as instâncias da série com `series_id` igual e `is_exception !== true`
- `deleteTask(id, board)` (`app.js:710`) → modelo para exclusão; exclusão em série filtra por `series_id` e `date >=` a da instância selecionada
- `openModal(id, board)` (`app.js:862`) / `closeModal()` (`app.js:883`) → reaproveitar para o modal de tarefa; o modal "apenas esta / esta e todas as futuras" é um novo modal intermediário antes de aplicar `patch`/`deleteTask`
- `finalizeOrder(col)` (`app.js:1002`) → ponto onde o drag-and-drop já reatribui `t.date = dateKey`; é aqui que a regra "mover vira exceção" precisa ser aplicada (comparar `dateKey` com o `date` original antes de sobrescrever)
- `save()` (`app.js:159`) / `render()` → persistência e re-render já existentes, sem mudança de contrato

### Riscos e pontos de atenção

- **`urgent_rank` das instâncias geradas** → resolvido: cada instância usa o mesmo default de `addTask()` hoje (`urgent: false, urgentRank: 0`), a menos que o usuário marque a tarefa como urgente no formulário de criação — nesse caso, aplicar o mesmo padrão de `f.urgent` (`app.js:922-926`) e `finalizeOrder` (`app.js:1009,1013`): `urgentRankBase = Date.now()` decrescente por instância, para preservar uma ordem estável entre elas.
- **Volume de instâncias / payload do upsert total** → resolvido como risco aceito para o uso pessoal do app (consistente com o ADR `001-upsert-total.md`), mas com mitigação de UX: aviso não bloqueante acima de 90 instâncias geradas numa única série (ver v1). Não há limite rígido no backend — se o uso real mostrar payloads problemáticos, revisar depois.
- **Sobreposição com a feature "Visão do Dia"** (ainda não implementada) → resolvido a nível de regra: qualquer fluxo que altere `date`/`deliveryDate` de uma instância recorrente — incluindo "adiar" e "Fechar o Dia" da Visão do Dia — deve marcar `is_exception = true`, da mesma forma que o drag-and-drop no board. Quando a Visão do Dia entrar em desenvolvimento, sua spec deve referenciar essa regra explicitamente e reaproveitar a mesma função de "virar exceção" (a implementar em `app.js` nesta feature).
- **Instância "âncora" da regra de recorrência** → ainda em aberto: como todas as instâncias são linhas independentes em `tasks` (sem uma tabela de séries separada), `recurrence_rule` precisa estar em pelo menos uma linha para permitir eventual necessidade futura de exibir "regra da série" — decidir no v3 final se fica replicada em todas as instâncias não-exceção (mais simples de consultar, mas duplicada) ou só na primeira instância (mais enxuto, mas exige lógica extra para localizar a âncora ao excluir a 1ª instância). Recomendação: replicar em todas as não-exceção, pela simplicidade do modelo upsert total já adotado no projeto.
- **Meses sem o `dayOfMonth` escolhido** (ex.: dia 31 em abril) → regra já definida no critério de aceite original: pula o mês, não ajusta para o último dia disponível.

---

## Tasks de implementação
> Decomposto pelo agente `task-planner` a partir do v3 (preliminar). Linhas do v3 conferidas contra o código atual em 2026-07-11 — todas batem (`uid()` app.js:82, `save()` app.js:159, `addTask()` app.js:698, `deleteTask()` app.js:710, `openModal()` app.js:862, `closeModal()` app.js:883, `patch()` app.js:897, `finalizeOrder()` app.js:1002-1017, `appTaskToDb()`/`dbTaskToApp()` server.js:160/183).
>
> **Gap encontrado e assumido nesta decomposição:** o v3 fala em "painel de recorrência no formulário de criação de tarefa" como se já existisse um modal de criação — mas hoje a criação é feita pelo formulário inline de uma linha (`add-form`, app.js:655, só campo "nome") que chama `addTask(dateKey, name)` direto, sem modal. O protótipo v2 desenha um modal "Nova tarefa" completo (Nome, Data, toggle Recorrente, Link) que **não existe no app hoje**. Como a regra de recorrência precisa ser coletada *antes* de gerar as N instâncias, este plano inclui a criação desse modal do zero (`fe-01`/`fe-02`/`fe-08`/`fe-11`), reaproveitando o padrão visual do modal de edição existente. O formulário inline de uma linha continua existindo para criação rápida não-recorrente (fluxo atual preservado); o modal novo é o caminho para ativar recorrência.
>
> **Segundo gap:** o protótipo assume um modal de edição com botão "Salvar" explícito, mas o app hoje edita com auto-save por campo (`patch()` disparado a cada `input`/`change`, sem botão salvar — ver `f.name`/`f.date`/etc., app.js:905-926). A pergunta "apenas esta / esta e todas as futuras" (`fe-14`) é adaptada para disparar na *primeira* alteração de campo dentro da sessão de edição (não num clique de "Salvar" que não existe), e a escolha feita vale para o restante da sessão até `closeModal()`.

### 🗄️ Banco de dados
- [ ] `db-01` Adicionar colunas `series_id TEXT DEFAULT NULL`, `recurrence_rule JSONB DEFAULT NULL`, `is_exception BOOLEAN DEFAULT false` na tabela `tasks`
       Onde: `schema.sql`, dentro do `CREATE TABLE tasks` (linhas 15-34)
       Depende de: nenhuma

### ⚙️ Backend
- [ ] `be-01` Mapear os 3 novos campos (`seriesId`↔`series_id`, `recurrenceRule`↔`recurrence_rule`, `isException`↔`is_exception`) em `appTaskToDb()` e `dbTaskToApp()`
       Onde: `server.js:160` (`appTaskToDb`) e `server.js:183` (`dbTaskToApp`)
       Depende de: `db-01`

### 🎨 Frontend — estrutura
*Só `index.html` e `styles.css` — sem event listeners (isso fica na seção de lógica).*

- [ ] `fe-01` Markup do novo modal "Nova tarefa" (overlay + `.task-modal`): campos Nome, Data, Link e footer com "Cancelar"/"Salvar tarefa"
       Onde: `index.html`, novo bloco próximo ao `#modalOverlay` existente (linha ~115); seguir a estrutura do `#createOverlay` do protótipo (`prototype.html:538-650`)
       Depende de: nenhuma
- [ ] `fe-02` Markup do toggle "Recorrente" + painel de recorrência (abas Diário/Semanal/Mensal/Personalizado, weekday-pills, campo numérico do personalizado, "Repetir até", linha de resumo textual) dentro do modal de `fe-01`
       Onde: `index.html`, dentro do modal criado em `fe-01`; espelhar `prototype.html:556-637`
       Depende de: `fe-01`
- [ ] `fe-03` Markup dos dois estados que o protótipo não cobre: erro inline de "zero ocorrências" (perto do botão salvar) e aviso de volume ">90 instâncias" (elemento de confirmação não-bloqueante) — ambos ocultos por padrão
       Onde: `index.html`, dentro do painel de recorrência de `fe-02`
       Depende de: `fe-02`
- [ ] `fe-04` Barra "🔁 Série: {nome} · {resumo} até {data}" no topo do modal de edição existente, oculta por padrão
       Onde: `index.html`, dentro de `#modalOverlay` (linha ~115), antes dos campos do formulário
       Depende de: nenhuma
- [ ] `fe-05` Markup dos dois modais de confirmação de escopo — "Editar tarefa recorrente" (✏️) e "Excluir tarefa recorrente" (🗑️), cada um com as duas opções em formato cartão-botão (a segunda opção de exclusão em cor de risco)
       Onde: `index.html`, dois novos overlays; espelhar `prototype.html:689-731` (`confirmEditOverlay`, `confirmDeleteOverlay`)
       Depende de: nenhuma
- [ ] `fe-06` Estilos: painel de recorrência (abas, weekday-pills, custom-interval-row, recurrence-summary), estados de erro/aviso de `fe-03`, barra de série de `fe-04`, os dois `confirm-modal` de `fe-05`, e ícone 🔁 no card (`position:absolute; top:7px; right:8px; opacity:.55; font-size:11px`) — inclui adicionar `position:relative` em `.card` (`styles.css:549`), que hoje não tem
       Onde: `styles.css`
       Depende de: `fe-01`, `fe-02`, `fe-03`, `fe-04`, `fe-05`

### ⚡ Frontend — lógica
*Só `app.js`.*

- [ ] `fe-07` Função pura `generateRecurrenceInstances(rule, startDateKey)` → retorna array de `dateKey`s segundo os 4 padrões (`daily`+`workdaysOnly`, `weekly`+`days[]`, `monthly`+`dayOfMonth` pulando meses que não têm o dia, `custom`+`interval`), respeitando `endDate`
       Onde: `app.js`, próximo às funções de data (`toKey`/`addDays`, app.js:70-71)
       Depende de: nenhuma
- [ ] `fe-08` Abrir/fechar o modal de `fe-01` (trigger a definir: botão junto ao formulário rápido de coluna); toggle "Recorrente" expande/colapsa o painel; troca de abas do padrão; função `formatRecurrenceSummary(rule)` e atualização ao vivo da linha de resumo a cada mudança nos controles
       Onde: `app.js`, novo bloco `---------- create modal ----------` próximo ao bloco `---------- modal ----------` (app.js:715)
       Depende de: `fe-02`
- [ ] `fe-09` Validação de zero-ocorrências: recalcula com `fe-07` a cada mudança e mostra/esconde o erro de `fe-03`, bloqueando o botão "Salvar tarefa" enquanto o erro estiver ativo
       Onde: `app.js`, no bloco de `fe-08`
       Depende de: `fe-07`, `fe-08`
- [ ] `fe-10` Aviso de volume: se `fe-07` retornar mais de 90 datas, exibe a confirmação não-bloqueante de `fe-03` antes de prosseguir com o salvamento
       Onde: `app.js`, no bloco de `fe-08`
       Depende de: `fe-07`, `fe-08`
- [ ] `fe-11` Handler de "Salvar tarefa" do modal de criação: se Recorrente ativo, gera `seriesId` (`uid()`), monta `recurrenceRule`, chama `fe-07` e cria uma task por data retornada — estendendo o padrão de `addTask()` (app.js:698) para aceitar os campos do formulário novo (nome, link) e replicar `recurrenceRule`/`seriesId`/`isException:false` em todas; se marcada urgente, aplica `urgentRankBase = Date.now()` decrescente por instância (mesmo padrão de `finalizeOrder`, app.js:1009,1013). Se Recorrente desativado, cria uma única task (comportamento equivalente ao `addTask()` atual)
       Onde: `app.js`, no bloco de `fe-08`
       Depende de: `fe-01`, `fe-08`, `fe-09`, `fe-10`, `be-01`
- [ ] `fe-12` Ícone 🔁 no card para toda task com `seriesId` preenchido
       Onde: `app.js`, `cardHtml()` (app.js:675-694)
       Depende de: `be-01`, `fe-06`
- [ ] `fe-13` `openModal()` popula a barra de série de `fe-04` quando `task.seriesId` existe, usando `formatRecurrenceSummary()` (`fe-08`) sobre `task.recurrenceRule`
       Onde: `app.js`, `openModal()` (app.js:862-882)
       Depende de: `fe-04`, `fe-08`, `be-01`
- [ ] `fe-14` Interceptar edição de instância de série: na primeira mudança de campo de uma sessão de edição (qualquer handler `f.*.addEventListener`, app.js:905-926) sobre uma task com `seriesId` e `isException !== true`, abrir o modal de confirmação "Editar" (`fe-05`) antes de aplicar o `patch()`; "apenas esta ocorrência" marca `isException = true` e aplica só nela; "esta e todas as futuras" aplica os mesmos campos (exceto `date`) em todas as tasks do board com o mesmo `seriesId`, `date >=` a da instância editada e `isException !== true`, reaproveitando a forma de mutação de `patch()` (app.js:897). A escolha feita vale para o resto da sessão de edição (até `closeModal()`, app.js:883), sem perguntar de novo a cada campo. Tasks já com `isException = true` editam direto, sem essa pergunta
       Onde: `app.js`, em torno de `patch()` (app.js:897) e dos handlers `f.*`
       Depende de: `fe-05`, `fe-13`, `be-01`
- [ ] `fe-15` Interceptar exclusão de instância de série: ao clicar em excluir (`#deleteTask`, app.js:928-934) uma task com `seriesId`, pular a exclusão direta e ir ao modal de confirmação "Excluir" (`fe-05`); "apenas esta" chama `deleteTask()` normalmente; "esta e todas as futuras" remove todas as tasks do board com o mesmo `seriesId` e `date >=` à da instância selecionada, **inclusive as já marcadas `isException = true`** com data igual ou posterior — instâncias anteriores permanecem intactas
       Onde: `app.js`, listener de `#deleteTask` (app.js:928) e `deleteTask()` (app.js:710)
       Depende de: `fe-05`, `be-01`
- [ ] `fe-16` Marcar `isException = true` em qualquer mudança de data de uma instância de série, só quando a data efetivamente muda: (a) `finalizeOrder()` — comparar `t.date` original com `dateKey` antes de sobrescrever (app.js:1006); (b) handler de `f.date` (app.js:906); (c) handler de `f.delegatedDate` quando altera `t.date` (app.js:920)
       Onde: `app.js:1002-1017` (`finalizeOrder`), `app.js:906` e `app.js:920`
       Depende de: `be-01`

### ✅ Critérios de conclusão
*Checklist final antes de abrir o PR. Verificado pelo agente `spec-checker`.*

- [ ] Existe um caminho na UI para criar uma tarefa recorrente: um modal "Nova tarefa" com nome, data, link e o toggle Recorrente, acessível a partir do board
- [ ] Criar recorrência semanal (seg/qua) a partir de uma segunda-feira gera instâncias em todas as segundas e quartas até a data de término
- [ ] Criar recorrência mensal no dia 31 em um mês com menos dias pula esse mês (não gera no dia 28/30 — apenas nos meses que têm o dia 31)
- [ ] Combinação de padrão + data de término que não gera nenhuma ocorrência bloqueia o salvamento com mensagem de erro
- [ ] Série que gerar mais de 90 instâncias exibe aviso de confirmação antes de salvar
- [ ] "Esta e todas as futuras" em edição nunca altera instâncias com data anterior à da instância selecionada, nem instâncias já marcadas `is_exception = true`
- [ ] "Esta e todas as futuras" em exclusão remove instâncias futuras mesmo que já sejam exceção
- [ ] Instâncias com `is_exception = true` não são afetadas por edições em massa da série, e editar/excluir uma delas individualmente não pergunta "apenas esta / esta e todas as futuras" — se comporta como tarefa comum
- [ ] Mover uma instância de data (drag-and-drop ou edição de data) marca `is_exception = true` e não afeta o resto da série
- [ ] Instâncias marcadas como urgentes recebem `urgentRank` individual, preservando ordem estável entre si
- [ ] Toda instância de uma série exibe o ícone 🔁 no card
- [ ] O payload enviado ao `POST /api/tasks` continua sendo o estado completo (sem mudança de protocolo)
- [ ] Testado nos dois boards (Trabalho e Pessoal)
- [ ] Dados persistem após recarregar a página

---

## Registro de desenvolvimento
> Preencher durante e após o desenvolvimento.

### Desvios da spec
- _n/a — desenvolvimento ainda não iniciado_

### Problemas encontrados
- _n/a_

### O que ficou fora (e por quê)
- _n/a_

### Notas de sessão

**2026-07-11**
- Onde parei: spec reorganizada no formato do template; v1 e v3 preliminar com itens em aberto resolvidos (payload, `urgent_rank`, validação de zero-ocorrências, semântica de exceção em exclusão em massa, sobreposição com Visão do Dia). Protótipo (`prototype.html`) gerado e incorporado ao v2 — decisões de UX documentadas, jornada do v1 corrigida (dia do mês não é editável, ao contrário do que a spec original dizia).
- Próximo passo: rodar `design-critic` sobre o protótipo e resolver as duas lacunas visuais pendentes (aviso de volume acima de 90 instâncias, erro de "padrão não gera nenhuma ocorrência") antes de fechar o v2 e seguir para o v3 oficial.
- Contexto importante: `series_id` deve ser `TEXT` (via `uid()`), não `UUID` — corrigido em relação à versão anterior da spec, para manter consistência com o padrão de ids do resto do app.

**2026-07-11 (continuação — task-planner)**
- Onde parei: rodado o `task-planner` sobre o v3 mesmo ele estando marcado como preliminar (pedido explícito do usuário, ciente do risco de retrabalho após o `design-critic` pendente no v2). Seção "Tasks de implementação" reescrita: 18 tasks atômicas (1 `db`, 1 `be`, 6 `fe` de estrutura, 10 `fe` de lógica), cada uma com "Onde" e "Depende de" explícitos, substituindo a lista placeholder anterior que tinha itens compostos demais (ex.: antigo `fe-04` misturava geração de instâncias + validação + aviso de volume em uma única task — quebrado agora em `fe-07`/`fe-09`/`fe-10`).
- Todas as referências de linha do v3 (`uid()` app.js:82, `addTask()` app.js:698, `patch()` app.js:897, `deleteTask()` app.js:710, `openModal()`/`closeModal()` app.js:862/883, `finalizeOrder()` app.js:1002, `save()` app.js:159, `appTaskToDb()`/`dbTaskToApp()` server.js:160/183) foram conferidas contra o código atual e continuam batendo.
- Dois gaps de arquitetura encontrados durante a decomposição, não cobertos pelo v3 (documentados no topo da seção "Tasks de implementação"):
  1. **Não existe modal de criação hoje** — a criação atual é um formulário inline de uma linha (`add-form`, só nome) que chama `addTask()` direto; o protótipo v2 desenha um modal "Nova tarefa" completo. Como a regra de recorrência precisa ser coletada antes de gerar as instâncias, o plano inclui construir esse modal do zero (`fe-01`, `fe-02`, `fe-08`, `fe-11`). O formulário inline continua existindo para criação rápida não-recorrente.
  2. **Não existe botão "Salvar" no modal de edição hoje** — o app edita com auto-save por campo (`patch()` a cada `input`/`change`). A pergunta "apenas esta / esta e todas as futuras" (`fe-14`) foi adaptada para disparar na primeira mudança de campo da sessão de edição, com a escolha valendo até `closeModal()`, em vez de depender de um clique de "Salvar" que não existe no app real (só existe no protótipo).
- Critérios de conclusão mantidos e ampliados com 2 itens novos: existência do caminho de criação via modal, e o comportamento de não perguntar escopo ao editar/excluir uma instância que já é exceção.
- Próximo passo: revisar as 18 tasks com o usuário (ou seguir direto para o `implementor`, já que o usuário pediu para prosseguir apesar do v3 ainda não estar revalidado pelo `design-critic`); ao implementar, os dois gaps de arquitetura acima devem ser validados na prática, já que são decisões novas não desenhadas no protótipo original.
