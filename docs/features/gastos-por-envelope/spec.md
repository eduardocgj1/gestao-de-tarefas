# Feature: Gastos por Envelope

Protótipo de referência: `prototype.dc.html` (mesma pasta — abrir no browser)

**Status:** `[x] Discovery` → `[x] Design` → `[ ] Discovery Técnico` → `[ ] Em desenvolvimento` → `[ ] Em revisão` → `[ ] Concluído`

**Criado em:** 2026-07-15
**Depende de:** feature `financas` (já implementada — tabs Visão geral, Lançamentos, Planejamento, Planejados)

---

## Nome

Organizar gastos por Envelope

---

## Objetivo da Feature

Permitir que o usuário enxergue suas finanças pelo **porquê** dos gastos — agrupando despesas em envelopes de contexto (uma viagem, um hábito semanal, um projeto) — sem abrir mão da visão por categoria que já existe.

---

## Descrição Detalhada

**Ideia da Feature**

Os gastos financeiros passam a poder ser associados a **envelopes** — containers intencionais que agrupam despesas por contexto, não por categoria. Cada gasto continua recebendo sua categoria padrão (transporte, alimentação, lazer etc.), mas o envelope é a camada de significado por cima: "esse Uber foi *para o aniversário da Bia*", não apenas "transporte".

**Problema Identificado**

Hoje o app responde bem "quanto gastei com alimentação este mês", mas não responde "quanto custou a viagem a Buenos Aires" nem "quanto estou gastando com a marmita da semana". Categorias fatiam o dinheiro por natureza do gasto; experiências e projetos reais atravessam várias categorias ao mesmo tempo. O usuário perde a noção do custo real das coisas que importam para ele.

**Solução Desenhada**

Uma nova tab **Envelopes** dentro de Finanças exibe os envelopes do mês agrupados por tipo, com orçado vs. realizado. O modal de lançamento ganha um seletor opcional de envelope. Gastos sem envelope aparecem como **avulsos** em seção própria. O usuário obtém tanto o macro ("quanto gastei em Social esse mês") quanto o detalhe ("quanto custou a viagem a Buenos Aires").

> **Decisão de posicionamento:** Envelopes é uma **quinta tab**, não uma substituição da tab Planejamento. Planejamento continua respondendo *quanto posso gastar* (orçamento por categoria + fixos); Envelopes responde *por que estou gastando*. As duas lentes se complementam.

---

## Conceitos

### Tipos de envelope

| Tipo | O que é | Exemplos | Ciclo de vida |
|---|---|---|---|
| **Evento único** | Experiência com começo e fim | Aniversário da Bia, jantar romântico, viagem a Buenos Aires | Criado com orçamento e período; **encerrado manualmente** pelo usuário |
| **Evento recorrente** | Hábito com custo periódico | Marmita da semana, compras do mês | Template com orçamento + cadência; a cada ciclo uma **nova instância é criada automaticamente** |
| **Projeto** | Investimento progressivo com objetivo | Lançamento da marca de fotografia | Orçamento total, sem data obrigatória; subdividido em **sub-envelopes** (identidade visual, equipamento, marketing). Gastos são associados ao sub-envelope, nunca ao projeto diretamente |

### Tipos de evento (pré-definidos, extensíveis)

Social, Casal, Viagem, Rotina, Saúde, Casa, Profissional. O usuário pode criar novos tipos. Cada tipo tem cor (reutiliza a paleta de categorias: blue, green, amber, teal, red, gray, purple).

---

## Escopo

**Dentro do Escopo**

- Nova tab "Envelopes" em Finanças, com visão macro agrupada por tipo de evento + seções Recorrentes e Projetos
- CRUD de envelopes (criar, editar, encerrar, reabrir, excluir)
- Seletor de envelope no modal de lançamento existente (opcional, só para gastos)
- Seção "Avulsos" com gastos do mês sem envelope
- Detalhe do envelope (drawer): lista de gastos, orçado vs. realizado, ritmo, encerramento
- Recorrência: geração automática de instância a cada novo ciclo, com comparação entre ciclos
- Projetos com sub-envelopes e orçamento total consolidado
- Retrospectiva ao encerrar envelope (resumo do custo total vs. orçado)
- Tipos de evento customizáveis

**Fora do Escopo**

