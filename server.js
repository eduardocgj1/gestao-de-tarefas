require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

// ── Fallback de DEV local sem credenciais do Supabase ────────
// Só para desenvolvimento local sem .env configurado. Em produção (Render) as variáveis
// SUPABASE_URL/SUPABASE_KEY sempre existem. Implementa o mínimo da API encadeável do
// @supabase/supabase-js usada neste arquivo, com armazenamento em memória (dados NÃO
// persistem entre reinícios).
const memoryDb = {
  boards: [], tasks: [], calendar_events: [], people: [], app_state: [], activities: [],
  finance_categories: [], finance_wallets: [], finance_transactions: [],
  finance_planned_purchases: [], finance_budget_items: [], finance_envelopes: [],
};

function makeMemorySupabaseClient() {
  const matchesFilters = (row, filters) => filters.every(filter => {
    switch (filter.type) {
      case 'eq':
        return row[filter.column] === filter.value;
      case 'like': {
        const pattern = String(filter.pattern || '');
        const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*');
        const regex = new RegExp(`^${escaped}$`, 'i');
        return regex.test(String(row[filter.column] ?? ''));
      }
      case 'is':
        return row[filter.column] === filter.value;
      default:
        return true;
    }
  });

  return {
    from(table) {
      if (!memoryDb[table]) memoryDb[table] = [];
      const filters = [];
      return {
        select(_cols) {
          const data = memoryDb[table]
            .map(row => ({ ...row }))
            .filter(row => matchesFilters(row, filters));
          const builder = {
            eq(column, value) { filters.push({ type: 'eq', column, value }); return this; },
            like(column, pattern) { filters.push({ type: 'like', column, pattern }); return this; },
            is(column, value) { filters.push({ type: 'is', column, value }); return this; },
            not() { return this; },
            then(resolve, reject) {
              return Promise.resolve({ data, error: null }).then(resolve, reject);
            },
            catch(reject) {
              return Promise.resolve({ data, error: null }).catch(reject);
            },
          };
          return builder;
        },
        upsert(payload, opts = {}) {
          const conflictKey = opts.onConflict || 'id';
          const items = Array.isArray(payload) ? payload : [payload];
          items.forEach(item => {
            const rows = memoryDb[table];
            const idx = rows.findIndex(r => r[conflictKey] === item[conflictKey]);
            if (idx >= 0) rows[idx] = { ...item };
            else rows.push({ ...item });
          });
          return Promise.resolve({ error: null });
        },
        update(updates) {
          const filtered = memoryDb[table].filter(row => matchesFilters(row, filters));
          memoryDb[table] = memoryDb[table].map(row => {
            if (!filtered.includes(row)) return row;
            return { ...row, ...updates };
          });
          return {
            is(column, value) { filters.push({ type: 'is', column, value }); return Promise.resolve({ error: null }); },
            eq(column, value) { filters.push({ type: 'eq', column, value }); return Promise.resolve({ error: null }); },
            filter() { return Promise.resolve({ error: null }); },
          };
        },
        delete() {
          const builder = {
            eq(column, value) { filters.push({ type: 'eq', column, value }); return this; },
            not(column, op, pattern) {
              if (op === 'is') {
                memoryDb[table] = memoryDb[table].filter(row => !matchesFilters(row, filters));
                return Promise.resolve({ error: null });
              }
              const inner = String(pattern).replace(/^\(|\)$/g, '');
              const allowed = new Set(inner.split(',').filter(Boolean));
              memoryDb[table] = memoryDb[table].filter(r => !allowed.has(String(r[column])) && matchesFilters(r, filters));
              return Promise.resolve({ error: null });
            },
          };
          return builder;
        },
      };
    },
  };
}

const useMemoryFallback = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
if (useMemoryFallback) {
  console.warn('[dev] SUPABASE_URL/SUPABASE_KEY ausentes — usando armazenamento em memória (SOMENTE para desenvolvimento local). Os dados NÃO persistem entre reinícios do servidor.');
}

