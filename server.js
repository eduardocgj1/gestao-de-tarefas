const http = require('http');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3131;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' };

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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
    { data: boards, error: e1 },
    { data: tasks,  error: e2 },
    { data: events, error: e3 },
    { data: people, error: e4 },
    { data: state,  error: e5 },
  ] = await Promise.all([
    supabase.from('boards').select('*'),
    supabase.from('tasks').select('*'),
    supabase.from('calendar_events').select('*'),
    supabase.from('people').select('*'),
    supabase.from('app_state').select('*'),
  ]);

  if (e1 || e2 || e3 || e4 || e5) {
    throw new Error([e1, e2, e3, e4, e5].filter(Boolean).map(e => e.message).join('; '));
  }

  // Indexar estado global
  const appState = Object.fromEntries((state || []).map(r => [r.key, r.value]));

  // Agrupar tasks por board
  const tasksByBoard = {};
  for (const t of tasks || []) {
    if (!tasksByBoard[t.board_id]) tasksByBoard[t.board_id] = [];
    tasksByBoard[t.board_id].push(dbTaskToApp(t));
  }

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
  };
}

// ── Escrita: sincroniza estado completo no Supabase ─────────
async function saveState(state) {
  const { boards = [], calendarEvents = [], people = [], activeBoardId,
          pomodoroSettings, pomodoro, exportViews = {} } = state;

  // 1. Upsert boards (sem tasks — tasks ficam em tabela separada)
  if (boards.length > 0) {
    const { error } = await supabase.from('boards').upsert(
      boards.map(b => ({ id: b.id, name: b.name, color: b.color || null, fields: b.fields || [] })),
      { onConflict: 'id' }
    );
    if (error) throw error;
  }

  // 2. Deletar boards removidos
  const boardIds = boards.map(b => b.id);
  if (boardIds.length > 0) {
    const { error } = await supabase.from('boards').delete().not('id', 'in', `(${boardIds.map(id => `'${id}'`).join(',')})`);
    if (error) throw error;
  } else {
    await supabase.from('boards').delete().neq('id', '');
  }

  // 3. Upsert tasks (flatten de todos os boards)
  const allTasks = boards.flatMap(b => (b.tasks || []).map(t => appTaskToDb(t, b.id)));
  if (allTasks.length > 0) {
    const { error } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (error) throw error;
  }

  // 4. Deletar tasks removidas
  const taskIds = allTasks.map(t => t.id);
  if (taskIds.length > 0) {
    const { error } = await supabase.from('tasks').delete().not('id', 'in', `(${taskIds.map(id => `'${id}'`).join(',')})`);
    if (error) throw error;
  } else {
    await supabase.from('tasks').delete().neq('id', '');
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
    const { error } = await supabase.from('calendar_events').delete().not('id', 'in', `(${eventIds.map(id => `'${id}'`).join(',')})`);
    if (error) throw error;
  } else {
    await supabase.from('calendar_events').delete().neq('id', '');
  }

  // 6. Upsert people
  if (people.length > 0) {
    const { error } = await supabase.from('people').upsert(people, { onConflict: 'id' });
    if (error) throw error;
  }
  const peopleIds = people.map(p => p.id);
  if (peopleIds.length > 0) {
    const { error } = await supabase.from('people').delete().not('id', 'in', `(${peopleIds.map(id => `'${id}'`).join(',')})`);
    if (error) throw error;
  } else {
    await supabase.from('people').delete().neq('id', '');
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
function appTaskToDb(t, boardId) {
  return {
    id:             t.id,
    board_id:       boardId,
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
  };
}

function dbTaskToApp(t) {
  return {
    id:            t.id,
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
