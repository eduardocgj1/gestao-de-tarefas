# Tarefas Recorrentes

**Status:** `[x] Discovery` → `[x] Design` → `[x] Discovery Técnico` → `[ ] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Branch:** `feature/tarefas-recorrentes`
**Criado em:** 2026-07-11
**Última atualização:** 2026-07-12 (v3 revalidado pelo `tech-discovery` — fechado)

> **Nota sobre esta versão:** a spec original misturava conteúdo de discovery (v1) com modelo de dados (v3) e pulava a fase de design (v2). O protótipo (`prototype.html`) já foi gerado e seu conteúdo foi incorporado ao v2 abaixo. O `design-critic` rodou sobre os dois estados que faltavam (aviso de volume e erro de zero-ocorrências) e o v2 está **fechado** — ver decisões na seção "Estados da interface". **Atualização:** o `tech-discovery` revalidou o v3 contra o código atual em produção e encontrou 3 correções técnicas (uma delas relevante — a feature "Visão do Dia" já está implementada, ao contrário do que este documento assumia) — ver nota no topo da seção v3, "Riscos e pontos de atenção" e "Notas de sessão". **v3 fechado.**

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
> Protótipo gerado e incorporado abaixo. Revisado pela skill `design-critic` em 2026-07-11 — os dois pontos antes sinalizados como "pendente" em Estados da interface foram resolvidos (ver abaixo). **v2 fechado.**

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
- **Dimensões do modal "Nova tarefa" seguem o app real, não o protótipo** → o protótipo desenhou `.task-modal` com `420px`/`border-radius:16px`, mas o modal que já existe em produção (`public/styles.css:597-606`, usado na edição) é `360px`/`border-radius:18px` — que é o valor correto dos tokens do design system (`--modal-w-task: 360px`, `--radius-modal: 18px`). **Correção encontrada pelo `design-critic`:** o `fe-01` deve construir o modal "Nova tarefa" em cima do `.modal` real (360px/18px), não replicar as dimensões do protótipo, para não introduzir um segundo padrão de modal no app.
- **Aviso de volume (>90 instâncias) — resolvido pelo `design-critic`** → reaproveita o padrão `.confirm-modal` (360px, ícone grande + título + descrição) já usado nos modais de escopo desta feature, mas **sem os cartões `confirm-options`** (é confirmação simples, não escolha entre duas ações). Novo overlay `confirmVolumeOverlay`: ícone `📋`, título "Confirmar criação em série", descrição `Isso vai criar {N} tarefas no board, de {data início} até {data término}.` com "{N} tarefas" em negrito na cor de texto padrão (`--text-primary`) — sem cor de alerta, porque não é um risco, é só confirmação de escala, e o tom do app evita exclamação de alarme. Rodapé no padrão `.modal-footer`: `Cancelar` (`.btn-neutral`) e `Criar {N} tarefas` (`.btn-primary`, verde). Disparo: ao clicar "Salvar tarefa", se a regra gerar mais de 90 datas e não houver erro de zero-ocorrências. "Cancelar" fecha só esse modal e volta ao modal de criação sem perder os dados preenchidos.
- **Erro de zero-ocorrências — resolvido pelo `design-critic`** → não é modal, é inline: o próprio slot do `.recurrence-summary` troca para uma variante de erro (`.recurrence-summary.error`) em vez de empilhar um elemento novo — mesma posição/padding, `background: var(--terracotta-100)`, `color: var(--terracotta-600)`, `border-top-color: rgba(193,98,45,.2)` (reaproveita os tokens de destructive já usados na exclusão em série, nenhuma cor nova). Texto: "Esse padrão não gera nenhuma ocorrência antes da data de término." — sem ícone extra, mantém o tom direto do app. O botão "Salvar tarefa" recebe o atributo `disabled`, reaproveitando o estado disabled que já existe no componente `Button` do design system (`opacity:.5; cursor:not-allowed`) — nenhum CSS novo necessário. Some e reverte ao resumo verde normal assim que a regra passar a gerar ao menos 1 ocorrência futura.

### Estados da interface
- **Vazio** — painel de recorrência fica oculto (classe `.hidden`) até o usuário ativar o toggle "Recorrente"; nenhum estado vazio adicional necessário
- **Com dados** — painel de recorrência com aba ativa preenchida + resumo textual ao vivo (estado principal, coberto pelo protótipo)
- **Editando instância de série** — barra verde "🔁 Série: ..." no topo do modal de edição (coberto pelo protótipo)
- **Confirmação de edição** — modal `✏️ Editar tarefa recorrente` com as duas opções (coberto pelo protótipo)
- **Confirmação de exclusão** — modal `🗑️ Excluir tarefa recorrente` com as duas opções, segunda opção em destaque de risco (coberto pelo protótipo)
- **Erro de validação** — combinação de padrão + data de término não gera nenhuma ocorrência; variante de erro do `.recurrence-summary` (ver "Decisões de UX tomadas"), bloqueia o botão "Salvar tarefa" via `disabled`
- **Aviso de volume** — série geraria mais de 90 instâncias; modal `confirmVolumeOverlay` no padrão `.confirm-modal` simplificado, sem bloquear o salvamento (ver "Decisões de UX tomadas")
- **Carregando** — n/a (geração de instâncias é síncrona no cliente, antes do `save()`)

### Perguntas respondidas pelo design
- Layout do painel → abas por tipo de padrão, dentro de um painel com borda verde que expande abaixo do toggle, empurrando o campo "Link" para baixo.
- Posição do ícone 🔁 → canto superior direito do card, opacidade reduzida.
- Modal "apenas esta / esta e todas as futuras" → modal novo e mais compacto (`confirm-modal`), específico dessa feature, com opções em formato cartão em vez de radio.
- Editabilidade do dia do mês no padrão "Mensal" → não editável, sempre igual ao dia da data de início (mudança em relação à spec v1 original).
- Aviso de volume → respondida: modal `confirmVolumeOverlay`, reaproveitando `.confirm-modal` sem os cartões de opção, com botões `Cancelar`/`Criar {N} tarefas` no padrão `.modal-footer`.
- Erro de zero-ocorrências → respondida: variante `.recurrence-summary.error` (terracota) no lugar do resumo normal, com o botão "Salvar tarefa" desabilitado.

---

## v3 — Discovery Técnico
> **v3 fechado.** Revalidado pelo `tech-discovery` em 2026-07-12, após o v2 ter sido fechado pelo `design-critic`. Confirmado: os dois estados novos do v2 (`confirmVolumeOverlay`, `.recurrence-summary.error`) são só client-side, antes do `save()` — sem impacto no modelo de dados nem na lista de "Arquivos a modificar" (a expectativa registrada no pedido desta revalidação se confirmou). Todas as referências de linha/função já conferidas pelo `task-planner` (`uid()`, `save()`, `addTask()`, `deleteTask()`, `openModal()`/`closeModal()`, `patch()`, `finalizeOrder()`, `appTaskToDb()`/`dbTaskToApp()`) foram checadas de novo e continuam batendo, incluindo `.modal` (`styles.css:597-606`, 360px/`border-radius:18px` — confirmado byte a byte) e `.card` (`styles.css:549`, sem `position` definido hoje). Três correções feitas nesta revalidação, detalhadas em "Riscos e pontos de atenção" e refletidas nas tasks `fe-06`/`fe-16`:
> 1. **A feature "Visão do Dia" já está implementada em produção** (`app.js` — `openDayPopup`, `applyShutdown()`, botão "adiar"), ao contrário do que o status do `CLAUDE.md` e a redação do v1 desta spec assumiam ("ainda não implementada"). Isso é um gap real, não cosmético: esses dois fluxos já mutam `date`/`deliveryDate` de tarefas hoje, sem qualquer noção de `is_exception`. A task `fe-16` foi ampliada com os itens (d) e (e) para cobrir isso.
> 2. **Nomes de custom properties CSS citados no v2 não existem** em lugar nenhum do projeto (nem `styles.css`, nem `prototype.html`) — corrigidos na task `fe-06` para os tokens reais.
> 3. A decisão sobre a instância "âncora" do `recurrence_rule`, antes "em aberto", já estava operacionalizada pela task `fe-11` (replicar em todas as instâncias não-exceção) — atualizado para refletir isso.
>
> Um achado adicional, pré-existente e fora do escopo desta feature, foi sinalizado mas não bloqueia o fechamento do v3: `schema.sql` declara `urgent_rank` como `INTEGER`, não `BIGINT` como a regra do projeto exige — ver "Riscos e pontos de atenção".

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
- **Sobreposição com a feature "Visão do Dia"** → **correção encontrada nesta revalidação:** ao contrário do que o v1 e o status do `CLAUDE.md` assumiam ("ainda não implementada"), a Visão do Dia **já está implementada e em produção** em `app.js` — o popup de dia já tem o botão "adiar" (`.adiar-btn`, `app.js:1757-1770`, adia a tarefa para amanhã) e o fluxo "Fechar o Dia" (`enterShutdownMode()`/`applyShutdown()`, `app.js:1687-1716`), ambos mutando `t.date`/`t.deliveryDate` diretamente, sem qualquer noção de `is_exception` hoje (o campo simplesmente ainda não existe). Isso deixou de ser um risco futuro e virou um gap real desta implementação. A task `fe-16` foi ampliada com dois itens novos — (d) `adiar-btn` (`app.js:1757-1770`) e (e) `applyShutdown()` (`app.js:1702-1716`) — para que essas ações também marquem `is_exception = true` quando a data efetivamente muda, ao lado de `finalizeOrder()` e dos handlers `f.date`/`f.delegatedDate` já cobertos.
- **Instância "âncora" da regra de recorrência** → **resolvido, já operacionalizado na task `fe-11`:** `recurrence_rule` é replicado em todas as instâncias não-exceção da série (não só na primeira), pela simplicidade do modelo upsert total já adotado no projeto. Não há mais decisão em aberto aqui.
- **Meses sem o `dayOfMonth` escolhido** (ex.: dia 31 em abril) → regra já definida no critério de aceite original: pula o mês, não ajusta para o último dia disponível.
- **Nomes de custom properties CSS incorretos no v2** (achado nesta revalidação) → o texto de "Decisões de UX tomadas" (v2) cita tokens que não existem em lugar nenhum do projeto — nem em `public/styles.css`, nem em `prototype.html` (`--terracotta-100`, `--terracotta-600`, `--modal-w-task`, `--radius-modal`, `--text-primary`, `--terracotta`). Os tokens reais são `--color-terracotta` (`#C1622D`), `--color-terracotta-soft` (`#FBEEE6`) e `--color-text` (`#262420`); não existe um token unificado de largura/raio de modal — `.modal` (`styles.css:597-606`) já hardcoda `width:360px; border-radius:18px` diretamente (isso a task `fe-01` já cita corretamente, sem depender dos tokens fictícios). Corrigido na task `fe-06`, seguindo o mesmo padrão já usado em `.delete-btn` (`styles.css:644-645`). As classes `.confirm-modal`/`.modal-footer`/`.btn-primary`/`.btn-neutral` também não existem em `public/styles.css` hoje — só existem dentro do `<style>` do `prototype.html` (linhas 337-366), com nomes de variável próprios do protótipo (`--green-hover`, `--neutral-btn-hover` etc.) que tampouco batem com os tokens do app real. `fe-05`/`fe-06` devem criar essas classes do zero no app, adaptando a estrutura visual do protótipo para os tokens reais — não é reaproveitamento de um padrão que já existe em produção, é a primeira vez que esse padrão de modal de confirmação entra no app.
- **`urgent_rank` já é `INTEGER` no `schema.sql` atual, não `BIGINT`** (achado nesta revalidação, pré-existente e fora do escopo desta feature) → `schema.sql:25` declara `urgent_rank INTEGER DEFAULT 0`, contrariando a regra documentada em `CLAUDE.md`/`architecture.md` ("`urgent_rank` é BIGINT — nunca INTEGER"). Isso já é usado hoje por `app.js:924` (`f.urgent` handler) e `app.js:1009/1013` (`finalizeOrder`), que atribuem `Date.now()` (13 dígitos) a esse campo — um valor maior que o máximo de `INTEGER` (~2,1 bilhões, 10 dígitos). Não é um problema introduzido por esta feature (já existe hoje para qualquer tarefa marcada urgente), mas a task `fe-11` amplia a exposição ao gerar várias instâncias urgentes por série. Como `db-01` já vai alterar a tabela `tasks`, é uma boa oportunidade — não obrigatória para o escopo desta feature — de incluir `ALTER TABLE tasks ALTER COLUMN urgent_rank TYPE BIGINT` na mesma migração. Sinalizado aqui e no relatório desta revalidação para o usuário decidir; não incluído como task obrigatória.