const supabase = useMemoryFallback
  ? makeMemorySupabaseClient()
  : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── Helpers ─────────────────────────────────────────────────
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => (raw += chunk));
    req.on('end', () => {
      try { resolve(JSON.parse(raw)); } catch (e) { reject(e); }
    });
  });
}

// ── Autenticação ─────────────────────────────────────────────
// Em dev mode (sem Supabase), retorna 'dev-user' sem validar token.
// Em produção, valida o JWT emitido pelo Supabase Auth e retorna o user.id.
async function authenticate(req, res) {
  if (useMemoryFallback) return 'dev-user';

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    send(res, 401, { error: 'Não autenticado' });
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    send(res, 401, { error: 'Token inválido ou expirado' });
    return null;
  }

  return user.id;
}

// ── Leitura: monta o estado completo a partir do Supabase ───
async function loadState(userId) {
  const [
    { data: boards,     error: e1 },
    { data: tasks,      error: e2 },
    { data: events,     error: e3 },
    { data: people,     error: e4 },
    { data: state,      error: e5 },
    { data: activities, error: e6 },
  ] = await Promise.all([
    supabase.from('boards').select('*').eq('user_id', userId),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('calendar_events').select('*').eq('user_id', userId),
    supabase.from('people').select('*').eq('user_id', userId),
    supabase.from('app_state').select('*').like('key', `${userId}:%`),
    supabase.from('activities').select('*').eq('user_id', userId),
  ]);

  if (e1 || e2 || e3 || e4 || e5 || e6) {
    throw new Error([e1, e2, e3, e4, e5, e6].filter(Boolean).map(e => e.message).join('; '));
  }

  // Indexar estado global — strip do prefixo userId: das chaves
  const appState = Object.fromEntries(
    (state || []).map(r => [r.key.replace(`${userId}:`, ''), r.value])
  );

  // Separar tasks por board e por atividade
  const tasksByBoard = {};
  const tasksByActivity = {};
  for (const t of tasks || []) {
    const mapped = dbTaskToApp(t);
    if (t.board_id && !t.activity_id) {
      if (!tasksByBoard[t.board_id]) tasksByBoard[t.board_id] = [];
      tasksByBoard[t.board_id].push(mapped);
    }
    if (t.activity_id) {
      if (!tasksByActivity[t.activity_id]) tasksByActivity[t.activity_id] = [];
      tasksByActivity[t.activity_id].push(mapped);
    }
  }

  const mappedActivities = (activities || []).map(a => {
    const app = dbActivityToApp(a);
    app.checklistTasks = tasksByActivity[a.id] || [];
    return app;
  });

  return {
    boards: (boards || []).map(b => ({
      id: b.id,
      name: b.name,
      color: b.color,
      fields: b.fields,
      tasks: tasksByBoard[b.id] || [],
    })),
    activeBoardId:     appState.activeBoardId    ?? null,
    pomodoroSettings:  appState.pomodoroSettings ?? { focus: 25, short: 5, long: 15 },
    pomodoro:          appState.pomodoro         ?? { mode: 'focus', remaining: 25 * 60, running: false, cycle: 0, updatedAt: Date.now() },
    calendarEvents:    (events || []).map(dbEventToApp),
    people:            people || [],
    exportViews:       appState.exportViews      ?? {},
    activities:        mappedActivities,
  };
}

