# Feature: Visão Financeira

Protótipo de referência: `prototype.dc.html` (mesma pasta)

---

## O que a feature faz

Adiciona uma aba "Finanças" ao sidebar do app com três sub-views:

- **Visão geral** — KPI cards (receita, gastos, saldo, projeção), breakdown por categoria com barras de progresso vs. limite, gráfico histórico mensal e painel de insights automáticos.
- **Lançamentos** — lista cronológica de todas as transações do mês selecionado, com filtros por tipo e categoria.
- **Planejados** — lista de compras planejadas com prioridade, valor alvo, progresso de economia e estimativa de meses.

---

## 1. Banco de dados

### Três novas tabelas no Supabase

#### `finance_categories`
Categorias de gasto. Vem com 6 padrões; o usuário pode criar novas.

```sql
CREATE TABLE finance_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    NOT NULL,
  icon        TEXT    NOT NULL DEFAULT '📦',
  color       TEXT    NOT NULL DEFAULT 'gray',
    -- valores aceitos: 'blue' | 'green' | 'amber' | 'teal' | 'red' | 'gray' | 'purple'
  monthly_limit NUMERIC(12,2) DEFAULT NULL,
    -- NULL = sem limite definido
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Categorias padrão (executar uma vez no Supabase)
INSERT INTO finance_categories (name, icon, color, sort_order) VALUES
  ('Moradia',       '🏠', 'blue',   0),
  ('Alimentação',   '🍽', 'green',  1),
  ('Transporte',    '🚗', 'amber',  2),
  ('Saúde',         '💊', 'teal',   3),
  ('Lazer',         '🎮', 'red',    4),
  ('Outros',        '📦', 'gray',   5);
```

#### `finance_transactions`
Cada lançamento financeiro (gasto ou receita).

```sql
CREATE TABLE finance_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description   TEXT        NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    -- sempre positivo; o tipo (expense/income) define o sinal na UI
  type          TEXT        NOT NULL CHECK (type IN ('expense', 'income')),
  category_id   UUID        REFERENCES finance_categories(id) ON DELETE SET NULL,
    -- NULL quando type = 'income' (receita não tem categoria de gasto)
  date          DATE        NOT NULL,
  nature        TEXT        NOT NULL DEFAULT 'variable'
                  CHECK (nature IN ('fixed', 'variable')),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_finance_transactions_date ON finance_transactions(date);
```

#### `finance_planned_purchases`
Itens da lista de compras planejadas.

```sql
CREATE TABLE finance_planned_purchases (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT          NOT NULL,
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  saved_amount   NUMERIC(12,2) NOT NULL DEFAULT 0,
  priority       TEXT          NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('high', 'medium', 'low')),
  category_label TEXT,
    -- texto livre: 'Eletrônicos', 'Viagem', 'Casa', etc.
  description    TEXT,
  target_date    DATE,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### schema.sql — o que adicionar

Estas três tabelas precisam ser adicionadas ao `schema.sql` existente para documentar a estrutura.

---

## 2. Backend (`server.js`)

### Padrão adotado

Dois novos endpoints independentes — mesma filosofia do `/api/tasks`, mas separada para finance:

```
GET  /api/finance        → carrega todo o estado financeiro
POST /api/finance        → salva todo o estado financeiro (upsert total)
```

O frontend mantém em memória o estado financeiro completo (`financeState`) e chama `POST /api/finance` sempre que algo muda, assim como já faz com `save()` para tarefas.

> **Por que separado de `/api/tasks`?**
> Finance data cresce ao longo do tempo e não precisa ser carregado junto com boards/tarefas em toda navegação. Manter separado evita payload gigante e facilita paginar o histórico no futuro sem mexer no contrato existente.

### Estrutura do payload

**GET /api/finance** responde:
```json
{
  "categories": [ { "id": "...", "name": "Moradia", "icon": "🏠", "color": "blue", "monthlyLimit": 2200, "sortOrder": 0 } ],
  "transactions": [ { "id": "...", "description": "Aluguel", "amount": 2200, "type": "expense", "categoryId": "...", "date": "2026-07-10", "nature": "fixed" } ],
  "plannedPurchases": [ { "id": "...", "name": "MacBook", "targetAmount": 12800, "savedAmount": 0, "priority": "high", "categoryLabel": "Eletrônicos", "description": "...", "targetDate": null } ]
}
```

**POST /api/finance** recebe o mesmo shape e executa upsert+delete (igual ao padrão tasks).

### Código a adicionar em `server.js`

#### Funções de mapeamento (app camelCase ↔ banco snake_case)

```js
function appCategoryToDb(c) {
  return {
    id:            c.id,
    name:          c.name,
    icon:          c.icon          || '📦',
    color:         c.color         || 'gray',
    monthly_limit: c.monthlyLimit  ?? null,
    sort_order:    c.sortOrder     ?? 0,
  };
}