- Vínculo com a aba de Atividades/Projetos do assistente pessoal (integração futura — o modelo de dados já prevê o campo `linkedActivityId` para isso)
- Mover gastos em lote entre envelopes
- Envelopes com receita (envelopes agrupam apenas gastos)
- Rateio de um gasto entre múltiplos envelopes (um gasto pertence a no máximo 1 envelope)
- Metas de economia por envelope (isso é papel dos Planejados)

---

## Jornada

**Jornada principal — evento único**

- Usuário abre Finanças → tab Envelopes e clica em "+ Novo envelope"
- Escolhe tipo "Evento único", dá o nome ("Viagem a Buenos Aires"), seleciona o tipo de evento (Viagem), define orçamento (R$ 4.500) e período (10–17 ago)
- O envelope aparece no grupo "Viagem" da visão macro, com barra 0% e status aberto
- Ao lançar um gasto (+ Lançar), o usuário preenche como sempre (valor, descrição, categoria, data) e agora seleciona o envelope "Viagem a Buenos Aires" no novo campo
- O card do envelope atualiza: realizado, % do orçamento, ritmo ("no ritmo atual, estoura em 2 dias")
- Ao voltar da viagem, o usuário abre o detalhe e clica em "Encerrar envelope"
- O app mostra a retrospectiva: total gasto, diferença vs. orçado, maior gasto, gasto por categoria dentro do envelope
- O envelope vai para o arquivo (histórico consultável — "quanto custou a viagem?" continua respondível para sempre)

**Bifurcação — recorrente**

- Usuário cria "Marmita da semana" como recorrente: orçamento R$ 120, cadência semanal
- A cada segunda-feira o app cria a instância da semana automaticamente; a anterior é encerrada e entra no histórico do template
- O card mostra o ciclo atual + comparação: "esta semana R$ 84 · média das últimas 4: R$ 112 ↓"

**Bifurcação — projeto**

- Usuário cria "Marca de fotografia" como projeto com orçamento total R$ 8.000 e sub-envelopes: Identidade visual (R$ 2.000), Equipamento (R$ 4.500), Marketing (R$ 1.500)
- No modal de lançamento, os sub-envelopes aparecem como "Marca de fotografia › Equipamento"
- O card do projeto consolida: total realizado, barra por sub-envelope

**Bifurcação — avulso**

- Usuário lança um gasto sem selecionar envelope → cai em "Avulsos" na visão macro
- A seção Avulsos mostra o total do mês e o percentual dos gastos sem contexto ("28% dos seus gastos este mês são avulsos")

---

## Design (v2)

### Visão macro (tab Envelopes)

Segue **o mesmo padrão visual da tab Planejamento** (cards de linha expansíveis + coluna de resumo à direita), com dois níveis de drill-down: categoria de envelope → envelopes → detalhe.

- **Barra de resumo (4 KPIs):** Orçado em envelopes abertos · Realizado no mês · Avulsos do mês · "Gastos com contexto" (% dos gastos do mês que têm envelope — o número que mede se a feature está cumprindo o objetivo)
- **Cards de categoria de envelope** (Social, Casal, Viagem, Recorrentes, Projetos, Avulsos), um por linha, no formato do `plan-cat-card`: badge colorido, barra de progresso orçado vs. realizado agregado, contagem de envelopes, "R$ gasto / R$ orçado", chevron de expandir
- **Ao clicar na categoria, expande** a lista de envelopes de dentro (formato `plan-fixed-item`): ícone, nome, meta-linha (período, ritmo ou comparação de ciclo), mini-barra, "gasto / orçado". Recorrentes exibem chip do ciclo atual; projetos exibem a linha do projeto seguida das linhas dos sub-envelopes indentadas
- **Ao clicar no envelope, abre o drawer** de detalhe (ver abaixo)
- **Avulsos** é a última categoria da lista: agregado dos gastos sem envelope, expandindo para os itens com atalho "+ envelope" para atribuição inline
- **Rodapé de categoria expandida:** botão "+ Novo envelope em <tipo>" (dashed, padrão `plan-add-fixed`) e link "ver arquivo (N encerrados)"
- **Coluna direita:** card "Resumo por tipo" (total gasto por categoria no mês + total em envelopes + avulsos) e card "Dicas" (insights de ritmo, encerramento pendente, % de contexto) — mesmo padrão dos cards da direita do Planejamento
- Regras de cor das barras iguais às do app: cor do tipo < 75%, âmbar ≥ 75%, terracota ≥ 100%