// ── Escrita: sincroniza estado completo no Supabase ─────────
async function saveState(state, userId) {
  const { boards = [], activities = [], calendarEvents = [], people = [], activeBoardId,
          pomodoroSettings, pomodoro, exportViews = {} } = state;

  // 1. Upsert boards
  if (boards.length > 0) {
    const { error } = await supabase.from('boards').upsert(
      boards.map(b => ({ id: b.id, name: b.name, color: b.color || null, fields: b.fields || [], user_id: userId })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 2. Deletar boards removidos
  const boardIds = boards.map(b => b.id);
  if (boardIds.length > 0) {
    const { error } = await supabase.from('boards').delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${boardIds.join(',')})`);
    if (error) throw error;
  }

  // 2.5. Upsert activities (antes das tasks — FK)
  if (activities.length > 0) {
    const { error } = await supabase.from('activities').upsert(
      activities.map(a => ({ ...appActivityToDb(a), user_id: userId })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 3. Upsert tasks
  const boardTasks = boards.flatMap(b =>
    (b.tasks || [])
      .filter(t => !t.activityId)
      .map(t => ({ ...appTaskToDb(t, b.id), user_id: userId }))
  );
  const allChecklistTasks = activities.flatMap(a =>
    (a.checklistTasks || []).map(t => ({ ...appTaskToDb(t, t.boardId || null, a.id), user_id: userId }))
  );
  const allTasks = [...boardTasks, ...allChecklistTasks];
  if (allTasks.length > 0) {
    const { error } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (error) throw error;
  }

  // 4. Deletar tasks removidas
  const taskIds = allTasks.map(t => t.id);
  if ((boards.length > 0 || activities.length > 0) && taskIds.length > 0) {
    const { error } = await supabase.from('tasks').delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${taskIds.join(',')})`);
    if (error) throw error;
  }

  // 4.5. Deletar activities removidas
  const activityIds = activities.map(a => a.id);
  if (Array.isArray(state.activities)) {
    const query = supabase.from('activities').delete().eq('user_id', userId);
    const { error } = activityIds.length > 0
      ? await query.not('id', 'in', `(${activityIds.join(',')})`)
      : await query.not('id', 'is', null);
    if (error) throw error;
  }

  // 5. Upsert calendar_events
  if (calendarEvents.length > 0) {
    const { error } = await supabase.from('calendar_events').upsert(
      calendarEvents.map(e => ({ ...appEventToDb(e), user_id: userId })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const eventIds = calendarEvents.map(e => e.id);
  if (eventIds.length > 0) {
    const { error } = await supabase.from('calendar_events').delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${eventIds.join(',')})`);
    if (error) throw error;
  }

  // 6. Upsert people
  if (people.length > 0) {
    const { error } = await supabase.from('people').upsert(
      people.map(p => ({ ...p, user_id: userId })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const peopleIds = people.map(p => p.id);
  if (peopleIds.length > 0) {
    const { error } = await supabase.from('people').delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${peopleIds.join(',')})`);
    if (error) throw error;
  }

  // 7. Upsert app_state — chaves prefixadas com userId: para isolamento por usuário
  const stateRows = [
    { key: `${userId}:activeBoardId`,    value: activeBoardId    ?? null },
    { key: `${userId}:pomodoroSettings`, value: pomodoroSettings ?? {} },
    { key: `${userId}:pomodoro`,         value: pomodoro         ?? {} },
    { key: `${userId}:exportViews`,      value: exportViews      ?? {} },
  ];
  const { error: stateErr } = await supabase.from('app_state').upsert(stateRows, { onConflict: 'key' });
  if (stateErr) throw stateErr;
}

// ── Mapeamento app <-> banco ─────────────────────────────────
function appTaskToDb(t, boardId, activityId = null) {
  return {
    id:             t.id,
    board_id:       boardId ?? t.boardId ?? null,
    activity_id:    activityId ?? t.activityId ?? null,
    name:           t.name,
    task_date:      t.date       || null,
    delivery_date:  t.deliveryDate || null,
    link:           t.link       || '',
    duration:       t.duration   ?? 0,
    priority:       t.priority   ?? null,
    urgent:         t.urgent     ?? false,
    urgent_rank:    t.urgentRank ?? 0,
    delegated:      t.delegated  ?? false,
    delegated_to:   t.delegatedTo   || '',
    delegated_date: t.delegatedDate || null,
    completed:      t.completed  ?? false,
    created_at:     t.createdAt  ?? null,
    completed_at:   t.completedAt ?? null,
    field_values:   t.fieldValues ?? {},
    team:           t.team       ?? [],
    series_id:       t.seriesId       ?? null,
    recurrence_rule: t.recurrenceRule ?? null,
    is_exception:    t.isException    ?? false,
    antecedencia_minima_dias: t.antecedenciaMiniDias ?? null,
    antecedencia_max_dias:    t.antecedenciaMaxDias  ?? null,
    antecedencia_rec_dias:    t.antecedenciaRecDias  ?? null,
  };
}

function dbTaskToApp(t) {
  return {
    id:            t.id,
    boardId:       t.board_id    ?? null,
    activityId:    t.activity_id ?? null,
    name:          t.name,
    date:          t.task_date      || '',
    deliveryDate:  t.delivery_date  || '',
    link:          t.link           || '',
    duration:      t.duration       ?? 0,
    priority:      t.priority       ?? null,
    urgent:        t.urgent         ?? false,
    urgentRank:    t.urgent_rank    ?? 0,
    delegated:     t.delegated      ?? false,
    delegatedTo:   t.delegated_to   || '',
    delegatedDate: t.delegated_date || '',
    completed:     t.completed      ?? false,
    createdAt:     t.created_at     ?? null,
    completedAt:   t.completed_at   ?? null,
    fieldValues:   t.field_values   ?? {},
    team:          t.team           ?? [],
    seriesId:       t.series_id       ?? null,
    recurrenceRule: t.recurrence_rule ?? null,
    isException:    t.is_exception    ?? false,
    antecedenciaMiniDias: t.antecedencia_minima_dias ?? null,
    antecedenciaMaxDias:  t.antecedencia_max_dias    ?? null,
    antecedenciaRecDias:  t.antecedencia_rec_dias    ?? null,
  };
}

function appEventToDb(e) {
  return {
    id:         e.id,
    name:       e.name,
    start_date: e.startDate || null,
    end_date:   e.endDate   || null,
    board_ids:  e.boardIds  ?? [],
    is_holiday: e.isHoliday ?? false,
  };
}

function dbEventToApp(e) {
  return {
    id:        e.id,
    name:      e.name,
    startDate: e.start_date || '',
    endDate:   e.end_date   || '',
    boardIds:  e.board_ids  ?? [],
    isHoliday: e.is_holiday ?? false,
  };
}

function appActivityToDb(a) {
  return {
    id:                         a.id,
    name:                       a.name,
    categoria:                  a.categoria,
    status:                     a.status,
    descricao:                  a.descricao               ?? null,
    foto_capa:                  a.fotoCapa                ?? null,
    vibes:                      a.vibes                   ?? [],
    modalidades_duracao:        a.modalidadesDuracao      ?? [],
    meios_transporte:           a.meiosTransporte         ?? [],
    nivel_planejamento:         a.nivelPlanejamento       ?? null,
    antecedencia_minima_dias:   a.antecedenciaMiniDias    ?? null,
    decisao_ultima_hora:        a.decisaoUltimaHora       ?? false,
    localidade:                 a.localidade              ?? null,
    distancia_sp:               a.distanciaSP             ?? null,
    condicao_climatica_ideal:   a.condicaoClimaticaIdeal  ?? [],
    temperatura_minima_celsius: a.temperaturaMiniCelsius  ?? null,
    epoca_ideal:                a.epocaIdeal              ?? [],
    perfil_grupo:               a.perfilGrupo             ?? [],
    tamanho_grupo:              a.tamanhoGrupo            ?? null,
    condicionamento_fisico:     a.condicionamentoFisico   ?? null,
    evitar_alta_temporada:      a.evitarAltaTemporada     ?? false,
    repetivel:                  a.repetivel               ?? true,
    pet_friendly:               a.petFriendly             ?? null,
    perfis_custo:               a.perfisCusto             ?? {},
    variacoes:                  a.variacoes               ?? [],
    variacao_escolhida_id:      a.variacaoEscolhidaId     ?? null,
    notas:                      a.notas                   ?? null,
    links:                      a.links                   ?? [],
    data_inicio:                a.dataInicio              ?? null,
    board_destino_id:           a.boardDestinoId          ?? null,
    realizacoes:                a.realizacoes             ?? [],
    created_at:                 a.createdAt               ?? null,
    updated_at:                 a.updatedAt               ?? null,
  };
}

function dbActivityToApp(a) {
  return {
    id:                       a.id,
    name:                     a.name,
    categoria:                a.categoria,
    status:                   a.status,
    descricao:                a.descricao               ?? null,
    fotoCapa:                 a.foto_capa               ?? null,
    vibes:                    a.vibes                   ?? [],
    modalidadesDuracao:       a.modalidades_duracao     ?? [],
    meiosTransporte:          a.meios_transporte        ?? [],
    nivelPlanejamento:        a.nivel_planejamento      ?? null,
    antecedenciaMiniDias:     a.antecedencia_minima_dias ?? null,
    decisaoUltimaHora:        a.decisao_ultima_hora     ?? false,
    localidade:               a.localidade              ?? null,
    distanciaSP:              a.distancia_sp            ?? null,
    condicaoClimaticaIdeal:   a.condicao_climatica_ideal ?? [],
    temperaturaMiniCelsius:   a.temperatura_minima_celsius ?? null,
    epocaIdeal:               a.epoca_ideal             ?? [],
    perfilGrupo:              a.perfil_grupo            ?? [],
    tamanhoGrupo:             a.tamanho_grupo           ?? null,
    condicionamentoFisico:    a.condicionamento_fisico  ?? null,
    evitarAltaTemporada:      a.evitar_alta_temporada   ?? false,
    repetivel:                a.repetivel               ?? true,
    petFriendly:              a.pet_friendly            ?? null,
    perfisCusto:              a.perfis_custo            ?? {},
    variacoes:                a.variacoes               ?? [],
    variacaoEscolhidaId:      a.variacao_escolhida_id   ?? null,
    notas:                    a.notas                   ?? null,
    links:                    a.links                   ?? [],
    dataInicio:               a.data_inicio             ?? null,
    boardDestinoId:           a.board_destino_id        ?? null,
    realizacoes:              a.realizacoes             ?? [],
    checklistTasks:           [],
    createdAt:                a.created_at              ?? null,
    updatedAt:                a.updated_at              ?? null,
  };
}

// ── Mapeamento finanças app <-> banco ────────────────────────
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
    icon:         c.icon          || '📦',
    color:        c.color         || 'gray',
    monthlyLimit: c.monthly_limit ?? null,
    sortOrder:    c.sort_order    ?? 0,
  };
}