---

## Tasks de implementação
> Decomposto pelo agente `task-planner` a partir do v3 (então preliminar). Linhas do v3 conferidas contra o código atual em 2026-07-11 — todas batem (`uid()` app.js:82, `save()` app.js:159, `addTask()` app.js:698, `deleteTask()` app.js:710, `openModal()` app.js:862, `closeModal()` app.js:883, `patch()` app.js:897, `finalizeOrder()` app.js:1002-1017, `appTaskToDb()`/`dbTaskToApp()` server.js:160/183). **Atualização (revalidação do `tech-discovery`, 2026-07-12):** conferidas de novo, continuam batendo; `fe-16` foi ampliada (itens d/e) e `fe-06` corrigida (nomes de tokens CSS) — ver "Riscos e pontos de atenção" no v3.
>
> **Gap encontrado e assumido nesta decomposição:** o v3 fala em "painel de recorrência no formulário de criação de tarefa" como se já existisse um modal de criação — mas hoje a criação é feita pelo formulário inline de uma linha (`add-form`, app.js:655, só campo "nome") que chama `addTask(dateKey, name)` direto, sem modal. O protótipo v2 desenha um modal "Nova tarefa" completo (Nome, Data, toggle Recorrente, Link) que **não existe no app hoje**. Como a regra de recorrência precisa ser coletada *antes* de gerar as N instâncias, este plano inclui a criação desse modal do zero (`fe-01`/`fe-02`/`fe-08`/`fe-11`), reaproveitando o padrão visual do modal de edição existente. O formulário inline de uma linha continua existindo para criação rápida não-recorrente (fluxo atual preservado); o modal novo é o caminho para ativar recorrência.
>
> **Segundo gap:** o protótipo assume um modal de edição com botão "Salvar" explícito, mas o app hoje edita com auto-save por campo (`patch()` disparado a cada `input`/`change`, sem botão salvar — ver `f.name`/`f.date`/etc., app.js:905-926). A pergunta "apenas esta / esta e todas as futuras" (`fe-14`) é adaptada para disparar na *primeira* alteração de campo dentro da sessão de edição (não num clique de "Salvar" que não existe), e a escolha feita vale para o restante da sessão até `closeModal()`.

