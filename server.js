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
// Só para desenvolvimento local sem .env configurado (ex.: este ambiente de implementação, que
// não tem acesso de rede/credenciais ao painel do Supabase). Em produção (Render) as variáveis
// SUPABASE_URL/SUPABASE_KEY sempre existem, então este bloco nunca é usado lá — o comportamento
// real com Supabase não muda. Implementa o mínimo da API encadeável do @supabase/supabase-js
// usada neste arquivo (from().select(), from().upsert(), from().delete().not()) sobre um objeto
// JS simples em memória, com o MESMO formato de entrada/saída (linhas em snake_case, como no
// banco real) — loadState()/saveState() não precisam saber a diferença.
const memoryDb = { boards: [], tasks: [], calendar_events: [], people: [], app_state: [], activities: [] };

function makeMemorySupabaseClient() {
  return {
    from(table) {
      if (!memoryDb[table]) memoryDb[table] = [];
      return {
        select(_cols) {
          return Promise.resolve({ data: memoryDb[table].map(row => ({ ...row })), error: null });
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
        delete() {
          return {
            // Reproduz `.not(column, 'in', '(v1,v2,...)')`: mantém apenas as linhas cujo valor
            // está no padrão informado (equivalente a deletar as que NÃO estão). Também reproduz
            // `.not(column, 'is', null)`, usado para apagar todas as linhas da tabela (coluna é
            // sempre NOT NULL por ser a primary key).
            not(column, op, pattern) {
              if (op === 'is') {
                memoryDb[table] = [];
                return Promise.resolve({ error: null });
              }
              const inner = String(pattern).replace(/^\(|\)$/g, '');
              const allowed = new Set(inner.split(',').filter(Boolean));
              memoryDb[table] = memoryDb[table].filter(r => allowed.has(String(r[column])));
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };
}

const useMemoryFallback = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
if (useMemoryFallback) {
  console.warn('[dev] SUPABASE_URL/SUPABASE_KEY ausentes — usando armazenamento em memória (SOMENTE para desenvolvimento local). Os dados NÃO persistem entre reinícios do servidor. Em produção (Render), configure as env vars normalmente.');
}

const supabase = useMemoryFallback
  ? makeMemorySupabaseClient()
  : createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ── Helpers ─────────────────────────────────────────────────
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type });
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

// ── Leitura: monta o estado completo a partir do Supabase ───
async function loadState() {
  const [
    { data: boards,     error: e1 },
    { data: tasks,      error: e2 },
    { data: events,     error: e3 },
    { data: people,     error: e4 },
    { data: state,      error: e5 },
    { data: activities, error: e6 },
  ] = await Promise.all([
    supabase.from('boards').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('calendar_events').select('*'),
    supabase.from('people').select('*'),
    supabase.from('app_state').select('*'),
    supabase.from('activities').select('*'),
  ]);

  if (e1 || e2 || e3 || e4 || e5 || e6) {
    throw new Error([e1, e2, e3, e4, e5, e6].filter(Boolean).map(e => e.message).join('; '));
  }

  // Indexar estado global
  const appState = Object.fromEntries((state || []).map(r => [r.key, r.value]));

  // Separar tasks por board e por atividade.
  // Tarefas promovidas (com activity_id E board_id) vão APENAS para tasksByActivity —
  // o board as lê via getTasksForDateAndBoard()/tasksFor(), evitando duplicação na renderização.
  const tasksByBoard = {};
  const tasksByActivity = {};
  for (const t of tasks || []) {
    const mapped = dbTaskToApp(t);
    if (t.board_id && !t.activity_id) {
      // Tarefa de board puro (não pertence a nenhuma atividade)
      if (!tasksByBoard[t.board_id]) tasksByBoard[t.board_id] = [];
      tasksByBoard[t.board_id].push(mapped);
    }
    if (t.activity_id) {
      // Tarefa de checklist (promovida ou não) — fonte de verdade em activity.checklistTasks
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
async function saveState(state) {
  const { boards = [], activities = [], calendarEvents = [], people = [], activeBoardId,
          pomodoroSettings, pomodoro, exportViews = {} } = state;

  // 1. Upsert boards (sem tasks — tasks ficam em tabela separada)
  if (boards.length > 0) {
    const { error } = await supabase.from('boards').upsert(
      boards.map(b => ({ id: b.id, name: b.name, color: b.color || null, fields: b.fields || [] })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 2. Deletar boards removidos (só se vieram boards no payload — evita wipe acidental)
  const boardIds = boards.map(b => b.id);
  if (boardIds.length > 0) {
    const { error } = await supabase.from('boards').delete().not('id', 'in', `(${boardIds.join(',')})`);
    if (error) throw error;
  }

  // 2.5. Upsert activities (precisa acontecer antes do upsert de tasks — tasks.activity_id
  // referencia activities(id) via FK, então a atividade precisa existir antes da task promovida/checklist)
  if (activities.length > 0) {
    const { error } = await supabase.from('activities').upsert(
      activities.map(appActivityToDb), { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 3. Upsert tasks
  // Tasks de board puro (sem activityId) — tarefas promovidas NÃO estão em board.tasks,
  // ficam em activity.checklistTasks e são salvas pelo bloco abaixo.
  const boardTasks = boards.flatMap(b =>
    (b.tasks || [])
      .filter(t => !t.activityId)
      .map(t => appTaskToDb(t, b.id))
  );
  // Todas as tasks de checklist (promovidas ou não) — fonte de verdade única em activity.checklistTasks.
  // Tarefas promovidas têm boardId preenchido; não-promovidas têm boardId null.
  const allChecklistTasks = activities.flatMap(a =>
    (a.checklistTasks || []).map(t => appTaskToDb(t, t.boardId || null, a.id))
  );
  const allTasks = [...boardTasks, ...allChecklistTasks];
  if (allTasks.length > 0) {
    const { error } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (error) throw error;
  }

  // 4. Deletar tasks removidas (só se vieram boards OU activities no payload — evita wipe
  // acidental quando um dos dois arrays está vazio por engano/erro, mas o outro tem conteúdo real;
  // ver histórico de bug de wipe no commit f5e418d)
  const taskIds = allTasks.map(t => t.id);
  if ((boards.length > 0 || activities.length > 0) && taskIds.length > 0) {
    const { error } = await supabase.from('tasks').delete().not('id', 'in', `(${taskIds.join(',')})`);
    if (error) throw error;
  }

  // 4.5. Deletar activities removidas (só se o campo veio no payload — evita wipe acidental
  // quando o campo está ausente por erro, mas permite deletar a última activity restante)
  const activityIds = activities.map(a => a.id);
  if (Array.isArray(state.activities)) {
    const query = supabase.from('activities').delete();
    const { error } = activityIds.length > 0
      ? await query.not('id', 'in', `(${activityIds.join(',')})`)
      : await query.not('id', 'is', null);
    if (error) throw error;
  }

  // 5. Upsert calendar_events
  if (calendarEvents.length > 0) {
    const { error } = await supabase.from('calendar_events').upsert(
      calendarEvents.map(appEventToDb),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }
  const eventIds = calendarEvents.map(e => e.id);
  if (eventIds.length > 0) {
    const { error } = await supabase.from('calendar_events').delete().not('id', 'in', `(${eventIds.join(',')})`);
    if (error) throw error;
  }

  // 6. Upsert people
  if (people.length > 0) {
    const { error } = await supabase.from('people').upsert(people, { onConflict: 'id' });
    if (error) throw error;
  }
  const peopleIds = people.map(p => p.id);
  if (peopleIds.length > 0) {
    const { error } = await supabase.from('people').delete().not('id', 'in', `(${peopleIds.join(',')})`);
    if (error) throw error;
  }

  // 7. Upsert app_state (chaves globais)
  const stateRows = [
    { key: 'activeBoardId',    value: activeBoardId    ?? null },
    { key: 'pomodoroSettings', value: pomodoroSettings ?? {} },
    { key: 'pomodoro',         value: pomodoro         ?? {} },
    { key: 'exportViews',      value: exportViews      ?? {} },
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
    notas:                    a.notas                   ?? null,
    links:                    a.links                   ?? [],
    dataInicio:               a.data_inicio             ?? null,
    boardDestinoId:           a.board_destino_id        ?? null,
    realizacoes:              a.realizacoes             ?? [],
    checklistTasks:           [],  // populado separadamente a partir da tabela tasks
    createdAt:                a.created_at              ?? null,
    updatedAt:                a.updated_at              ?? null,
  };
}

// ── Servidor HTTP ────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  // GET /api/tasks — carrega estado do Supabase
  if (req.method === 'GET' && req.url === '/api/tasks') {
    try {
      const state = await loadState();
      send(res, 200, state);
    } catch (err) {
      console.error('GET /api/tasks error:', err.message);
      send(res, 500, { error: err.message });
    }
    return;
  }

  // POST /api/tasks — salva estado no Supabase
  if (req.method === 'POST' && req.url === '/api/tasks') {
    try {
      const body = await parseBody(req);
      await saveState(body);
      send(res, 200, { ok: true });
    } catch (err) {
      console.error('POST /api/tasks error:', err.message);
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