### Detalhe do envelope (drawer lateral, padrão do app)

- Header: nome, chip do tipo, período, botões Editar / Encerrar
- Orçado vs. realizado em destaque + projeção de ritmo
- Breakdown por categoria *dentro* do envelope (o cruzamento das duas lentes)
- Lista cronológica dos gastos do envelope
- Recorrente: histórico de ciclos (lista com valor de cada ciclo vs. orçamento)
- Projeto: navegação entre sub-envelopes

### Modal de lançamento (alteração)

- Novo campo "Envelope" (pills, mesmo padrão das pills de categoria), visível apenas para gastos
- Lista apenas envelopes **abertos** cujo período cobre a data do lançamento (recorrentes mostram a instância atual; projetos mostram os sub-envelopes)
- Seleção opcional; clicar de novo desmarca (avulso)

### Modal de novo envelope

- Toggle de 3 tipos (Evento único / Recorrente / Projeto) — o formulário se adapta
- Evento único: nome, tipo de evento (pills + "+ novo tipo"), orçamento, período (início/fim)
- Recorrente: nome, tipo de evento, orçamento por ciclo, cadência (semanal / mensal)
- Projeto: nome, orçamento total, lista editável de sub-envelopes (nome + orçamento)

### Estados

- **Vazio:** ilustração leve + texto "Envelopes dão contexto aos seus gastos" + botão criar + 3 sugestões clicáveis (ex.: "🍱 Marmita da semana", "✈️ Próxima viagem", "🎂 Aniversário")
- **Com dados:** estado principal (protótipo)
- **Encerrado:** cards com opacidade reduzida no arquivo
- **Erro/carregando:** mesmos padrões da view de Finanças atual

---

## Discovery Técnico (v3)

### Banco de dados

**Nova tabela `finance_envelopes`:**

```sql
CREATE TABLE finance_envelopes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('event', 'recurring', 'project', 'sub')),
  event_type   TEXT,              -- 'Social', 'Viagem'... (NULL para project/sub)
  icon         TEXT DEFAULT '✉️',
  color        TEXT DEFAULT 'gray',
  budget       NUMERIC(12,2),     -- por ciclo (recurring), total (project), do evento (event)
  period_start DATE,
  period_end   DATE,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at    TIMESTAMPTZ,
  parent_id    UUID REFERENCES finance_envelopes(id) ON DELETE CASCADE,
    -- sub → projeto pai; instância recorrente → template
  recurrence   TEXT CHECK (recurrence IN ('weekly', 'monthly')),  -- só no template recorrente
  linked_activity_id TEXT,        -- integração futura com Atividades
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

**Alteração em `finance_transactions`:** nova coluna `envelope_id UUID REFERENCES finance_envelopes(id) ON DELETE SET NULL`.

**Tipos de evento customizados:** array em `app_state` (key `envelopeEventTypes`), somando aos 7 padrões hard-coded no frontend.

Atualizar `schema.sql` e o `memoryDb` em `server.js`.

### Modelagem da recorrência

- O **template** é uma linha `kind='recurring'` com `recurrence` preenchido e sem período
- Cada **instância** é uma linha `kind='event'` com `parent_id` apontando para o template e `period_start/end` do ciclo
- Geração da instância acontece **no frontend, de forma lazy**: ao carregar a tab Envelopes, para cada template ativo verifica-se se existe instância cobrindo hoje; se não, cria (fecha a anterior) e chama `saveFinance()`. Sem cron, sem mudança no servidor — consistente com a arquitetura do app

### Backend (`server.js`)

- Estender o payload de `GET/POST /api/finance` com `envelopes: []` (mesmo padrão upsert total das demais coleções finance)
- Novas funções `appEnvelopeToDb()` / `dbEnvelopeToApp()` (camelCase ↔ snake_case)
- `appTransactionToDb()` / `dbTransactionToApp()`: incluir `envelope_id` ↔ `envelopeId`

### Frontend

| Arquivo | O que muda | Impacto |
|---|---|---|
| `public/app.js` | `financeState.envelopes`, tab 'envelopes' em `renderFinanceView()`, `renderFinanceEnvelopes()`, drawer de detalhe, modais (novo envelope, encerrar/retrospectiva), geração lazy de instâncias, pills de envelope no `renderFinTransactionModal()` + `saveFinTransaction()` | Alto |
| `public/index.html` | HTML dos novos modais; campo envelope no modal de transação | Médio |
| `public/styles.css` | Classes `fin-env-*` (cards, grupos, drawer, retrospectiva) seguindo tokens existentes | Médio |
| `server.js` | Mapeamentos + envelopes no load/save de finance | Baixo |

### O que reutilizar

- `saveFinance()` / `loadFinance()` — persistência (nada novo)
- `finGetSummary()` — base dos agregados mensais; criar `finGetEnvelopeSummary(env, month)`
- `finFmt()`, `finFmtDate()`, `finCatBarColor()` — formatação e cores
- Padrão de pills do modal de transação (`.fin-cat-pill`) para o seletor de envelope
- Regras de cor de barra (< 75% cor própria, ≥ 75% âmbar `#C07C30`, ≥ 100% terracota)
- `uid()`, `escapeHtml()`, padrão de event delegation via `data-*` em `renderFinanceView()`