### 🗄️ Banco de dados
- [x] `db-01` Adicionar colunas `series_id TEXT DEFAULT NULL`, `recurrence_rule JSONB DEFAULT NULL`, `is_exception BOOLEAN DEFAULT false` na tabela `tasks`
       Onde: `schema.sql`, dentro do `CREATE TABLE tasks` (linhas 15-34)
       Depende de: nenhuma

### ⚙️ Backend
- [ ] `be-01` Mapear os 3 novos campos (`seriesId`↔`series_id`, `recurrenceRule`↔`recurrence_rule`, `isException`↔`is_exception`) em `appTaskToDb()` e `dbTaskToApp()`
       Onde: `server.js:160` (`appTaskToDb`) e `server.js:183` (`dbTaskToApp`)
       Depende de: `db-01`

### 🎨 Frontend — estrutura
*Só `index.html` e `styles.css` — sem event listeners (isso fica na seção de lógica).*

- [ ] `fe-01` Markup do novo modal "Nova tarefa" (overlay + `.modal`, reaproveitando a classe `.modal` real do app — **360px/`border-radius:18px`, não os 420px/16px do protótipo**, ver correção do `design-critic` em "Decisões de UX tomadas"): campos Nome, Data, Link e footer com "Cancelar"/"Salvar tarefa"
       Onde: `index.html`, novo bloco próximo ao `#modalOverlay` existente (linha ~115); reaproveitar `public/styles.css:597-606` (`.modal`) como base, usando `prototype.html:538-650` (`#createOverlay`) só como referência de estrutura/campos, não de dimensões
       Depende de: nenhuma