function dbCategoryToApp(c) {
  return {
    id:           c.id,
    name:         c.name,
    icon:         c.icon,
    color:        c.color,
    monthlyLimit: c.monthly_limit  ?? null,
    sortOrder:    c.sort_order     ?? 0,
  };
}

function appTransactionToDb(t) {
  return {
    id:          t.id,
    description: t.description,
    amount:      t.amount,
    type:        t.type,
    category_id: t.categoryId ?? null,
    date:        t.date,
    nature:      t.nature || 'variable',
  };
}

function dbTransactionToApp(t) {
  return {
    id:          t.id,
    description: t.description,
    amount:      Number(t.amount),
    type:        t.type,
    categoryId:  t.category_id ?? null,
    date:        t.date,
    nature:      t.nature,
    createdAt:   t.created_at ?? null,
  };
}

function appPurchaseToDb(p) {
  return {
    id:             p.id,
    name:           p.name,
    target_amount:  p.targetAmount,
    saved_amount:   p.savedAmount  ?? 0,
    priority:       p.priority     || 'medium',
    category_label: p.categoryLabel ?? null,
    description:    p.description  ?? null,
    target_date:    p.targetDate   ?? null,
    sort_order:     p.sortOrder    ?? 0,
  };
}

function dbPurchaseToApp(p) {
  return {
    id:            p.id,
    name:          p.name,
    targetAmount:  Number(p.target_amount),
    savedAmount:   Number(p.saved_amount),
    priority:      p.priority,
    categoryLabel: p.category_label ?? null,
    description:   p.description    ?? null,
    targetDate:    p.target_date     ?? null,
    sortOrder:     p.sort_order      ?? 0,
    createdAt:     p.created_at      ?? null,
  };
}
```

#### Funções loadFinance / saveFinance

```js
async function loadFinance() {
  const [
    { data: categories, error: e1 },
    { data: transactions, error: e2 },
    { data: purchases, error: e3 },
  ] = await Promise.all([
    supabase.from('finance_categories').select('*'),
    supabase.from('finance_transactions').select('*'),
    supabase.from('finance_planned_purchases').select('*'),
  ]);
  if (e1 || e2 || e3) throw new Error([e1, e2, e3].filter(Boolean).map(e => e.message).join('; '));
  return {
    categories:      (categories || []).map(dbCategoryToApp),
    transactions:    (transactions || []).map(dbTransactionToApp),
    plannedPurchases:(purchases || []).map(dbPurchaseToApp),
  };
}