function appWalletToDb(w) {
  return {
    id:         w.id,
    name:       w.name,
    icon:       w.icon      || '💳',
    sort_order: w.sortOrder ?? 0,
  };
}
function dbWalletToApp(w) {
  return {
    id:        w.id,
    name:      w.name,
    icon:      w.icon       || '💳',
    sortOrder: w.sort_order ?? 0,
  };
}

function appTransactionToDb(t) {
  return {
    id:          t.id,
    type:        t.type,
    nature:      t.nature       || 'variable',
    description: t.description  || '',
    amount:      t.amount       ?? 0,
    date:        t.date,
    category_id: t.categoryId   ?? null,
    wallet_id:   t.walletId     ?? null,
    envelope_id: t.envelopeId   ?? null,
  };
}
function dbTransactionToApp(t) {
  return {
    id:          t.id,
    type:        t.type,
    nature:      t.nature       || 'variable',
    description: t.description  || '',
    amount:      Number(t.amount) ?? 0,
    date:        t.date,
    categoryId:  t.category_id  ?? null,
    walletId:    t.wallet_id    ?? null,
    envelopeId:  t.envelope_id  ?? null,
  };
}

function appEnvelopeToDb(e) {
  return {
    id:                 e.id,
    name:               e.name,
    kind:               e.kind        || 'event',
    event_type:         e.eventType   ?? null,
    icon:               e.icon        || '✉️',
    color:              e.color       || 'gray',
    budget:             e.budget      ?? null,
    period_start:       e.periodStart ?? null,
    period_end:         e.periodEnd   ?? null,
    status:             e.status      || 'open',
    closed_at:          e.closedAt    ?? null,
    parent_id:          e.parentId    ?? null,
    recurrence:         e.recurrence  ?? null,
    linked_activity_id: e.linkedActivityId ?? null,
    sort_order:         e.sortOrder   ?? 0,
    created_at:         e.createdAt   ?? null,
  };
}
function dbEnvelopeToApp(e) {
  return {
    id:               e.id,
    name:             e.name,
    kind:             e.kind        || 'event',
    eventType:        e.event_type  ?? null,
    icon:             e.icon        || '✉️',
    color:            e.color       || 'gray',
    budget:           e.budget === null || e.budget === undefined ? null : Number(e.budget),
    periodStart:      e.period_start ?? null,
    periodEnd:        e.period_end   ?? null,
    status:           e.status      || 'open',
    closedAt:         e.closed_at   ?? null,
    parentId:         e.parent_id   ?? null,
    recurrence:       e.recurrence  ?? null,
    linkedActivityId: e.linked_activity_id ?? null,
    sortOrder:        e.sort_order  ?? 0,
    createdAt:        e.created_at  ?? null,
  };
}