- [ ] `fe-02` Markup do toggle "Recorrente" + painel de recorrência (abas Diário/Semanal/Mensal/Personalizado, weekday-pills, campo numérico do personalizado, "Repetir até", linha de resumo textual) dentro do modal de `fe-01`
       Onde: `index.html`, dentro do modal criado em `fe-01`; espelhar `prototype.html:556-637`
       Depende de: `fe-01`
- [ ] `fe-03` Markup dos dois estados resolvidos pelo `design-critic` (ver "Decisões de UX tomadas" no v2): (a) variante de erro `.recurrence-summary.error` (terracota) no mesmo slot do resumo textual, texto "Esse padrão não gera nenhuma ocorrência antes da data de término.", com o botão "Salvar tarefa" preparado para receber `disabled`; (b) novo overlay `confirmVolumeOverlay` no padrão `.confirm-modal` **sem** `.confirm-options` — ícone 📋, título "Confirmar criação em série", descrição com `{N} tarefas` em negrito, footer `.modal-footer` com "Cancelar"/"Criar {N} tarefas" — ambos ocultos por padrão
       Onde: `index.html`, o item (a) dentro do painel de recorrência de `fe-02`; o item (b) como novo overlay irmão de `fe-05`
       Depende de: `fe-02`
- [ ] `fe-04` Barra "🔁 Série: {nome} · {resumo} até {data}" no topo do modal de edição existente, oculta por padrão
       Onde: `index.html`, dentro de `#modalOverlay` (linha ~115), antes dos campos do formulário
       Depende de: nenhuma