async function saveFinance(state) {
  const { categories = [], transactions = [], plannedPurchases = [] } = state;

  // Upsert categories
  if (categories.length > 0) {
    const { error } = await supabase.from('finance_categories')
      .upsert(categories.map(appCategoryToDb), { onConflict: 'id' });
    if (error) throw error;
  }
  const catIds = categories.map(c => c.id);
  if (catIds.length > 0) {
    const { error } = await supabase.from('finance_categories')
      .delete().not('id', 'in', `(${catIds.join(',')})`);
    if (error) throw error;
  }

  // Upsert transactions
  if (transactions.length > 0) {
    const { error } = await supabase.from('finance_transactions')
      .upsert(transactions.map(appTransactionToDb), { onConflict: 'id' });
    if (error) throw error;
  }
  const txnIds = transactions.map(t => t.id);
  if (txnIds.length > 0) {
    const { error } = await supabase.from('finance_transactions')
      .delete().not('id', 'in', `(${txnIds.join(',')})`);
    if (error) throw error;
  }

  // Upsert planned purchases
  if (plannedPurchases.length > 0) {
    const { error } = await supabase.from('finance_planned_purchases')
      .upsert(plannedPurchases.map(appPurchaseToDb), { onConflict: 'id' });
    if (error) throw error;
  }
  const purchaseIds = plannedPurchases.map(p => p.id);
  if (purchaseIds.length > 0) {
    const { error } = await supabase.from('finance_planned_purchases')
      .delete().not('id', 'in', `(${purchaseIds.join(',')})`);
    if (error) throw error;
  }
}
```

#### Rotas a adicionar no servidor HTTP

```js
// Adicionar ANTES do bloco de arquivos estáticos:

if (req.method === 'GET' && req.url === '/api/finance') {
  try {
    const state = await loadFinance();
    send(res, 200, state);
  } catch (err) {
    console.error('GET /api/finance error:', err.message);
    send(res, 500, { error: err.message });
  }
  return;
}

if (req.method === 'POST' && req.url === '/api/finance') {
  try {
    const body = await parseBody(req);
    await saveFinance(body);
    send(res, 200, { ok: true });
  } catch (err) {
    console.error('POST /api/finance error:', err.message);
    send(res, 500, { error: err.message });
  }
  return;
}
```

#### memoryDb — adicionar tabelas ao fallback local

```js
// Linha 20 de server.js — adicionar as 3 novas tabelas:
const memoryDb = {
  boards: [], tasks: [], calendar_events: [], people: [], app_state: [], activities: [],
  finance_categories: [], finance_transactions: [], finance_planned_purchases: [],
};
```

---

## 3. Frontend

### 3.1 `public/app.js` — estado global

Adicionar junto aos outros `let` globais do topo:

```js
// ── Finance state ──────────────────────────────────────────────
let financeState = {
  categories:      [],   // { id, name, icon, color, monthlyLimit, sortOrder }
  transactions:    [],   // { id, description, amount, type, categoryId, date, nature, createdAt }
  plannedPurchases:[],   // { id, name, targetAmount, savedAmount, priority, categoryLabel, description, targetDate }
};
let financeMonth = null; // Date obj: primeiro dia do mês exibido, ex.: new Date(2026, 6, 1)
let financeTab   = 'geral'; // 'geral' | 'lancamentos' | 'planejados'
```

### 3.2 `public/app.js` — funções a implementar

#### Carregamento e persistência

```js
async function loadFinance() {
  const res = await fetch('/api/finance');
  const data = await res.json();
  financeState.categories       = data.categories       || [];
  financeState.transactions     = data.transactions     || [];
  financeState.plannedPurchases = data.plannedPurchases || [];
  // Garantir categorias padrão se banco vier vazio (primeira vez)
  if (financeState.categories.length === 0) initDefaultCategories();
}

async function saveFinance() {
  await fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(financeState),
  });
}