function appPurchaseToDb(p) {
  return {
    id:             p.id,
    name:           p.name,
    description:    p.description    ?? null,
    target_amount:  p.targetAmount   ?? 0,
    saved_amount:   p.savedAmount    ?? 0,
    priority:       p.priority       || 'medium',
    category_label: p.categoryLabel  ?? null,
    created_at:     p.createdAt      ?? null,
  };
}
function dbPurchaseToApp(p) {
  return {
    id:            p.id,
    name:          p.name,
    description:   p.description    ?? null,
    targetAmount:  Number(p.target_amount) ?? 0,
    savedAmount:   Number(p.saved_amount)  ?? 0,
    priority:      p.priority       || 'medium',
    categoryLabel: p.category_label ?? null,
    createdAt:     p.created_at     ?? null,
  };
}

function appBudgetItemToDb(i) {
  return {
    id:          i.id,
    category_id: i.categoryId ?? null,
    description: i.description || '',
    icon:        i.icon        || '📌',
    amount:      i.amount      ?? 0,
    sort_order:  i.sortOrder   ?? 0,
  };
}
function dbBudgetItemToApp(i) {
  return {
    id:          i.id,
    categoryId:  i.category_id ?? null,
    description: i.description || '',
    icon:        i.icon        || '📌',
    amount:      Number(i.amount) ?? 0,
    sortOrder:   i.sort_order  ?? 0,
  };
}