### Riscos e pontos de atenção

- **Payload crescente** do `/api/finance` (upsert total) — aceitável no padrão atual; paginar histórico fica para depois
- **Instâncias recorrentes duplicadas** se duas abas gerarem ao mesmo tempo → checar existência por `parentId + period_start` antes de criar
- **Excluir envelope com gastos** → gastos viram avulsos (`ON DELETE SET NULL`); confirmar com o usuário mostrando a contagem
- **Gasto com data fora do período do envelope** → permitir, mas exibir aviso sutil no detalhe (viagens têm gastos antecipados)

---

## Insights que a feature habilita (diferenciais)

1. **Ritmo do envelope** — "No ritmo atual, 'Viagem a Buenos Aires' estoura o orçamento 2 dias antes do fim"
2. **Comparação de ciclos** — "Marmita desta semana está 25% abaixo da média do mês"
3. **Medidor de contexto** — "72% dos seus gastos deste mês têm envelope" (gamifica dar significado ao dinheiro)
4. **Retrospectiva de encerramento** — memória afetiva + financeira: "Aniversário da Bia custou R$ 630, 5% abaixo do planejado. Maior gasto: bolo (R$ 180)"
5. **Cruzamento das lentes** — dentro do envelope, ver o gasto por categoria ("na viagem, 40% foi alimentação")

Esses insights também alimentam o painel de Insights da Visão Geral (adicionar 1–2 regras em `finGetInsights()` numa segunda iteração).

---

## Tasks de implementação

### 🗄️ Banco de dados
- [ ] `db-01` Criar tabela `finance_envelopes` no Supabase + `schema.sql`
- [ ] `db-02` Adicionar coluna `envelope_id` em `finance_transactions` + `schema.sql`

### ⚙️ Backend
- [ ] `be-01` Mapeamentos `appEnvelopeToDb`/`dbEnvelopeToApp` + envelopes em `loadFinance`/`saveFinance` (server)
- [ ] `be-02` `envelopeId` no mapeamento de transactions + `memoryDb`

### 🎨 Frontend — estrutura
- [ ] `fe-01` Tab "Envelopes" + `renderFinanceEnvelopes()` (grupos, cards, avulsos, KPIs)
- [ ] `fe-02` Estilos `fin-env-*` em `styles.css`
- [ ] `fe-03` Modal novo envelope (3 tipos) em `index.html` + lógica
- [ ] `fe-04` Campo envelope no modal de lançamento (pills) + persistência

### ⚡ Frontend — lógica
- [ ] `fe-05` Drawer de detalhe do envelope (gastos, breakdown por categoria, ritmo)
- [ ] `fe-06` Encerramento + retrospectiva + arquivo
- [ ] `fe-07` Recorrência lazy (gerar/fechar instâncias) + comparação de ciclos
- [ ] `fe-08` Projetos: sub-envelopes no modal, consolidação no card, navegação no drawer
- [ ] `fe-09` Atribuir envelope a gasto avulso direto da seção Avulsos

### ✅ Critérios de conclusão
- [ ] As três jornadas (evento, recorrente, projeto) funcionam de ponta a ponta
- [ ] Gasto sem envelope aparece em Avulsos; com envelope, no card certo
- [ ] Instância recorrente é criada automaticamente na virada do ciclo, sem duplicar
- [ ] Encerrar envelope mostra retrospectiva e move para o arquivo
- [ ] Nenhuma funcionalidade existente de Finanças quebrou; dados persistem após reload