function initDefaultCategories() {
  const defaults = [
    { name: 'Moradia',     icon: '🏠', color: 'blue',  monthlyLimit: null },
    { name: 'Alimentação', icon: '🍽', color: 'green', monthlyLimit: null },
    { name: 'Transporte',  icon: '🚗', color: 'amber', monthlyLimit: null },
    { name: 'Saúde',       icon: '💊', color: 'teal',  monthlyLimit: null },
    { name: 'Lazer',       icon: '🎮', color: 'red',   monthlyLimit: null },
    { name: 'Outros',      icon: '📦', color: 'gray',  monthlyLimit: null },
  ];
  financeState.categories = defaults.map((d, i) => ({
    id: crypto.randomUUID(), sortOrder: i, ...d,
  }));
}
```

#### CRUD de transações

```js
function addTransaction({ description, amount, type, categoryId, date, nature }) {
  financeState.transactions.push({
    id: crypto.randomUUID(),
    description, amount: Number(amount), type, categoryId: categoryId ?? null,
    date, nature, createdAt: new Date().toISOString(),
  });
  saveFinance();
  renderFinanceView();
}

function deleteTransaction(id) {
  financeState.transactions = financeState.transactions.filter(t => t.id !== id);
  saveFinance();
  renderFinanceView();
}
```

#### Cálculos do dashboard (sem library, tudo vanilla JS)

```js
function getFinanceSummary(month /* Date */) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const dayOfMonth = (y === today.getFullYear() && m === today.getMonth())
    ? today.getDate()
    : daysInMonth; // mês passado: considera completo

  const monthTxns = financeState.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const totalIncome  = monthTxns.filter(t => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxns.filter(t => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  // Separar gastos fixos (já ocorreram por inteiro) e variáveis (projetar pelo ritmo)
  const fixedExpense    = monthTxns.filter(t => t.type === 'expense' && t.nature === 'fixed')
    .reduce((s, t) => s + t.amount, 0);
  const variableExpense = monthTxns.filter(t => t.type === 'expense' && t.nature === 'variable')
    .reduce((s, t) => s + t.amount, 0);
  const dailyRate       = dayOfMonth > 0 ? variableExpense / dayOfMonth : 0;
  const projectedExpense = fixedExpense + dailyRate * daysInMonth;

  // Por categoria
  const byCat = {};
  for (const t of monthTxns.filter(t => t.type === 'expense')) {
    byCat[t.categoryId] = (byCat[t.categoryId] || 0) + t.amount;
  }

  return {
    totalIncome, totalExpense, balance: totalIncome - totalExpense,
    projectedExpense, projectedSavings: totalIncome - projectedExpense,
    dayOfMonth, daysInMonth, dailyRate,
    byCat,    // { [categoryId]: amount }
    monthTxns,
  };
}

function getInsights(summary, categories) {
  const insights = [];
  const { totalIncome, totalExpense, projectedSavings, projectedExpense, byCat, daysInMonth, dayOfMonth } = summary;

  // 1. Vai fechar no azul?
  if (projectedSavings > 0) {
    const pct = Math.round((projectedSavings / totalIncome) * 100);
    insights.push({ type: 'ok', text: `No ritmo atual você fecha o mês com <strong>R$ ${fmt(projectedSavings)} de economia</strong> (${pct}% da receita).` });
  } else {
    insights.push({ type: 'alert', text: `Atenção: no ritmo atual você vai <strong>gastar mais do que recebe</strong> este mês.` });
  }

  // 2. Categorias próximas do limite
  for (const cat of categories) {
    if (!cat.monthlyLimit) continue;
    const spent = byCat[cat.id] || 0;
    const pct   = spent / cat.monthlyLimit;
    const remaining = daysInMonth - dayOfMonth;
    if (pct >= 1) {
      insights.push({ type: 'alert', text: `<strong>${cat.icon} ${cat.name}</strong> atingiu 100% do limite este mês.` });
    } else if (pct >= 0.75 && remaining > 5) {
      insights.push({ type: 'warn', text: `<strong>${cat.icon} ${cat.name}</strong> está em ${Math.round(pct * 100)}% do limite com ${remaining} dias restantes.` });
    }
  }

  // 3. Ritmo diário
  const { dailyRate } = summary;
  if (dailyRate > 0) {
    insights.push({ type: 'info', text: `Você está gastando em média <strong>R$ ${fmt(dailyRate)}/dia</strong> em gastos variáveis.` });
  }

  return insights.slice(0, 4); // máximo 4 insights
}

function fmt(n) {
  return Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
```

#### Renderização das views

```js
function renderFinanceView() {
  if (currentView !== 'finance') return;
  renderFinanceTopbar();
  if (financeTab === 'geral')        renderFinanceGeral();
  if (financeTab === 'lancamentos')  renderFinanceLancamentos();
  if (financeTab === 'planejados')   renderFinancePlanejados();
}

// Cada renderX() manipula o DOM diretamente (innerHTML ou createElement),
// seguindo o padrão já usado em renderBoard(), renderCalendar(), etc.
```

### 3.3 `public/index.html` — o que adicionar

#### Sidebar — novo item Finanças (dentro de `<nav class="sidebar-nav">`)

```html
<div class="sidebar-separator"></div>
<button type="button" id="sidebarFinanceItem" class="sidebar-finance-item">
  <span class="icon-finance-wrap">
    <!-- ícone de cifrão/moeda (SVG inline igual ao padrão do calendário) -->
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6.25" stroke="currentColor" stroke-width="1.5"/>
      <path d="M7 3.5v7" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
      <path d="M5.2 9.2c0 .77.81 1.3 1.8 1.3s1.8-.53 1.8-1.3c0-.76-.81-1.3-1.8-1.3s-1.8-.53-1.8-1.3c0-.76.81-1.3 1.8-1.3s1.8.54 1.8 1.3"
            stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
  </span>
  <span class="sidebar-finance-label">Finanças</span>
</button>
```

#### Topbar — controles de finanças (dentro de `.nav`)

```html
<div class="nav-finance hidden" id="navFinanceControls">
  <button id="financePrevMonth">‹</button>
  <span id="financeMonthLabel"></span>
  <button id="financeNextMonth">›</button>
</div>
```

#### Botão lançar na topbar (junto ao export-report-btn)

```html
<button type="button" id="financeLancarBtn" class="btn-brand-sm hidden">+ Lançar</button>
```

#### Main — view financeira (junto a `#board`, `#calendarView`, `#activitiesView`)

```html
<main id="financeView" class="finance-view hidden">
  <!-- Tabs -->
  <div class="finance-tabs">
    <button class="finance-tab" data-tab="geral">Visão geral</button>
    <button class="finance-tab" data-tab="lancamentos">Lançamentos</button>
    <button class="finance-tab" data-tab="planejados">Planejados</button>
  </div>

  <!-- Tab: Visão Geral -->
  <div class="finance-tab-view" id="finTabGeral">
    <div class="fin-kpi-grid" id="finKpiGrid"></div>
    <div class="fin-body" id="finBody"></div>
  </div>

  <!-- Tab: Lançamentos -->
  <div class="finance-tab-view hidden" id="finTabLancamentos">
    <div id="finTxnHeader"></div>
    <div id="finTxnList"></div>
  </div>

  <!-- Tab: Planejados -->
  <div class="finance-tab-view hidden" id="finTabPlanejados">
    <div id="finPlanejadosHeader"></div>
    <div id="finPlanejadosGrid"></div>
  </div>
</main>
```

#### Modal de lançamento (dentro do `<body>`, junto aos outros modais)

```html
<div id="financeModalOverlay" class="modal-overlay hidden">
  <div class="modal finance-modal">
    <button id="closeFinanceModal" class="close-btn">&times;</button>
    <h2>Novo lançamento</h2>

    <!-- Tipo: Gasto / Receita -->
    <div id="finTypeToggle" class="fin-type-toggle">
      <button class="fin-type-btn active" data-type="expense">− Gasto</button>
      <button class="fin-type-btn"        data-type="income">+ Receita</button>
    </div>

    <label>Valor <input type="text" id="finAmount" placeholder="R$ 0,00"></label>
    <label>Descrição <input type="text" id="finDesc" placeholder="Ex.: Supermercado, Aluguel..."></label>

    <!-- Categoria: pills dinâmicas renderizadas via JS a partir de financeState.categories -->
    <label>Categoria</label>
    <div id="finCatPills" class="fin-cat-pills"></div>

    <label>Data <input type="date" id="finDate"></label>

    <!-- Natureza: Variável / Fixo -->
    <div id="finNatureToggle" class="fin-nature-toggle">
      <button class="fin-nature-btn" data-nature="variable">Variável</button>
      <button class="fin-nature-btn active" data-nature="fixed">Fixo (mensal)</button>
    </div>

    <div class="modal-footer">
      <button type="button" id="finCancelBtn" class="btn-neutral">Cancelar</button>
      <button type="button" id="finSaveBtn"   class="btn-primary">Salvar lançamento</button>
    </div>
  </div>
</div>
```

### 3.4 `public/styles.css` — o que adicionar

Novos seletores necessários (baseados exatamente no protótipo):

| Bloco | Seletores |
|---|---|
| Sidebar | `.sidebar-finance-item`, `.icon-finance-wrap` |
| Finance view | `.finance-view`, `.finance-tabs`, `.finance-tab`, `.finance-tab-view` |
| KPI grid | `.fin-kpi-grid`, `.fin-kpi-card`, `.fin-kpi-label`, `.fin-kpi-value`, `.fin-kpi-sub`, `.fin-kpi-bar` |
| Body layout | `.fin-body`, `.fin-col`, `.fin-section` (card branco com shadow) |
| Categorias | `.fin-cat-row`, `.fin-cat-badge`, `.fin-cat-bar-wrap`, `.fin-cat-bar` |
| Cores de categoria | `.fin-c-blue`, `.fin-c-green`, `.fin-c-amber`, `.fin-c-teal`, `.fin-c-red`, `.fin-c-gray` |
| Histórico | `.fin-hist-wrap`, `.fin-hist-bar`, `.fin-hist-lbl` |
| Insights | `.fin-insight-item`, `.fin-insight-icon`, `.fin-insight-ok/.warn/.info/.alert` |
| Transações | `.fin-txn-item`, `.fin-txn-full`, `.fin-txn-date-label`, `.fin-txn-amt.out/.in` |
| Planejados | `.fin-plan-grid`, `.fin-plan-card`, `.fin-priority-high/.mid/.low` |
| Modal | `.finance-modal`, `.fin-type-toggle`, `.fin-type-btn`, `.fin-cat-pills`, `.fin-nature-toggle`, `.fin-nature-btn` |
| Tags/pills | `.fin-tag`, `.fin-tag-green/.red/.blue/.gray/.amber` |

O estilo completo deve replicar fielmente o protótipo — mesma paleta, mesmos border-radius (16px cards, 10px botões, 20px pills), mesma tipografia Sora.

### 3.5 `public/app.js` — integração com navegação existente

#### showView() — estender para 'finance'

```js
// A função showView() já gerencia board/calendar/activities.
// Adicionar o caso 'finance':

function showView(view) {
  currentView = view;
  document.getElementById('board').classList.toggle('hidden', view !== 'board');
  document.getElementById('calendarView').classList.toggle('hidden', view !== 'calendar');
  document.getElementById('activitiesView').classList.toggle('hidden', view !== 'activities');
  document.getElementById('financeView').classList.toggle('hidden', view !== 'finance');    // NOVO

  // topbar controls
  document.getElementById('navBoardControls').classList.toggle('hidden', view !== 'board');
  document.getElementById('navCalendarControls').classList.toggle('hidden', view !== 'calendar');
  document.getElementById('navActivitiesControls').classList.toggle('hidden', view !== 'activities');
  document.getElementById('navFinanceControls').classList.toggle('hidden', view !== 'finance'); // NOVO
  document.getElementById('financeLancarBtn').classList.toggle('hidden', view !== 'finance');   // NOVO

  // active state no sidebar
  document.getElementById('sidebarFinanceItem').classList.toggle('active', view === 'finance'); // NOVO
  // ... (manter lógica existente para calendar e activities)

  if (view === 'finance') renderFinanceView(); // NOVO
}
```

#### Carregamento inicial — loadFinance junto com load()

```js
async function init() {
  await Promise.all([load(), loadFinance()]); // carregar em paralelo
  // ... resto da inicialização existente
}
```

---

## 4. Ordem de implementação

### Fase 1 — Fundação (banco + backend)
1. Adicionar as 3 tabelas no Supabase (rodar SQL acima no painel).
2. Inserir as categorias padrão.
3. Adicionar as tabelas ao `memoryDb` em `server.js`.
4. Adicionar funções de mapeamento e `loadFinance`/`saveFinance` em `server.js`.
5. Adicionar as duas rotas GET/POST `/api/finance`.
6. Atualizar `schema.sql` com as novas tabelas.

### Fase 2 — Esqueleto frontend
7. Adicionar variáveis globais de estado de finanças em `app.js`.
8. Implementar `loadFinance()`, `saveFinance()`, `initDefaultCategories()` em `app.js`.
9. Adicionar `#financeView` no `index.html` (estrutura de tabs e containers vazios).
10. Adicionar o item "Finanças" no sidebar (HTML + listener).
11. Estender `showView()` para aceitar `'finance'`.
12. Chamar `loadFinance()` no `init()`.

### Fase 3 — Dashboard (Visão Geral)
13. Implementar `getFinanceSummary()` e `getInsights()`.
14. Implementar `renderFinanceGeral()` — KPI cards, categorias, histórico, insights, últimos lançamentos.
15. Adicionar estilos CSS para KPI grid, category bars, hist chart, insights.

### Fase 4 — Modal de lançamento
16. Adicionar HTML do modal em `index.html`.
17. Implementar `openFinanceModal()`, `closeFinanceModal()`, `addTransaction()`.
18. Renderizar pills de categoria dinamicamente a partir de `financeState.categories`.
19. Adicionar botão "Lançar" na topbar, ligado ao modal.
20. Adicionar estilos CSS do modal.

### Fase 5 — Tab Lançamentos
21. Implementar `renderFinanceLancamentos()` — lista cronológica agrupada por data com filtros.
22. Adicionar lógica de filtro por tipo/categoria (in-memory, sem chamada ao servidor).

### Fase 6 — Tab Planejados
23. Implementar `renderFinancePlanejados()` — grid de cards de compras planejadas.
24. Implementar CRUD de compras planejadas (add/edit/delete).

### Fase 7 — Refinamentos
25. Navegação de mês na topbar (prevMonth/nextMonth).
26. Histórico mensal no chart (últimos 6 meses — calcular a partir de `financeState.transactions`).
27. Limites por categoria editáveis (modal de configurações de categoria).
28. Testes manuais completos contra Supabase real.

---

## 5. Decisões técnicas

| Decisão | Escolha | Motivo |
|---|---|---|
| Rotas | Separadas `/api/finance` | Evita payload gigante em `/api/tasks`; permite evolução independente |
| Padrão de persistência | Upsert total (igual ao existente) | Consistente com o resto do código; simples de implementar |
| Cálculos | Frontend (JS vanilla) | Sem dependências extras; projeção e insights são suficientemente simples |
| Gráfico de histórico | SVG/DOM manual (barras) | Sem biblioteca; idêntico ao protótipo |
| IDs | `crypto.randomUUID()` | Já usado no frontend pelo padrão atual |
| Categorias | Padrão + customizáveis | 6 pré-definidas no banco; usuário pode criar novas |
| Receitas sem categoria | `categoryId: null` | Receita não se enquadra em categoria de gasto; simplifica os cálculos |