// ── Finance: leitura e escrita ───────────────────────────────
async function loadFinance(userId) {
  const [
    { data: cats,        error: e1 },
    { data: txns,        error: e2 },
    { data: purchases,   error: e3 },
    { data: wallets,     error: e4 },
    { data: budgetItems, error: e5 },
    { data: envelopes,   error: e6 },
    { data: envTypes,    error: e7 },
  ] = await Promise.all([
    supabase.from('finance_categories').select('*').eq('user_id', userId),
    supabase.from('finance_transactions').select('*').eq('user_id', userId),
    supabase.from('finance_planned_purchases').select('*').eq('user_id', userId),
    supabase.from('finance_wallets').select('*').eq('user_id', userId),
    supabase.from('finance_budget_items').select('*').eq('user_id', userId),
    supabase.from('finance_envelopes').select('*').eq('user_id', userId),
    supabase.from('app_state').select('*').eq('key', `${userId}:envelopeEventTypes`),
  ]);

  if (e1 || e2 || e3 || e4 || e5 || e6 || e7) {
    throw new Error([e1, e2, e3, e4, e5, e6, e7].filter(Boolean).map(e => e.message).join('; '));
  }

  return {
    categories:       (cats        || []).map(dbCategoryToApp),
    transactions:     (txns        || []).map(dbTransactionToApp),
    plannedPurchases: (purchases   || []).map(dbPurchaseToApp),
    wallets:          (wallets     || []).map(dbWalletToApp),
    budgetItems:      (budgetItems || []).map(dbBudgetItemToApp),
    envelopes:        (envelopes   || []).map(dbEnvelopeToApp),
    envelopeEventTypes: envTypes?.[0]?.value || [],
  };
}