- [ ] `fe-05` Markup dos dois modais de confirmação de escopo — "Editar tarefa recorrente" (✏️) e "Excluir tarefa recorrente" (🗑️), cada um com as duas opções em formato cartão-botão (a segunda opção de exclusão em cor de risco)
       Onde: `index.html`, dois novos overlays; espelhar `prototype.html:689-731` (`confirmEditOverlay`, `confirmDeleteOverlay`)
       Depende de: nenhuma
- [ ] `fe-06` Estilos: painel de recorrência (abas, weekday-pills, custom-interval-row, recurrence-summary), `.recurrence-summary.error` (`background: var(--color-terracotta-soft)` / `color: var(--color-terracotta)` / `border-top-color: rgba(193,98,45,.2)` — **correção desta revalidação:** os tokens `--terracotta-100`/`--terracotta-600` citados no v2 não existem no projeto; usar os tokens reais acima, que seguem exatamente o mesmo padrão de `.delete-btn`, `styles.css:644-645`), `confirmVolumeOverlay` (variante de `.confirm-modal` sem `.confirm-options`, com `.modal-footer`; texto de `{N} tarefas` em negrito na cor `var(--color-text)` — não existe token `--text-primary`), `.confirm-modal`/`.modal-footer`/`.btn-primary`/`.btn-neutral` são classes **novas** desta feature — não existem em `public/styles.css` hoje, só em `prototype.html:337-366` com nomes de variável próprios do protótipo; recriar com os tokens reais do app (`--color-green`/`--color-green-hover` para `.btn-primary`, `--color-neutral-btn`/`--color-neutral-btn-hover` para `.btn-neutral`), barra de série de `fe-04`, os dois `confirm-modal` de `fe-05` (opção de risco em exclusão usa `var(--color-terracotta)`, não `--terracotta`), e ícone 🔁 no card (`position:absolute; top:7px; right:8px; opacity:.55; font-size:11px`) — inclui adicionar `position:relative` em `.card` (`styles.css:549`), que hoje não tem
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
- [ ] `fe-09` Validação de zero-ocorrências: recalcula com `fe-07` a cada mudança e alterna a classe `.error` do `.recurrence-summary` de `fe-03`, aplicando/removendo `disabled` no botão "Salvar tarefa" enquanto o erro estiver ativo
       Onde: `app.js`, no bloco de `fe-08`
       Depende de: `fe-07`, `fe-08`