async function saveFinance(state, userId) {
  const { categories = [], transactions = [], plannedPurchases = [], wallets = [], budgetItems = [], envelopes = [], envelopeEventTypes = [] } = state;

  // Upsert + delete categories
  if (categories.length > 0) {
    const { error } = await supabase.from('finance_categories').upsert(
      categories.map(c => ({ ...appCategoryToDb(c), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const catIds = categories.map(c => c.id);
  if (Array.isArray(state.categories)) {
    const q = supabase.from('finance_categories').delete().eq('user_id', userId);
    const { error } = catIds.length > 0
      ? await q.not('id', 'in', `(${catIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  // Upsert + delete wallets
  if (wallets.length > 0) {
    const { error } = await supabase.from('finance_wallets').upsert(
      wallets.map(w => ({ ...appWalletToDb(w), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const walletIds = wallets.map(w => w.id);
  if (Array.isArray(state.wallets)) {
    const q = supabase.from('finance_wallets').delete().eq('user_id', userId);
    const { error } = walletIds.length > 0
      ? await q.not('id', 'in', `(${walletIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  // Upsert + delete transactions
  if (transactions.length > 0) {
    const { error } = await supabase.from('finance_transactions').upsert(
      transactions.map(t => ({ ...appTransactionToDb(t), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const txnIds = transactions.map(t => t.id);
  if (Array.isArray(state.transactions)) {
    const q = supabase.from('finance_transactions').delete().eq('user_id', userId);
    const { error } = txnIds.length > 0
      ? await q.not('id', 'in', `(${txnIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  // Upsert + delete planned purchases
  if (plannedPurchases.length > 0) {
    const { error } = await supabase.from('finance_planned_purchases').upsert(
      plannedPurchases.map(p => ({ ...appPurchaseToDb(p), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const purchaseIds = plannedPurchases.map(p => p.id);
  if (Array.isArray(state.plannedPurchases)) {
    const q = supabase.from('finance_planned_purchases').delete().eq('user_id', userId);
    const { error } = purchaseIds.length > 0
      ? await q.not('id', 'in', `(${purchaseIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  // Upsert + delete budget items
  if (budgetItems.length > 0) {
    const { error } = await supabase.from('finance_budget_items').upsert(
      budgetItems.map(i => ({ ...appBudgetItemToDb(i), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const budgetItemIds = budgetItems.map(i => i.id);
  if (Array.isArray(state.budgetItems)) {
    const q = supabase.from('finance_budget_items').delete().eq('user_id', userId);
    const { error } = budgetItemIds.length > 0
      ? await q.not('id', 'in', `(${budgetItemIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  // Upsert + delete envelopes
  if (envelopes.length > 0) {
    const { error } = await supabase.from('finance_envelopes').upsert(
      envelopes.map(e => ({ ...appEnvelopeToDb(e), user_id: userId })), { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const envelopeIds = envelopes.map(e => e.id);
  if (Array.isArray(state.envelopes)) {
    const q = supabase.from('finance_envelopes').delete().eq('user_id', userId);
    const { error } = envelopeIds.length > 0
      ? await q.not('id', 'in', `(${envelopeIds.join(',')})`)
      : await q.not('id', 'is', null);
    if (error) throw error;
  }

  const { error: envTypeErr } = await supabase.from('app_state').upsert(
    [{ key: `${userId}:envelopeEventTypes`, value: envelopeEventTypes }],
    { onConflict: 'key' }
  );
  if (envTypeErr) throw envTypeErr;
}

// ── Servidor HTTP ────────────────────────────────────────────
const server = http.createServer(async (req, res) => {

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end();
    return;
  }

  // GET /api/config — expõe configuração pública do Supabase para o frontend
  if (req.method === 'GET' && req.url === '/api/config') {
    send(res, 200, {
      supabaseUrl:     process.env.SUPABASE_URL     || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
    });
    return;
  }

  // GET /api/tasks — carrega estado do Supabase
  if (req.method === 'GET' && req.url === '/api/tasks') {
    const userId = await authenticate(req, res);
    if (!userId) return;
    try {
      const state = await loadState(userId);
      send(res, 200, state);
    } catch (err) {
      console.error('GET /api/tasks error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // POST /api/tasks — salva estado no Supabase
  if (req.method === 'POST' && req.url === '/api/tasks') {
    const userId = await authenticate(req, res);
    if (!userId) return;
    try {
      const body = await parseBody(req);
      await saveState(body, userId);
      send(res, 200, { ok: true });
    } catch (err) {
      console.error('POST /api/tasks error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // GET /api/finance — carrega dados financeiros
  if (req.method === 'GET' && req.url === '/api/finance') {
    const userId = await authenticate(req, res);
    if (!userId) return;
    try {
      const data = await loadFinance(userId);
      send(res, 200, data);
    } catch (err) {
      console.error('GET /api/finance error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // POST /api/finance — salva dados financeiros
  if (req.method === 'POST' && req.url === '/api/finance') {
    const userId = await authenticate(req, res);
    if (!userId) return;
    try {
      const body = await parseBody(req);
      await saveFinance(body, userId);
      send(res, 200, { ok: true });
    } catch (err) {
      console.error('POST /api/finance error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // POST /api/claim-data — migra dados existentes (sem user_id) para o usuário logado
  // Chamado automaticamente pelo frontend na primeira vez que o usuário entra no app
  if (req.method === 'POST' && req.url === '/api/claim-data') {
    if (useMemoryFallback) { send(res, 200, { ok: true }); return; }
    const userId = await authenticate(req, res);
    if (!userId) return;
    try {
      const tables = [
        'boards', 'tasks', 'calendar_events', 'people', 'activities',
        'finance_categories', 'finance_wallets', 'finance_transactions',
        'finance_planned_purchases', 'finance_budget_items',
      ];
      for (const t of tables) {
        const { error } = await supabase.from(t).update({ user_id: userId }).is('user_id', null);
        if (error) console.warn(`claim-data ${t}:`, error.message);
      }
      // Migrar chaves do app_state sem prefixo para o formato userId:key
      const { data: oldState } = await supabase.from('app_state').select('*');
      const toMigrate = (oldState || []).filter(r => !r.key.includes(':'));
      for (const row of toMigrate) {
        await supabase.from('app_state').upsert(
          { key: `${userId}:${row.key}`, value: row.value },
          { onConflict: 'key' }
        );
      }
      send(res, 200, { ok: true });
    } catch (err) {
      console.error('POST /api/claim-data error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // Arquivos estáticos
  const filePath = path.join(PUBLIC_DIR, req.url === '/' ? '/index.html' : req.url);
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    const contentType = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Tarefas rodando em http://localhost:${PORT}`));