- [ ] `fe-10` Aviso de volume: ao clicar "Salvar tarefa", se `fe-07` retornar mais de 90 datas, abre `confirmVolumeOverlay` de `fe-03` (com o texto preenchido com `N`) em vez de salvar direto; "Cancelar" fecha só esse overlay e mantém o modal de criação aberto com os dados preenchidos; "Criar N tarefas" prossegue para `fe-11`
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
- [ ] `fe-16` Marcar `isException = true` em qualquer mudança de data de uma instância de série, só quando a data efetivamente muda: (a) `finalizeOrder()` — comparar `t.date` original com `dateKey` antes de sobrescrever (app.js:1006); (b) handler de `f.date` (app.js:906); (c) handler de `f.delegatedDate` quando altera `t.date` (app.js:920); (d) botão "adiar" do popup de dia — `.adiar-btn`, `app.js:1757-1770` (**ampliado nesta revalidação:** a Visão do Dia já está implementada em produção, ao contrário do que o v1 desta spec assumia — ver correção em "Riscos e pontos de atenção"); (e) `applyShutdown()` do fluxo "Fechar o Dia", `app.js:1702-1716`, que aplica `shutdownChoices` em lote — cada tarefa cuja data muda entra na mesma checagem
       Onde: `app.js:1002-1017` (`finalizeOrder`), `app.js:906`, `app.js:920`, `app.js:1757-1770` (`adiar-btn`), `app.js:1702-1716` (`applyShutdown`)
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

**2026-07-11 (continuação — design-critic)**
- Onde parei: rodado o `design-critic` de forma focada, apenas para fechar os dois estados de interface pendentes desde o v2 (aviso de volume >90 instâncias, erro de zero-ocorrências) — não uma revisão completa do zero, já que o restante do protótipo já estava aprovado. Decisão: resolver esse gap **antes** do `tech-discovery`/implementação, porque diferente dos dois gaps de arquitetura (modal de criação, botão salvar — já assumidos como risco aceito pelo usuário), estes eram gaps de **design visual** (cor, copy, layout) que o `implementor` teria que inventar sem guardrails caso não fossem fechados agora.
- Resultado: **v2 fechado**. Aviso de volume → modal `confirmVolumeOverlay`, variante simplificada do `.confirm-modal` (sem `.confirm-options`), com `.modal-footer` padrão (Cancelar/Criar N tarefas). Erro de zero-ocorrências → variante `.recurrence-summary.error` (terracota) no mesmo slot do resumo textual, com o botão "Salvar tarefa" recebendo `disabled` (reaproveitando o estado disabled já definido no componente `Button` do design system, sem CSS novo). Seção "Estados da interface" e "Perguntas respondidas pelo design" atualizadas; tasks `fe-01`, `fe-03`, `fe-06`, `fe-09`, `fe-10` ajustadas para refletir as decisões concretas.
- Achado adicional do `design-critic`: o protótipo desenhou o modal "Nova tarefa" com `420px`/`border-radius:16px`, divergindo do modal real do app em produção (`360px`/`border-radius:18px`, que é o valor correto dos tokens `--modal-w-task`/`--radius-modal` do design system). Corrigido na task `fe-01` — o modal novo deve nascer do `.modal` real, não do protótipo, para não criar um segundo padrão de modal no app.
- Próximo passo: rodar `tech-discovery` para revalidar o v3 preliminar agora que o v2 está fechado (confirmar se os novos elementos — `confirmVolumeOverlay`, variante de erro — mudam algo no modelo de dados ou nos arquivos a modificar; a expectativa é que não mudem, pois são só estados de UI client-side, sem novo campo no banco), depois seguir para a implementação.

**2026-07-12 (continuação — tech-discovery, revalidação do v3)**
- Onde parei: revalidado o v3 (então preliminar) contra o código atual (`server.js`, `public/app.js`, `public/index.html`, `public/styles.css`, `schema.sql`), agora que o v2 está fechado. Confirmado, como esperado: os dois estados novos do v2 (`confirmVolumeOverlay`, `.recurrence-summary.error`) são puramente client-side (antes do `save()`) e não exigem nenhuma mudança no modelo de dados (`series_id`/`recurrence_rule`/`is_exception` continuam os 3 únicos campos novos) nem na lista de "Arquivos a modificar". Todas as referências de linha/função das 18 tasks foram reconferidas e batem.
- **Achado mais relevante:** a feature "Visão do Dia" (popup de dia, botão "adiar", fluxo "Fechar o Dia") **já está implementada em produção** em `app.js` (`openDayPopup`/`renderDayPopup`, `enterShutdownMode()`/`applyShutdown()` em `app.js:1687-1716`, botão `.adiar-btn` em `app.js:1757-1770`, UI em `index.html:256-257`) — ao contrário do que o status do `CLAUDE.md` ("não implementado") e a redação do v1 desta spec ("quando existir") assumiam. Isso não é cosmético: ambos os fluxos já mutam `t.date`/`t.deliveryDate` de tarefas hoje, e a task `fe-16` (marcar `is_exception` ao mover data) só cobria `finalizeOrder()`/`f.date`/`f.delegatedDate`. Ampliada com os itens (d) `adiar-btn` e (e) `applyShutdown()`, usando a mesma regra já decidida no v1 ("comparar a data antes de sobrescrever, virar exceção só se mudou").
- Duas correções de nomenclatura CSS encontradas: (1) os custom properties citados no v2 (`--terracotta-100`, `--terracotta-600`, `--modal-w-task`, `--radius-modal`, `--text-primary`, `--terracotta`) não existem em lugar nenhum do projeto — nem em `public/styles.css`, nem em `prototype.html` (que usa seus próprios nomes, também diferentes: `--terracotta`, `--terracotta-soft`, `--green-hover` etc., sem as variantes numeradas 100/600 nem tokens de modal); corrigido na task `fe-06` para os tokens reais (`--color-terracotta`, `--color-terracotta-soft`, `--color-text`), seguindo o padrão já usado em `.delete-btn`; (2) `.confirm-modal`/`.modal-footer`/`.btn-primary`/`.btn-neutral` não existem em `public/styles.css` — só no `<style>` do protótipo — anotado que `fe-05`/`fe-06` criam esse padrão do zero no app, não reaproveitam algo que já existe em produção.
- Achado adicional, pré-existente e fora do escopo desta feature, sinalizado mas não bloqueante: `schema.sql:25` declara `urgent_rank INTEGER`, não `BIGINT` como a regra do projeto exige — usado hoje por `f.urgent`/`finalizeOrder` com `Date.now()` (que já excede o range de `INTEGER`). Recomendado (não obrigatório) aproveitar a migração de `db-01` para corrigir com `ALTER COLUMN ... TYPE BIGINT`, mas isso é uma decisão do usuário, não desta feature.
- Resultado: **v3 fechado.** As 3 correções acima foram aplicadas diretamente nas tasks (`fe-16`, `fe-06`) e na seção "Riscos e pontos de atenção", por serem correções técnicas mecânicas (nomes/linhas de código reais), não decisões de produto em aberto. Nenhuma pergunta ficou sem resposta que impeça o início da implementação.
- Próximo passo: seguir para a implementação (`implementor`), começando por `db-01` → `be-01` → tasks de frontend na ordem já definida. Antes de começar, o usuário deve decidir se quer incluir a correção de `urgent_rank` (BIGINT) na mesma migração de `db-01` — não é obrigatório para esta feature, mas é uma janela conveniente.

**2026-07-12 (continuação — orquestrador, decisão antes da implementação)**
- Decisão tomada (conservadora, por ambiguidade não coberta pela spec): **não** incluir a correção de `urgent_rank` (`INTEGER` → `BIGINT`) na migração de `db-01` desta feature. É um bug pré-existente, fora do escopo de "tarefas-recorrentes", e misturá-lo aumentaria o raio de impacto do PR sem necessidade. Fica sinalizado aqui para o usuário tratar em um PR separado, dedicado a esse fix.
- Branch `feature/tarefas-recorrentes` criada a partir de `main`. Próximo passo: `implementor` executa as 18 tasks em ordem, uma por vez, com commit após cada uma.
