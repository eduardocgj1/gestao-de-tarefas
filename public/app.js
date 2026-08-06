const YEAR_START = new Date(2026, 0, 1);
const YEAR_END = new Date(2026, 11, 31);
const DOW = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const PALETTE = ['#FF6B6B', '#FFA94D', '#FFD43B', '#69DB7C', '#38D9A9', '#4DABF7', '#748FFC', '#9775FA', '#DA77F2', '#F783AC', '#868E96', '#495057'];

let boards = [];
let activeBoardId = null;
let weekStart = clamp(startOfWeek(new Date()));
let editingId = null;
let editingBoardTabId = null;

let currentView = 'board'; // 'board' | 'calendar'
let calendarEvents = [];
let editingEventId = null;
let calendarLoadedMonths = [];
let calendarInitialized = false;

let dayPopupDate = null;       // dateKey string, or null when closed
let dayPopupMode = 'plan';     // 'plan' | 'close'
let dayPopupGroupField = '';   // nome do campo custom usado para agrupar "demais tarefas" (só aparece com >8 tarefas no dia); resets on open
let closeChoices = {};         // taskId -> { boardId, choice: 'amanha'|'outra'|'arquivar'|'ignorar', reason, customDate } — transiente, montado ao entrar no modo Fechar
let dayLogs = {};              // dateKey -> { capacity, mitIds, mitWhen, note, nextDayMitIds, closedAt } — vem do payload de /api/tasks (day_logs)
let dayNoteDraft = '';
let daySettingsOpen = false;
let dayTrayOpen = false;
let dayCaptureText = '';
let dayCaptureBoardId = null;

let sidebarOpen = false;
let addingBoard = false;

let people = [];
let exportViews = {};

let exportOpen = false;
let exportBoardId = null;
let exportWeekOffset = 0;
let exportProjectFilter = {};
let exportRowEdits = {};
let exportRowDeletions = new Set();

let addingTeamMember = false;
let addingPerson = false;

let dayDrawerExpanded = false;
let dayDrawerResizing = false;
function loadDayDrawerWidth() {
  const stored = Number(localStorage.getItem('dayDrawerWidth'));
  if (!stored || isNaN(stored)) return 400;
  return Math.max(320, Math.min(720, stored));
}
let dayDrawerWidth = loadDayDrawerWidth();

// ---------- lista de atividades: domínio ----------
const ACTIVITY_CATEGORIES = [
  'Explorar a cidade',
  'Viagem de final de semana',
  'Viagem longa',
  'Natureza & aventura',
  'Hobbies & aprendizado',
  'Social & cultural',
  'Descanso intencional',
  'Personalizada',
];
const VIBES = [
  'Romantico', 'Aventura', 'Relaxamento', 'Cultural', 'Agito social', 'Mochilão',
  'Natureza & contemplação', 'Gastronômico', 'Fotográfico', 'Desconexão digital', 'Família', 'Solo',
];
const MODALIDADES_DURACAO = [
  'Parada rápida', 'Meio período', 'Dia inteiro', 'Bate volta', 'Final de semana', 'Feriado prolongado', 'Semana+',
];
const PERFIS_CUSTO_TIPOS = ['economico', 'padrao', 'conforto'];
const PERFIS_CUSTO_LABELS = { economico: 'Econômico', padrao: 'Padrão', conforto: 'Conforto' };
const MEIOS_TRANSPORTE = [
  'A pé', 'Bicicleta', 'Metro / CPTM', 'Ônibus municipal', 'Ônibus interestadual',
  'Carro próprio', 'Aplicativo (Uber/99)', 'Aluguel de carro', 'Avião', 'Barco / ferry', 'Van / transfer compartilhado',
];
const EPOCAS = ['Jan–Mar', 'Abr–Jun', 'Jul–Set', 'Out–Dez'];
const CONDICOES_CLIMATICAS = ['Ensolarado', 'Nublado (ok)', 'Chuva (ok)', 'Frio', 'Qualquer'];
const PERFIS_GRUPO = ['Solo', 'Dupla (casal)', 'Amigos', 'Família', 'Qualquer'];
const TAMANHOS_GRUPO = ['Solo', 'Dupla', 'Pequeno (3–5)', 'Grande', 'Qualquer'];
const NIVEIS_CONDICIONAMENTO = ['Não', 'Leve', 'Moderado', 'Intenso'];
const NIVEIS_PLANEJAMENTO = ['Espontâneo', 'Planejado', 'Requer reserva antecipada'];
const ACTIVITY_VARIATION_MERGE_FIELDS = [
  'vibes', 'condicaoClimaticaIdeal', 'temperaturaMiniCelsius', 'antecedenciaMiniDias',
  'decisaoUltimaHora', 'perfisCusto', 'modalidadesDuracao', 'meiosTransporte',
  'perfilGrupo', 'evitarAltaTemporada', 'notas',
];

let activities = [];
let editingActivityId = null;

// ---------- auth ----------
let supabaseClient = null;
let currentUser = null;
let authToken = null;
let activityFormStep = 1;
let activityFormMode = 'create'; // 'create' | 'edit'
let holidaysCache = null;
let activityFilters = { categoria: null, vibe: null, status: null, modalidade: null, custoMax: null, epoca: null };
let activitySearchQuery = '';
let activityDetailId = null;

const sidebarEl = document.getElementById('sidebar');
const sidebarBoardsEl = document.getElementById('sidebarBoards');
const sidebarAddBoardAreaEl = document.getElementById('sidebarAddBoardArea');
const sidebarCalendarItemEl = document.getElementById('sidebarCalendarItem');
const sidebarActivitiesItemEl = document.getElementById('sidebarActivitiesItem');
const board = document.getElementById('board');
const weekRangeEl = document.getElementById('weekRange');

function clamp(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (x < YEAR_START) return new Date(YEAR_START);
  if (x > YEAR_END) return new Date(YEAR_END);
  return x;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { return addDays(d, -d.getDay()); }
function toKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// ---------- recorrência ----------
const REC_WEEKDAY_INDEX = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
function generateRecurrenceInstances(rule, startDateKey) {
  const start = new Date(startDateKey + 'T00:00:00');
  const end = new Date(rule.endDate + 'T00:00:00');
  const keys = [];
  if (isNaN(start) || isNaN(end) || start > end) return keys;

  if (rule.type === 'daily') {
    let d = new Date(start);
    while (d <= end) {
      const dow = d.getDay();
      const isWeekend = dow === 0 || dow === 6;
      if (!(rule.workdaysOnly && isWeekend)) keys.push(toKey(d));
      d = addDays(d, 1);
    }
  } else if (rule.type === 'weekly') {
    const selected = new Set((rule.days || []).map(k => REC_WEEKDAY_INDEX[k]));
    let d = new Date(start);
    while (d <= end) {
      if (selected.has(d.getDay())) keys.push(toKey(d));
      d = addDays(d, 1);
    }
  } else if (rule.type === 'monthly') {
    const dayOfMonth = rule.dayOfMonth;
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      if (dayOfMonth <= daysInMonth) {
        const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth);
        if (candidate >= start && candidate <= end) keys.push(toKey(candidate));
      }
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  } else if (rule.type === 'custom') {
    const interval = Math.max(2, Math.min(60, Number(rule.interval) || 2));
    let d = new Date(start);
    while (d <= end) {
      keys.push(toKey(d));
      d = addDays(d, interval);
    }
  }
  return keys;
}
// Marca a instância como exceção quando sua data efetivamente muda (drag-and-drop, edição de
// data no modal, "adiar" ou "Fechar o Dia" da Visão do Dia). Não afeta o restante da série.
function markExceptionIfMoved(t, previousDate) {
  if (t.seriesId && t.date !== previousDate) t.isException = true;
}
function label(d) { return `${String(d.getDate()).padStart(2, '0')}/${MON[d.getMonth()]} - ${DOW[d.getDay()]}`; }
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

// ---------- boards ----------
function currentBoard() { return boards.find(b => b.id === activeBoardId); }

function migrateLegacyData(data) {
  const legacyTasks = data.tasks || [];
  const legacyClass = data.classifications || { projeto: [], modo: [] };
  const fields = [];
  const fieldByLegacyType = {};
  ['projeto', 'modo'].forEach(type => {
    const items = legacyClass[type] || [];
    const fieldId = uid();
    fieldByLegacyType[type] = fieldId;
    fields.push({
      id: fieldId,
      name: type === 'projeto' ? 'Projeto' : 'Modo',
      values: items.map(i => ({ id: i.id, name: i.name, color: i.color })),
    });
  });
  const tasks = legacyTasks.map(t => {
    const { projeto, modo, ...rest } = t;
    const fieldValues = {};
    if (projeto) fieldValues[fieldByLegacyType.projeto] = projeto;
    if (modo) fieldValues[fieldByLegacyType.modo] = modo;
    return { ...rest, fieldValues };
  });
  return {
    boards: [{ id: uid(), name: 'Trabalho', tasks, fields }],
    activeBoardId: null,
  };
}

// ---------- persistence ----------
async function load(isRetry = false) {
  let res, data;
  try {
    res = await fetch('/api/tasks', { headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {} });
    data = await res.json();
  } catch (err) {
    console.error('Falha ao carregar dados do servidor:', err);
    alert('Não foi possível carregar os dados do servidor. Recarregue a página — nada foi salvo.');
    return;
  }
  if (!res.ok || data.error) {
    console.error('Erro ao carregar dados do servidor:', data.error || res.status);
    alert('Não foi possível carregar os dados do servidor. Recarregue a página — nada foi salvo.');
    return;
  }

  let migrated = false;
  if (!data.boards) {
    const result = migrateLegacyData(data);
    boards = result.boards;
    activeBoardId = boards[0].id;
    migrated = true;
  } else {
    boards = data.boards;
    activeBoardId = data.activeBoardId && boards.some(b => b.id === data.activeBoardId) ? data.activeBoardId : (boards[0] && boards[0].id);
  }
  // Na primeira vez que um usuário faz login, tenta migrar dados existentes sem user_id
  if (!boards.length && currentUser && !isRetry) {
    try {
      const claimRes = await fetch('/api/claim-data', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      if (claimRes.ok) return load(true);  // recarrega com os dados migrados
    } catch (_) { /* ignora — vai criar board padrão */ }
  }

  if (!boards.length) {
    boards = [{ id: uid(), name: 'Trabalho', tasks: [], fields: [] }];
    activeBoardId = boards[0].id;
  }
  boards.forEach((b, i) => { if (!b.color) b.color = PALETTE[i % PALETTE.length]; });
  boards.forEach(b => b.tasks.forEach(t => { if (!t.team) t.team = []; }));

  calendarEvents = data.calendarEvents || [];
  people = data.people || [];
  exportViews = data.exportViews || {};
  activities = data.activities || [];
  activities.forEach(a => { if (!a.checklistTasks) a.checklistTasks = []; });
  dayLogs = data.dayLogs || {};

  renderSidebar();
  updateAppTitle();
  render();
  if (migrated) save();
  initWeather();
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    fetch('/api/tasks', { method: 'POST', headers, body: JSON.stringify({ boards, activeBoardId, calendarEvents, people, exportViews, activities, dayLogs }) });
  }, 250);
}

// ---------- sidebar (boards + calendar nav) ----------
function toggleSidebar() {
  sidebarOpen = !sidebarOpen;
  sidebarEl.classList.toggle('open', sidebarOpen);
}

function renderSidebar() {
  sidebarBoardsEl.innerHTML = '';

  boards.forEach(b => {
    const item = document.createElement('div');
    item.className = 'sidebar-board-item' + (currentView === 'board' && b.id === activeBoardId ? ' active' : '');
    item.dataset.id = b.id;

    if (editingBoardTabId === b.id) {
      const dot = document.createElement('span');
      dot.className = 'sidebar-board-dot';
      dot.style.background = b.color;
      item.appendChild(dot);

      const input = document.createElement('input');
      input.className = 'sidebar-board-name-input';
      input.value = b.name;
      item.appendChild(input);
      sidebarBoardsEl.appendChild(item);
      input.focus();
      input.select();
      const commit = () => {
        b.name = input.value.trim() || b.name;
        editingBoardTabId = null;
        save();
        renderSidebar();
        if (currentView === 'board' && b.id === activeBoardId) updateAppTitle();
        if (currentView === 'calendar') renderBoardLegend();
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') input.blur();
        if (e.key === 'Escape') { editingBoardTabId = null; renderSidebar(); }
      });
      return;
    }

    const dot = document.createElement('span');
    dot.className = 'sidebar-board-dot';
    dot.style.background = b.color;
    item.appendChild(dot);

    const label = document.createElement('span');
    label.className = 'sidebar-board-name';
    label.textContent = b.name;
    label.addEventListener('dblclick', e => { e.stopPropagation(); editingBoardTabId = b.id; renderSidebar(); });
    item.appendChild(label);

    if (boards.length > 1) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'sidebar-board-delete';
      del.title = 'Remover quadro';
      del.textContent = '×';
      del.addEventListener('click', e => { e.stopPropagation(); deleteBoard(b.id); });
      item.appendChild(del);
    }

    item.addEventListener('click', () => switchBoard(b.id));
    sidebarBoardsEl.appendChild(item);
  });

  renderSidebarAddBoardArea();
  sidebarCalendarItemEl.classList.toggle('active', currentView === 'calendar');
  sidebarActivitiesItemEl.classList.toggle('active', currentView === 'activities');
  const finItem = document.getElementById('sidebarFinanceItem');
  if (finItem) {
    finItem.classList.toggle('active', currentView === 'finance');
    finItem.classList.toggle('hidden', !posthog.isFeatureEnabled('financas'));
  }
}

function renderSidebarAddBoardArea() {
  sidebarAddBoardAreaEl.innerHTML = '';
  if (addingBoard) {
    const form = document.createElement('div');
    form.className = 'sidebar-add-board-form';
    const input = document.createElement('input');
    input.className = 'sidebar-add-board-input';
    input.placeholder = 'Nome do board';
    form.appendChild(input);
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'sidebar-add-board-cancel';
    cancel.textContent = '✕';
    cancel.addEventListener('click', () => cancelAddBoard());
    form.appendChild(cancel);
    sidebarAddBoardAreaEl.appendChild(form);
    input.focus();
    const commit = () => {
      const name = input.value.trim();
      if (name) commitAddBoard(name);
      else cancelAddBoard();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') cancelAddBoard();
    });
  } else {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'sidebar-add-board-btn';
    btn.innerHTML = '<span class="sidebar-add-board-icon">+</span><span class="sidebar-add-board-label">Novo board</span>';
    btn.addEventListener('click', startAddBoard);
    sidebarAddBoardAreaEl.appendChild(btn);
  }
}

function startAddBoard() { addingBoard = true; renderSidebarAddBoardArea(); }
function cancelAddBoard() { addingBoard = false; renderSidebarAddBoardArea(); }
function commitAddBoard(name) {
  const color = PALETTE[boards.length % PALETTE.length];
  const newBoard = { id: uid(), name, tasks: [], fields: [], color };
  boards.push(newBoard);
  activeBoardId = newBoard.id;
  addingBoard = false;
  save();
  setView('board');
}

function switchBoard(id) {
  activeBoardId = id;
  save();
  setView('board');
}

function deleteBoard(id) {
  if (boards.length <= 1) return;
  if (!confirm('Excluir este quadro e todas as suas tarefas?')) return;
  boards = boards.filter(b => b.id !== id);
  calendarEvents.forEach(ev => { ev.boardIds = ev.boardIds.filter(bid => bid !== id); });
  // Tarefas de checklist promovidas para este board voltam ao estado não-promovido
  // em vez de serem perdidas (checklist é independente do ciclo de vida do board).
  activities.forEach(a => {
    (a.checklistTasks || []).forEach(t => {
      if (t.boardId === id) { t.boardId = null; t.date = null; t.deliveryDate = null; }
    });
    if (a.boardDestinoId === id) a.boardDestinoId = null;
  });
  if (activeBoardId === id) activeBoardId = boards[0].id;
  save();
  setView('board');
}

function updateAppTitle() {
  const titles = { calendar: 'Calendário', activities: 'Atividades', finance: 'Finanças' };
  document.getElementById('appTitle').textContent = titles[currentView] || (currentBoard() ? currentBoard().name : 'Bússola');
}

// ---------- view mode (board vs calendário vs atividades vs finanças) ----------
function setView(view) {
  // Feature flag: Finanças. Mantenha a flag em 100% no painel do PostHog.
  // Baixar para 0% funciona como kill switch (a view de Finanças fica inacessível).
  if (view === 'finance' && !posthog.isFeatureEnabled('financas')) view = 'board';
  currentView = view;
  const isCalendar   = view === 'calendar';
  const isActivities = view === 'activities';
  const isBoard      = view === 'board';
  const isFinance    = view === 'finance';
  document.getElementById('board').classList.toggle('hidden', !isBoard);
  document.getElementById('calendarView').classList.toggle('hidden', !isCalendar);
  document.getElementById('activitiesView').classList.toggle('hidden', !isActivities);
  document.getElementById('financeView').classList.toggle('hidden', !isFinance);
  document.getElementById('boardLegend').classList.toggle('hidden', !isCalendar);
  document.getElementById('navBoardControls').classList.toggle('hidden', !isBoard);
  document.getElementById('navCalendarControls').classList.toggle('hidden', !isCalendar);
  document.getElementById('navActivitiesControls').classList.toggle('hidden', !isActivities);
  document.getElementById('navFinanceControls').classList.toggle('hidden', !isFinance);
  document.getElementById('exportReportBtn').classList.toggle('hidden', !isBoard);
  document.getElementById('financeLancarBtn').classList.toggle('hidden', !isFinance);
  updateAppTitle();
  renderSidebar();
  if (isCalendar) {
    renderBoardLegend();
    initCalendarIfNeeded();
  } else if (isActivities) {
    renderActivities();
    fetchHolidays();
  } else if (isFinance) {
    renderFinanceView();
  } else {
    render();
  }
}

document.getElementById('sidebarCollapseBtn').addEventListener('click', toggleSidebar);
document.getElementById('sidebarExpandBtn').addEventListener('click', toggleSidebar);
sidebarCalendarItemEl.addEventListener('click', () => setView('calendar'));
sidebarActivitiesItemEl.addEventListener('click', () => setView('activities'));

// ---------- fields (custom classifications) ----------
function findField(fieldId, board = currentBoard()) {
  return (board.fields || []).find(f => f.id === fieldId);
}
function findFieldValue(fieldId, valueId, board = currentBoard()) {
  const field = findField(fieldId, board);
  if (!field) return null;
  return field.values.find(v => v.id === valueId);
}
function fieldTagHtml(fieldId, valueId, board = currentBoard()) {
  const item = findFieldValue(fieldId, valueId, board);
  if (!item) return '';
  return `<span class="tag"><span class="dot" style="background:${item.color}"></span>${escapeHtml(item.name)}</span>`;
}
function addField(name) {
  currentBoard().fields.push({ id: uid(), name, values: [] });
  save(); render(); renderFieldsSettings();
}
function renameField(fieldId, name) {
  const field = findField(fieldId);
  if (!field || !name) return;
  field.name = name;
  save(); render(); renderFieldsSettings();
}
function deleteField(fieldId) {
  if (!confirm('Excluir este campo? Os valores atribuídos às tarefas serão removidos.')) return;
  currentBoard().fields = currentBoard().fields.filter(f => f.id !== fieldId);
  currentBoard().tasks.forEach(t => { if (t.fieldValues) delete t.fieldValues[fieldId]; });
  save(); render(); renderFieldsSettings();
}
function addFieldValue(fieldId, name, color) {
  const field = findField(fieldId);
  if (!field) return;
  field.values.push({ id: uid(), name, color });
  save(); render(); renderFieldsSettings();
}
function renameFieldValue(fieldId, valueId, name) {
  const item = findFieldValue(fieldId, valueId);
  if (!item || !name) return;
  item.name = name;
  save(); render();
}
function recolorFieldValue(fieldId, valueId, color) {
  const item = findFieldValue(fieldId, valueId);
  if (!item) return;
  item.color = color;
  save(); render(); renderFieldsSettings();
}
function deleteFieldValue(fieldId, valueId) {
  const board = currentBoard();
  const promotedChecklistTasks = activities.flatMap(a => a.checklistTasks || []).filter(t => t.boardId === board.id);
  const count = [...board.tasks, ...promotedChecklistTasks]
    .filter(t => t.fieldValues && t.fieldValues[fieldId] === valueId).length;
  if (count > 0) {
    alert(`Não é possível excluir: em uso em ${count} tarefa(s). Troque a classificação dessas tarefas antes.`);
    return;
  }
  const field = findField(fieldId);
  field.values = field.values.filter(v => v.id !== valueId);
  save(); render(); renderFieldsSettings();
}

// ---------- ordering ----------
function compare(a, b) {
  if (a.completed !== b.completed) return a.completed ? 1 : -1;
  if (a.completed) return (a.completedAt || 0) - (b.completedAt || 0);
  if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
  if (a.urgent) return (b.urgentRank || 0) - (a.urgentRank || 0);
  return (a.priority || 0) - (b.priority || 0);
}
// Tarefas de um board numa data: tarefas próprias do board + tarefas de checklist de atividades
// já promovidas para esse board/data (fonte de verdade única em activity.checklistTasks — sem
// duplicação em board.tasks).
function getTasksForDateAndBoard(boardId, dateKey) {
  const board = boards.find(b => b.id === boardId);
  const ownTasks = (board ? board.tasks : []).filter(t => t.date === dateKey);
  const promotedTasks = activities
    .flatMap(a => (a.checklistTasks || []))
    .filter(t => t.boardId === boardId && t.date === dateKey);
  return [...ownTasks, ...promotedTasks];
}
function tasksFor(key, board = currentBoard()) { return getTasksForDateAndBoard(board.id, key).sort(compare); }

// Irmãs de uma tarefa na mesma coluna (board+data): tarefas próprias do board +
// tarefas de checklist já promovidas para esse board/data. Sem board (checklist
// ainda não promovido), não há coluna para reordenar.
function siblingTasks(board, dateKey, excludeId) {
  if (!board || !board.id) return [];
  return getTasksForDateAndBoard(board.id, dateKey).filter(t => t.id !== excludeId);
}

function setPriority(task, newPriority, board = currentBoard()) {
  const dateKey = task.date;
  const normal = siblingTasks(board, dateKey, task.id).filter(t => !t.urgent && !t.completed)
    .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  const idx = Math.max(0, Math.min(newPriority - 1, normal.length));
  normal.splice(idx, 0, task);
  normal.forEach((t, i) => (t.priority = i + 1));
}

// ---------- completion ----------
function setCompleted(task, completed, board = currentBoard()) {
  const dateKey = task.date;
  if (completed) {
    task.completed = true;
    task.completedAt = Date.now();
    task.priority = null;
    posthog.capture('tarefa_completada', { urgent: !!task.urgent, board_id: board && board.id });
    if (!task.urgent) {
      const normal = siblingTasks(board, dateKey, task.id).filter(t => !t.urgent && !t.completed)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));
      normal.forEach((t, i) => (t.priority = i + 1));
    }
  } else {
    task.completed = false;
    task.completedAt = null;
    if (!task.urgent) {
      const max = siblingTasks(board, dateKey, task.id).filter(t => !t.urgent && !t.completed)
        .reduce((m, t) => Math.max(m, t.priority || 0), 0);
      task.priority = max + 1;
    }
  }
}

// ---------- day_logs: teto, prioridades (MIT), nota, fechamento ----------
// Substitui o MIT que vivia em localStorage por board (mit-{boardId}-{date}). Agora é uma
// prioridade por dia, cruzando boards — day_logs viaja no mesmo payload de /api/tasks.
const DAY_DEFAULT_CAPACITY_KEY = 'dayPopupDefaultCapacity';
function getDefaultCapacity() {
  const v = Number(localStorage.getItem(DAY_DEFAULT_CAPACITY_KEY));
  return v > 0 ? v : 6;
}
function setDefaultCapacity(v) {
  const n = Math.max(1, Math.round(Number(v)) || getDefaultCapacity());
  localStorage.setItem(DAY_DEFAULT_CAPACITY_KEY, String(n));
}
function getDayLog(dateKey) {
  return dayLogs[dateKey] || { capacity: null, mitIds: [], mitWhen: {}, note: '', nextDayMitIds: [], closedAt: null };
}
function patchDayLog(dateKey, patch) {
  dayLogs[dateKey] = { ...getDayLog(dateKey), ...patch };
  save();
}
function toggleMit(dateKey, taskId) {
  const log = getDayLog(dateKey);
  const has = log.mitIds.includes(taskId);
  if (!has && log.mitIds.length >= 3) return;
  const mitIds = has ? log.mitIds.filter(id => id !== taskId) : [...log.mitIds, taskId];
  const mitWhen = { ...log.mitWhen };
  if (has) delete mitWhen[taskId];
  patchDayLog(dateKey, { mitIds, mitWhen });
}
function setMitWhen(dateKey, taskId, when) {
  const log = getDayLog(dateKey);
  const mitWhen = { ...log.mitWhen };
  if (mitWhen[taskId] === when) delete mitWhen[taskId]; else mitWhen[taskId] = when;
  patchDayLog(dateKey, { mitWhen });
}
function toggleTomorrowMit(dateKey, taskId) {
  const log = getDayLog(dateKey);
  const ids = log.nextDayMitIds || [];
  const has = ids.includes(taskId);
  if (!has && ids.length >= 3) return;
  const nextDayMitIds = has ? ids.filter(id => id !== taskId) : [...ids, taskId];
  patchDayLog(dateKey, { nextDayMitIds });
}

// ---------- weather ----------
const WEATHER_LOCATION_KEY = 'weather-location';
const WEATHER_OVERRIDES_KEY = 'weather-date-overrides';
const WEATHER_CACHE_KEY = 'weather-cache';
const WEATHER_CACHE_TTL = 60 * 60 * 1000;

const WEATHER_ICONS = {
  0: '☀️',
  1: '🌤', 2: '⛅', 3: '🌥',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌦', 56: '🌦', 57: '🌦',
  61: '🌧', 63: '🌧', 65: '🌧', 66: '🌧', 67: '🌧',
  71: '🌨', 73: '🌨', 75: '🌨', 77: '🌨',
  80: '🌧', 81: '🌧', 82: '🌧',
  95: '⛈', 96: '⛈', 99: '⛈',
};
const WEATHER_LABELS = {
  0: 'Céu limpo',
  1: 'Poucas nuvens', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina com geada',
  51: 'Garoa fraca', 53: 'Garoa', 55: 'Garoa forte', 56: 'Garoa congelante', 57: 'Garoa congelante forte',
  61: 'Chuva fraca', 63: 'Chuva', 65: 'Chuva forte', 66: 'Chuva congelante', 67: 'Chuva congelante forte',
  71: 'Neve fraca', 73: 'Neve', 75: 'Neve forte', 77: 'Grãos de neve',
  80: 'Pancadas de chuva fracas', 81: 'Pancadas de chuva', 82: 'Pancadas de chuva fortes',
  95: 'Tempestade', 96: 'Tempestade com granizo', 99: 'Tempestade forte com granizo',
};
function weatherIcon(code) { return WEATHER_ICONS[code] || '🌡'; }
function weatherLabel(code) { return WEATHER_LABELS[code] || ''; }

let weatherLocation = null;      // { name, latitude, longitude, auto } — cidade padrão (demais dias sem override)
let weatherLocationPending = true;
let weatherOverrides = {};       // dateKey -> { name, latitude, longitude } — override por dia
let weatherCacheMap = {};        // coordsKey -> { fetchedAt, daily }
let weatherSearchOpen = false;
let weatherSearchQuery = '';
let weatherSearchResults = [];
let weatherSearchTimer = null;

function loadWeatherLocationFromStorage() {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveWeatherLocation(loc) {
  weatherLocation = loc;
  try { localStorage.setItem(WEATHER_LOCATION_KEY, JSON.stringify(loc)); } catch {}
}

function loadWeatherOverridesFromStorage() {
  try {
    const raw = localStorage.getItem(WEATHER_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function setWeatherOverrideForDate(dateKey, loc) {
  weatherOverrides[dateKey] = loc;
  try { localStorage.setItem(WEATHER_OVERRIDES_KEY, JSON.stringify(weatherOverrides)); } catch {}
}

// Localização efetiva de uma data: override específico ou a cidade padrão
function weatherLocationForDate(dateKey) {
  return weatherOverrides[dateKey] || weatherLocation;
}

// Retorna localização salva ou detecta via browser
async function getWeatherLocation() {
  const stored = loadWeatherLocationFromStorage();
  if (stored && stored.latitude != null && stored.longitude != null) {
    weatherLocation = stored;
    return stored;
  }
  if (!navigator.geolocation) return null;
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
    });
    const loc = { name: 'Local atual', latitude: pos.coords.latitude, longitude: pos.coords.longitude, auto: true };
    saveWeatherLocation(loc);
    return loc;
  } catch {
    return null;
  }
}

function coordsKeyFor(lat, lon) { return `${lat.toFixed(2)},${lon.toFixed(2)}`; }

function loadWeatherCacheMapFromStorage() {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && parsed.daily) return { [parsed.coordsKey]: { fetchedAt: parsed.fetchedAt, daily: parsed.daily } }; // formato antigo (única localização)
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }
}
function saveWeatherCacheMap() {
  try { localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherCacheMap)); } catch {}
}

// Busca previsão (com cache de 1h) para uma localização específica
async function fetchWeather(lat, lon) {
  const coordsKey = coordsKeyFor(lat, lon);
  const cached = weatherCacheMap[coordsKey];
  if (cached && (Date.now() - cached.fetchedAt) < WEATHER_CACHE_TTL) return cached;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&forecast_days=14`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const json = await res.json();
    const fresh = { fetchedAt: Date.now(), daily: json.daily };
    weatherCacheMap[coordsKey] = fresh;
    saveWeatherCacheMap();
    return fresh;
  } catch (err) {
    console.error('Falha ao buscar previsão do tempo:', err);
    if (cached) return cached; // offline: usa cache expirado se disponível
    return null;
  }
}

// Retorna { icon, label, max, min } para uma dateKey específica (respeita override da data)
function weatherForDay(dateKey) {
  const loc = weatherLocationForDate(dateKey);
  if (!loc) return null;
  const cache = weatherCacheMap[coordsKeyFor(loc.latitude, loc.longitude)];
  if (!cache || !cache.daily || !cache.daily.time) return null;
  const idx = cache.daily.time.indexOf(dateKey);
  if (idx === -1) return null;
  const code = cache.daily.weathercode[idx];
  return {
    icon: weatherIcon(code),
    label: weatherLabel(code),
    max: Math.round(cache.daily.temperature_2m_max[idx]),
    min: Math.round(cache.daily.temperature_2m_min[idx]),
  };
}

function columnWeatherHtml(dateKey) {
  const loc = weatherLocationForDate(dateKey);
  const w = weatherForDay(dateKey);
  const cityBtn = `<button type="button" class="col-weather-city-btn" data-date="${dateKey}" title="${loc ? 'Trocar cidade' : 'Selecionar cidade'}">📍</button>`;
  if (!w) return `<div class="col-weather col-weather-empty">${cityBtn}</div>`;
  const cityName = loc ? `<span class="col-weather-city">${escapeHtml(loc.name)}</span>` : '';
  return `
  <div class="col-weather">
    <span class="col-weather-info">${w.icon} ${w.max}° / ${w.min}°</span>
    ${cityName}
    ${cityBtn}
  </div>`;
}

// Injeta .col-weather em cada .col-header após render()
function renderWeatherOnColumns() {
  document.querySelectorAll('.col-header').forEach(headerEl => {
    const html = columnWeatherHtml(headerEl.dataset.date);
    const existing = headerEl.querySelector('.col-weather');
    if (existing) existing.outerHTML = html;
    else headerEl.insertAdjacentHTML('beforeend', html);
  });
}

function cityLabel(c) { return [c.name, c.admin1, c.country].filter(Boolean).join(', '); }

// Campo de busca com autocomplete (usado na Visão do Dia)
async function searchCity(query) {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=pt`);
    if (!res.ok) throw new Error('geocoding failed');
    const json = await res.json();
    return json.results || [];
  } catch (err) {
    console.error('Falha ao buscar cidade:', err);
    return [];
  }
}

function weatherCityResultsHtml() {
  if (weatherSearchResults.length) {
    return weatherSearchResults.map(c => `
      <button type="button" class="weather-city-option" data-lat="${c.latitude}" data-lon="${c.longitude}" data-name="${escapeHtml(cityLabel(c))}">${escapeHtml(cityLabel(c))}</button>
    `).join('');
  }
  return weatherSearchQuery.trim().length >= 2 ? '<div class="weather-city-empty">Nenhuma cidade encontrada</div>' : '';
}
function renderWeatherCityResults() {
  const el = document.querySelector('.weather-city-results');
  if (el) el.innerHTML = weatherCityResultsHtml();
}

function weatherSearchHtml() {
  return `
    <div class="day-popup-weather-search">
      <div class="day-popup-weather-search-row">
        <input type="text" id="weatherCityInput" class="weather-city-input" placeholder="Buscar cidade..." value="${escapeHtml(weatherSearchQuery)}" autocomplete="off">
        <button type="button" id="weatherSearchCancelBtn" class="weather-link-btn">cancelar</button>
      </div>
      <div class="weather-city-results">${weatherCityResultsHtml()}</div>
    </div>`;
}

// Renderiza bloco de clima dentro do DayPopup
function renderWeatherInDayPopup(dateKey) {
  const el = document.getElementById('dayPopupWeather');
  if (!el) return;

  if (weatherSearchOpen) {
    el.innerHTML = weatherSearchHtml();
    return;
  }
  const loc = weatherLocationForDate(dateKey);
  if (!loc) {
    el.innerHTML = weatherLocationPending
      ? `<div class="day-popup-weather-loading">Carregando...</div>`
      : `<div class="day-popup-weather-error">Localização indisponível · <button type="button" id="weatherSearchOpenBtn" class="weather-link-btn">buscar cidade</button></div>`;
    return;
  }
  const w = weatherForDay(dateKey);
  if (!w) {
    el.innerHTML = `<div class="day-popup-weather-loading">Carregando...</div>`;
    return;
  }
  el.innerHTML = `
    <div class="day-popup-weather-row">
      <span>📍 ${escapeHtml(loc.name)}</span>
      <button type="button" id="weatherSearchOpenBtn" class="weather-link-btn">trocar cidade</button>
    </div>
    <div class="day-popup-weather-forecast">${w.icon} ${escapeHtml(w.label)} · ${w.max}° / ${w.min}°</div>`;
}

// Muda a cidade apenas para a data informada; as demais seguem a cidade padrão
async function selectWeatherCity(loc, dateKey) {
  setWeatherOverrideForDate(dateKey, loc);
  weatherSearchOpen = false;
  weatherSearchQuery = '';
  weatherSearchResults = [];
  if (dayPopupDate) renderWeatherInDayPopup(dayPopupDate);
  await fetchWeather(loc.latitude, loc.longitude);
  renderWeatherOnColumns();
  if (dayPopupDate) renderWeatherInDayPopup(dayPopupDate);
}

async function initWeather() {
  weatherOverrides = loadWeatherOverridesFromStorage();
  weatherCacheMap = loadWeatherCacheMapFromStorage();

  const loc = await getWeatherLocation();
  weatherLocationPending = false;

  const uniqueLocs = new Map();
  if (loc) uniqueLocs.set(coordsKeyFor(loc.latitude, loc.longitude), loc);
  Object.values(weatherOverrides).forEach(l => {
    if (l && l.latitude != null && l.longitude != null) uniqueLocs.set(coordsKeyFor(l.latitude, l.longitude), l);
  });
  await Promise.all([...uniqueLocs.values()].map(l => fetchWeather(l.latitude, l.longitude)));

  renderWeatherOnColumns();
  if (dayPopupDate) renderWeatherInDayPopup(dayPopupDate);
}

// ---------- weather: popover de seleção de cidade (cabeçalho das colunas) ----------
const weatherPopoverEl = document.getElementById('weatherCityPopover');
const weatherPopoverInputEl = document.getElementById('weatherPopoverInput');
let weatherPopoverQuery = '';
let weatherPopoverResults = [];
let weatherPopoverTimer = null;
let weatherPopoverDateKey = null;

function renderWeatherPopoverResults() {
  const el = document.getElementById('weatherPopoverResults');
  if (!el) return;
  if (weatherPopoverResults.length) {
    el.innerHTML = weatherPopoverResults.map(c => `
      <button type="button" class="weather-city-option" data-lat="${c.latitude}" data-lon="${c.longitude}" data-name="${escapeHtml(cityLabel(c))}">${escapeHtml(cityLabel(c))}</button>
    `).join('');
  } else {
    el.innerHTML = weatherPopoverQuery.trim().length >= 2 ? '<div class="weather-city-empty">Nenhuma cidade encontrada</div>' : '';
  }
}

function onWeatherPopoverOutsideClick(e) {
  if (!weatherPopoverEl.contains(e.target) && !e.target.closest('.col-weather-city-btn')) closeWeatherPopover();
}
function onWeatherPopoverKeydown(e) {
  if (e.key === 'Escape') closeWeatherPopover();
}

function openWeatherPopover(anchorEl) {
  weatherPopoverDateKey = anchorEl.dataset.date;
  weatherPopoverQuery = '';
  weatherPopoverResults = [];
  weatherPopoverInputEl.value = '';
  renderWeatherPopoverResults();

  weatherPopoverEl.classList.remove('hidden');
  const rect = anchorEl.getBoundingClientRect();
  const popoverWidth = weatherPopoverEl.offsetWidth || 220;
  const left = Math.min(Math.max(10, rect.left), window.innerWidth - popoverWidth - 10);
  weatherPopoverEl.style.top = `${rect.bottom + 6}px`;
  weatherPopoverEl.style.left = `${left}px`;

  weatherPopoverInputEl.focus();
  document.addEventListener('mousedown', onWeatherPopoverOutsideClick);
  document.addEventListener('keydown', onWeatherPopoverKeydown);
}
function closeWeatherPopover() {
  weatherPopoverEl.classList.add('hidden');
  document.removeEventListener('mousedown', onWeatherPopoverOutsideClick);
  document.removeEventListener('keydown', onWeatherPopoverKeydown);
}

weatherPopoverEl.addEventListener('click', e => {
  const opt = e.target.closest('.weather-city-option');
  if (!opt) return;
  selectWeatherCity({
    name: opt.dataset.name,
    latitude: parseFloat(opt.dataset.lat),
    longitude: parseFloat(opt.dataset.lon),
    auto: false,
  }, weatherPopoverDateKey);
  closeWeatherPopover();
});
weatherPopoverInputEl.addEventListener('input', e => {
  weatherPopoverQuery = e.target.value;
  clearTimeout(weatherPopoverTimer);
  weatherPopoverTimer = setTimeout(async () => {
    weatherPopoverResults = await searchCity(weatherPopoverQuery);
    renderWeatherPopoverResults();
  }, 400);
});

// ---------- rendering ----------
function render() {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (d > YEAR_END) break;
    days.push(d);
  }
  const first = days[0], last = days[days.length - 1];
  weekRangeEl.textContent = `${String(first.getDate()).padStart(2, '0')}/${MON[first.getMonth()]} - ${String(last.getDate()).padStart(2, '0')}/${MON[last.getMonth()]}`;

  document.getElementById('prevDay').disabled = toKey(weekStart) <= toKey(YEAR_START);
  document.getElementById('prevWeek').disabled = toKey(weekStart) <= toKey(YEAR_START);
  document.getElementById('nextDay').disabled = addDays(weekStart, 1) > YEAR_END;
  document.getElementById('nextWeek').disabled = addDays(weekStart, 7) > YEAR_END;

  board.innerHTML = noDateColumnHtml() + days.map(d => columnHtml(d)).join('');
  renderWeatherOnColumns();
}

// Tarefas sem data (própria do board ou de checklist de atividade promovida sem antecedência
// mínima definida) — aparecem numa coluna "Sem data" fixa no início do board.
function tasksWithoutDate(board = currentBoard()) {
  const ownTasks = (board.tasks || []).filter(t => !t.date);
  const promotedTasks = activities
    .flatMap(a => (a.checklistTasks || []))
    .filter(t => t.boardId === board.id && !t.date);
  return [...ownTasks, ...promotedTasks];
}

function noDateColumnHtml() {
  const items = tasksWithoutDate();
  if (!items.length) return '';
  return `
  <div class="column column-no-date">
    <div class="col-header" data-date="">
      <div class="col-header-top">
        <div class="col-title">Sem data</div>
      </div>
      <div class="col-stats">
        <span>${items.length} tarefa(s) sem data definida</span>
      </div>
    </div>
    <div class="col-body" data-date="">
      ${items.map(t => cardHtml(t, currentBoard())).join('')}
    </div>
  </div>`;
}

function columnHtml(d) {
  const key = toKey(d);
  const items = tasksFor(key);
  const total = items.length;
  const done = items.filter(t => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const events = eventsForBoardDate(activeBoardId, key);
  const closed = !!getDayLog(key).closedAt;

  return `
  <div class="column${closed ? ' day-closed' : ''}">
    <div class="col-header" data-date="${key}">
      <div class="col-header-top">
        <div class="col-title-group">
          <div class="col-title">${label(d)}</div>
          ${closed ? '<span class="col-closed-pill">✓ Fechado</span>' : ''}
        </div>
        <span class="col-progress-ring"></span>
      </div>
      <div class="col-stats">
        <span>${total} tarefas · ${done} concluídas · ${pct}%</span>
      </div>
    </div>
    ${events.length ? `<div class="col-events">${events.map(ev => eventChipHtml(ev, key)).join('')}</div>` : ''}
    <div class="col-body" data-date="${key}">
      ${items.map(t => cardHtml(t, currentBoard())).join('')}
    </div>
    <form class="add-form" data-date="${key}">
      <input type="text" placeholder="+ nova tarefa" required>
    </form>
  </div>`;
}

function eventChipHtml(ev, key) {
  const dots = ev.boardIds.map(bid => {
    const b = boards.find(x => x.id === bid);
    return b ? `<span class="dot" style="background:${b.color}"></span>` : '';
  }).join('');
  const span = eventSpanLabel(ev, key);
  return `
  <div class="event-chip" data-event-id="${ev.id}">
    <span class="dot-group">${dots}</span>
    <span class="event-name">${escapeHtml(ev.name)}</span>
    ${span ? `<span class="event-span">${span}</span>` : ''}
  </div>`;
}

function cardHtml(t, board = currentBoard()) {
  const cls = ['card', t.urgent ? 'urgent' : 'normal', t.completed ? 'completed' : ''].join(' ');
  const fields = (board && board.fields) || [];
  const fieldTags = fields.map(f => (t.fieldValues && t.fieldValues[f.id]) ? fieldTagHtml(f.id, t.fieldValues[f.id], board) : '').join('');
  return `
  <div class="${cls}" draggable="true" data-id="${t.id}">
    ${t.seriesId ? '<span class="recurring-badge" title="Tarefa recorrente">🔁</span>' : ''}
    <div class="card-top">
      <input type="checkbox" class="chk-done" ${t.completed ? 'checked' : ''}>
      <div class="card-name">${escapeHtml(t.name)}</div>
      ${t.urgent ? '<span class="badge">URGENTE</span>' : ''}
    </div>
    <div class="card-meta">
      ${!t.completed && t.priority ? `<span>#${t.priority}</span>` : ''}
      ${t.delegated ? `<span>👤 ${escapeHtml(t.delegatedTo || '-')}</span>` : ''}
      ${t.link ? `<a href="${escapeHtml(t.link)}" target="_blank" rel="noopener">🔗</a>` : ''}
      ${fieldTags}
    </div>
  </div>`;
}

// ---------- add / update / delete ----------
// board é opcional (default currentBoard()) para preservar o único call site original (form
// "+ nova tarefa" da coluna); a captura inline do painel da Visão do Dia passa um board explícito
// escolhido no seletor, que pode ser diferente de activeBoardId.
function addTask(dateKey, name, board = currentBoard()) {
  const tasks = board.tasks;
  const normalMax = tasks.filter(t => t.date === dateKey && !t.urgent).reduce((m, t) => Math.max(m, t.priority || 0), 0);
  tasks.push({
    id: uid(), name, date: dateKey, deliveryDate: dateKey, link: '',
    priority: normalMax + 1, urgent: false, urgentRank: 0,
    delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
    fieldValues: {}, team: [], archived: false,
  });
  posthog.capture('tarefa_criada', { board_id: board.id });
  save(); refreshCalendarAndBoard();
}
function findTask(id, board = currentBoard()) { return board.tasks.find(t => t.id === id); }

// Localiza uma tarefa dentro de um board JÁ CONHECIDO: busca primeiro em board.tasks (tarefa
// normal) e, se não encontrar, nas checklistTasks de qualquer atividade promovida para esse
// board (tarefa de checklist já promovida — aparece nesse board via getTasksForDateAndBoard(),
// mas não é duplicada em board.tasks). Superset de findTask(id, board) — usado por qualquer
// interação de card (checkbox, drag-and-drop, Visão do Dia, abrir modal) que possa envolver
// uma tarefa promovida renderizada dentro de um board específico.
function findTaskInBoard(id, board) {
  if (!board) return null;
  const own = board.tasks.find(t => t.id === id);
  if (own) return own;
  for (const a of activities) {
    const t = (a.checklistTasks || []).find(x => x.id === id && x.boardId === board.id);
    if (t) return t;
  }
  return null;
}

// Localiza uma tarefa quando o board de contexto já é conhecido (ex.: openModal chamado a
// partir da Visão do Dia, que já resolveu o board pelo dataset.boardId): tenta board.tasks
// primeiro (tarefa normal) e cai para as checklistTasks de atividades promovidas para esse
// board. Mesma forma de retorno de findTaskAnywhere(), para os dois caminhos serem
// intercambiáveis em openModal().
function resolveFoundInBoard(id, board) {
  const own = board.tasks.find(t => t.id === id);
  if (own) return { task: own, source: 'board', board, activity: null };
  for (const a of activities) {
    const t = (a.checklistTasks || []).find(x => x.id === id && x.boardId === board.id);
    if (t) return { task: t, source: 'checklist', board, activity: a };
  }
  return { task: null, source: null, board, activity: null };
}

// Localiza uma tarefa em qualquer lugar do app: nos boards (tarefas normais) ou nos checklists
// das atividades (promovidas ou não). Superset de findTask() — usado por qualquer fluxo de
// edição que precise funcionar tanto para tarefas de board quanto de checklist.
function findTaskAnywhere(id) {
  for (const b of boards) {
    const t = b.tasks.find(x => x.id === id);
    if (t) return { task: t, source: 'board', board: b, activity: null };
  }
  for (const a of activities) {
    const t = (a.checklistTasks || []).find(x => x.id === id);
    if (t) {
      // Tarefa de checklist já promovida (boardId setado) aparece na mesma coluna do
      // board que suas irmãs — resolve o board real para que setPriority/setCompleted
      // consigam reordenar corretamente entre tarefas promovidas e normais.
      const board = t.boardId ? (boards.find(b => b.id === t.boardId) || null) : null;
      return { task: t, source: 'checklist', board, activity: a };
    }
  }
  return null;
}

// Resolve a tarefa/board/atividade da tarefa atualmente aberta no modal de edição (editingId),
// via findTaskAnywhere() — funciona tanto para tarefas de board quanto de checklist. Para
// tarefas de checklist ainda não promovidas (sem board), `board` retorna um objeto sintético
// com `.id: null` — setPriority/setCompleted tratam isso como "sem coluna para reordenar".
function resolveEditingContext() {
  const found = findTaskAnywhere(editingId);
  if (!found) return null;
  const board = found.board || { id: null, tasks: [] };
  return { task: found.task, board, activity: found.activity, source: found.source };
}

// Remove a tarefa de onde quer que ela esteja (board ou checklist de atividade).
function removeTaskAnywhere(id) {
  const found = findTaskAnywhere(id);
  if (!found) return;
  if (found.source === 'board') {
    found.board.tasks = found.board.tasks.filter(t => t.id !== id);
  } else {
    found.activity.checklistTasks = (found.activity.checklistTasks || []).filter(t => t.id !== id);
  }
}
function deleteTask(id, board = currentBoard()) {
  board.tasks = board.tasks.filter(t => t.id !== id);
  save(); refreshCalendarAndBoard();
}

// ---------- recorrência: tornar uma tarefa aberta recorrente ----------
const recToggleRow = document.getElementById('recToggleRow');
const recToggleSwitch = document.getElementById('recToggleSwitch');
const recToggleHint = document.getElementById('recToggleHint');
const recurrencePanel = document.getElementById('recurrencePanel');
const recTabs = document.querySelectorAll('.rec-tab');
const recSections = document.querySelectorAll('.rec-section');
const recMonthlyDayEl = document.getElementById('rec-monthly-day');
const recCustomIntervalEl = document.getElementById('rec-custom-interval');
const recEndDateEl = document.getElementById('rec-end-date');
const recurrenceSummaryEl = document.getElementById('recurrenceSummary');
const weekdayPillEls = document.querySelectorAll('.weekday-pill');
const applyRecurrenceBtn = document.getElementById('applyRecurrenceBtn');

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABEL_PT = { mon: 'seg', tue: 'ter', wed: 'qua', thu: 'qui', fri: 'sex', sat: 'sáb', sun: 'dom' };

let recurrenceOn = false;
let recActiveTab = 'daily';

function fmtDateBR(dateKey) {
  if (!dateKey) return '';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

function joinWeekdayNames(names) {
  if (names.length === 1) return names[0];
  return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
}

function buildRecurrenceRule() {
  const type = recActiveTab;
  const rule = { type, endDate: recEndDateEl.value };
  if (type === 'daily') {
    const checked = document.querySelector('input[name="rec-daily"]:checked');
    rule.workdaysOnly = !!checked && checked.value === 'workdays';
  } else if (type === 'weekly') {
    rule.days = [...weekdayPillEls].filter(p => p.classList.contains('selected')).map(p => p.dataset.day);
  } else if (type === 'monthly') {
    rule.dayOfMonth = new Date(f.date.value + 'T00:00:00').getDate();
  } else if (type === 'custom') {
    rule.interval = Math.max(2, Math.min(60, Number(recCustomIntervalEl.value) || 2));
  }
  return rule;
}

function formatRecurrenceSummary(rule) {
  if (!rule) return '';
  let desc = '';
  if (rule.type === 'daily') {
    desc = rule.workdaysOnly ? 'Todo dia útil' : 'Todos os dias';
  } else if (rule.type === 'weekly') {
    const days = WEEKDAY_ORDER.filter(d => (rule.days || []).includes(d)).map(d => WEEKDAY_LABEL_PT[d]);
    desc = days.length ? `Toda ${joinWeekdayNames(days)}` : 'Nenhum dia selecionado';
  } else if (rule.type === 'monthly') {
    desc = `Todo dia ${rule.dayOfMonth} do mês`;
  } else if (rule.type === 'custom') {
    desc = `A cada ${rule.interval} dias`;
  }
  return rule.endDate ? `🔁 ${desc} · até ${fmtDateBR(rule.endDate)}` : `🔁 ${desc}`;
}

function updateRecurrenceSummary() {
  if (!recurrenceOn) return;
  const rule = buildRecurrenceRule();
  // Sem data de término, generateRecurrenceInstances() não tem como calcular ocorrências futuras —
  // trata como o mesmo caso de "zero ocorrências" (bloqueia o salvamento com o mesmo erro inline),
  // em vez de deixar passar em branco e falhar silenciosamente ao clicar "Aplicar recorrência".
  const hasZeroOccurrences = !rule.endDate || generateRecurrenceInstances(rule, f.date.value).length === 0;
  if (hasZeroOccurrences) {
    recurrenceSummaryEl.textContent = 'Esse padrão não gera nenhuma ocorrência antes da data de término.';
    recurrenceSummaryEl.classList.add('error');
  } else {
    recurrenceSummaryEl.textContent = formatRecurrenceSummary(rule);
    recurrenceSummaryEl.classList.remove('error');
  }
  applyRecurrenceBtn.disabled = hasZeroOccurrences;
}

function selectRecTab(type) {
  recActiveTab = type;
  recTabs.forEach(t => t.classList.toggle('active', t.dataset.type === type));
  recSections.forEach(s => s.classList.toggle('active', s.dataset.section === type));
  updateRecurrenceSummary();
}

function resetRecurrencePanel(dateKey) {
  recurrenceOn = false;
  recToggleSwitch.classList.remove('on');
  recToggleHint.textContent = 'Não';
  recurrencePanel.classList.add('hidden');

  recActiveTab = 'daily';
  document.querySelectorAll('input[name="rec-daily"]')[0].checked = true;
  weekdayPillEls.forEach(p => p.classList.remove('selected'));
  recCustomIntervalEl.value = 14;
  recMonthlyDayEl.textContent = new Date(dateKey + 'T00:00:00').getDate();
  recEndDateEl.value = '';
  recEndDateEl.max = '2026-12-31';
  recurrenceSummaryEl.classList.remove('error');
  applyRecurrenceBtn.disabled = false;
  selectRecTab('daily');
}

recTabs.forEach(t => t.addEventListener('click', () => selectRecTab(t.dataset.type)));

recToggleRow.addEventListener('click', () => {
  recurrenceOn = !recurrenceOn;
  recToggleSwitch.classList.toggle('on', recurrenceOn);
  recToggleHint.textContent = recurrenceOn ? 'Sim' : 'Não';
  recurrencePanel.classList.toggle('hidden', !recurrenceOn);
  if (recurrenceOn) {
    updateRecurrenceSummary();
  } else {
    recurrenceSummaryEl.classList.remove('error');
    applyRecurrenceBtn.disabled = false;
  }
});

weekdayPillEls.forEach(p => p.addEventListener('click', () => {
  p.classList.toggle('selected');
  updateRecurrenceSummary();
}));
document.querySelectorAll('input[name="rec-daily"]').forEach(r => r.addEventListener('change', updateRecurrenceSummary));
recCustomIntervalEl.addEventListener('input', updateRecurrenceSummary);
recEndDateEl.addEventListener('change', updateRecurrenceSummary);

// ---------- recorrência: aviso de volume (>90 instâncias) ----------
const RECURRENCE_VOLUME_WARNING_THRESHOLD = 90;
const confirmVolumeOverlay = document.getElementById('confirmVolumeOverlay');
const confirmVolumeCountEl = document.getElementById('confirmVolumeCount');
const confirmVolumeStartEl = document.getElementById('confirmVolumeStart');
const confirmVolumeEndEl = document.getElementById('confirmVolumeEnd');
const confirmVolumeBtnEl = document.getElementById('confirmVolumeBtn');
const cancelVolumeBtnEl = document.getElementById('cancelVolumeBtn');

let pendingRecurrenceRule = null;
let pendingRecurrenceDates = null;

function closeConfirmVolumeOverlay() {
  confirmVolumeOverlay.classList.add('hidden');
  pendingRecurrenceRule = null;
  pendingRecurrenceDates = null;
}

function handleApplyRecurrence() {
  if (applyRecurrenceBtn.disabled) return;
  const startDateKey = f.date.value;
  const rule = buildRecurrenceRule();
  const dates = generateRecurrenceInstances(rule, startDateKey);
  if (!dates.length) return; // guarda extra: botão já deveria estar disabled (fe-09)

  if (dates.length > RECURRENCE_VOLUME_WARNING_THRESHOLD) {
    pendingRecurrenceRule = rule;
    pendingRecurrenceDates = dates;
    confirmVolumeCountEl.textContent = dates.length;
    confirmVolumeStartEl.textContent = fmtDateBR(startDateKey);
    confirmVolumeEndEl.textContent = fmtDateBR(rule.endDate);
    confirmVolumeBtnEl.textContent = `Criar ${dates.length} tarefas`;
    confirmVolumeOverlay.classList.remove('hidden');
    return;
  }

  commitRecurrenceForEditingTask(rule, dates);
}

applyRecurrenceBtn.addEventListener('click', handleApplyRecurrence);
cancelVolumeBtnEl.addEventListener('click', closeConfirmVolumeOverlay);
confirmVolumeOverlay.addEventListener('click', e => { if (e.target === confirmVolumeOverlay) closeConfirmVolumeOverlay(); });
confirmVolumeBtnEl.addEventListener('click', () => {
  const rule = pendingRecurrenceRule, dates = pendingRecurrenceDates;
  confirmVolumeOverlay.classList.add('hidden');
  pendingRecurrenceRule = null;
  pendingRecurrenceDates = null;
  commitRecurrenceForEditingTask(rule, dates);
});

// Transforma a tarefa aberta na primeira ocorrência de uma nova série: a instância existente é
// reaproveitada (mantém id/histórico) e as demais datas do rule viram novas tarefas.
function commitRecurrenceForEditingTask(rule, dates) {
  const ctx = resolveEditingContext();
  if (!ctx || ctx.source !== 'board') return; // recorrência só existe para tarefas de board
  const { task: t, board } = ctx;
  const tasks = board.tasks;
  const seriesId = uid();

  function pushInstance(dateKey) {
    const normalMax = tasks.filter(x => x.date === dateKey && !x.urgent).reduce((m, x) => Math.max(m, x.priority || 0), 0);
    tasks.push({
      id: uid(), name: t.name, date: dateKey, deliveryDate: dateKey, link: t.link,
      priority: normalMax + 1, urgent: false, urgentRank: 0,
      delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
      fieldValues: {}, team: [], archived: false,
      seriesId, recurrenceRule: rule, isException: false,
    });
  }

  t.seriesId = seriesId;
  t.recurrenceRule = rule;
  t.isException = false;
  dates.filter(dateKey => dateKey !== t.date).forEach(pushInstance);

  save();
  refreshCalendarAndBoard();
  openModal(editingId, board);
}

// ---------- modal ----------
const overlay = document.getElementById('modalOverlay');
const fFieldsContainer = document.getElementById('f-fields');
const f = {
  name: document.getElementById('f-name'),
  date: document.getElementById('f-date'),
  link: document.getElementById('f-link'),
  delegated: document.getElementById('f-delegated'),
  delegatedTo: document.getElementById('f-delegatedTo'),
  delegatedDate: document.getElementById('f-delegatedDate'),
  priority: document.getElementById('f-priority'),
  urgent: document.getElementById('f-urgent'),
  completed: document.getElementById('f-completed'),
};
const delegateFields = document.getElementById('delegateFields');
const priorityField = document.getElementById('priorityField');
const seriesInfoBarEl = document.getElementById('seriesInfoBar');
const seriesInfoTextEl = document.getElementById('seriesInfoText');

function formatSeriesInfoText(t) {
  const summary = formatRecurrenceSummary(t.recurrenceRule).replace(/^🔁\s*/, '');
  return `Série: ${t.name} · ${summary}`;
}

function renderModalFields(task, board = currentBoard()) {
  const fields = board.fields || [];
  fFieldsContainer.innerHTML = fields.map(f => `
    <label>${escapeHtml(f.name)}
      <select class="f-field-select" data-field-id="${f.id}">
        <option value="">Nenhum</option>
        ${f.values.map(v => `<option value="${v.id}" ${task.fieldValues && task.fieldValues[f.id] === v.id ? 'selected' : ''}>${escapeHtml(v.name)}</option>`).join('')}
      </select>
    </label>
  `).join('');
  fFieldsContainer.querySelectorAll('.f-field-select').forEach(sel => {
    sel.addEventListener('change', () => {
      patch(t => {
        if (!t.fieldValues) t.fieldValues = {};
        if (sel.value) t.fieldValues[sel.dataset.fieldId] = sel.value;
        else delete t.fieldValues[sel.dataset.fieldId];
      });
    });
  });
}

// ---------- projeto (campo custom "Projeto") ----------
function findProjectField(board) { return (board.fields || []).find(f => f.name === 'Projeto') || null; }
function taskProjectInfo(t, board) {
  const field = findProjectField(board);
  const val = field && t.fieldValues && field.values.find(v => v.id === t.fieldValues[field.id]);
  return val ? { id: val.id, name: val.name, color: val.color } : { id: '__none__', name: 'Sem projeto', color: '#D8D2C2' };
}

// ---------- card da tarefa: equipe ----------
const teamEmptyStateEl = document.getElementById('teamEmptyState');
const teamMembersListEl = document.getElementById('teamMembersList');
const addTeamMemberBtnEl = document.getElementById('addTeamMemberBtn');
const addTeamMemberFormEl = document.getElementById('addTeamMemberForm');
const teamMemberNameEl = document.getElementById('teamMemberName');
const teamMemberAreaEl = document.getElementById('teamMemberArea');
const teamMemberSuggestionsEl = document.getElementById('teamMemberSuggestions');

function taskModalMetaHtml(t, board) {
  const info = taskProjectInfo(t, board);
  const d = new Date(t.date + 'T00:00:00');
  const dow = DOW[d.getDay()];
  const [, m, day] = t.date.split('-');
  return `<span class="dot" style="background:${info.color}"></span>${escapeHtml(info.name)} · ${dow} · ${day}/${m}`;
}

function currentEditingTask() {
  const ctx = resolveEditingContext();
  return ctx ? ctx.task : null;
}

function renderTeamSection(t) {
  const team = t.team || [];
  teamEmptyStateEl.classList.toggle('hidden', team.length > 0);
  if (!team.length) {
    const p = principalPerson();
    teamEmptyStateEl.innerHTML = p
      ? `Sem equipe cadastrada — usa <strong>${escapeHtml(p.name)}</strong> como responsável.`
      : `Sem equipe cadastrada — nenhuma pessoa principal definida em Configurações.`;
  }
  teamMembersListEl.innerHTML = team.map((m, i) => `
    <div class="team-member-row" data-index="${i}">
      <span>${escapeHtml(m.name)}${m.area ? ` <span class="team-member-area">· ${escapeHtml(m.area)}</span>` : ''}</span>
      <button type="button" class="team-member-remove" data-index="${i}" title="Remover">×</button>
    </div>`).join('');
  addingTeamMember = false;
  addTeamMemberBtnEl.classList.remove('hidden');
  addTeamMemberFormEl.classList.add('hidden');
}

function startAddTeamMember() {
  addingTeamMember = true;
  addTeamMemberBtnEl.classList.add('hidden');
  addTeamMemberFormEl.classList.remove('hidden');
  teamMemberNameEl.value = '';
  teamMemberAreaEl.value = '';
  teamMemberSuggestionsEl.classList.add('hidden');
  teamMemberSuggestionsEl.innerHTML = '';
  teamMemberNameEl.focus();
}
function cancelAddTeamMember() {
  const t = currentEditingTask();
  if (t) renderTeamSection(t);
}
function renderTeamSuggestions(query) {
  const q = query.trim().toLowerCase();
  if (!q) { teamMemberSuggestionsEl.classList.add('hidden'); teamMemberSuggestionsEl.innerHTML = ''; return; }
  const matches = people.filter(p => p.name.toLowerCase().includes(q)).slice(0, 4);
  teamMemberSuggestionsEl.classList.toggle('hidden', !matches.length);
  teamMemberSuggestionsEl.innerHTML = matches.map(p => `
    <div class="autocomplete-suggestion-row" data-id="${p.id}">${escapeHtml(p.name)}${p.area ? ` · ${escapeHtml(p.area)}` : ''}</div>
  `).join('');
}
function confirmAddTeamMember() {
  const name = teamMemberNameEl.value.trim();
  if (!name) return;
  const area = teamMemberAreaEl.value.trim();
  if (!findPersonByName(name)) addPerson(name, area);
  patch(t => { if (!t.team) t.team = []; t.team.push({ name, area }); });
  const t = currentEditingTask();
  if (t) renderTeamSection(t);
}
function removeTeamMember(index) {
  patch(t => { t.team.splice(index, 1); });
  const t = currentEditingTask();
  if (t) renderTeamSection(t);
}

addTeamMemberBtnEl.addEventListener('click', startAddTeamMember);
document.getElementById('cancelAddTeamMember').addEventListener('click', cancelAddTeamMember);
document.getElementById('confirmAddTeamMember').addEventListener('click', confirmAddTeamMember);
teamMemberNameEl.addEventListener('input', () => renderTeamSuggestions(teamMemberNameEl.value));
teamMemberSuggestionsEl.addEventListener('click', e => {
  const row = e.target.closest('.autocomplete-suggestion-row');
  if (!row) return;
  const p = people.find(x => x.id === row.dataset.id);
  if (!p) return;
  teamMemberNameEl.value = p.name;
  teamMemberAreaEl.value = p.area || '';
  teamMemberSuggestionsEl.classList.add('hidden');
  teamMemberSuggestionsEl.innerHTML = '';
});
teamMembersListEl.addEventListener('click', e => {
  const rm = e.target.closest('.team-member-remove');
  if (rm) removeTeamMember(Number(rm.dataset.index));
});

let editingTaskBoardId = null;

// Abre o modal de edição para uma tarefa de board (passando `board` explicitamente, como sempre
// foi feito) ou para uma tarefa de checklist de atividade (chamando sem `board` — fe-31 usa esse
// caminho). Quando a tarefa vem de um checklist ainda não promovido (sem boardId), os campos que
// dependem de contexto de board (data, prioridade, urgência, recorrência) ficam ocultos — o
// usuário ainda edita nome, duração, link, delegação, campos customizados (se já promovida) e
// pode marcar como concluída.
function openModal(id, board) {
  const found = board ? resolveFoundInBoard(id, board) : findTaskAnywhere(id);
  if (!found || !found.task) return;
  const t = found.task;
  editingId = id;
  editingTaskBoardId = found.board ? found.board.id : (t.boardId || null);
  const isChecklistUnpromoted = found.source === 'checklist' && !t.boardId;

  document.getElementById('dateField').classList.toggle('hidden', isChecklistUnpromoted);
  document.getElementById('urgentField').classList.toggle('hidden', isChecklistUnpromoted);

  if (isChecklistUnpromoted) {
    seriesInfoBarEl.classList.add('hidden');
    recToggleRow.classList.add('hidden');
    recurrencePanel.classList.add('hidden');
  } else if (t.seriesId && t.recurrenceRule && !t.isException) {
    // Instâncias já marcadas isException se comportam como tarefa comum (não perguntam escopo ao
    // editar/excluir) — mostrar a barra de série aqui induziria o usuário a achar que a edição vai
    // perguntar escopo, quando na verdade não vai (ver critério de aceite sobre isException).
    seriesInfoTextEl.textContent = formatSeriesInfoText(t);
    seriesInfoBarEl.classList.remove('hidden');
    recToggleRow.classList.add('hidden');
    recurrencePanel.classList.add('hidden');
  } else {
    seriesInfoBarEl.classList.add('hidden');
    recToggleRow.classList.remove('hidden');
    resetRecurrencePanel(t.deliveryDate || t.date || toKey(new Date()));
  }
  f.name.value = t.name;
  f.date.value = t.deliveryDate || t.date || '';
  f.link.value = t.link || '';
  // Campos customizados: refletem o board de destino quando a tarefa já pertence a um (board
  // puro, ou checklist já promovido); tarefa de checklist ainda não promovida não tem board.
  const fieldsBoard = found.board || boards.find(b => b.id === t.boardId) || { fields: [] };
  renderModalFields(t, fieldsBoard);
  document.getElementById('taskModalMeta').innerHTML = t.date
    ? taskModalMetaHtml(t, fieldsBoard)
    : (found.activity ? `Checklist de <strong>${escapeHtml(found.activity.name)}</strong> · atividade ainda não planejada` : '');
  renderTeamSection(t);
  f.delegated.checked = t.delegated;
  f.delegatedTo.value = t.delegatedTo || '';
  f.delegatedDate.value = t.delegatedDate || '';
  f.priority.value = t.priority || 1;
  f.urgent.checked = t.urgent;
  f.completed.checked = t.completed;
  delegateFields.classList.toggle('hidden', !t.delegated);
  priorityField.classList.toggle('hidden', isChecklistUnpromoted || t.completed);
  overlay.classList.remove('hidden');
}
function closeModal() {
  overlay.classList.add('hidden');
  editingId = null;
  editingTaskBoardId = null;
  editScopeChoice = null;
  pendingPatchFn = null;
  addingTeamMember = false;
  addTeamMemberBtnEl.classList.remove('hidden');
  addTeamMemberFormEl.classList.add('hidden');
  if (dayPopupDate) renderDayPopup();
  if (exportOpen) renderExportModal();
  if (currentView === 'activities') renderActivities();
}

document.getElementById('closeModal').addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

// ---------- edição em série: "apenas esta ocorrência" x "esta e todas as futuras" ----------
// editScopeChoice vale para o resto da sessão de edição (até closeModal()): null (ainda não perguntado),
// 'only' (edições aplicam só na instância aberta) ou 'all' (edições propagam para a série).
let editScopeChoice = null;
let pendingPatchFn = null;

const confirmEditScopeOverlay = document.getElementById('confirmEditScopeOverlay');
const editScopeOnlyThisBtn = document.getElementById('editScopeOnlyThis');
const editScopeAllFutureBtn = document.getElementById('editScopeAllFuture');
const editScopeOnlyThisDescEl = document.getElementById('editScopeOnlyThisDesc');
const editScopeAllFutureDescEl = document.getElementById('editScopeAllFutureDesc');
const cancelEditScopeBtn = document.getElementById('cancelEditScope');

function openEditScopeModal(t) {
  const dateLabel = fmtDateBR(t.date);
  editScopeOnlyThisDescEl.textContent = `Somente ${dateLabel} será alterada. O restante da série permanece igual.`;
  editScopeAllFutureDescEl.textContent = `${dateLabel} e todas as ocorrências seguintes serão atualizadas.`;
  confirmEditScopeOverlay.classList.remove('hidden');
}
function closeEditScopeModal() { confirmEditScopeOverlay.classList.add('hidden'); }

function resolveEditScope(choice) {
  editScopeChoice = choice;
  closeEditScopeModal();
  const fn = pendingPatchFn;
  pendingPatchFn = null;
  const ctx = resolveEditingContext();
  if (ctx && fn) {
    const { task: t, board } = ctx;
    // "Apenas esta ocorrência" tira a instância da série de fato (fe-14/v1): sem isso, ela
    // continuaria contando como parte ativa da série e seria sobrescrita por um futuro
    // "esta e todas as futuras" aplicado a partir de uma instância anterior, revertendo
    // silenciosamente a decisão do usuário de isolar essa ocorrência.
    if (choice === 'only') t.isException = true;
    applyPatchWithScope(t, board, fn, choice);
  }
}
editScopeOnlyThisBtn.addEventListener('click', () => resolveEditScope('only'));
editScopeAllFutureBtn.addEventListener('click', () => resolveEditScope('all'));
cancelEditScopeBtn.addEventListener('click', () => {
  // Sem decisão de escopo: descarta a mudança pendente (nada é salvo) e revalida os campos do
  // modal a partir do estado em memória (que não mudou), já que o app não tem "desfazer" de input.
  pendingPatchFn = null;
  closeEditScopeModal();
  if (editingId) openModal(editingId);
});
confirmEditScopeOverlay.addEventListener('click', e => { if (e.target === confirmEditScopeOverlay) cancelEditScopeBtn.click(); });

// Chamado após qualquer mutação de tarefa (board ou checklist) para persistir e re-renderizar
// todas as views que podem estar exibindo essa tarefa.
function finishTaskMutation() {
  save();
  refreshCalendarAndBoard();
  if (currentView === 'activities') renderActivities();
}

function applyPatchWithScope(t, board, fn, scope) {
  if (scope === 'all') {
    board.tasks
      .filter(x => x.seriesId === t.seriesId && !x.isException && x.date >= t.date)
      .forEach(x => fn(x, board));
  } else {
    fn(t, board);
  }
  finishTaskMutation();
}

// directPatch: aplica a mutação diretamente na instância aberta, sem passar pela pergunta de
// escopo — usado pelos campos que mudam a data da tarefa (f.date/f.delegatedDate), cujo
// comportamento ao mover uma instância de série é sempre virar exceção (fe-16), nunca propagar
// para a série.
function directPatch(fn) {
  const ctx = resolveEditingContext();
  if (!ctx) return;
  fn(ctx.task, ctx.board);
  finishTaskMutation();
}

function patch(fn) {
  const ctx = resolveEditingContext();
  if (!ctx) return;
  const { task: t, board } = ctx;

  if (t.seriesId && !t.isException && editScopeChoice === null) {
    pendingPatchFn = fn;
    openEditScopeModal(t);
    return;
  }

  applyPatchWithScope(t, board, fn, editScopeChoice);
}

f.name.addEventListener('input', () => patch(t => (t.name = f.name.value)));
f.date.addEventListener('change', () => directPatch(t => {
  const prevDate = t.date;
  t.deliveryDate = f.date.value;
  t.date = f.date.value;
  markExceptionIfMoved(t, prevDate);
}));
f.date.addEventListener('change', () => {
  if (!recurrenceOn) return;
  recMonthlyDayEl.textContent = new Date(f.date.value + 'T00:00:00').getDate();
  updateRecurrenceSummary();
});
f.link.addEventListener('input', () => patch(t => (t.link = f.link.value)));
f.priority.addEventListener('change', () => patch((t, board) => { if (!t.urgent && !t.completed) setPriority(t, Number(f.priority.value) || 1, board); }));
f.completed.addEventListener('change', () => {
  priorityField.classList.toggle('hidden', f.completed.checked);
  patch((t, board) => setCompleted(t, f.completed.checked, board));
});

f.delegated.addEventListener('change', () => {
  delegateFields.classList.toggle('hidden', !f.delegated.checked);
  patch(t => (t.delegated = f.delegated.checked));
});
f.delegatedTo.addEventListener('input', () => patch(t => (t.delegatedTo = f.delegatedTo.value)));
f.delegatedDate.addEventListener('change', () => directPatch(t => {
  const prevDate = t.date;
  t.delegatedDate = f.delegatedDate.value;
  if (f.delegatedDate.value) t.date = f.delegatedDate.value;
  markExceptionIfMoved(t, prevDate);
}));

f.urgent.addEventListener('change', () => {
  // urgentRankBase vive no closure do fn passado a patch(): quando o escopo é "esta e todas as
  // futuras", applyPatchWithScope chama esse fn uma vez por instância da série na mesma execução
  // síncrona — o contador decrescente garante urgentRank individual e ordem estável entre elas,
  // igual ao padrão já usado em finalizeOrder() para o drag-and-drop.
  let urgentRankBase = Date.now();
  patch((t, board) => {
    t.urgent = f.urgent.checked;
    if (t.urgent) { t.urgentRank = urgentRankBase--; }
    else { const max = board.tasks.filter(x => x.date === t.date && !x.urgent && x.id !== t.id).reduce((m, x) => Math.max(m, x.priority || 0), 0); t.priority = max + 1; }
  });
});

// ---------- exclusão em série: "apenas esta ocorrência" x "esta e todas as futuras" ----------
const confirmDeleteScopeOverlay = document.getElementById('confirmDeleteScopeOverlay');
const deleteScopeOnlyThisBtn = document.getElementById('deleteScopeOnlyThis');
const deleteScopeAllFutureBtn = document.getElementById('deleteScopeAllFuture');
const deleteScopeOnlyThisDescEl = document.getElementById('deleteScopeOnlyThisDesc');
const deleteScopeAllFutureDescEl = document.getElementById('deleteScopeAllFutureDesc');
const cancelDeleteScopeBtn = document.getElementById('cancelDeleteScope');

function openDeleteScopeModal(t) {
  const dateLabel = fmtDateBR(t.date);
  deleteScopeOnlyThisDescEl.textContent = `Somente ${dateLabel} será removida. O restante da série permanece.`;
  deleteScopeAllFutureDescEl.textContent = `${dateLabel} e todas as ocorrências posteriores serão excluídas. Ocorrências anteriores permanecem.`;
  confirmDeleteScopeOverlay.classList.remove('hidden');
}
function closeDeleteScopeModal() { confirmDeleteScopeOverlay.classList.add('hidden'); }

// Remove a instância selecionada e todas as posteriores da série (date >= a dela), inclusive as
// que já eram exceção (is_exception = true) — diferente da edição em massa, que não afeta exceções.
function deleteSeriesFromInstance(t, board) {
  board.tasks = board.tasks.filter(x => !(x.seriesId === t.seriesId && x.date >= t.date));
  save();
  refreshCalendarAndBoard();
}

// Exclui a tarefa aberta no modal de onde quer que ela esteja (board ou checklist de atividade)
// e re-renderiza tudo que pode estar exibindo essa tarefa.
function deleteTaskAnywhere(id) {
  removeTaskAnywhere(id);
  finishTaskMutation();
}

deleteScopeOnlyThisBtn.addEventListener('click', () => {
  closeDeleteScopeModal();
  if (!editingId) return;
  deleteTaskAnywhere(editingId);
  closeModal();
});
deleteScopeAllFutureBtn.addEventListener('click', () => {
  closeDeleteScopeModal();
  if (!editingId) return;
  const ctx = resolveEditingContext();
  if (!ctx || ctx.source !== 'board') return; // séries recorrentes só existem em tarefas de board
  deleteSeriesFromInstance(ctx.task, ctx.board);
  closeModal();
});
cancelDeleteScopeBtn.addEventListener('click', closeDeleteScopeModal);
confirmDeleteScopeOverlay.addEventListener('click', e => { if (e.target === confirmDeleteScopeOverlay) closeDeleteScopeModal(); });

document.getElementById('deleteTask').addEventListener('click', () => {
  if (!editingId) return;
  const ctx = resolveEditingContext();
  if (!ctx) return;
  const { task: t } = ctx;
  if (t.seriesId && !t.isException) {
    openDeleteScopeModal(t);
    return;
  }
  deleteTaskAnywhere(editingId);
  closeModal();
});

// ---------- board interactions (delegated) ----------
board.addEventListener('submit', e => {
  e.preventDefault();
  if (!e.target.classList.contains('add-form')) return;
  const input = e.target.querySelector('input');
  const name = input.value.trim();
  if (!name) return;
  addTask(e.target.dataset.date, name);
});

board.addEventListener('click', e => {
  const weatherBtn = e.target.closest('.col-weather-city-btn');
  if (weatherBtn) { openWeatherPopover(weatherBtn); return; }
  const title = e.target.closest('.col-title');
  if (title) {
    const dateKey = title.closest('.col-header').dataset.date;
    if (dateKey) openDayPopup(dateKey); // a coluna "Sem data" não tem Visão do Dia associada
    return;
  }
  const chip = e.target.closest('.event-chip');
  if (chip) { openEventModal(chip.dataset.eventId); return; }
  if (e.target.classList.contains('chk-done')) {
    const card = e.target.closest('.card');
    const t = findTaskInBoard(card.dataset.id, currentBoard());
    if (!t) return;
    setCompleted(t, e.target.checked);
    save(); render();
    if (exportOpen) renderExportModal();
    return;
  }
  const card = e.target.closest('.card');
  if (card) openModal(card.dataset.id);
});

// ---------- drag and drop ----------
board.addEventListener('dragstart', e => {
  const card = e.target.closest('.card');
  if (!card) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
  setTimeout(() => card.classList.add('dragging'), 0);
});
board.addEventListener('dragend', e => {
  const card = e.target.closest('.card');
  if (card) card.classList.remove('dragging');
});
board.addEventListener('dragover', e => {
  const col = e.target.closest('.col-body');
  if (!col) return;
  e.preventDefault();
  const dragging = board.querySelector('.card.dragging');
  if (!dragging) return;
  const after = getDragAfterElement(col, e.clientY);
  if (after == null) col.appendChild(dragging);
  else col.insertBefore(dragging, after);
});
board.addEventListener('drop', e => {
  const col = e.target.closest('.col-body');
  if (!col) return;
  e.preventDefault();
  finalizeOrder(col);
});

function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.card:not(.dragging)')];
  return els.reduce((closest, el) => {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: el };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

function finalizeOrder(col) {
  const dateKey = col.dataset.date;
  const ids = [...col.querySelectorAll('.card')].map(c => c.dataset.id);
  const ordered = ids.map(id => findTaskInBoard(id, currentBoard())).filter(Boolean);
  ordered.forEach(t => {
    const prevDate = t.date;
    t.date = dateKey;
    markExceptionIfMoved(t, prevDate);
  });

  let normalIdx = 0;
  let urgentRankBase = Date.now();
  let completedRankBase = Date.now();
  ordered.forEach(t => {
    if (t.completed) { t.priority = null; t.completedAt = completedRankBase++; }
    else if (t.urgent) t.urgentRank = urgentRankBase--;
    else t.priority = ++normalIdx;
  });
  save(); render();
}

// ---------- settings (fields) ----------
const settingsOverlay = document.getElementById('settingsOverlay');
const fieldsSettingsEl = document.getElementById('fieldsSettings');
const newColorSelection = {};

function paletteHtml(selectedColor) {
  return PALETTE.map(c => `<span class="swatch ${c === selectedColor ? 'selected' : ''}" data-color="${c}" style="background:${c}"></span>`).join('');
}

function fieldValueItemHtml(fieldId, item) {
  return `
  <div class="class-item" data-id="${item.id}">
    <span class="dot" style="background:${item.color}"></span>
    <input type="text" class="class-name-input" value="${escapeHtml(item.name)}">
    <div class="mini-palette">${paletteHtml(item.color)}</div>
    <button type="button" class="class-delete-btn" title="Excluir">🗑</button>
  </div>`;
}

function fieldSectionHtml(field) {
  if (!(field.id in newColorSelection)) newColorSelection[field.id] = PALETTE[0];
  return `
  <div class="settings-section field-section" data-field-id="${field.id}">
    <div class="field-section-header">
      <input type="text" class="field-name-input" value="${escapeHtml(field.name)}">
      <button type="button" class="field-delete-btn" title="Excluir campo">🗑</button>
    </div>
    <div class="class-list" data-values-for="${field.id}">${field.values.map(v => fieldValueItemHtml(field.id, v)).join('')}</div>
    <form class="class-add-form field-value-form" data-field-id="${field.id}">
      <input type="text" placeholder="Novo valor" required>
      <div class="color-palette">${paletteHtml(newColorSelection[field.id])}</div>
      <input type="hidden" class="new-color-input" value="${newColorSelection[field.id]}">
      <button type="submit">Adicionar</button>
    </form>
  </div>`;
}

function renderFieldsSettings() {
  const fields = currentBoard().fields || [];
  fieldsSettingsEl.innerHTML = fields.map(fieldSectionHtml).join('');
}

function openSettings() {
  renderFieldsSettings();
  renderPeopleSettings();
  renderWalletSettings();
  settingsOverlay.classList.remove('hidden');
}
function closeSettings() { settingsOverlay.classList.add('hidden'); }

document.getElementById('settingsBtn').addEventListener('click', openSettings);
document.getElementById('closeSettings').addEventListener('click', closeSettings);
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) closeSettings(); });

document.getElementById('addFieldForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('newFieldName');
  const name = input.value.trim();
  if (!name) return;
  addField(name);
  input.value = '';
});

fieldsSettingsEl.addEventListener('submit', e => {
  if (!e.target.classList.contains('field-value-form')) return;
  e.preventDefault();
  const fieldId = e.target.dataset.fieldId;
  const input = e.target.querySelector('input[type="text"]');
  const name = input.value.trim();
  if (!name) return;
  addFieldValue(fieldId, name, newColorSelection[fieldId] || PALETTE[0]);
  input.value = '';
  newColorSelection[fieldId] = PALETTE[0];
});

fieldsSettingsEl.addEventListener('click', e => {
  const section = e.target.closest('.field-section');
  if (!section) return;
  const fieldId = section.dataset.fieldId;

  if (e.target.classList.contains('field-delete-btn')) { deleteField(fieldId); return; }

  if (e.target.closest('.field-value-form') && e.target.classList.contains('swatch')) {
    newColorSelection[fieldId] = e.target.dataset.color;
    renderFieldsSettings();
    return;
  }

  const item = e.target.closest('.class-item');
  if (item) {
    const valueId = item.dataset.id;
    if (e.target.classList.contains('class-delete-btn')) { deleteFieldValue(fieldId, valueId); return; }
    if (e.target.classList.contains('swatch')) { recolorFieldValue(fieldId, valueId, e.target.dataset.color); }
  }
});

fieldsSettingsEl.addEventListener('change', e => {
  const section = e.target.closest('.field-section');
  if (!section) return;
  const fieldId = section.dataset.fieldId;

  if (e.target.classList.contains('field-name-input')) {
    renameField(fieldId, e.target.value.trim());
    return;
  }
  if (e.target.classList.contains('class-name-input')) {
    const valueId = e.target.closest('.class-item').dataset.id;
    renameFieldValue(fieldId, valueId, e.target.value.trim());
  }
});

// ---------- settings (pessoas) ----------
const peopleListEl = document.getElementById('peopleList');
const addPersonBtnEl = document.getElementById('addPersonBtn');
const addPersonFormEl = document.getElementById('addPersonForm');
const newPersonNameEl = document.getElementById('newPersonName');
const newPersonAreaEl = document.getElementById('newPersonArea');

function principalPerson() { return people.find(p => p.principal) || null; }
function findPersonByName(name) {
  const q = (name || '').trim().toLowerCase();
  if (!q) return null;
  return people.find(p => p.name.trim().toLowerCase() === q) || null;
}
function addPerson(name, area) {
  const person = { id: uid(), name: name.trim(), area: (area || '').trim(), principal: people.length === 0 };
  people.push(person);
  save();
  return person;
}
function setPrincipal(id) {
  people.forEach(p => { p.principal = p.id === id; });
  save(); renderPeopleSettings();
}
function removePerson(id) {
  const p = people.find(x => x.id === id);
  if (!p || p.principal) return;
  if (!confirm('Remover esta pessoa?')) return;
  people = people.filter(x => x.id !== id);
  save(); renderPeopleSettings();
}

function personRowHtml(p) {
  const meta = p.area ? `<div class="person-area">${escapeHtml(p.area)}</div>` : '';
  const right = p.principal
    ? `<span class="person-principal-badge">Principal</span>`
    : `<button type="button" class="person-set-principal-btn" data-id="${p.id}">Definir principal</button>
       <button type="button" class="person-remove-btn" data-id="${p.id}" title="Remover">×</button>`;
  return `
  <div class="person-row" data-id="${p.id}">
    <div>
      <div class="person-name">${escapeHtml(p.name)}</div>
      ${meta}
    </div>
    <div class="person-row-actions">${right}</div>
  </div>`;
}
function renderPeopleSettings() {
  peopleListEl.innerHTML = people.map(personRowHtml).join('');
}

function startAddPerson() {
  addingPerson = true;
  addPersonBtnEl.classList.add('hidden');
  addPersonFormEl.classList.remove('hidden');
  newPersonNameEl.value = '';
  newPersonAreaEl.value = '';
  newPersonNameEl.focus();
}
function cancelAddPerson() {
  addingPerson = false;
  addPersonBtnEl.classList.remove('hidden');
  addPersonFormEl.classList.add('hidden');
}
function confirmAddPerson() {
  const name = newPersonNameEl.value.trim();
  if (!name) return;
  addPerson(name, newPersonAreaEl.value);
  cancelAddPerson();
  renderPeopleSettings();
}

addPersonBtnEl.addEventListener('click', startAddPerson);
document.getElementById('cancelAddPerson').addEventListener('click', cancelAddPerson);
document.getElementById('confirmAddPerson').addEventListener('click', confirmAddPerson);
newPersonNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddPerson(); });

peopleListEl.addEventListener('click', e => {
  const setBtn = e.target.closest('.person-set-principal-btn');
  if (setBtn) { setPrincipal(setBtn.dataset.id); return; }
  const rmBtn = e.target.closest('.person-remove-btn');
  if (rmBtn) { removePerson(rmBtn.dataset.id); return; }
});

// ---------- settings (carteiras/finanças) ----------
const walletListEl = document.getElementById('walletList');
const addWalletBtnEl = document.getElementById('addWalletBtn');
const addWalletFormEl = document.getElementById('addWalletForm');
const newWalletNameEl = document.getElementById('newWalletName');

function addWallet(name) {
  const wallet = { id: uid(), name: name.trim(), icon: '💳', sortOrder: financeState.wallets.length };
  financeState.wallets.push(wallet);
  saveFinance();
  return wallet;
}
function removeWallet(id) {
  if (!confirm('Remover esta carteira? Lançamentos vinculados ficarão sem carteira.')) return;
  financeState.wallets = financeState.wallets.filter(w => w.id !== id);
  saveFinance(); renderWalletSettings();
}

function walletRowHtml(w) {
  return `
  <div class="person-row" data-id="${w.id}">
    <div>
      <div class="person-name">${escapeHtml(w.icon)} ${escapeHtml(w.name)}</div>
    </div>
    <div class="person-row-actions">
      <button type="button" class="person-remove-btn" data-id="${w.id}" title="Remover">×</button>
    </div>
  </div>`;
}
function renderWalletSettings() {
  if (!walletListEl) return;
  walletListEl.innerHTML = financeState.wallets.map(walletRowHtml).join('')
    || '<div class="fin-empty" style="padding:4px 0">Nenhuma carteira cadastrada.</div>';
}

function startAddWallet() {
  addWalletBtnEl.classList.add('hidden');
  addWalletFormEl.classList.remove('hidden');
  newWalletNameEl.value = '';
  newWalletNameEl.focus();
}
function cancelAddWallet() {
  addWalletBtnEl.classList.remove('hidden');
  addWalletFormEl.classList.add('hidden');
}
function confirmAddWallet() {
  const name = newWalletNameEl.value.trim();
  if (!name) return;
  addWallet(name);
  cancelAddWallet();
  renderWalletSettings();
}

addWalletBtnEl.addEventListener('click', startAddWallet);
document.getElementById('cancelAddWallet').addEventListener('click', cancelAddWallet);
document.getElementById('confirmAddWallet').addEventListener('click', confirmAddWallet);
newWalletNameEl.addEventListener('keydown', e => { if (e.key === 'Enter') confirmAddWallet(); });

walletListEl.addEventListener('click', e => {
  const rmBtn = e.target.closest('.person-remove-btn');
  if (rmBtn) { removeWallet(rmBtn.dataset.id); return; }
});

// ---------- nav ----------
document.getElementById('prevWeek').addEventListener('click', () => { weekStart = clamp(addDays(startOfWeek(weekStart), -7)); render(); });
document.getElementById('nextWeek').addEventListener('click', () => { weekStart = clamp(addDays(startOfWeek(weekStart), 7)); render(); });
document.getElementById('prevDay').addEventListener('click', () => { weekStart = clamp(addDays(weekStart, -1)); render(); });
document.getElementById('nextDay').addEventListener('click', () => { weekStart = clamp(addDays(weekStart, 1)); render(); });
document.getElementById('todayBtn').addEventListener('click', () => { weekStart = clamp(startOfWeek(new Date())); render(); });

// ---------- calendário universal: eventos ----------
function eventDateKeys(ev) {
  const keys = [];
  let d = new Date(ev.startDate + 'T00:00:00');
  const end = new Date(ev.endDate + 'T00:00:00');
  while (d <= end) { keys.push(toKey(d)); d = addDays(d, 1); }
  return keys;
}
function eventsForDate(key) {
  return calendarEvents.filter(ev => ev.startDate <= key && key <= ev.endDate);
}
function eventsForBoardDate(boardId, key) {
  return eventsForDate(key).filter(ev => ev.boardIds.includes(boardId));
}
function eventSpanLabel(ev, key) {
  const keys = eventDateKeys(ev);
  if (keys.length <= 1) return '';
  return `${keys.indexOf(key) + 1}/${keys.length}`;
}
function findEvent(id) { return calendarEvents.find(e => e.id === id); }
function addCalendarEvent(data) {
  calendarEvents.push({ id: uid(), name: data.name, startDate: data.startDate, endDate: data.endDate, boardIds: data.boardIds, isHoliday: !!data.isHoliday });
  save();
}
function updateCalendarEvent(id, patchFn) {
  const ev = findEvent(id);
  if (!ev) return;
  patchFn(ev);
  save();
}
function deleteCalendarEvent(id) {
  calendarEvents = calendarEvents.filter(e => e.id !== id);
  save();
}
function refreshCalendarAndBoard() {
  if (currentView === 'calendar') rerenderLoadedMonths();
  render();
}

// ---------- calendário universal: legenda de boards ----------
function renderBoardLegend() {
  document.getElementById('boardLegend').innerHTML = boards.map(b =>
    `<span class="legend-item"><span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}</span>`
  ).join('');
}

// ---------- calendário universal: grid de mês ----------
function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function calEventHtml(ev, key) {
  const b0 = boards.find(b => b.id === ev.boardIds[0]);
  const multi = ev.boardIds.length > 1;
  const dots = ev.boardIds.map(bid => {
    const b = boards.find(x => x.id === bid);
    return b ? `<span style="background:${multi ? b.color : '#fff'}"></span>` : '';
  }).join('');
  const style = multi
    ? (b0 ? `border-left-color:${b0.color}` : '')
    : (b0 ? `background:${b0.color}` : '');
  return `
  <div class="cal-event${multi ? ' multi-board' : ''}" style="${style}" data-event-id="${ev.id}">
    <span class="dot-group">${dots}</span>
    <span class="cal-event-name">${escapeHtml(ev.name)}</span>
  </div>`;
}

function monthBlockHtml(year, month) {
  const cells = monthCells(year, month);
  const todayKey = toKey(new Date());
  const cellsHtml = cells.map(d => {
    if (!d) return `<div class="day-cell blank"></div>`;
    const key = toKey(d);
    const isToday = key === todayKey;
    const events = eventsForDate(key);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isHoliday = events.some(ev => ev.isHoliday);
    const closed = !!getDayLog(key).closedAt;
    const classes = ['day-cell'];
    if (isToday) classes.push('today');
    if (isWeekend || isHoliday) classes.push('weekend');
    if (closed) classes.push('day-closed');
    return `<div class="${classes.join(' ')}" data-date="${key}">
      <button type="button" class="day-cell-add-event" data-date="${key}" title="Novo evento">+</button>
      <div class="day-num-row">
        <div class="day-num">${d.getDate()}</div>
        ${closed ? '<span class="day-closed-check" title="Dia fechado">✓</span>' : ''}
      </div>
      ${events.map(ev => calEventHtml(ev, key)).join('')}
    </div>`;
  }).join('');
  return `
  <div class="month-block" data-year="${year}" data-month="${month}">
    <div class="month-label">${MONTH_NAMES[month]} ${year}</div>
    <div class="month-grid">${cellsHtml}</div>
  </div>`;
}

// ---------- calendário universal: scroll contínuo entre meses ----------
function normalizeYearMonth(year, month) {
  let y = year, m = month;
  while (m < 0) { m += 12; y--; }
  while (m > 11) { m -= 12; y++; }
  return { year: y, month: m };
}
function appendMonth(year, month) {
  const { year: y, month: m } = normalizeYearMonth(year, month);
  calendarLoadedMonths.push({ year: y, month: m });
  document.getElementById('calendarMonths').insertAdjacentHTML('beforeend', monthBlockHtml(y, m));
}
function prependMonth(year, month) {
  const { year: y, month: m } = normalizeYearMonth(year, month);
  calendarLoadedMonths.unshift({ year: y, month: m });
  document.getElementById('calendarMonths').insertAdjacentHTML('afterbegin', monthBlockHtml(y, m));
}
function rerenderLoadedMonths() {
  document.getElementById('calendarMonths').innerHTML =
    calendarLoadedMonths.map(m => monthBlockHtml(m.year, m.month)).join('');
}

function onCalendarScroll() {
  const scrollEl = document.getElementById('calendarScroll');
  if (scrollEl.scrollTop < 300) {
    const first = calendarLoadedMonths[0];
    const prevHeight = scrollEl.scrollHeight;
    prependMonth(first.year, first.month - 1);
    scrollEl.scrollTop += scrollEl.scrollHeight - prevHeight;
  } else if (scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight < 300) {
    const last = calendarLoadedMonths[calendarLoadedMonths.length - 1];
    appendMonth(last.year, last.month + 1);
  }
  updateMonthRangeLabel();
}

function updateMonthRangeLabel() {
  const scrollEl = document.getElementById('calendarScroll');
  const scrollRect = scrollEl.getBoundingClientRect();
  const blocks = [...document.querySelectorAll('.month-block')];
  let current = blocks[0];
  for (const blockEl of blocks) {
    if (blockEl.getBoundingClientRect().top - scrollRect.top <= 80) current = blockEl;
    else break;
  }
  if (current) {
    document.getElementById('monthRange').textContent = `${MONTH_NAMES[Number(current.dataset.month)]} ${current.dataset.year}`;
  }
}

function scrollToToday() {
  const scrollEl = document.getElementById('calendarScroll');
  const todayCell = scrollEl.querySelector('.day-cell.today');
  if (!todayCell) return;
  const blockEl = todayCell.closest('.month-block');
  const scrollRect = scrollEl.getBoundingClientRect();
  const blockRect = blockEl.getBoundingClientRect();
  scrollEl.scrollTop += blockRect.top - scrollRect.top;
  updateMonthRangeLabel();
}

function initCalendarIfNeeded() {
  if (calendarInitialized) { updateMonthRangeLabel(); return; }
  calendarInitialized = true;
  const now = new Date();
  document.getElementById('calendarMonths').innerHTML = '';
  calendarLoadedMonths = [];
  for (let offset = -1; offset <= 1; offset++) appendMonth(now.getFullYear(), now.getMonth() + offset);
  document.getElementById('calendarScroll').addEventListener('scroll', onCalendarScroll);
  scrollToToday();
}

function goToCalendarToday() {
  const now = new Date();
  const loaded = calendarLoadedMonths.some(m => m.year === now.getFullYear() && m.month === now.getMonth());
  if (!loaded) { calendarInitialized = false; initCalendarIfNeeded(); }
  else scrollToToday();
}

document.getElementById('calendarTodayBtn').addEventListener('click', goToCalendarToday);
document.getElementById('addEventFab').addEventListener('click', () => openEventModal(null, toKey(new Date())));

document.getElementById('calendarMonths').addEventListener('click', e => {
  const addBtn = e.target.closest('.day-cell-add-event');
  if (addBtn) { e.stopPropagation(); openEventModal(null, addBtn.dataset.date); return; }
  const chip = e.target.closest('.cal-event');
  if (chip) { openEventModal(chip.dataset.eventId); return; }
  const cell = e.target.closest('.day-cell');
  if (cell) openDayPopup(cell.dataset.date);
});

// ---------- calendário universal: modal de criar/editar evento ----------
function renderEventBoardChecklist(selectedIds) {
  document.getElementById('ev-boards').innerHTML = boards.map(b => `
    <label class="board-check-row">
      <input type="checkbox" class="ev-board-check" value="${b.id}" ${selectedIds.includes(b.id) ? 'checked' : ''}>
      <span class="dot" style="background:${b.color}"></span> ${escapeHtml(b.name)}
    </label>
  `).join('');
}

function openEventModal(id, defaultDate) {
  editingEventId = id;
  const deleteBtn = document.getElementById('deleteEventBtn');
  if (id) {
    const ev = findEvent(id);
    document.getElementById('ev-name').value = ev.name;
    document.getElementById('ev-start').value = ev.startDate;
    document.getElementById('ev-end').value = ev.endDate;
    document.getElementById('ev-holiday').checked = !!ev.isHoliday;
    renderEventBoardChecklist(ev.boardIds);
    deleteBtn.classList.remove('hidden');
  } else {
    const d = defaultDate || toKey(new Date());
    document.getElementById('ev-name').value = '';
    document.getElementById('ev-start').value = d;
    document.getElementById('ev-end').value = d;
    document.getElementById('ev-holiday').checked = false;
    renderEventBoardChecklist(boards.map(b => b.id));
    deleteBtn.classList.add('hidden');
  }
  document.getElementById('eventModalOverlay').classList.remove('hidden');
}
function closeEventModal() {
  document.getElementById('eventModalOverlay').classList.add('hidden');
  editingEventId = null;
}
function saveEventFromModal() {
  const name = document.getElementById('ev-name').value.trim();
  const startDate = document.getElementById('ev-start').value;
  let endDate = document.getElementById('ev-end').value;
  if (!name || !startDate) return;
  if (!endDate || endDate < startDate) endDate = startDate;
  const boardIds = [...document.querySelectorAll('.ev-board-check:checked')].map(cb => cb.value);
  const isHoliday = document.getElementById('ev-holiday').checked;
  if (editingEventId) {
    updateCalendarEvent(editingEventId, ev => { ev.name = name; ev.startDate = startDate; ev.endDate = endDate; ev.boardIds = boardIds; ev.isHoliday = isHoliday; });
  } else {
    addCalendarEvent({ name, startDate, endDate, boardIds, isHoliday });
  }
  closeEventModal();
  refreshCalendarAndBoard();
}

document.getElementById('closeEventModal').addEventListener('click', closeEventModal);
document.getElementById('eventModalOverlay').addEventListener('click', e => { if (e.target.id === 'eventModalOverlay') closeEventModal(); });
document.getElementById('saveEventBtn').addEventListener('click', saveEventFromModal);
document.getElementById('deleteEventBtn').addEventListener('click', () => {
  if (editingEventId) { deleteCalendarEvent(editingEventId); closeEventModal(); refreshCalendarAndBoard(); }
});

// ---------- visão do dia (popup) ----------
const DAYPOPUP_HIDDEN_KEY = 'dayPopupHiddenBoardIds';
function getHiddenBoardIds() {
  try { return JSON.parse(localStorage.getItem(DAYPOPUP_HIDDEN_KEY)) || []; }
  catch (e) { return []; }
}
function isBoardVisibleInPopup(boardId) { return !getHiddenBoardIds().includes(boardId); }
function toggleBoardVisibility(boardId) {
  const hidden = getHiddenBoardIds();
  const i = hidden.indexOf(boardId);
  if (i >= 0) hidden.splice(i, 1); else hidden.push(boardId);
  localStorage.setItem(DAYPOPUP_HIDDEN_KEY, JSON.stringify(hidden));
  renderDayPopup();
}
function visibleBoards() { return boards.filter(b => isBoardVisibleInPopup(b.id)); }

// Lista unificada do dia: tasksFor() de cada board visível, concatenada e reordenada por
// compare() — o board deixa de segmentar a lista e vira só o dot colorido em cada linha.
function unifiedDayItems(dateKey) {
  return visibleBoards()
    .flatMap(b => tasksFor(dateKey, b).filter(t => !t.archived).map(t => ({ t, b })))
    .sort((x, y) => compare(x.t, y.t));
}
function dayPopupAgendaEvents(dateKey) {
  const visIds = visibleBoards().map(b => b.id);
  return eventsForDate(dateKey).filter(ev => ev.boardIds.some(id => visIds.includes(id)));
}
// Todas as tarefas com data de um board (próprias + checklist já promovido), sem filtrar por
// uma data exata — usado pela bandeja de pendências para varrer uma janela de dias.
function allDatedTasksForBoard(board) {
  const own = (board.tasks || []).filter(t => t.date);
  const promoted = activities.flatMap(a => (a.checklistTasks || [])).filter(t => t.boardId === board.id && t.date);
  return [...own, ...promoted];
}
// Bandeja de pendências: atrasadas (até 14 dias atrás) + sem data, dos boards visíveis.
function dayPendingTrayItems(dateKey) {
  const cutoff = toKey(addDays(new Date(dateKey + 'T00:00:00'), -14));
  const result = [];
  visibleBoards().forEach(b => {
    const overdue = allDatedTasksForBoard(b).filter(t => !t.completed && !t.archived && t.date < dateKey && t.date >= cutoff);
    const dateless = tasksWithoutDate(b).filter(t => !t.completed && !t.archived);
    [...overdue, ...dateless].forEach(t => result.push({ t, b }));
  });
  return result;
}
// Campos customizados em comum entre os boards visíveis, casados por nome (ex.: "Projeto"),
// para o select de agrupamento da lista unificada (só aparece com >8 tarefas no dia).
function dayGroupFieldOptions() {
  const seen = new Map();
  visibleBoards().forEach(b => (b.fields || []).forEach(f => { if (!seen.has(f.name)) seen.set(f.name, f); }));
  return [...seen.values()];
}
function groupRestItems(restItems) {
  if (!dayPopupGroupField) return null;
  const buckets = new Map();
  const unclassified = [];
  restItems.forEach(({ t, b }) => {
    const field = (b.fields || []).find(f => f.name === dayPopupGroupField);
    const val = field && t.fieldValues && field.values.find(v => v.id === t.fieldValues[field.id]);
    if (val) {
      if (!buckets.has(val.name)) buckets.set(val.name, []);
      buckets.get(val.name).push({ t, b });
    } else {
      unclassified.push({ t, b });
    }
  });
  const groups = [...buckets.entries()].map(([groupLabel, items]) => ({ label: groupLabel, items }));
  if (unclassified.length) groups.push({ label: 'Sem classificação', items: unclassified });
  return groups;
}

// ---------- day drawer: docked / expanded hosting ----------
const dayDrawerDockedEl = document.getElementById('dayDrawerDocked');
const dayDrawerResizeHandleEl = document.getElementById('dayDrawerResizeHandle');
const dayPopupPanelEl = document.getElementById('dayPopupPanel');
const dayPopupOverlayEl = document.getElementById('dayPopupOverlay');
const dayPopupModalHostEl = document.getElementById('dayPopupModalHost');
const dayPopupExpandBtnEl = document.getElementById('dayPopupExpandBtn');
const dayPopupSettingsBtnEl = document.getElementById('dayPopupSettingsBtn');

function attachDayPopupPanel() {
  if (!dayPopupDate) {
    dayDrawerDockedEl.classList.add('hidden');
    dayPopupOverlayEl.classList.add('hidden');
    return;
  }
  if (dayDrawerExpanded) {
    dayPopupModalHostEl.appendChild(dayPopupPanelEl);
    dayPopupOverlayEl.classList.remove('hidden');
    dayDrawerDockedEl.classList.add('hidden');
    dayPopupExpandBtnEl.textContent = '⤡';
    dayPopupExpandBtnEl.title = 'Encaixar na lateral';
  } else {
    dayDrawerDockedEl.appendChild(dayPopupPanelEl);
    dayDrawerDockedEl.style.width = dayDrawerWidth + 'px';
    dayDrawerDockedEl.classList.remove('hidden');
    dayPopupOverlayEl.classList.add('hidden');
    dayPopupExpandBtnEl.textContent = '⤢';
    dayPopupExpandBtnEl.title = 'Abrir como pop-up';
  }
}

function toggleDayDrawerExpand() {
  dayDrawerExpanded = !dayDrawerExpanded;
  if (dayDrawerExpanded) dayPopupMode = 'plan';
  renderDayPopup();
  attachDayPopupPanel();
}

function openDayPopup(dateKey) {
  // Feature flag: Visão do Dia. Mantenha a flag em 100% no painel do PostHog.
  // Baixar para 0% funciona como kill switch (a Visão do Dia deixa de abrir).
  if (!posthog.isFeatureEnabled('visao-do-dia')) return;
  dayPopupDate = dateKey;
  dayPopupMode = 'plan';
  dayPopupGroupField = '';
  closeChoices = {};
  dayNoteDraft = '';
  daySettingsOpen = false;
  dayCaptureText = '';
  dayCaptureBoardId = activeBoardId;
  // Painel abre sempre expandido em modo Planejar (ver v1 "Jornada do usuário"); dia sem
  // nenhuma tarefa abre com a bandeja de pendências já expandida (bifurcação do design).
  dayDrawerExpanded = true;
  dayTrayOpen = unifiedDayItems(dateKey).length === 0;
  weatherSearchOpen = false;
  weatherSearchQuery = '';
  weatherSearchResults = [];
  renderDayPopup();
  attachDayPopupPanel();
}
function closeDayPopup() {
  dayPopupDate = null;
  dayPopupMode = 'plan';
  closeChoices = {};
  dayNoteDraft = '';
  daySettingsOpen = false;
  dayDrawerExpanded = false;
  attachDayPopupPanel();
}

dayPopupExpandBtnEl.addEventListener('click', toggleDayDrawerExpand);

dayDrawerResizeHandleEl.addEventListener('mousedown', e => {
  e.preventDefault();
  dayDrawerResizing = true;
  dayDrawerDockedEl.classList.add('resizing');
  const startX = e.clientX;
  const startWidth = dayDrawerWidth;
  const onMouseMove = ev => {
    const delta = startX - ev.clientX;
    let w = startWidth + delta;
    w = Math.max(320, Math.min(720, w));
    dayDrawerWidth = w;
    dayDrawerDockedEl.style.width = w + 'px';
  };
  const onMouseUp = () => {
    dayDrawerResizing = false;
    dayDrawerDockedEl.classList.remove('resizing');
    localStorage.setItem('dayDrawerWidth', String(dayDrawerWidth));
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
});

// ---------- linhas de tarefa reutilizadas nos vários blocos do painel ----------
function dayUnifiedTaskRowHtml(t, b, isMit, mitCount) {
  const cls = ['day-popup-task-row', t.completed ? 'completed' : ''].join(' ');
  const fields = b.fields || [];
  const fieldTags = fields.map(f => (t.fieldValues && t.fieldValues[f.id]) ? fieldTagHtml(f.id, t.fieldValues[f.id], b) : '').join('');
  const starDisabled = !isMit && mitCount >= 3;
  return `
  <div class="${cls}">
    <input type="checkbox" class="daypopup-chk-done" data-task-id="${t.id}" data-board-id="${b.id}" ${t.completed ? 'checked' : ''}>
    <span class="dot" style="background:${b.color}"></span>
    <button type="button" class="day-popup-task-name" data-task-id="${t.id}" data-board-id="${b.id}">${escapeHtml(t.name)}</button>
    <div class="day-popup-task-meta">
      ${fieldTags}
      <button type="button" class="mit-star ${isMit ? 'active' : ''} ${starDisabled ? 'disabled' : ''}" data-task-id="${t.id}" title="Marcar como prioridade do dia">⭐</button>
    </div>
  </div>`;
}
const MIT_WHEN_LABELS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
function mitCardHtml(t, b, dateKey) {
  const when = getDayLog(dateKey).mitWhen[t.id] || '';
  const opts = [['manha', 'M'], ['tarde', 'T'], ['noite', 'N']];
  return `
  <div class="day-popup-mit-card">
    <button type="button" class="mit-star active" data-task-id="${t.id}" title="Remover prioridade">⭐</button>
    <span class="dot" style="background:${b.color}"></span>
    <span class="day-popup-mit-name ${t.completed ? 'completed' : ''}">${escapeHtml(t.name)}</span>
    <div class="day-popup-when-group">
      ${opts.map(([key, letter]) => `<button type="button" class="day-popup-when-btn ${when === key ? 'active' : ''}" data-when="${key}" data-task-id="${t.id}">${letter}</button>`).join('')}
    </div>
  </div>`;
}
function mitLeanRowHtml(t, dateKey) {
  const when = getDayLog(dateKey).mitWhen[t.id];
  return `
  <div class="day-popup-mit-card lean">
    <span>⭐</span>
    <span class="day-popup-mit-name ${t.completed ? 'completed' : ''}">${escapeHtml(t.name)}</span>
    ${when ? `<span class="day-popup-when-tag">${MIT_WHEN_LABELS[when]}</span>` : ''}
  </div>`;
}
function dayTrayRowHtml(t, b, dateKey) {
  return `
  <div class="day-popup-tray-row">
    <span class="dot" style="background:${b.color}"></span>
    <span class="day-popup-tray-name">${escapeHtml(t.name)}</span>
    <span class="day-popup-tray-date">${t.date ? fmtDateBR(t.date) : 'Sem data'}</span>
    <button type="button" class="day-pull-btn" data-task-id="${t.id}" data-board-id="${b.id}">→ hoje</button>
  </div>`;
}
function tomorrowMitRowHtml(t, b, tomorrowMitIds) {
  const isMit = tomorrowMitIds.includes(t.id);
  const disabled = !isMit && tomorrowMitIds.length >= 3;
  return `
  <div class="day-popup-task-row">
    <span class="dot" style="background:${b.color}"></span>
    <span class="day-popup-task-name-static ${t.completed ? 'completed' : ''}">${escapeHtml(t.name)}</span>
    <button type="button" class="tomorrow-mit-star ${isMit ? 'active' : ''} ${disabled ? 'disabled' : ''}" data-task-id="${t.id}" title="Marcar como prioridade de amanhã">⭐</button>
  </div>`;
}
function loadPillHtml(count, capacity) {
  const state = count > capacity ? 'over' : count === capacity ? 'warn' : 'ok';
  const text = `${count} de ${capacity} tarefas${state === 'over' ? ' — acima do teto' : ''}`;
  return `<span class="day-load-pill ${state}">${text}</span>`;
}
function reopenBannerHtml(log) {
  const d = new Date(log.closedAt);
  const dateLabel = isNaN(d) ? '' : d.toLocaleDateString('pt-BR');
  return `
  <div class="day-popup-reopen-banner">
    <span>Este dia foi fechado ${dateLabel}.</span>
    <button type="button" id="dayReopenBtn" class="day-reopen-btn">Reabrir o dia</button>
  </div>`;
}

// ---------- modo Planejar ----------
function dayPlanBodyHtml(dateKey) {
  const log = getDayLog(dateKey);
  const capacity = log.capacity ?? getDefaultCapacity();
  const items = unifiedDayItems(dateKey);
  const mitIds = log.mitIds.filter(id => items.some(({ t }) => t.id === id));
  const mitItems = mitIds.map(id => items.find(({ t }) => t.id === id));
  const restItems = items.filter(({ t }) => !mitIds.includes(t.id));
  const total = items.length;
  const agenda = dayPopupAgendaEvents(dateKey);
  const trayItems = dayPendingTrayItems(dateKey);

  const groupOptions = dayGroupFieldOptions();
  const showGroupSelect = total > 8 && groupOptions.length > 0;
  const groups = showGroupSelect ? groupRestItems(restItems) : null;
  const restHtml = groups
    ? groups.map(g => `
        <div class="day-popup-group-label">${escapeHtml(g.label)}</div>
        ${g.items.map(({ t, b }) => dayUnifiedTaskRowHtml(t, b, false, mitIds.length)).join('')}
      `).join('')
    : restItems.map(({ t, b }) => dayUnifiedTaskRowHtml(t, b, false, mitIds.length)).join('');

  return `
    ${log.closedAt ? reopenBannerHtml(log) : ''}
    <div class="day-popup-section">
      <div class="day-popup-section-label">Captura rápida</div>
      <div class="day-popup-capture-row">
        <select id="dayCaptureBoardSelect">
          ${boards.map(b => `<option value="${b.id}" ${b.id === dayCaptureBoardId ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
        </select>
        <input type="text" id="dayCaptureInput" placeholder="Nova tarefa para hoje…" value="${escapeHtml(dayCaptureText)}">
        <button type="button" id="dayCaptureSubmitBtn">Adicionar</button>
      </div>
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-header">
        <div class="day-popup-section-label">Teto do dia</div>
        ${loadPillHtml(total, capacity)}
      </div>
      <div class="day-popup-capacity-row">
        <span>Quantas tarefas hoje?</span>
        <input type="number" min="1" id="dayCapacityInput" value="${capacity}">
      </div>
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">⭐ Prioridades do dia</div>
      ${mitItems.length
        ? mitItems.map(({ t, b }) => mitCardHtml(t, b, dateKey)).join('')
        : `<div class="day-popup-mit-placeholder">Marque até 3 prioridades na lista abaixo</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Agenda</div>
      ${agenda.length ? `<div class="day-popup-events">${agenda.map(ev => eventChipHtml(ev, dateKey)).join('')}</div>` : `<div class="day-popup-empty-hint">Nenhum evento no dia.</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-header">
        <div class="day-popup-section-label">Demais tarefas do dia</div>
        ${showGroupSelect ? `
          <select class="day-popup-group-select" id="dayGroupSelect">
            <option value="">Sem agrupamento</option>
            ${groupOptions.map(f => `<option value="${escapeHtml(f.name)}" ${dayPopupGroupField === f.name ? 'selected' : ''}>Por ${escapeHtml(f.name)}</option>`).join('')}
          </select>` : ''}
      </div>
      ${restItems.length ? restHtml : `<div class="day-popup-empty-hint">Nenhuma outra tarefa.</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-tray-header" id="dayTrayToggle">
        <span class="day-popup-section-label">Pendências (${trayItems.length})</span>
        <span class="day-popup-tray-arrow">${dayTrayOpen ? '▲' : '▼'}</span>
      </div>
      ${dayTrayOpen ? (trayItems.length
        ? trayItems.map(({ t, b }) => dayTrayRowHtml(t, b, dateKey)).join('')
        : `<div class="day-popup-empty-hint">Nada atrasado nos últimos 14 dias.</div>`) : ''}
    </div>
  `;
}

// ---------- modo Executar (drawer encaixado, expanded:false) ----------
// Não é um terceiro valor de `mode` — renderDayPopup() sempre usa este corpo quando o painel
// está encaixado, independente de dayPopupMode ser 'plan' ou 'close' por trás.
function dayDockedBodyHtml(dateKey) {
  const log = getDayLog(dateKey);
  const items = unifiedDayItems(dateKey);
  const mitItems = log.mitIds.map(id => items.find(({ t }) => t.id === id)).filter(Boolean);
  const agenda = dayPopupAgendaEvents(dateKey);
  const nextEvent = agenda[0];
  return `
    <div class="day-popup-section">
      <div class="day-popup-section-label">⭐ Prioridades</div>
      ${mitItems.length ? mitItems.map(({ t }) => mitLeanRowHtml(t, dateKey)).join('') : `<div class="day-popup-mit-placeholder">Marque até 3 prioridades</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Próximo evento</div>
      ${nextEvent ? `<div class="day-popup-next-event">${eventChipHtml(nextEvent, dateKey)}</div>` : `<div class="day-popup-empty-hint">Nenhum evento hoje.</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Captura rápida</div>
      <div class="day-popup-capture-row">
        <input type="text" id="dayCaptureInput" placeholder="Nova tarefa para o dia…" value="${escapeHtml(dayCaptureText)}">
        <button type="button" id="dayCaptureSubmitBtn">+</button>
      </div>
    </div>
  `;
}

// ---------- modo Fechar ----------
const CLOSE_CHOICE_OPTS = [['amanha', 'Amanhã'], ['outra', 'Outra data'], ['arquivar', 'Arquivar'], ['ignorar', 'Ignorar']];
const CLOSE_REASON_OPTS = [['time', 'faltou tempo'], ['blocked', 'bloqueado por terceiro'], ['reprioritized', 'mudei de prioridade']];
function closeTaskRowHtml(t, b, c) {
  return `
  <div class="day-popup-close-row" data-task-id="${t.id}">
    <div class="day-popup-close-row-top">
      <span class="dot" style="background:${b.color}"></span>
      <span class="day-popup-close-name">${escapeHtml(t.name)}</span>
    </div>
    <div class="day-popup-choice-row">
      ${CLOSE_CHOICE_OPTS.map(([key, lbl]) => `<button type="button" class="day-choice-btn ${c.choice === key ? 'active' : ''}" data-task-id="${t.id}" data-choice="${key}">${lbl}</button>`).join('')}
    </div>
    ${c.choice === 'outra' ? `<input type="date" class="day-choice-date-input" data-task-id="${t.id}" value="${c.customDate || ''}">` : ''}
    <div class="day-popup-reason-row">
      ${CLOSE_REASON_OPTS.map(([key, lbl]) => `<button type="button" class="day-reason-chip ${c.reason === key ? 'active' : ''}" data-task-id="${t.id}" data-reason="${key}">${lbl}</button>`).join('')}
    </div>
  </div>`;
}
function dayCloseBodyHtml(dateKey) {
  const log = getDayLog(dateKey);
  const items = unifiedDayItems(dateKey);
  const total = items.length;
  const done = items.filter(({ t }) => t.completed).length;
  const mitDone = log.mitIds.filter(id => { const it = items.find(({ t }) => t.id === id); return it && it.t.completed; }).length;
  const resultLine = `${done} de ${total} tarefas concluídas · ${mitDone} de 3 prioridades`;

  const pendingIds = Object.keys(closeChoices);
  const pendingRows = pendingIds.map(taskId => {
    const c = closeChoices[taskId];
    const board = boards.find(b => b.id === c.boardId);
    const t = board && findTaskInBoard(taskId, board);
    return (t && board) ? closeTaskRowHtml(t, board, c) : '';
  }).join('');

  const tomorrow = toKey(addDays(new Date(dateKey + 'T00:00:00'), 1));
  const tomorrowItems = unifiedDayItems(tomorrow);
  const tomorrowMitIds = log.nextDayMitIds || [];

  return `
    <div class="day-popup-section day-popup-result-card">
      <div class="day-popup-section-label">Resultado</div>
      <div class="day-popup-result-line">${resultLine}</div>
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Pendências</div>
      ${pendingIds.length ? pendingRows : `<div class="day-popup-mit-placeholder">Nenhuma tarefa pendente 🎉</div>`}
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Nota do dia</div>
      <div class="day-popup-note-prompts">
        <button type="button" class="day-note-prompt-btn" data-prompt="stuck">o que travou?</button>
        <button type="button" class="day-note-prompt-btn" data-prompt="well">o que foi bem?</button>
      </div>
      <textarea id="dayNoteTextarea" placeholder="Como foi o dia?">${escapeHtml(dayNoteDraft)}</textarea>
    </div>
    <div class="day-popup-section">
      <div class="day-popup-section-label">Amanhã — escolha até 3 prioridades</div>
      ${tomorrowItems.length ? tomorrowItems.map(({ t, b }) => tomorrowMitRowHtml(t, b, tomorrowMitIds)).join('') : `<div class="day-popup-empty-hint">Nenhuma tarefa datada para amanhã ainda.</div>`}
    </div>
  `;
}

function openDayCloseMode() {
  if (!dayPopupDate) return;
  const dateKey = dayPopupDate;
  const tomorrow = toKey(addDays(new Date(dateKey + 'T00:00:00'), 1));
  closeChoices = {};
  unifiedDayItems(dateKey).filter(({ t }) => !t.completed).forEach(({ t, b }) => {
    closeChoices[t.id] = { boardId: b.id, choice: 'amanha', reason: null, customDate: tomorrow };
  });
  dayNoteDraft = getDayLog(dateKey).note || '';
  dayPopupMode = 'close';
  dayDrawerExpanded = true;
  renderDayPopup();
  attachDayPopupPanel();
}
function setCloseChoice(taskId, choice) {
  const c = closeChoices[taskId];
  if (!c) return;
  c.choice = choice;
  if (choice === 'outra' && !c.customDate) c.customDate = toKey(addDays(new Date(dayPopupDate + 'T00:00:00'), 1));
  renderDayPopup();
}
function setCloseReason(taskId, reason) {
  const c = closeChoices[taskId];
  if (!c) return;
  c.reason = c.reason === reason ? null : reason;
  renderDayPopup();
}
function setCloseCustomDate(taskId, value) {
  const c = closeChoices[taskId];
  if (c) c.customDate = value;
}
// Reabrir só limpa closed_at — não desfaz adiamentos/arquivamentos já aplicados no fechamento.
function reopenDayLog() {
  if (!dayPopupDate) return;
  patchDayLog(dayPopupDate, { closedAt: null });
  renderDayPopup();
}
function finalizeClose() {
  if (!dayPopupDate) return;
  const dateKey = dayPopupDate;
  const tomorrow = toKey(addDays(new Date(dateKey + 'T00:00:00'), 1));
  Object.entries(closeChoices).forEach(([taskId, c]) => {
    const board = boards.find(b => b.id === c.boardId);
    const t = board && findTaskInBoard(taskId, board);
    if (!t) return;
    if (c.choice === 'amanha' || c.choice === 'outra') {
      const newDate = (c.choice === 'outra' && c.customDate) ? c.customDate : tomorrow;
      const prevDate = t.date;
      t.date = newDate;
      t.deliveryDate = newDate;
      markExceptionIfMoved(t, prevDate);
    } else if (c.choice === 'arquivar') {
      // Arquivar uma ocorrência tira ela da série (mesmo padrão de mover/editar individualmente).
      t.archived = true;
      if (t.seriesId) t.isException = true;
    }
    t.deferralReason = c.reason || null;
  });
  const nextMit = getDayLog(dateKey).nextDayMitIds || [];
  patchDayLog(dateKey, { note: dayNoteDraft, closedAt: new Date().toISOString() });
  if (nextMit.length) patchDayLog(tomorrow, { mitIds: nextMit });
  closeChoices = {};
  dayNoteDraft = '';
  closeDayPopup();
  refreshCalendarAndBoard();
}

// ---------- captura inline ----------
function submitDayCapture() {
  const name = dayCaptureText.trim();
  if (!name || !dayPopupDate) return;
  const board = (dayCaptureBoardId && boards.find(b => b.id === dayCaptureBoardId)) || currentBoard();
  addTask(dayPopupDate, name, board);
  dayCaptureText = '';
  renderDayPopup();
}

// ---------- teto do dia ----------
function setDayCapacity(dateKey, value) {
  const n = Math.max(1, Math.round(Number(value)) || getDefaultCapacity());
  patchDayLog(dateKey, { capacity: n });
  renderDayPopup();
}

// ---------- bandeja: puxar pendência para hoje ----------
function pullTaskToToday(taskId, boardId, dateKey) {
  const board = boards.find(b => b.id === boardId);
  const t = board && findTaskInBoard(taskId, board);
  if (!t) return;
  const prevDate = t.date;
  t.date = dateKey;
  t.deliveryDate = dateKey;
  markExceptionIfMoved(t, prevDate);
  save();
  refreshCalendarAndBoard();
  renderDayPopup();
}

// ---------- ⚙ configurações do painel ----------
function toggleDaySettings() {
  daySettingsOpen = !daySettingsOpen;
  renderDayPopup();
}
function daySettingsPopoverHtml() {
  return `
    <div class="day-popup-settings-label">Boards visíveis</div>
    ${boards.map(b => `
      <label class="day-popup-settings-board-toggle">
        <input type="checkbox" class="day-popup-board-toggle" data-board-id="${b.id}" ${isBoardVisibleInPopup(b.id) ? 'checked' : ''}>
        <span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}
      </label>`).join('')}
    <div class="day-popup-settings-divider"></div>
    <div class="day-popup-settings-label">Teto padrão</div>
    <input type="number" min="1" id="dayDefaultCapacityInput" value="${getDefaultCapacity()}">
  `;
}

// ---------- render principal ----------
function dayPopupSubtitleText(log) {
  if (!dayDrawerExpanded) return 'Executar · painel encaixado';
  if (log.closedAt) return 'Dia fechado';
  return dayPopupMode === 'close' ? 'Fechando o dia' : 'Planejando o dia';
}
function renderDayPopup() {
  if (!dayPopupDate) return;
  const dateKey = dayPopupDate;
  const d = new Date(dateKey + 'T00:00:00');
  const log = getDayLog(dateKey);

  document.getElementById('dayPopupHeader').textContent = label(d);
  document.getElementById('dayPopupSubtitle').textContent = dayPopupSubtitleText(log);

  const weatherEl = document.getElementById('dayPopupWeather');
  weatherEl.style.display = dayDrawerExpanded ? '' : 'none';
  if (dayDrawerExpanded) renderWeatherInDayPopup(dateKey);

  dayPopupSettingsBtnEl.classList.toggle('hidden', !dayDrawerExpanded);
  const settingsEl = document.getElementById('dayPopupSettingsPopover');
  if (daySettingsOpen && dayDrawerExpanded) {
    settingsEl.classList.remove('hidden');
    settingsEl.innerHTML = daySettingsPopoverHtml();
  } else {
    settingsEl.classList.add('hidden');
    settingsEl.innerHTML = '';
  }

  const bodyEl = document.getElementById('dayPopupBody');
  const footerEl = document.getElementById('dayPopupFooter');

  if (!dayDrawerExpanded) {
    bodyEl.innerHTML = dayDockedBodyHtml(dateKey);
    footerEl.innerHTML = `<button type="button" id="dayOpenCloseBtn" class="shutdown-btn">Fechar o dia</button>`;
  } else if (dayPopupMode === 'close') {
    bodyEl.innerHTML = dayCloseBodyHtml(dateKey);
    footerEl.innerHTML = `<button type="button" id="dayBackToPlanBtn" class="shutdown-back-btn">Voltar</button>
       <button type="button" id="dayFinalizeCloseBtn" class="shutdown-apply-btn">Encerrar o dia</button>`;
  } else {
    bodyEl.innerHTML = dayPlanBodyHtml(dateKey);
    footerEl.innerHTML = `<button type="button" id="dayOpenCloseBtn" class="shutdown-btn">Fechar o dia</button>`;
  }
}

document.getElementById('closeDayPopup').addEventListener('click', closeDayPopup);

dayPopupOverlayEl.addEventListener('click', e => {
  if (e.target.id === 'dayPopupOverlay') closeDayPopup();
});

dayPopupPanelEl.addEventListener('click', e => {
  if (e.target.id === 'dayPopupSettingsBtn') { toggleDaySettings(); return; }

  const star = e.target.closest('.mit-star');
  if (star) {
    if (star.classList.contains('disabled')) return;
    toggleMit(dayPopupDate, star.dataset.taskId);
    refreshCalendarAndBoard();
    renderDayPopup();
    return;
  }
  const tomorrowStar = e.target.closest('.tomorrow-mit-star');
  if (tomorrowStar) {
    if (tomorrowStar.classList.contains('disabled')) return;
    toggleTomorrowMit(dayPopupDate, tomorrowStar.dataset.taskId);
    renderDayPopup();
    return;
  }
  const whenBtn = e.target.closest('.day-popup-when-btn');
  if (whenBtn) { setMitWhen(dayPopupDate, whenBtn.dataset.taskId, whenBtn.dataset.when); renderDayPopup(); return; }

  const pullBtn = e.target.closest('.day-pull-btn');
  if (pullBtn) { pullTaskToToday(pullBtn.dataset.taskId, pullBtn.dataset.boardId, dayPopupDate); return; }

  if (e.target.closest('#dayTrayToggle')) { dayTrayOpen = !dayTrayOpen; renderDayPopup(); return; }

  const nameBtn = e.target.closest('.day-popup-task-name');
  if (nameBtn) {
    const board = boards.find(b => b.id === nameBtn.dataset.boardId);
    if (board) openModal(nameBtn.dataset.taskId, board);
    return;
  }

  if (e.target.id === 'dayCaptureSubmitBtn') { submitDayCapture(); return; }
  if (e.target.id === 'dayOpenCloseBtn') { openDayCloseMode(); return; }
  if (e.target.id === 'dayBackToPlanBtn') { dayPopupMode = 'plan'; renderDayPopup(); return; }
  if (e.target.id === 'dayFinalizeCloseBtn') { finalizeClose(); return; }
  if (e.target.id === 'dayReopenBtn') { reopenDayLog(); return; }

  const choiceBtn = e.target.closest('.day-choice-btn');
  if (choiceBtn) { setCloseChoice(choiceBtn.dataset.taskId, choiceBtn.dataset.choice); return; }
  const reasonChip = e.target.closest('.day-reason-chip');
  if (reasonChip) { setCloseReason(reasonChip.dataset.taskId, reasonChip.dataset.reason); return; }
  const promptBtn = e.target.closest('.day-note-prompt-btn');
  if (promptBtn) {
    const promptLabel = promptBtn.dataset.prompt === 'stuck' ? 'O que travou: ' : 'O que foi bem: ';
    dayNoteDraft = (dayNoteDraft ? dayNoteDraft + '\n' : '') + promptLabel;
    renderDayPopup();
    return;
  }

  const cityOption = e.target.closest('.weather-city-option');
  if (cityOption) {
    selectWeatherCity({
      name: cityOption.dataset.name,
      latitude: parseFloat(cityOption.dataset.lat),
      longitude: parseFloat(cityOption.dataset.lon),
      auto: false,
    }, dayPopupDate);
    return;
  }
  if (e.target.id === 'weatherSearchOpenBtn') {
    weatherSearchOpen = true;
    weatherSearchQuery = '';
    weatherSearchResults = [];
    renderWeatherInDayPopup(dayPopupDate);
    return;
  }
  if (e.target.id === 'weatherSearchCancelBtn') {
    weatherSearchOpen = false;
    renderWeatherInDayPopup(dayPopupDate);
    return;
  }
});

dayPopupPanelEl.addEventListener('keydown', e => {
  if (e.target.id === 'dayCaptureInput' && e.key === 'Enter') { e.preventDefault(); submitDayCapture(); }
});

dayPopupPanelEl.addEventListener('input', e => {
  if (e.target.id === 'weatherCityInput') {
    weatherSearchQuery = e.target.value;
    clearTimeout(weatherSearchTimer);
    weatherSearchTimer = setTimeout(async () => {
      weatherSearchResults = await searchCity(weatherSearchQuery);
      renderWeatherCityResults();
    }, 400);
    return;
  }
  if (e.target.id === 'dayCaptureInput') { dayCaptureText = e.target.value; return; }
  if (e.target.id === 'dayNoteTextarea') { dayNoteDraft = e.target.value; return; }
});

dayPopupPanelEl.addEventListener('change', e => {
  if (e.target.classList.contains('day-popup-board-toggle')) {
    toggleBoardVisibility(e.target.dataset.boardId);
    return;
  }
  if (e.target.classList.contains('daypopup-chk-done')) {
    const board = boards.find(b => b.id === e.target.dataset.boardId);
    const t = board && findTaskInBoard(e.target.dataset.taskId, board);
    if (t) {
      setCompleted(t, e.target.checked, board);
      save();
      refreshCalendarAndBoard();
      renderDayPopup();
    }
    return;
  }
  if (e.target.id === 'dayCaptureBoardSelect') { dayCaptureBoardId = e.target.value; return; }
  if (e.target.id === 'dayGroupSelect') { dayPopupGroupField = e.target.value; renderDayPopup(); return; }
  if (e.target.id === 'dayCapacityInput') { setDayCapacity(dayPopupDate, e.target.value); return; }
  if (e.target.id === 'dayDefaultCapacityInput') { setDefaultCapacity(e.target.value); renderDayPopup(); return; }
  if (e.target.classList.contains('day-choice-date-input')) { setCloseCustomDate(e.target.dataset.taskId, e.target.value); return; }
});

// ================================================================
// Exportar atividades
// ================================================================

// ---------- semana ----------
function mondayOfWeek(d) {
  const dow = d.getDay(); // 0=dom..6=sáb
  return addDays(d, dow === 0 ? -6 : 1 - dow);
}
function currentWeekMonday() {
  const today = new Date();
  return mondayOfWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
}
function exportWeekMonday(offset) { return addDays(currentWeekMonday(), offset * 7); }
function exportWeekDates(monday) { return [0, 1, 2, 3, 4].map(i => toKey(addDays(monday, i))); }
function exportWeekLabelText(monday) {
  const fri = addDays(monday, 4);
  return `${String(monday.getDate()).padStart(2, '0')}/${MON[monday.getMonth()]} – ${String(fri.getDate()).padStart(2, '0')}/${MON[fri.getMonth()]}`;
}
function exportColumnWeekLabel(monday) {
  const fri = addDays(monday, 4);
  const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(monday)} - ${fmt(fri)}`;
}
function exportViewKey(boardId, monday) { return `${boardId}::${toKey(monday)}`; }

// ---------- formatação do responsável ----------
function formatResponsavel(team) {
  if (!team || !team.length) {
    const p = principalPerson();
    return p ? p.name : '';
  }
  const groups = [];
  const byArea = new Map();
  team.forEach(m => {
    const key = m.area || '';
    if (!byArea.has(key)) { const g = { area: m.area || '', names: [] }; byArea.set(key, g); groups.push(g); }
    byArea.get(key).names.push(m.name);
  });
  const joinNames = ns => ns.length === 1 ? ns[0] : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1];
  return groups.map(g => g.area ? `${joinNames(g.names)} | ${g.area}` : joinNames(g.names)).join(', ');
}

function generateExportText(t) {
  const [, m, d] = t.date.split('-');
  const resp = formatResponsavel(t.team);
  return resp ? `${t.name} (${resp} – ${d}/${m})` : `${t.name} – ${d}/${m}`;
}

// ---------- montagem das linhas ----------
function tasksForExportWeek(boardId, monday) {
  const b = boards.find(x => x.id === boardId);
  if (!b) return [];
  const keys = exportWeekDates(monday);
  return keys.flatMap(k => getTasksForDateAndBoard(boardId, k));
}

function buildExportRows() {
  const board = boards.find(b => b.id === exportBoardId);
  const monday = exportWeekMonday(exportWeekOffset);
  const nextMonday = addDays(monday, 7);
  const weekTasks = tasksForExportWeek(exportBoardId, monday);
  const nextWeekTasks = tasksForExportWeek(exportBoardId, nextMonday);

  const projectsPresent = new Map();
  [...weekTasks, ...nextWeekTasks].forEach(t => { const p = taskProjectInfo(t, board); if (!projectsPresent.has(p.id)) projectsPresent.set(p.id, p); });

  const visible = ts => ts
    .filter(t => !exportRowDeletions.has(t.id))
    .filter(t => exportProjectFilter[taskProjectInfo(t, board).id] === true);
  const sortByDateDesc = ts => [...ts].sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0));

  return {
    board, monday, nextMonday, projectsPresent,
    progresso: sortByDateDesc(visible(weekTasks).filter(t => t.completed)),
    proximos: sortByDateDesc(visible(nextWeekTasks).filter(t => !t.completed)),
  };
}

// ---------- render ----------
function rowText(t) { return exportRowEdits[t.id] !== undefined ? exportRowEdits[t.id] : generateExportText(t); }

function exportRowHtml(t, board) {
  const p = taskProjectInfo(t, board);
  const missing = !formatResponsavel(t.team);
  return `
  <div class="export-row${missing ? ' missing-info' : ''}" data-task-id="${t.id}">
    <span class="dot" style="background:${p.color}"></span>
    <textarea class="export-row-textarea" data-task-id="${t.id}" rows="1">${escapeHtml(rowText(t))}</textarea>
    <button type="button" class="export-row-delete" data-task-id="${t.id}" title="Remover do export">×</button>
  </div>`;
}
function exportEmptyStateHtml(msg) { return `<div class="export-empty-state">${msg}</div>`; }

function exportProjectPillsHtml(projectsPresent) {
  return [...projectsPresent.values()].map(p => {
    const checked = exportProjectFilter[p.id] === true;
    return `
    <label class="export-project-pill${checked ? ' checked' : ''}">
      <input type="checkbox" class="export-pill-checkbox" data-project-id="${p.id}" ${checked ? 'checked' : ''}>
      <span class="dot" style="background:${p.color}"></span>${escapeHtml(p.name)}
    </label>`;
  }).join('');
}

function autoGrowTextarea(el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }

function renderExportModal() {
  if (!exportOpen) return;
  const { board, monday, nextMonday, projectsPresent, progresso, proximos } = buildExportRows();
  document.getElementById('exportWeekLabel').textContent = exportWeekLabelText(monday);
  document.getElementById('exportProjectPills').innerHTML = exportProjectPillsHtml(projectsPresent);
  document.getElementById('exportProgressoWeek').textContent = exportColumnWeekLabel(monday);
  document.getElementById('exportProximosWeek').textContent = exportColumnWeekLabel(nextMonday);
  const projectIds = [...projectsPresent.keys()];
  const allSelected = projectIds.length > 0 && projectIds.every(id => exportProjectFilter[id] === true);
  const selectAllBtn = document.getElementById('exportSelectAllBtn');
  selectAllBtn.textContent = allSelected ? 'Limpar seleção' : 'Selecionar todos';
  selectAllBtn.disabled = projectIds.length === 0;
  document.getElementById('exportProgressoCount').textContent = progresso.length;
  document.getElementById('exportProximosCount').textContent = proximos.length;
  document.getElementById('exportProgressoBody').innerHTML = progresso.length
    ? progresso.map(t => exportRowHtml(t, board)).join('')
    : exportEmptyStateHtml('Nenhuma atividade concluída nesta semana');
  document.getElementById('exportProximosBody').innerHTML = proximos.length
    ? proximos.map(t => exportRowHtml(t, board)).join('')
    : exportEmptyStateHtml('Nenhuma atividade pendente nesta semana');
  document.querySelectorAll('.export-row-textarea').forEach(autoGrowTextarea);
}

// ---------- abrir / fechar / navegar / salvar ----------
function loadExportViewState() {
  const key = exportViewKey(exportBoardId, exportWeekMonday(exportWeekOffset));
  const saved = exportViews[key];
  exportProjectFilter = saved ? { ...saved.projectFilter } : {};
  exportRowEdits = saved ? { ...saved.rowEdits } : {};
  exportRowDeletions = new Set(saved ? saved.rowDeletions : []);
}

function openExportModal() {
  exportOpen = true;
  exportBoardId = activeBoardId;
  exportWeekOffset = 0;
  loadExportViewState();
  document.getElementById('exportOverlay').classList.remove('hidden');
  renderExportModal();
}
function closeExportModal() {
  exportOpen = false;
  document.getElementById('exportOverlay').classList.add('hidden');
}
function changeExportWeek(delta) {
  exportWeekOffset += delta;
  loadExportViewState();
  renderExportModal();
}

function saveExportView() {
  const key = exportViewKey(exportBoardId, exportWeekMonday(exportWeekOffset));
  exportViews[key] = {
    projectFilter: { ...exportProjectFilter },
    rowEdits: { ...exportRowEdits },
    rowDeletions: [...exportRowDeletions],
  };
  save();
  const btn = document.getElementById('exportSaveViewBtn');
  btn.textContent = 'Visualização salva ✓';
  setTimeout(() => { btn.textContent = 'Salvar visualização'; }, 1500);
}

function toggleSelectAllProjects() {
  const { projectsPresent } = buildExportRows();
  const ids = [...projectsPresent.keys()];
  const allSelected = ids.length > 0 && ids.every(id => exportProjectFilter[id] === true);
  ids.forEach(id => { exportProjectFilter[id] = !allSelected; });
  renderExportModal();
}

function copyExportColumn(colKey, btn) {
  const { progresso, proximos } = buildExportRows();
  const rows = colKey === 'progresso' ? progresso : proximos;
  const text = rows.map(rowText).join('\n');
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = 'Copiado ✓';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
  });
}

// ---------- eventos ----------
document.getElementById('exportReportBtn').addEventListener('click', openExportModal);
document.getElementById('closeExportModal').addEventListener('click', closeExportModal);
document.getElementById('exportOverlay').addEventListener('click', e => {
  if (e.target.id === 'exportOverlay') closeExportModal();
});
document.getElementById('exportPrevWeek').addEventListener('click', () => changeExportWeek(-1));
document.getElementById('exportNextWeek').addEventListener('click', () => changeExportWeek(1));
document.getElementById('exportSaveViewBtn').addEventListener('click', saveExportView);
document.getElementById('exportSelectAllBtn').addEventListener('click', toggleSelectAllProjects);

document.querySelector('.export-modal').addEventListener('click', e => {
  const copyBtn = e.target.closest('.export-copy-btn');
  if (copyBtn) { copyExportColumn(copyBtn.dataset.col, copyBtn); return; }
  const delBtn = e.target.closest('.export-row-delete');
  if (delBtn) { exportRowDeletions.add(delBtn.dataset.taskId); renderExportModal(); return; }
});
document.querySelector('.export-modal').addEventListener('change', e => {
  if (e.target.classList.contains('export-pill-checkbox')) {
    exportProjectFilter[e.target.dataset.projectId] = e.target.checked;
    renderExportModal();
  }
});
document.querySelector('.export-modal').addEventListener('input', e => {
  if (e.target.classList.contains('export-row-textarea')) {
    exportRowEdits[e.target.dataset.taskId] = e.target.value;
    autoGrowTextarea(e.target);
  }
});

// ================================================================
// Lista de Atividades
// ================================================================

function findActivity(id) { return activities.find(a => a.id === id); }

// Busca fuzzy via Fuse.js (CDN — fe-01) sobre nome, categoria, vibe e notas, threshold 0.4.
// O índice é reconstruído a cada busca em vez de mantido incrementalmente: para o volume de
// atividades de uma lista pessoal (dezenas, não milhares), reconstruir é imperceptível e evita
// ter que invalidar o índice manualmente em cada um dos muitos pontos que mutam `activities`.
function searchActivitiesFuzzy(list, query) {
  const q = (query || '').trim();
  if (!q || typeof Fuse === 'undefined') return list;
  const fuse = new Fuse(list, { keys: ['name', 'categoria', 'vibes', 'notas'], threshold: 0.4 });
  return fuse.search(q).map(r => r.item);
}

// Filtros combináveis (categoria, vibe, status, modalidade de duração, perfil de custo, época do
// ano) — todos aplicados em conjunto e combináveis com a busca fuzzy (getFilteredActivities()).
function applyActivityFilters(list) {
  return list.filter(a => {
    if (activityFilters.categoria && a.categoria !== activityFilters.categoria) return false;
    if (activityFilters.vibe && !(a.vibes || []).includes(activityFilters.vibe)) return false;
    if (activityFilters.status && a.status !== activityFilters.status) return false;
    if (activityFilters.modalidade && !(a.modalidadesDuracao || []).includes(activityFilters.modalidade)) return false;
    if (activityFilters.epoca && !(a.epocaIdeal || []).includes(activityFilters.epoca)) return false;
    if (activityFilters.custoMax != null) {
      const hasAffordable = PERFIS_CUSTO_TIPOS.some(tipo => {
        const perfil = (a.perfisCusto || {})[tipo];
        const baixa = perfil && perfil.baixa_temporada;
        return baixa && baixa[0] != null && baixa[0] <= activityFilters.custoMax;
      });
      if (!hasAffordable) return false;
    }
    return true;
  });
}

function getFilteredActivities() {
  return applyActivityFilters(searchActivitiesFuzzy(activities, activitySearchQuery));
}

function groupActivitiesByStatus(list) {
  const groups = new Map(Object.keys(ACTIVITY_STATUS_LABELS).map(s => [s, []]));
  list.forEach(a => {
    if (!groups.has(a.status)) groups.set(a.status, []);
    groups.get(a.status).push(a);
  });
  groups.forEach(g => g.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
  return groups;
}

function activitiesEmptyStateHtml() {
  return `<div class="activities-empty-state">Nenhuma atividade ainda. Clique em "+ Nova atividade" para começar sua lista.</div>`;
}

function activityDraftBannerHtml() {
  const count = activities.filter(a => a.status === 'rascunho').length;
  if (!count) return '';
  return `<div class="activity-draft-banner">⚠️ ${count} atividade${count > 1 ? 's' : ''} aguardando detalhamento</div>`;
}

const ACTIVITY_STATUS_LABELS = { rascunho: 'Rascunho', quero_fazer: 'Quero fazer', planejada: 'Planejada', realizada: 'Realizada' };
let activityDisplayView = 'category'; // 'category' | 'status'

// Mapeamento mês (0-indexado) → época trimestral.
function epocaForMonth(month) {
  if (month <= 2) return 'Jan–Mar';
  if (month <= 5) return 'Abr–Jun';
  if (month <= 8) return 'Jul–Set';
  return 'Out–Dez';
}

function isWeekendDate(date) { const d = date.getDay(); return d === 0 || d === 6; }

// Detecta períodos de "feriado prolongado" a partir do cache de feriados (fe-41): agrupa cada
// feriado com os fins de semana/feriados adjacentes em um período contínuo de dias não-úteis;
// períodos com 3+ dias contam como "feriado prolongado". A spec não define um algoritmo exato de
// clusterização — esta é uma interpretação conservadora (feriado + fins de semana emendados),
// documentada em "Registro de desenvolvimento".
function findProlongedHolidayPeriods(holidays) {
  if (!holidays || !holidays.length) return [];
  const offDates = new Set(holidays.map(h => h.date));
  const isOff = d => offDates.has(toKey(d)) || isWeekendDate(d);
  const periods = [];
  const seenStarts = new Set();
  holidays.forEach(h => {
    const holidayDate = new Date(h.date + 'T00:00:00');
    let start = new Date(holidayDate);
    while (isOff(addDays(start, -1))) start = addDays(start, -1);
    let end = new Date(holidayDate);
    while (isOff(addDays(end, 1))) end = addDays(end, 1);
    const lengthDays = Math.round((end - start) / 86400000) + 1;
    const startKey = toKey(start);
    if (lengthDays >= 3 && !seenStarts.has(startKey)) {
      seenStarts.add(startKey);
      periods.push({ start: startKey, end: toKey(end) });
    }
  });
  return periods;
}

// Retorna a variação sazonal ativa para uma data de referência (padrão: hoje), ou null se
// nenhuma cobrir a época atual (fallback: atributos da base). Se `inclui_feriados_prolongados`,
// a variação também fica ativa a partir da véspera do primeiro dia de um feriado prolongado
// detectado via holidaysCache (fe-41) — mesmo que a data ainda pertença à época anterior.
function getActiveVariation(activity, referenceDate = new Date()) {
  const variations = (activity && activity.variacoes) || [];
  if (!variations.length) return null;

  if (holidaysCache && holidaysCache.length) {
    const periods = findProlongedHolidayPeriods(holidaysCache);
    const refKey = toKey(referenceDate);
    for (const v of variations) {
      if (!v.incluiFeriadosProlongados) continue;
      for (const p of periods) {
        const vespera = toKey(addDays(new Date(p.start + 'T00:00:00'), -1));
        if (refKey >= vespera && refKey <= p.end) return v;
      }
    }
  }

  const currentEpoca = epocaForMonth(referenceDate.getMonth());
  return variations.find(v => (v.epocasCobertas || []).includes(currentEpoca)) || null;
}

function activityCostSummaryHtml(a) {
  const perfis = a.perfisCusto || {};
  for (const tipo of PERFIS_CUSTO_TIPOS) {
    const perfil = perfis[tipo];
    const range = perfil && perfil.baixa_temporada;
    if (range && range[0] != null && range[1] != null) {
      return `R$ ${range[0]}–${range[1]} / pessoa`;
    }
  }
  return '';
}

function activityCardHtml(a) {
  const isStatusView = activityDisplayView === 'status';
  const isPlanned    = a.status === 'planejada';
  const isRealized   = a.status === 'realizada';

  // Variação escolhida (para Planejada/Realizada na visão por status)
  const chosenVar = (isPlanned || isRealized)
    ? (a.variacoes || []).find(v => v.id === a.variacaoEscolhidaId) || null
    : null;

  // Vibes: usa os da variação escolhida se existir, senão base da atividade
  const vibes    = (chosenVar && chosenVar.vibes && chosenVar.vibes.length ? chosenVar.vibes : a.vibes) || [];
  const vibeChips = vibes.slice(0, 3).map(v => `<span class="tag activity-tag-vibe">${escapeHtml(v)}</span>`).join('');
  const vibeMore  = vibes.length > 3 ? `<span class="tag activity-tag-more">+${vibes.length - 3}</span>` : '';

  // Custo: usa perfil da variação se existir
  const costSrc  = (chosenVar && chosenVar.perfisCusto && Object.keys(chosenVar.perfisCusto).length)
    ? { ...a, perfisCusto: chosenVar.perfisCusto }
    : a;
  const cost     = activityCostSummaryHtml(costSrc);

  const realCount  = (a.realizacoes || []).length;
  const durChips   = (a.modalidadesDuracao || []).map(m => `<span class="tag activity-tag-duracao">${escapeHtml(m)}</span>`).join('');
  const activeVariation = getActiveVariation(a);

  // Subtítulo: variação escolhida + data de início (só em Planejada/Realizada)
  const subtitleParts = [
    chosenVar ? escapeHtml(chosenVar.nome) : null,
    (isPlanned || isRealized) && a.dataInicio ? fmtDateBR(a.dataInicio) : null,
  ].filter(Boolean);
  const subtitle = subtitleParts.length
    ? `<div class="activity-card-subtitle">${subtitleParts.join(' · ')}</div>`
    : '';

  // Chip de variação escolhida (visão por status — planejada/realizada)
  const chosenVarChip = chosenVar && isStatusView
    ? `<span class="tag activity-tag-variation">${escapeHtml(chosenVar.nome)}</span>`
    : '';

  // Chip de status (visão por categoria, para o usuário saber onde cada atividade está)
  const statusChip = !isStatusView
    ? `<span class="tag activity-tag-status activity-status-${a.status}">${ACTIVITY_STATUS_LABELS[a.status] || a.status}</span>`
    : '';

  // Chip de variação sazonal ativa (só na visão por categoria, quando não tem variação escolhida)
  const activeVarChip = !isStatusView && activeVariation && !chosenVar
    ? `<span class="tag activity-tag-variation">🕓 ${escapeHtml(activeVariation.nome)}</span>`
    : '';

  return `
  <div class="activity-card" draggable="true" data-id="${a.id}">
    ${a.fotoCapa ? `<div class="activity-card-cover" style="background-image:url('${a.fotoCapa}')"></div>` : ''}
    <div class="activity-card-top">
      <div>
        <div class="activity-card-name">${escapeHtml(a.name)}</div>
        ${subtitle}
      </div>
    </div>
    <div class="activity-card-chips">
      ${statusChip}
      ${chosenVarChip}
      ${vibeChips}${vibeMore}
      ${activeVarChip}
      ${realCount > 0 ? `<span class="tag activity-tag-realized">Realizada ${realCount}×</span>` : ''}
    </div>
    <div class="activity-card-meta">
      ${cost ? `<span class="activity-card-cost">${cost}</span>` : ''}
      ${durChips}
    </div>
  </div>`;
}

function activityColumnHtml(status, list) {
  return `
  <section class="activity-column">
    <div class="activity-column-header">
      <span class="activity-column-title activity-status-${status}">${ACTIVITY_STATUS_LABELS[status] || status}</span>
      <span class="activity-column-count">${list.length}</span>
    </div>
    <div class="activity-column-body" data-status="${status}">
      ${list.map(a => activityCardHtml(a)).join('') || '<div class="activity-column-empty">Nenhuma atividade</div>'}
    </div>
  </section>`;
}

// ─── Vista por categoria ────────────────────────────────────
function groupActivitiesByCategoria(list) {
  const groups = new Map();
  list.forEach(a => {
    if (!groups.has(a.categoria)) groups.set(a.categoria, []);
    groups.get(a.categoria).push(a);
  });
  // Ordena categorias alfabeticamente
  return new Map([...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function activityCategoryGroupHtml(categoria, list) {
  return `
  <section class="activity-column">
    <div class="activity-column-header">
      <span class="activity-column-title activity-tag-categoria">${escapeHtml(categoria)}</span>
      <span class="activity-column-count">${list.length}</span>
    </div>
    <div class="activity-column-body" data-categoria="${escapeHtml(categoria)}">
      ${list.map(a => activityCardHtml(a)).join('')}
    </div>
  </section>`;
}

// Reconstrói o DOM de #activitiesView — análoga a render() (board) e initCalendarIfNeeded() (calendário).
function renderActivities() {
  if (currentView !== 'activities') return;
  const container = document.getElementById('activitiesView');
  if (!container) return;

  const banner = activityDraftBannerHtml();

  if (!activities.length) {
    container.innerHTML = banner + activitiesEmptyStateHtml();
    return;
  }

  const filtered = getFilteredActivities();

  if (activityDisplayView === 'category') {
    const groups = groupActivitiesByCategoria(filtered);
    const columnsHtml = [...groups.entries()].map(([cat, list]) => activityCategoryGroupHtml(cat, list)).join('');
    container.innerHTML = banner + `<div class="activities-board">${columnsHtml}</div>`;
  } else {
    const groups = groupActivitiesByStatus(filtered);
    const columnsHtml = [...groups.entries()].map(([status, list]) => activityColumnHtml(status, list)).join('');
    container.innerHTML = banner + `<div class="activities-board">${columnsHtml}</div>`;
  }
}

// ---------- criação rápida (Fluxo 1) ----------
function createBlankActivity(name, categoria) {
  const now = Date.now();
  return {
    id: uid(), name, categoria, status: 'rascunho',
    descricao: null, fotoCapa: null, vibes: [],
    modalidadesDuracao: [], meiosTransporte: [], nivelPlanejamento: null,
    antecedenciaMiniDias: null, decisaoUltimaHora: false, localidade: null, distanciaSP: null,
    condicaoClimaticaIdeal: [], temperaturaMiniCelsius: null, epocaIdeal: [], perfilGrupo: [],
    tamanhoGrupo: null, condicionamentoFisico: null, evitarAltaTemporada: false, repetivel: true, petFriendly: null,
    perfisCusto: {}, variacoes: [], variacaoEscolhidaId: null, notas: null, links: [],
    dataInicio: null, boardDestinoId: null, realizacoes: [],
    checklistTasks: [], createdAt: now, updatedAt: now,
  };
}

// Categorias personalizadas já em uso (para autocomplete), derivadas do array `activities` em
// memória — evita fragmentação por erro de digitação (ver seção "Categoria Personalizada" da spec).
function customCategoriesInUse() {
  const known = new Set(ACTIVITY_CATEGORIES);
  const set = new Set();
  activities.forEach(a => { if (a.categoria && !known.has(a.categoria)) set.add(a.categoria); });
  return [...set];
}

let activityAiPanelOpen = false;

function resetActivityAiPanel() {
  activityAiPanelOpen = false;
  document.getElementById('activityAiPanel').classList.remove('open');
  document.getElementById('activityAiToggleBtn').classList.remove('active');
  document.getElementById('activityAiJsonArea').value = '';
  document.getElementById('activityAiConfirmBtn').disabled = true;
  const copyBtn = document.getElementById('activityCopyPromptBtn');
  if (copyBtn) copyBtn.textContent = '📋 Copiar prompt';
}

function openActivityQuickCreate() {
  document.getElementById('activityQuickName').value = '';
  document.getElementById('activityQuickDesc').value = '';
  const sel = document.getElementById('activityQuickCategoria');
  sel.innerHTML = ACTIVITY_CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = ACTIVITY_CATEGORIES[0];
  document.getElementById('activityQuickCategoriaCustomField').classList.add('hidden');
  document.getElementById('activityQuickCategoriaCustom').value = '';
  document.getElementById('activityQuickCategoriaCustomList').innerHTML =
    customCategoriesInUse().map(c => `<option value="${escapeHtml(c)}">`).join('');
  resetActivityAiPanel();
  document.getElementById('activityQuickCreateOverlay').classList.remove('hidden');
  document.getElementById('activityQuickName').focus();
}
function closeActivityQuickCreate() {
  document.getElementById('activityQuickCreateOverlay').classList.add('hidden');
  resetActivityAiPanel();
}
function confirmActivityQuickCreate() {
  const name = document.getElementById('activityQuickName').value.trim();
  if (!name) return;
  const sel = document.getElementById('activityQuickCategoria');
  let categoria = sel.value;
  if (categoria === 'Personalizada') {
    // Normalizado (trim, sem caixa forçada) antes de salvar — ver "Categoria Personalizada" na spec.
    categoria = document.getElementById('activityQuickCategoriaCustom').value.trim();
    if (!categoria) return;
  }
  activities.push(createBlankActivity(name, categoria));
  save();
  closeActivityQuickCreate();
  renderActivities();
}

// ── Painel IA no quick-create ────────────────────────────────────────────────
function toggleActivityAiPanel() {
  activityAiPanelOpen = !activityAiPanelOpen;
  document.getElementById('activityAiPanel').classList.toggle('open', activityAiPanelOpen);
  document.getElementById('activityAiToggleBtn').classList.toggle('active', activityAiPanelOpen);
}

function buildActivityPrompt() {
  const nome = document.getElementById('activityQuickName').value.trim();
  const desc = document.getElementById('activityQuickDesc').value.trim();
  const lines = [];
  if (nome) lines.push(`Nome: ${nome}`);
  if (desc) lines.push(`Descrição: ${desc}`);
  const userInput = lines.length ? lines.join('\n') : '[sem informação — pergunte ao usuário]';
  return `Você é um assistente de planejamento pessoal. O usuário vai descrever uma atividade que quer fazer — pode ser só o título, pode ser uma descrição mais detalhada, pode incluir contexto pessoal (com quem vai, ocasião, preferências).

ANTES DE GERAR O JSON:
- Avalie se você tem informação suficiente para preencher os campos com qualidade.
- Se o input for ambíguo em algo que impacte campos obrigatórios ou estimativas centrais (categoria, custo, duração), faça perguntas objetivas — no máximo 3, todas numa única mensagem.
- Se o input for suficiente, vá direto ao JSON sem comentários.
- Campos opcionais sem informação suficiente devem ser preenchidos com null.

REGRAS DE PREENCHIMENTO:
- Preencha com base no seu conhecimento sobre a atividade e no contexto fornecido.
- Inclua variações sazonais apenas quando a experiência mudar significativamente por época.
- Nas variações, preencha APENAS os campos que diferem da base.
- Estime custos em R$ por pessoa, considerando São Paulo como cidade de origem.
- O checklist deve ser prático e específico. Para cada item, estime antecedência mínima, máxima e recomendada em dias antes da data da atividade.

RETORNE SOMENTE O JSON, sem texto antes ou depois.

SCHEMA:
{
  "nome": "",
  "categoria": "",
  "descricao": "",
  "vibes": [],
  "modalidades_duracao": [],
  "meios_transporte": [],
  "nivel_planejamento": "",
  "antecedencia_minima_dias": null,
  "decisao_ultima_hora": false,
  "distancia_sp": "",
  "condicao_climatica_ideal": [],
  "temperatura_minima_ideal_celsius": null,
  "epoca_ideal": [],
  "perfil_grupo": [],
  "tamanho_grupo": "",
  "condicionamento_fisico": "",
  "evitar_alta_temporada": false,
  "repetivel": true,
  "pet_friendly": null,
  "perfis_custo": {
    "economico": { "baixa_temporada": [min, max], "alta_temporada": [min, max] },
    "padrao":    { "baixa_temporada": [min, max], "alta_temporada": [min, max] },
    "conforto":  { "baixa_temporada": [min, max], "alta_temporada": [min, max] }
  },
  "variacoes": [
    {
      "nome": "",
      "epocas_cobertas": [],
      "inclui_feriados_prolongados": false,
      "vibes": [],
      "condicao_climatica_ideal": [],
      "temperatura_minima_celsius": null,
      "antecedencia_minima_dias": null,
      "decisao_ultima_hora": null,
      "perfis_custo": {},
      "modalidades_duracao": [],
      "meios_transporte": [],
      "perfil_grupo": [],
      "evitar_alta_temporada": null,
      "notas": ""
    }
  ],
  "checklist_sugerido": [
    {
      "name": "",
      "antecedencia_minima_dias": null,
      "antecedencia_max_dias": null,
      "antecedencia_rec_dias": null
    }
  ]
}

--- ATIVIDADE ---
${userInput}`;
}

async function copyActivityPrompt() {
  const prompt = buildActivityPrompt();
  try {
    await navigator.clipboard.writeText(prompt);
  } catch(e) {
    const ta = document.createElement('textarea');
    ta.value = prompt;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  const btn = document.getElementById('activityCopyPromptBtn');
  const original = btn.textContent;
  btn.textContent = '✓ Prompt copiado!';
  setTimeout(() => { btn.textContent = original; }, 3000);
}

function onActivityAiJsonInput() {
  const val = document.getElementById('activityAiJsonArea').value.trim();
  let valid = false;
  try { valid = validateActivityImportJson(JSON.parse(val)).valid; } catch(e) {}
  document.getElementById('activityAiConfirmBtn').disabled = !valid;
}

function confirmActivityImportFromQuickCreate() {
  const raw = document.getElementById('activityAiJsonArea').value.trim();
  let json;
  try {
    json = JSON.parse(raw);
  } catch(e) {
    alert('JSON inválido. Verifique e tente novamente.');
    return;
  }
  const { valid, errors } = validateActivityImportJson(json);
  if (!valid) {
    alert('JSON inválido:\n' + errors.map(e => `- ${e.field}: ${e.message}`).join('\n'));
    return;
  }
  const activity = importJsonToActivity(json);
  activities.push(activity);
  save();
  closeActivityQuickCreate();
  openActivityFormAfterImport(activity.id);
}

function openActivityFormAfterImport(id) {
  const a = findActivity(id);
  if (!a) return;
  editingActivityId = id;
  activityFormMode = 'edit';
  showActivityFormStep(1);
  renderActivityFormStep(1);
  document.getElementById('activityFormImportBanner').classList.remove('hidden');
  document.getElementById('activityFormOverlay').classList.remove('hidden');
}

document.getElementById('activitySearchInput').addEventListener('input', e => {
  activitySearchQuery = e.target.value;
  renderActivities();
});

document.getElementById('activityNewBtn').addEventListener('click', openActivityQuickCreate);
document.getElementById('closeActivityQuickCreate').addEventListener('click', closeActivityQuickCreate);
document.getElementById('activityQuickCancelBtn').addEventListener('click', closeActivityQuickCreate);
document.getElementById('activityQuickCreateOverlay').addEventListener('click', e => { if (e.target.id === 'activityQuickCreateOverlay') closeActivityQuickCreate(); });
document.getElementById('activityQuickCategoria').addEventListener('change', e => {
  document.getElementById('activityQuickCategoriaCustomField').classList.toggle('hidden', e.target.value !== 'Personalizada');
});
document.getElementById('activityQuickCreateBtn').addEventListener('click', confirmActivityQuickCreate);
document.getElementById('activityAiToggleBtn').addEventListener('click', toggleActivityAiPanel);
document.getElementById('activityCopyPromptBtn').addEventListener('click', copyActivityPrompt);
document.getElementById('activityAiJsonArea').addEventListener('input', onActivityAiJsonInput);
document.getElementById('activityAiConfirmBtn').addEventListener('click', confirmActivityImportFromQuickCreate);

// ---------- modal de detalhes ----------
function detailRow(label, value) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  const text = Array.isArray(value) ? value.map(escapeHtml).join(', ') : escapeHtml(String(value));
  return `<div class="activity-detail-row"><span class="activity-detail-row-label">${escapeHtml(label)}</span><span class="activity-detail-row-value">${text}</span></div>`;
}

function activityDetailOverviewHtml(a) {
  return `
    <h3>Visão geral</h3>
    ${a.fotoCapa ? `<div class="activity-detail-cover" style="background-image:url('${a.fotoCapa}')"></div>` : ''}
    ${detailRow('Categoria', a.categoria)}
    ${detailRow('Vibe', a.vibes)}
    ${detailRow('Descrição', a.descricao)}
    ${detailRow('Localidade', a.localidade)}
  `;
}

function activityDetailLogisticsHtml(a) {
  const custoRows = PERFIS_CUSTO_TIPOS.map(tipo => {
    const perfil = (a.perfisCusto || {})[tipo];
    if (!perfil) return '';
    const baixa = perfil.baixa_temporada;
    const alta = perfil.alta_temporada;
    const parts = [];
    if (baixa && baixa[0] != null) parts.push(`Baixa: R$ ${baixa[0]}–${baixa[1]}`);
    if (alta && alta[0] != null) parts.push(`Alta: R$ ${alta[0]}–${alta[1]}`);
    return parts.length ? detailRow(PERFIS_CUSTO_LABELS[tipo], parts.join(' · ')) : '';
  }).join('');
  return `
    <h3>Logística</h3>
    ${detailRow('Modalidades de duração', a.modalidadesDuracao)}
    ${detailRow('Meios de transporte', a.meiosTransporte)}
    ${custoRows}
    ${detailRow('Nível de planejamento', a.nivelPlanejamento)}
    ${detailRow('Antecedência mínima geral', a.antecedenciaMiniDias != null ? `${a.antecedenciaMiniDias} dias` : null)}
    ${detailRow('Decisão de última hora', a.decisaoUltimaHora ? 'Sim' : null)}
    ${detailRow('Distância de SP', a.distanciaSP)}
  `;
}

function activityDetailConditionsHtml(a) {
  return `
    <h3>Condições ideais</h3>
    ${detailRow('Condição climática ideal', a.condicaoClimaticaIdeal)}
    ${detailRow('Temperatura mínima ideal', a.temperaturaMiniCelsius != null ? `${a.temperaturaMiniCelsius}°C` : null)}
    ${detailRow('Época ideal', a.epocaIdeal)}
    ${detailRow('Perfil de grupo', a.perfilGrupo)}
    ${detailRow('Tamanho do grupo', a.tamanhoGrupo)}
    ${detailRow('Condicionamento físico', a.condicionamentoFisico)}
    ${detailRow('Evitar alta temporada', a.evitarAltaTemporada ? 'Sim' : null)}
    ${detailRow('Repetível', a.repetivel ? 'Sim' : 'Não')}
    ${detailRow('Pet-friendly', a.petFriendly === true ? 'Sim' : (a.petFriendly === false ? 'Não' : null))}
  `;
}

function activityVariationCardHtml(v, isActive, isChosen) {
  const rows = ACTIVITY_VARIATION_MERGE_FIELDS
    .filter(f => v[f] != null && !(Array.isArray(v[f]) && !v[f].length))
    .map(f => detailRow(f, Array.isArray(v[f]) ? v[f] : String(v[f])))
    .join('');
  return `
  <div class="activity-variation-card${isActive ? ' active' : ''}" data-id="${v.id}">
    <div class="activity-variation-card-header">
      <strong>${escapeHtml(v.nome)}</strong>
      ${isChosen ? ' <span class="tag activity-tag-variation">Escolhida ✓</span>' : ''}
      ${isActive ? ' <span class="tag activity-tag-variation">Ativa agora</span>' : ''}
      <span class="activity-variation-card-epocas">${(v.epocasCobertas || []).map(escapeHtml).join(', ')}${v.incluiFeriadosProlongados ? ' + feriados prolongados' : ''}</span>
    </div>
    ${rows}
  </div>`;
}

function activityDetailVariationsHtml(a) {
  const variations = a.variacoes || [];
  const active = getActiveVariation(a);
  return `
    <h3>Variações sazonais</h3>
    ${variations.length ? variations.map(v => activityVariationCardHtml(v, active && active.id === v.id, a.variacaoEscolhidaId === v.id)).join('') : '<div class="activity-detail-empty">Nenhuma variação sazonal cadastrada.</div>'}
  `;
}

function activityChecklistProgressHtml(a) {
  const tasks = a.checklistTasks || [];
  const done = tasks.filter(t => t.completed).length;
  return tasks.length ? `<div class="activity-checklist-progress">${done} de ${tasks.length} itens concluídos</div>` : '';
}

function activityDetailPlanningHtml(a) {
  const links = a.links || [];
  const linksHtml = links.length
    ? `<ul class="activity-links-list">${links.map(l => `<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.titulo || l.url)}</a></li>`).join('')}</ul>`
    : '';
  return `
    <h3>Planejamento</h3>
    ${activityChecklistProgressHtml(a)}
    <div class="activity-detail-checklist" id="activityDetailChecklist"></div>
    ${detailRow('Data de início', a.dataInicio ? fmtDateBR(a.dataInicio) : null)}
    ${detailRow('Board de destino', a.boardDestinoId ? (boards.find(b => b.id === a.boardDestinoId) || {}).name : null)}
    ${detailRow('Notas', a.notas)}
    ${linksHtml}
    <h4>Próximos feriados compatíveis</h4>
    <div id="activityDetailHolidays"></div>
  `;
}

function activityDetailHistoryHtml(a) {
  const realizacoes = a.realizacoes || [];
  if (!realizacoes.length) return `<h3>Histórico</h3><div class="activity-detail-empty">Ainda não realizada.</div>`;
  return `
    <h3>Histórico (Realizada ${realizacoes.length}×)</h3>
    ${realizacoes.map(r => `
      <div class="activity-realization-card" data-id="${r.id}">
        ${detailRow('Data', fmtDateBR(r.data))}
        ${detailRow('Gasto total', r.gasto_total != null ? `R$ ${r.gasto_total}` : null)}
        ${detailRow('Perfil vivido', r.perfil_vivido ? PERFIS_CUSTO_LABELS[r.perfil_vivido] : null)}
        ${detailRow('Com quem', r.com_quem)}
        ${detailRow('Avaliação', r.avaliacao ? `${'★'.repeat(r.avaliacao)}${'☆'.repeat(5 - r.avaliacao)}` : null)}
        ${detailRow('Nota', r.nota)}
        <button type="button" class="btn-neutral-sm activity-realization-edit-btn" data-id="${r.id}">Editar registro</button>
      </div>
    `).join('')}
  `;
}

function activityDetailFooterHtml(a) {
  const buttons = [];
  if (a.status === 'quero_fazer') {
    const checklistEmpty = !(a.checklistTasks || []).length;
    buttons.push(`<button type="button" class="btn-primary activity-promote-btn" data-id="${a.id}" ${checklistEmpty ? 'disabled title="Adicione ao menos uma tarefa ao checklist para planejar"' : ''}>Mover para Planejada</button>`);
  }
  if (a.status === 'planejada') {
    buttons.push(`<button type="button" class="btn-neutral activity-cancel-plan-btn" data-id="${a.id}">Cancelar planejamento</button>`);
  }
  if (a.status !== 'rascunho' && a.status !== 'realizada') {
    buttons.push(`<button type="button" class="btn-neutral activity-realize-btn" data-id="${a.id}">Marcar como realizada</button>`);
  }
  if (a.status === 'realizada') {
    buttons.push(`<button type="button" class="btn-neutral activity-realize-btn" data-id="${a.id}" title="Registrar outra realização">Registrar nova visita</button>`);
  }
  buttons.push(`<button type="button" class="btn-neutral activity-delete-btn" data-id="${a.id}">Excluir atividade</button>`);
  return buttons.join('');
}

function openActivityDetail(id) {
  const a = findActivity(id);
  if (!a) return;
  activityDetailId = id;
  document.getElementById('activityDetailTitle').textContent = a.name;
  const statusEl = document.getElementById('activityDetailStatus');
  statusEl.textContent = ACTIVITY_STATUS_LABELS[a.status] || a.status;
  statusEl.className = `tag activity-tag-status activity-status-${a.status}`;
  const realCount = (a.realizacoes || []).length;
  const realizedBadgeEl = document.getElementById('activityDetailRealizedBadge');
  realizedBadgeEl.textContent = `Realizada ${realCount}×`;
  realizedBadgeEl.classList.toggle('hidden', realCount === 0);
  document.getElementById('activityDetailOverview').innerHTML = activityDetailOverviewHtml(a);
  document.getElementById('activityDetailLogistics').innerHTML = activityDetailLogisticsHtml(a);
  document.getElementById('activityDetailConditions').innerHTML = activityDetailConditionsHtml(a);
  document.getElementById('activityDetailVariations').innerHTML = activityDetailVariationsHtml(a);
  document.getElementById('activityDetailPlanning').innerHTML = activityDetailPlanningHtml(a);
  const checklistEl = document.getElementById('activityDetailChecklist');
  if (checklistEl) checklistEl.innerHTML = (a.checklistTasks || []).map(checklistTaskRowHtml).join('');
  renderActivityDetailHolidays(a);
  document.getElementById('activityDetailHistory').innerHTML = activityDetailHistoryHtml(a);
  document.getElementById('activityDetailFooter').innerHTML = activityDetailFooterHtml(a);
  document.getElementById('activityDetailOverlay').classList.remove('hidden');
}
function closeActivityDetail() {
  document.getElementById('activityDetailOverlay').classList.add('hidden');
  activityDetailId = null;
}

document.getElementById('activityDetailOverlay').addEventListener('click', e => {
  const nameBtn = e.target.closest('.checklist-task-name');
  if (nameBtn) { openModal(nameBtn.dataset.id); return; }
  const chk = e.target.closest('.checklist-chk-done');
  if (chk) {
    const a = findActivity(activityDetailId);
    const t = a && (a.checklistTasks || []).find(x => x.id === chk.dataset.id);
    if (t) {
      setCompleted(t, chk.checked, t.boardId ? boards.find(b => b.id === t.boardId) : null);
      patchActivity(a, () => {});
      openActivityDetail(activityDetailId);
    }
    return;
  }
  const promoteBtn = e.target.closest('.activity-promote-btn');
  if (promoteBtn && !promoteBtn.disabled) { openActivityPromote(promoteBtn.dataset.id); return; }
  const cancelPlanBtn = e.target.closest('.activity-cancel-plan-btn');
  if (cancelPlanBtn) {
    const a = findActivity(cancelPlanBtn.dataset.id);
    if (a && confirm('Cancelar o planejamento vai remover as datas das tarefas do checklist e tirá-las do board. As tarefas permanecem no checklist da atividade. Deseja continuar?')) {
      cancelActivityPlan(a);
      openActivityDetail(a.id);
    }
    return;
  }
  const realizeBtn = e.target.closest('.activity-realize-btn');
  if (realizeBtn) { openActivityRealization(realizeBtn.dataset.id, null); return; }
  const editRealizationBtn = e.target.closest('.activity-realization-edit-btn');
  if (editRealizationBtn) { openActivityRealization(activityDetailId, editRealizationBtn.dataset.id); return; }
  const deleteBtn = e.target.closest('.activity-delete-btn');
  if (deleteBtn) { deleteActivity(deleteBtn.dataset.id); return; }
});

document.getElementById('activitiesView').addEventListener('click', e => {
  const card = e.target.closest('.activity-card');
  if (card) { openActivityDetail(card.dataset.id); return; }
});

// ---------- kanban de status (drag-and-drop entre colunas) ----------
// Move a atividade para o status da coluna de destino diretamente — sem exigir checklist,
// board ou qualquer outro campo preenchido (o kanban é a via rápida de mudança de status;
// o fluxo de "Mover para Planejada" no detalhe, com data/board, continua existindo à parte).
function setActivityStatus(a, newStatus) {
  a.status = newStatus;
  a.updatedAt = Date.now();
  save();
  renderActivities();
  if (activityDetailId === a.id) openActivityDetail(a.id);
}

let pendingVariationPickActivityId = null;

function openActivityVariationPicker(activityId) {
  const a = findActivity(activityId);
  if (!a) return;
  pendingVariationPickActivityId = activityId;

  // Nome da atividade no cabeçalho do modal
  const nameEl = document.getElementById('activityVariationPickerActivityName');
  if (nameEl) nameEl.textContent = a.name;

  // Opções de variação
  document.getElementById('activityVariationPickerOptions').innerHTML = (a.variacoes || []).map(v => `
    <label class="activity-variation-picker-option">
      <input type="radio" name="activityVariationPick" value="${v.id}">
      <div>
        <div style="font:700 13px var(--font-sora);">${escapeHtml(v.nome)}</div>
        ${v.epocasCobertas && v.epocasCobertas.length ? `<div style="font:500 11.5px var(--font-sora);color:var(--color-text-tertiary);margin-top:2px;">${v.epocasCobertas.map(escapeHtml).join(' · ')}</div>` : ''}
      </div>
    </label>`).join('');

  // Data padrão: +14 dias
  const d = new Date(); d.setDate(d.getDate() + 14);
  const dateEl = document.getElementById('activityVariationPickerDate');
  if (dateEl) dateEl.value = d.toISOString().split('T')[0];

  document.getElementById('activityVariationPickerConfirmBtn').disabled = (a.variacoes || []).length > 0;
  document.getElementById('activityVariationPickerOverlay').classList.remove('hidden');
}
function closeActivityVariationPicker() {
  document.getElementById('activityVariationPickerOverlay').classList.add('hidden');
  pendingVariationPickActivityId = null;
}
document.getElementById('closeActivityVariationPicker').addEventListener('click', closeActivityVariationPicker);
document.getElementById('activityVariationPickerCancelBtn').addEventListener('click', closeActivityVariationPicker);
document.getElementById('activityVariationPickerOverlay').addEventListener('click', e => {
  if (e.target.id === 'activityVariationPickerOverlay') closeActivityVariationPicker();
});
document.getElementById('activityVariationPickerOverlay').addEventListener('change', e => {
  if (e.target.name === 'activityVariationPick') {
    document.getElementById('activityVariationPickerConfirmBtn').disabled = !e.target.value;
  }
});
document.getElementById('activityVariationPickerConfirmBtn').addEventListener('click', () => {
  const a = findActivity(pendingVariationPickActivityId);
  const checked = document.querySelector('input[name="activityVariationPick"]:checked');
  if (!a) return;
  if (checked) a.variacaoEscolhidaId = checked.value;
  const dateEl = document.getElementById('activityVariationPickerDate');
  if (dateEl && dateEl.value) a.dataInicio = dateEl.value;
  setActivityStatus(a, 'planejada');
  closeActivityVariationPicker();
});

const activitiesView = document.getElementById('activitiesView');
activitiesView.addEventListener('dragstart', e => {
  const card = e.target.closest('.activity-card');
  if (!card) return;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', card.dataset.id);
  setTimeout(() => card.classList.add('dragging'), 0);
});
activitiesView.addEventListener('dragend', e => {
  const card = e.target.closest('.activity-card');
  if (card) card.classList.remove('dragging');
  activitiesView.querySelectorAll('.activity-column-body.drag-over').forEach(el => el.classList.remove('drag-over'));
});
activitiesView.addEventListener('dragover', e => {
  const col = e.target.closest('.activity-column-body');
  if (!col) return;
  e.preventDefault();
  if (!col.classList.contains('drag-over')) {
    activitiesView.querySelectorAll('.activity-column-body.drag-over').forEach(el => el.classList.remove('drag-over'));
    col.classList.add('drag-over');
  }
});
activitiesView.addEventListener('drop', e => {
  const col = e.target.closest('.activity-column-body');
  if (!col) return;
  e.preventDefault();
  col.classList.remove('drag-over');
  const id = e.dataTransfer.getData('text/plain');
  const a = findActivity(id);
  const newStatus = col.dataset.status;
  if (!a || newStatus === undefined || a.status === newStatus) return;
  if (newStatus === 'planejada') {
    // Sempre abre o picker — com variações para escolher, sem variações só pede data
    openActivityVariationPicker(a.id);
    return;
  }
  if (newStatus === 'realizada') {
    openActivityRealization(a.id, null);
    return;
  }
  setActivityStatus(a, newStatus);
});

document.getElementById('closeActivityDetail').addEventListener('click', closeActivityDetail);
document.getElementById('activityDetailOverlay').addEventListener('click', e => { if (e.target.id === 'activityDetailOverlay') closeActivityDetail(); });
document.getElementById('activityDetailEditBtn').addEventListener('click', () => {
  if (activityDetailId) openActivityForm(activityDetailId);
});

// ---------- formulário em etapas (stepper) ----------
function currentEditingActivity() { return findActivity(editingActivityId); }

function openActivityForm(id) {
  const a = findActivity(id);
  if (!a) return;
  editingActivityId = id;
  activityFormMode = 'edit';
  document.getElementById('activityDetailOverlay').classList.add('hidden');
  showActivityFormStep(1);
  renderActivityFormStep(1);
  document.getElementById('activityFormOverlay').classList.remove('hidden');
}
function closeActivityForm() {
  document.getElementById('activityFormOverlay').classList.add('hidden');
  document.getElementById('activityFormImportBanner').classList.add('hidden');
  editingActivityId = null;
  renderActivities();
}

function showActivityFormStep(step) {
  activityFormStep = step;
  for (let i = 1; i <= 5; i++) {
    document.getElementById(`activityFormStep${i}`).classList.toggle('hidden', i !== step);
  }
  document.querySelectorAll('.activity-form-step-dot').forEach(dot => {
    const dotStep = Number(dot.dataset.step);
    dot.classList.toggle('active', dotStep === step);
    dot.classList.toggle('done', dotStep < step);
  });
  document.getElementById('activityFormBackBtn').classList.toggle('hidden', step === 1);
  document.getElementById('activityFormNextBtn').textContent = step === 5 ? 'Concluir' : 'Próximo';
}

// Validação mínima por etapa antes de avançar. Apenas a Etapa 1 tem campos obrigatórios (nome +
// categoria) — as demais etapas são inteiramente opcionais (ver seção "Campos por Atividade").
function validateActivityFormStep(step, a) {
  if (step === 1) return !!(a.name && a.name.trim() && a.categoria && a.categoria.trim());
  return true;
}

// Ponto único de renderização de cada etapa. Cada task fe-24..fe-31 define a função
// renderActivityFormStepN correspondente; até lá, a etapa fica vazia (esqueleto).
function renderActivityFormStep(step) {
  const a = currentEditingActivity();
  if (!a) return;
  const fn = window[`renderActivityFormStep${step}`];
  if (typeof fn === 'function') fn(a);
}

document.getElementById('activityFormNextBtn').addEventListener('click', async () => {
  const a = currentEditingActivity();
  if (!a) return;
  if (!validateActivityFormStep(activityFormStep, a)) {
    alert('Preencha os campos obrigatórios desta etapa antes de avançar.');
    return;
  }
  // Ao avançar da Etapa 1 para a Etapa 2: geocodifica `localidade` via Nominatim para preencher
  // distância de SP automaticamente. Fluxo nunca é bloqueado — sem localidade ou sem resultado,
  // o seletor manual da Etapa 2 continua disponível (fe-26).
  if (activityFormStep === 1 && typeof geocodeAndFillDistancia === 'function') {
    await geocodeAndFillDistancia(a);
  }
  if (activityFormStep < 5) {
    showActivityFormStep(activityFormStep + 1);
    renderActivityFormStep(activityFormStep);
  } else {
    closeActivityForm();
  }
});
document.getElementById('activityFormBackBtn').addEventListener('click', () => {
  if (activityFormStep > 1) {
    showActivityFormStep(activityFormStep - 1);
    renderActivityFormStep(activityFormStep);
  }
});
document.getElementById('activityFormDraftBtn').addEventListener('click', () => {
  save();
  const hint = document.getElementById('activityFormAutosaveHint');
  hint.textContent = 'Rascunho salvo ✓';
  setTimeout(() => { hint.textContent = 'Rascunho salvo automaticamente'; }, 1500);
});
document.getElementById('closeActivityForm').addEventListener('click', closeActivityForm);
document.getElementById('activityFormOverlay').addEventListener('click', e => { if (e.target.id === 'activityFormOverlay') closeActivityForm(); });
document.querySelectorAll('.activity-form-step-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    const step = Number(dot.dataset.step);
    showActivityFormStep(step);
    renderActivityFormStep(step);
  });
});

// Aplica uma mutação na atividade em edição e persiste — auto-save reaproveitando o debounce de
// 250ms já existente em save() (mesmo padrão usado por patch() nas tarefas do board).
function patchActivity(a, fn) {
  fn(a);
  a.updatedAt = Date.now();
  if (typeof window.maybeAdvanceActivityStatus === 'function') window.maybeAdvanceActivityStatus(a);
  save();
  if (currentView === 'activities') renderActivities();
}

function multiSelectChipsHtml(fieldName, options, selected) {
  return `<div class="chip-select-group" data-field="${fieldName}">
    ${options.map(o => `<button type="button" class="chip-select-option ${(selected || []).includes(o) ? 'selected' : ''}" data-value="${escapeHtml(o)}">${escapeHtml(o)}</button>`).join('')}
  </div>`;
}

function bindMultiSelectChips(container, fieldName, activity) {
  const group = container.querySelector(`[data-field="${fieldName}"]`);
  if (!group) return;
  group.addEventListener('click', e => {
    const btn = e.target.closest('.chip-select-option');
    if (!btn) return;
    const val = btn.dataset.value;
    patchActivity(activity, x => {
      if (!x[fieldName]) x[fieldName] = [];
      const i = x[fieldName].indexOf(val);
      if (i >= 0) x[fieldName].splice(i, 1); else x[fieldName].push(val);
    });
    btn.classList.toggle('selected');
  });
}

// Redimensiona a imagem de capa (máx. 800×600, JPEG 80%) via <canvas> e devolve a data URL base64
// — mantém o campo foto_capa (armazenado direto na tabela activities) abaixo de ~200 KB.
function resizeCoverPhotoToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const maxW = 800, maxH = 600;
        let w = img.width, h = img.height;
        const ratio = Math.min(1, maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ---------- Etapa 1: Identidade ----------
function activityCategoriaFieldHtml(a) {
  const isKnown = ACTIVITY_CATEGORIES.includes(a.categoria);
  const customValue = isKnown ? '' : (a.categoria || '');
  return `
    <label>Categoria
      <select id="af-categoria">
        ${ACTIVITY_CATEGORIES.map(c => `<option value="${escapeHtml(c)}" ${((isKnown && a.categoria === c) || (!isKnown && c === 'Personalizada')) ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
      </select>
    </label>
    <label id="af-categoria-custom-field" class="${isKnown ? 'hidden' : ''}">Categoria personalizada
      <input type="text" id="af-categoria-custom" list="af-categoria-custom-list" value="${escapeHtml(customValue)}">
      <datalist id="af-categoria-custom-list">${customCategoriesInUse().map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist>
    </label>`;
}

function renderActivityFormStep1(a) {
  const container = document.getElementById('activityFormStep1');
  container.innerHTML = `
    <label>Nome
      <input type="text" id="af-name" value="${escapeHtml(a.name || '')}" placeholder="Ex.: Ubatuba, cafezinho no Mercadão...">
    </label>
    ${activityCategoriaFieldHtml(a)}
    <label>Vibe</label>
    ${multiSelectChipsHtml('vibes', VIBES, a.vibes)}
    <label>Descrição
      <textarea id="af-descricao" rows="3">${escapeHtml(a.descricao || '')}</textarea>
    </label>
    <label>Localidade
      <input type="text" id="af-localidade" value="${escapeHtml(a.localidade || '')}" placeholder="Ex.: Cantareira, Ubatuba, Mercadão">
    </label>
    <label>Foto de capa
      <input type="file" id="af-foto-capa" accept="image/*">
    </label>
    <div id="af-foto-capa-preview" class="activity-cover-preview">${a.fotoCapa ? `<img src="${a.fotoCapa}">` : ''}</div>
  `;

  document.getElementById('af-name').addEventListener('input', e => patchActivity(a, x => { x.name = e.target.value; }));
  document.getElementById('af-categoria').addEventListener('change', e => {
    document.getElementById('af-categoria-custom-field').classList.toggle('hidden', e.target.value !== 'Personalizada');
    if (e.target.value !== 'Personalizada') patchActivity(a, x => { x.categoria = e.target.value; });
    else patchActivity(a, x => { x.categoria = document.getElementById('af-categoria-custom').value.trim(); });
  });
  document.getElementById('af-categoria-custom').addEventListener('input', e => patchActivity(a, x => { x.categoria = e.target.value.trim(); }));
  document.getElementById('af-descricao').addEventListener('input', e => patchActivity(a, x => { x.descricao = e.target.value; }));
  document.getElementById('af-localidade').addEventListener('input', e => patchActivity(a, x => { x.localidade = e.target.value; }));
  bindMultiSelectChips(container, 'vibes', a);
  document.getElementById('af-foto-capa').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const dataUrl = await resizeCoverPhotoToBase64(file);
    patchActivity(a, x => { x.fotoCapa = dataUrl; });
    document.getElementById('af-foto-capa-preview').innerHTML = `<img src="${dataUrl}">`;
  });
}

// ---------- Nominatim: geocodificação da localidade ----------
const SP_LAT = -23.5505, SP_LON = -46.6333; // referência: centro de São Paulo

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function distanciaSPFromKm(km) {
  if (km < 30) return 'Na cidade';
  if (km <= 150) return 'Até 150 km';
  if (km <= 400) return '150–400 km';
  return '400 km+';
}

// Geocodifica um texto livre (campo `localidade`) via Nominatim (OpenStreetMap). Retorna
// { lat, lon } ou null se vazio/sem resultado/erro de rede — nunca lança, sempre fallback silencioso.
async function geocodeLocalidade(query) {
  if (!query || !query.trim()) return null;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim() + ', Brasil')}&format=json&limit=1`, {
      headers: { 'Accept-Language': 'pt-BR' },
    });
    if (!res.ok) throw new Error('nominatim request failed');
    const json = await res.json();
    if (!json || !json.length) return null;
    return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
  } catch (err) {
    console.error('Falha ao geocodificar localidade via Nominatim:', err);
    return null;
  }
}

// Chamada ao avançar da Etapa 1 para a Etapa 2: se `localidade` estiver preenchida, tenta
// geocodificar e preencher `distanciaSP` automaticamente. Se vazio ou sem resultado, mantém o
// seletor manual da Etapa 2 intocado — o fluxo nunca é bloqueado.
async function geocodeAndFillDistancia(a) {
  if (!a.localidade || !a.localidade.trim()) return;
  const coords = await geocodeLocalidade(a.localidade);
  if (!coords) return;
  const km = haversineKm(SP_LAT, SP_LON, coords.lat, coords.lon);
  patchActivity(a, x => { x.distanciaSP = distanciaSPFromKm(km); });
}

// ---------- Etapa 2: Logística ----------
const DISTANCIA_SP_OPTIONS = ['Na cidade', 'Até 150 km', '150–400 km', '400 km+'];

function costRangeFieldHtml(tipo, temporada, range) {
  const min = range && range[0] != null ? range[0] : '';
  const max = range && range[1] != null ? range[1] : '';
  return `
    <div class="cost-range-row" data-tipo="${tipo}" data-temporada="${temporada}">
      <span class="cost-range-label">${temporada === 'baixa_temporada' ? 'Baixa temporada' : 'Alta temporada'}</span>
      <input type="number" min="0" class="cost-range-min" placeholder="Mín" value="${min}">
      <span>–</span>
      <input type="number" min="0" class="cost-range-max" placeholder="Máx" value="${max}">
    </div>`;
}

function costProfileSectionHtml(tipo, perfil) {
  perfil = perfil || {};
  return `
    <div class="cost-profile-section" data-tipo="${tipo}">
      <h4>${PERFIS_CUSTO_LABELS[tipo]}</h4>
      ${costRangeFieldHtml(tipo, 'baixa_temporada', perfil.baixa_temporada)}
      ${costRangeFieldHtml(tipo, 'alta_temporada', perfil.alta_temporada)}
    </div>`;
}

function renderActivityFormStep2(a) {
  const container = document.getElementById('activityFormStep2');
  container.innerHTML = `
    <label>Modalidades de duração</label>
    ${multiSelectChipsHtml('modalidadesDuracao', MODALIDADES_DURACAO, a.modalidadesDuracao)}
    <label>Meios de transporte</label>
    ${multiSelectChipsHtml('meiosTransporte', MEIOS_TRANSPORTE, a.meiosTransporte)}
    <label>Perfis de custo (R$ por pessoa)</label>
    <div id="af-cost-profiles">
      ${PERFIS_CUSTO_TIPOS.map(tipo => costProfileSectionHtml(tipo, (a.perfisCusto || {})[tipo])).join('')}
    </div>
    <label>Nível de planejamento
      <select id="af-nivel-planejamento">
        <option value="">Selecione</option>
        ${NIVEIS_PLANEJAMENTO.map(n => `<option value="${escapeHtml(n)}" ${a.nivelPlanejamento === n ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}
      </select>
    </label>
    <label>Antecedência mínima (dias)
      <input type="number" min="0" id="af-antecedencia-minima" value="${a.antecedenciaMiniDias ?? ''}">
    </label>
    <label class="checkbox-row">
      <input type="checkbox" id="af-decisao-ultima-hora" ${a.decisaoUltimaHora ? 'checked' : ''}> Decisão de última hora possível
    </label>
    <label id="af-distancia-field">Distância de SP
      <select id="af-distancia">
        <option value="">Não definida</option>
        ${DISTANCIA_SP_OPTIONS.map(d => `<option value="${escapeHtml(d)}" ${a.distanciaSP === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
      </select>
    </label>
  `;

  bindMultiSelectChips(container, 'modalidadesDuracao', a);
  bindMultiSelectChips(container, 'meiosTransporte', a);

  container.querySelectorAll('.cost-range-row').forEach(row => {
    const tipo = row.dataset.tipo, temporada = row.dataset.temporada;
    const commit = () => {
      const min = row.querySelector('.cost-range-min').value;
      const max = row.querySelector('.cost-range-max').value;
      patchActivity(a, x => {
        x.perfisCusto = x.perfisCusto || {};
        if (!x.perfisCusto[tipo]) x.perfisCusto[tipo] = {};
        if (min === '' && max === '') { x.perfisCusto[tipo][temporada] = null; }
        else x.perfisCusto[tipo][temporada] = [min === '' ? null : Number(min), max === '' ? null : Number(max)];
      });
    };
    row.querySelector('.cost-range-min').addEventListener('input', commit);
    row.querySelector('.cost-range-max').addEventListener('input', commit);
  });

  document.getElementById('af-nivel-planejamento').addEventListener('change', e => patchActivity(a, x => { x.nivelPlanejamento = e.target.value || null; }));
  document.getElementById('af-antecedencia-minima').addEventListener('input', e => patchActivity(a, x => { x.antecedenciaMiniDias = e.target.value === '' ? null : Number(e.target.value); }));
  document.getElementById('af-decisao-ultima-hora').addEventListener('change', e => patchActivity(a, x => { x.decisaoUltimaHora = e.target.checked; }));
  document.getElementById('af-distancia').addEventListener('change', e => patchActivity(a, x => { x.distanciaSP = e.target.value || null; }));
}

// ---------- Etapa 3: Condições ideais ----------
const EPOCA_IDEAL_OPTIONS = [...EPOCAS, 'Qualquer'];

function renderActivityFormStep3(a) {
  const container = document.getElementById('activityFormStep3');
  container.innerHTML = `
    <label>Condição climática ideal</label>
    ${multiSelectChipsHtml('condicaoClimaticaIdeal', CONDICOES_CLIMATICAS, a.condicaoClimaticaIdeal)}
    <label>Temperatura mínima ideal (°C)
      <input type="number" id="af-temp-minima" value="${a.temperaturaMiniCelsius ?? ''}">
    </label>
    <label>Época ideal do ano</label>
    ${multiSelectChipsHtml('epocaIdeal', EPOCA_IDEAL_OPTIONS, a.epocaIdeal)}
    <label>Perfil de grupo</label>
    ${multiSelectChipsHtml('perfilGrupo', PERFIS_GRUPO, a.perfilGrupo)}
    <label>Tamanho do grupo
      <select id="af-tamanho-grupo">
        <option value="">Não definido</option>
        ${TAMANHOS_GRUPO.map(t => `<option value="${escapeHtml(t)}" ${a.tamanhoGrupo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
      </select>
    </label>
    <label>Condicionamento físico exigido
      <select id="af-condicionamento">
        ${NIVEIS_CONDICIONAMENTO.map(n => `<option value="${escapeHtml(n)}" ${(a.condicionamentoFisico || 'Não') === n ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('')}
      </select>
    </label>
    <label class="checkbox-row"><input type="checkbox" id="af-evitar-alta" ${a.evitarAltaTemporada ? 'checked' : ''}> Evitar alta temporada</label>
    <label class="checkbox-row"><input type="checkbox" id="af-repetivel" ${a.repetivel !== false ? 'checked' : ''}> Repetível</label>
    <label>Pet-friendly
      <select id="af-pet-friendly">
        <option value="">Não definido</option>
        <option value="sim" ${a.petFriendly === true ? 'selected' : ''}>Sim</option>
        <option value="nao" ${a.petFriendly === false ? 'selected' : ''}>Não</option>
      </select>
    </label>
  `;
  bindMultiSelectChips(container, 'condicaoClimaticaIdeal', a);
  bindMultiSelectChips(container, 'epocaIdeal', a);
  bindMultiSelectChips(container, 'perfilGrupo', a);
  document.getElementById('af-temp-minima').addEventListener('input', e => patchActivity(a, x => { x.temperaturaMiniCelsius = e.target.value === '' ? null : Number(e.target.value); }));
  document.getElementById('af-tamanho-grupo').addEventListener('change', e => patchActivity(a, x => { x.tamanhoGrupo = e.target.value || null; }));
  document.getElementById('af-condicionamento').addEventListener('change', e => patchActivity(a, x => { x.condicionamentoFisico = e.target.value; }));
  document.getElementById('af-evitar-alta').addEventListener('change', e => patchActivity(a, x => { x.evitarAltaTemporada = e.target.checked; }));
  document.getElementById('af-repetivel').addEventListener('change', e => patchActivity(a, x => { x.repetivel = e.target.checked; }));
  document.getElementById('af-pet-friendly').addEventListener('change', e => patchActivity(a, x => { x.petFriendly = e.target.value === '' ? null : e.target.value === 'sim'; }));
}

// ---------- Etapa 4: Variações sazonais ----------
// Decisão de nomenclatura (ambiguidade da spec): a tabela "campos substituíveis" na spec usa
// snake_case (ex.: `condicao_climatica_ideal`), mas o resto do app (incluindo os campos-base da
// própria atividade) usa camelCase — e `variacoes` é armazenado como JSONB opaco, sem mapeamento
// campo-a-campo em server.js (appActivityToDb/dbActivityToApp só repassam o array como está).
// Decisão conservadora: manter camelCase dentro de cada objeto de variação, por consistência com
// o resto do objeto Activity em memória. A importação de JSON (fe-38) faz a tradução
// snake_case → camelCase ao montar `activity.variacoes`, já que o prompt de refinamento gera
// snake_case (ver seção "Prompt de Refinamento de Atividade" da spec).
let activityVariationDraft = null; // variação em edição (clone) ou null quando o editor está fechado

const VARIATION_FIELD_TYPES = {
  vibes: 'chips:VIBES',
  condicaoClimaticaIdeal: 'chips:CONDICOES_CLIMATICAS',
  temperaturaMiniCelsius: 'number',
  antecedenciaMiniDias: 'number',
  decisaoUltimaHora: 'boolean',
  perfisCusto: 'custo',
  modalidadesDuracao: 'chips:MODALIDADES_DURACAO',
  meiosTransporte: 'chips:MEIOS_TRANSPORTE',
  perfilGrupo: 'chips:PERFIS_GRUPO',
  evitarAltaTemporada: 'boolean',
  notas: 'text',
};
const VARIATION_FIELD_LABELS = {
  vibes: 'Vibe', condicaoClimaticaIdeal: 'Condição climática ideal', temperaturaMiniCelsius: 'Temperatura mínima (°C)',
  antecedenciaMiniDias: 'Antecedência mínima (dias)', decisaoUltimaHora: 'Decisão de última hora',
  perfisCusto: 'Perfis de custo', modalidadesDuracao: 'Modalidades de duração', meiosTransporte: 'Meios de transporte',
  perfilGrupo: 'Perfil de grupo', evitarAltaTemporada: 'Evitar alta temporada', notas: 'Notas',
};
const VARIATION_OPTIONS_BY_NAME = { VIBES, CONDICOES_CLIMATICAS, MODALIDADES_DURACAO, MEIOS_TRANSPORTE, PERFIS_GRUPO };

function variationFieldOverrideRowHtml(field, draft) {
  const type = VARIATION_FIELD_TYPES[field];
  const enabled = draft[field] !== undefined;
  const label = VARIATION_FIELD_LABELS[field];
  let editorHtml = '';
  if (type.startsWith('chips:')) {
    const options = VARIATION_OPTIONS_BY_NAME[type.split(':')[1]];
    editorHtml = multiSelectChipsHtml(`var-${field}`, options, draft[field] || []);
  } else if (type === 'boolean') {
    editorHtml = `<select class="var-field-input" data-field="${field}">
      <option value="true" ${draft[field] === true ? 'selected' : ''}>Sim</option>
      <option value="false" ${draft[field] === false ? 'selected' : ''}>Não</option>
    </select>`;
  } else if (type === 'number') {
    editorHtml = `<input type="number" class="var-field-input" data-field="${field}" value="${draft[field] ?? ''}">`;
  } else if (type === 'text') {
    editorHtml = `<textarea class="var-field-input" data-field="${field}" rows="2">${escapeHtml(draft[field] || '')}</textarea>`;
  } else if (type === 'custo') {
    editorHtml = `<div class="var-cost-profiles">${PERFIS_CUSTO_TIPOS.map(tipo => costProfileSectionHtml(tipo, (draft.perfisCusto || {})[tipo])).join('')}</div>`;
  }
  return `
    <div class="variation-field-row" data-field="${field}">
      <label class="checkbox-row"><input type="checkbox" class="var-field-toggle" data-field="${field}" ${enabled ? 'checked' : ''}> ${escapeHtml(label)}</label>
      <div class="variation-field-editor ${enabled ? '' : 'hidden'}">${editorHtml}</div>
    </div>`;
}

// Conflito de variações: bloqueia se duas variações cobrem a mesma época trimestral.
function findVariationConflict(activity, draft) {
  for (const v of activity.variacoes || []) {
    if (v.id === draft.id) continue;
    const overlap = (v.epocasCobertas || []).some(e => (draft.epocasCobertas || []).includes(e));
    if (overlap) return v;
  }
  return null;
}

function openVariationEditor(variation) {
  activityVariationDraft = variation
    ? JSON.parse(JSON.stringify(variation))
    : { id: uid(), nome: '', epocasCobertas: [], incluiFeriadosProlongados: false };
  renderVariationEditor();
}
function closeVariationEditor(a) {
  activityVariationDraft = null;
  renderActivityFormStep4(a);
}

function renderVariationEditor() {
  const el = document.getElementById('af-variation-editor');
  if (!el) return;
  const d = activityVariationDraft;
  if (!d) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <h4>${d.nome ? 'Editar variação' : 'Nova variação'}</h4>
    <label>Nome da variação
      <input type="text" id="var-nome" value="${escapeHtml(d.nome || '')}">
    </label>
    <label>Épocas cobertas</label>
    ${multiSelectChipsHtml('var-epocas', EPOCAS, d.epocasCobertas)}
    <label class="checkbox-row"><input type="checkbox" id="var-feriados" ${d.incluiFeriadosProlongados ? 'checked' : ''}> Inclui feriados prolongados</label>
    <div id="var-conflict-error" class="variation-conflict-error hidden"></div>
    <div class="variation-fields-list">
      ${ACTIVITY_VARIATION_MERGE_FIELDS.map(f => variationFieldOverrideRowHtml(f, d)).join('')}
    </div>
    <div class="modal-footer">
      <button type="button" id="var-cancel-btn" class="btn-neutral">Cancelar</button>
      <button type="button" id="var-save-btn" class="btn-primary">Salvar variação</button>
    </div>`;

  // Handlers atribuídos por propriedade (não addEventListener): este elemento persiste entre
  // chamadas de renderVariationEditor() — addEventListener duplicaria os handlers a cada re-render.
  el.onclick = e => {
    const chip = e.target.closest('.chip-select-option');
    if (chip) {
      const group = chip.closest('.chip-select-group');
      const field = group.dataset.field;
      const val = chip.dataset.value;
      const key = field === 'var-epocas' ? 'epocasCobertas' : field.replace('var-', '');
      if (!d[key]) d[key] = [];
      const idx = d[key].indexOf(val);
      if (idx >= 0) d[key].splice(idx, 1); else d[key].push(val);
      renderVariationEditor();
      return;
    }
    if (e.target.id === 'var-cancel-btn') { closeVariationEditor(currentEditingActivity()); return; }
    if (e.target.id === 'var-save-btn') { commitVariationDraft(currentEditingActivity()); return; }
  };
  el.onchange = e => {
    if (e.target.classList.contains('var-field-toggle')) {
      const field = e.target.dataset.field;
      const type = VARIATION_FIELD_TYPES[field];
      if (e.target.checked) {
        if (type.startsWith('chips:')) d[field] = [];
        else if (type === 'boolean') d[field] = false;
        else if (type === 'number') d[field] = null;
        else if (type === 'text') d[field] = '';
        else if (type === 'custo') d[field] = {};
      } else {
        delete d[field];
      }
      renderVariationEditor();
      return;
    }
    if (e.target.id === 'var-feriados') { d.incluiFeriadosProlongados = e.target.checked; return; }
    if (e.target.classList.contains('var-field-input')) {
      const field = e.target.dataset.field;
      const type = VARIATION_FIELD_TYPES[field];
      if (type === 'boolean') d[field] = e.target.value === 'true';
      return;
    }
  };
  el.oninput = e => {
    if (e.target.id === 'var-nome') { d.nome = e.target.value; return; }
    if (e.target.classList.contains('var-field-input')) {
      const field = e.target.dataset.field;
      const type = VARIATION_FIELD_TYPES[field];
      if (type === 'number') d[field] = e.target.value === '' ? null : Number(e.target.value);
      else if (type === 'text') d[field] = e.target.value;
      return;
    }
    const row = e.target.closest('.cost-range-row');
    if (row) {
      const tipo = row.dataset.tipo, temporada = row.dataset.temporada;
      const min = row.querySelector('.cost-range-min').value;
      const max = row.querySelector('.cost-range-max').value;
      if (!d.perfisCusto) d.perfisCusto = {};
      if (!d.perfisCusto[tipo]) d.perfisCusto[tipo] = {};
      d.perfisCusto[tipo][temporada] = (min === '' && max === '') ? null : [min === '' ? null : Number(min), max === '' ? null : Number(max)];
    }
  };
}

function commitVariationDraft(a) {
  const d = activityVariationDraft;
  if (!d.nome || !d.nome.trim()) { alert('Informe um nome para a variação.'); return; }
  const conflict = findVariationConflict(a, d);
  const errorEl = document.getElementById('var-conflict-error');
  if (conflict) {
    errorEl.textContent = `Este período já está coberto pela variação '${conflict.nome}'. Ajuste as épocas antes de salvar.`;
    errorEl.classList.remove('hidden');
    return;
  }
  patchActivity(a, x => {
    x.variacoes = x.variacoes || [];
    const idx = x.variacoes.findIndex(v => v.id === d.id);
    if (idx >= 0) x.variacoes[idx] = d; else x.variacoes.push(d);
  });
  activityVariationDraft = null;
  renderActivityFormStep4(a);
}

function removeVariation(a, id) {
  if (!confirm('Remover esta variação sazonal?')) return;
  patchActivity(a, x => { x.variacoes = (x.variacoes || []).filter(v => v.id !== id); });
  renderActivityFormStep4(a);
}

function variationListItemHtml(v) {
  return `
  <div class="activity-variation-list-item" data-id="${v.id}">
    <span>${escapeHtml(v.nome)} <span class="activity-variation-card-epocas">(${(v.epocasCobertas || []).join(', ')})</span></span>
    <div class="activity-variation-list-actions">
      <button type="button" class="btn-neutral-sm var-edit-btn" data-id="${v.id}">Editar</button>
      <button type="button" class="btn-neutral-sm var-remove-btn" data-id="${v.id}">Remover</button>
    </div>
  </div>`;
}

function renderActivityFormStep4(a) {
  const container = document.getElementById('activityFormStep4');
  container.innerHTML = `
    <label>Variações sazonais (opcional)</label>
    <div id="af-variations-list">
      ${(a.variacoes || []).length ? a.variacoes.map(variationListItemHtml).join('') : '<div class="activity-detail-empty">Nenhuma variação cadastrada ainda.</div>'}
    </div>
    <button type="button" id="af-add-variation-btn" class="btn-neutral-sm">+ Nova variação</button>
    <div id="af-variation-editor" class="variation-editor hidden"></div>
  `;
  document.getElementById('af-add-variation-btn').addEventListener('click', () => openVariationEditor(null));
  container.querySelectorAll('.var-edit-btn').forEach(btn => btn.addEventListener('click', () => {
    const v = (a.variacoes || []).find(x => x.id === btn.dataset.id);
    if (v) openVariationEditor(v);
  }));
  container.querySelectorAll('.var-remove-btn').forEach(btn => btn.addEventListener('click', () => removeVariation(a, btn.dataset.id)));
  if (activityVariationDraft) renderVariationEditor();
}

// ---------- Etapa 5: Planejamento ----------
function checklistTaskRowHtml(t) {
  const antecedencias = [
    t.antecedenciaMiniDias != null ? `mín ${t.antecedenciaMiniDias}d` : '',
    t.antecedenciaRecDias != null ? `rec ${t.antecedenciaRecDias}d` : '',
    t.antecedenciaMaxDias != null ? `máx ${t.antecedenciaMaxDias}d` : '',
  ].filter(Boolean).join(' · ');
  return `
  <div class="checklist-task-row${t.completed ? ' completed' : ''}" draggable="true" data-id="${t.id}">
    <span class="checklist-drag-handle" title="Arraste para reordenar">⠿</span>
    <input type="checkbox" class="checklist-chk-done" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
    <button type="button" class="checklist-task-name" data-id="${t.id}">${escapeHtml(t.name)}</button>
    ${antecedencias ? `<span class="checklist-task-antecedencias">${antecedencias}</span>` : ''}
    <button type="button" class="checklist-task-remove" data-id="${t.id}" title="Remover">×</button>
  </div>`;
}

function linkRowHtml(l, i) {
  return `
  <div class="activity-link-row" data-index="${i}">
    <a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.titulo || l.url)}</a>
    <button type="button" class="af-link-remove" data-index="${i}" title="Remover">×</button>
  </div>`;
}

function getDragAfterChecklistRow(container, y) {
  const els = [...container.querySelectorAll('.checklist-task-row:not(.dragging)')];
  return els.reduce((closest, el) => {
    const box = el.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: el };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

function renderActivityFormStep5(a) {
  const tasks = a.checklistTasks || [];
  const done = tasks.filter(t => t.completed).length;
  const container = document.getElementById('activityFormStep5');
  container.innerHTML = `
    <label>Checklist de planejamento</label>
    ${tasks.length ? `<div class="activity-checklist-progress">${done} de ${tasks.length} itens concluídos</div>` : ''}
    <div id="af-checklist-list" class="activity-checklist-list">
      ${tasks.map(checklistTaskRowHtml).join('')}
    </div>
    <form id="af-add-checklist-form" class="checklist-add-form">
      <input type="text" id="af-checklist-name" placeholder="Nova tarefa do checklist" required>
      <input type="number" id="af-checklist-mini" placeholder="Mín (dias)" min="0">
      <input type="number" id="af-checklist-rec" placeholder="Rec (dias)" min="0">
      <input type="number" id="af-checklist-max" placeholder="Máx (dias)" min="0">
      <button type="submit">Adicionar</button>
    </form>
    <label>Notas
      <textarea id="af-notas" rows="3">${escapeHtml(a.notas || '')}</textarea>
    </label>
    <label>Links úteis</label>
    <div id="af-links-list">${(a.links || []).map(linkRowHtml).join('')}</div>
    <form id="af-add-link-form" class="checklist-add-form">
      <input type="url" id="af-link-url" placeholder="https://" required>
      <input type="text" id="af-link-titulo" placeholder="Título (opcional)">
      <button type="submit">Adicionar link</button>
    </form>
  `;

  // Handlers por propriedade (não addEventListener): #activityFormStep5 é um container
  // persistente entre re-renders desta função — evita duplicar bindings a cada chamada.
  container.onsubmit = e => {
    e.preventDefault();
    if (e.target.id === 'af-add-checklist-form') {
      const name = document.getElementById('af-checklist-name').value.trim();
      if (!name) return;
      const mini = document.getElementById('af-checklist-mini').value;
      const rec = document.getElementById('af-checklist-rec').value;
      const max = document.getElementById('af-checklist-max').value;
      patchActivity(a, x => {
        x.checklistTasks = x.checklistTasks || [];
        const newTask = {
          id: uid(), name, date: null, deliveryDate: null, link: '',
          priority: null, urgent: false, urgentRank: 0,
          delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
          fieldValues: {}, team: [], boardId: null, activityId: a.id, archived: false,
          antecedenciaMiniDias: mini === '' ? null : Number(mini),
          antecedenciaRecDias: rec === '' ? null : Number(rec),
          antecedenciaMaxDias: max === '' ? null : Number(max),
        };
        // Atividade já promovida ao board: item novo é promovido imediatamente, senão
        // ficaria com boardId/date nulos para sempre (promoteChecklistToBoard só roda
        // uma vez, na transição de status para 'planejada').
        if (x.status === 'planejada' && x.boardDestinoId && x.dataInicio) {
          const date = computeChecklistTaskDate(newTask, x.dataInicio);
          newTask.boardId = x.boardDestinoId;
          newTask.date = date;
          newTask.deliveryDate = date;
        }
        x.checklistTasks.push(newTask);
      });
      render(); // atualiza o board caso o item novo já tenha sido promovido acima
      renderActivityFormStep5(a);
      return;
    }
    if (e.target.id === 'af-add-link-form') {
      const url = document.getElementById('af-link-url').value.trim();
      if (!url) return;
      const titulo = document.getElementById('af-link-titulo').value.trim();
      patchActivity(a, x => { x.links = x.links || []; x.links.push({ url, titulo }); });
      renderActivityFormStep5(a);
      return;
    }
  };

  container.onclick = e => {
    const nameBtn = e.target.closest('.checklist-task-name');
    if (nameBtn) { openModal(nameBtn.dataset.id); return; } // reaproveita o modal do board (fe-13)
    const rmBtn = e.target.closest('.checklist-task-remove');
    if (rmBtn) {
      patchActivity(a, x => { x.checklistTasks = (x.checklistTasks || []).filter(t => t.id !== rmBtn.dataset.id); });
      renderActivityFormStep5(a);
      return;
    }
    const linkRm = e.target.closest('.af-link-remove');
    if (linkRm) {
      const idx = Number(linkRm.dataset.index);
      patchActivity(a, x => { x.links.splice(idx, 1); });
      renderActivityFormStep5(a);
      return;
    }
  };

  container.onchange = e => {
    if (e.target.classList.contains('checklist-chk-done')) {
      const t = (a.checklistTasks || []).find(x => x.id === e.target.dataset.id);
      if (t) {
        setCompleted(t, e.target.checked, t.boardId ? boards.find(b => b.id === t.boardId) : null);
        patchActivity(a, () => {});
        renderActivityFormStep5(a);
      }
      return;
    }
  };
  container.oninput = e => {
    if (e.target.id === 'af-notas') patchActivity(a, x => { x.notas = e.target.value; });
  };

  // Drag-and-drop para reordenar o checklist — mesmo padrão de getDragAfterElement/finalizeOrder
  // já usado no board, adaptado para a lista de checklist.
  container.ondragstart = e => {
    const row = e.target.closest('.checklist-task-row');
    if (!row) return;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', row.dataset.id);
    setTimeout(() => row.classList.add('dragging'), 0);
  };
  container.ondragend = e => {
    const row = e.target.closest('.checklist-task-row');
    if (row) row.classList.remove('dragging');
  };
  container.ondragover = e => {
    const list = document.getElementById('af-checklist-list');
    if (!list) return;
    e.preventDefault();
    const dragging = list.querySelector('.dragging');
    if (!dragging) return;
    const after = getDragAfterChecklistRow(list, e.clientY);
    if (after == null) list.appendChild(dragging);
    else list.insertBefore(dragging, after);
  };
  container.ondrop = e => {
    const list = document.getElementById('af-checklist-list');
    if (!list) return;
    e.preventDefault();
    const ids = [...list.querySelectorAll('.checklist-task-row')].map(r => r.dataset.id);
    patchActivity(a, x => {
      const byId = new Map((x.checklistTasks || []).map(t => [t.id, t]));
      x.checklistTasks = ids.map(id => byId.get(id)).filter(Boolean);
    });
    renderActivityFormStep5(a);
  };
}

// ---------- Máquina de estados ----------
function activityMeetsQueroFazerConditions(a) {
  const hasModalidade = (a.modalidadesDuracao || []).length > 0;
  const hasCompleteCostRange = PERFIS_CUSTO_TIPOS.some(tipo => {
    const perfil = (a.perfisCusto || {})[tipo];
    const baixa = perfil && perfil.baixa_temporada;
    return baixa && baixa[0] != null && baixa[1] != null;
  });
  return hasModalidade && hasCompleteCostRange;
}

// Avança automaticamente rascunho → quero_fazer assim que as condições mínimas forem atendidas
// (ao menos 1 modalidade de duração + range completo de ao menos 1 perfil de custo em baixa
// temporada). Chamada após cada auto-save (patchActivity). Nunca reverte quero_fazer → rascunho
// manualmente — não existe nenhum controle de UI que force esse retorno; esta função só avança.
function maybeAdvanceActivityStatus(a) {
  if (a.status === 'rascunho' && activityMeetsQueroFazerConditions(a)) {
    a.status = 'quero_fazer';
  }
}

// ---------- promoção do checklist ao board (status → planejada) ----------
function fmtDateBRWithDow(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  const dowAbbrev = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()];
  return `${fmtDateBR(dateKey)} (${dowAbbrev})`;
}

// Calcula a data de cada tarefa do checklist (data_inicio − antecedenciaMiniDias), com fallback
// para hoje quando o resultado cair no passado. Usada tanto no preview do dialog quanto na
// promoção de fato — mantém as duas em sincronia (mesma fórmula).
// Calcula a data de uma tarefa de checklist a partir da data de início da atividade e da
// antecedência mínima, com fallback para hoje se a data calculada cair no passado.
function computeChecklistTaskDate(task, dataInicio) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inicio = new Date(dataInicio + 'T00:00:00');
  if (task.antecedenciaMiniDias == null) return null;
  const d = new Date(inicio);
  d.setDate(d.getDate() - task.antecedenciaMiniDias);
  return d < today ? toKey(today) : toKey(d);
}

function computeChecklistPromotionPreview(a, dataInicio) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return (a.checklistTasks || []).map(t => {
    const taskDate = computeChecklistTaskDate(t, dataInicio);
    return { task: t, date: taskDate, isToday: taskDate === toKey(today) };
  });
}

function renderActivityPromotePreview(a) {
  const dataInicio = document.getElementById('activityPromoteDate').value;
  const el = document.getElementById('activityPromotePreview');
  if (!dataInicio) { el.innerHTML = ''; return; }
  const preview = computeChecklistPromotionPreview(a, dataInicio);
  el.innerHTML = preview.map(p => {
    const label = p.date == null ? 'Sem data' : (p.isToday ? 'Hoje' : fmtDateBRWithDow(p.date));
    return `<div class="activity-promote-preview-row"><span>${escapeHtml(p.task.name)}</span><span>→ ${label}</span></div>`;
  }).join('');
}

function updateActivityPromoteConfirmState() {
  const dataInicio = document.getElementById('activityPromoteDate').value;
  const boardId = document.getElementById('activityPromoteBoard').value;
  document.getElementById('activityPromoteConfirmBtn').disabled = !dataInicio || !boardId;
}

function openActivityPromote(id) {
  const a = findActivity(id);
  if (!a || !(a.checklistTasks || []).length) return; // guarda extra: botão já deveria estar disabled
  activityDetailId = id;
  const tomorrow = toKey(addDays(new Date(), 1));
  const dateInput = document.getElementById('activityPromoteDate');
  dateInput.value = tomorrow;
  dateInput.min = tomorrow;
  const boardSel = document.getElementById('activityPromoteBoard');
  boardSel.innerHTML = boards.map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('');
  renderActivityPromotePreview(a);
  updateActivityPromoteConfirmState();
  document.getElementById('activityPromoteOverlay').classList.remove('hidden');
}
function closeActivityPromote() {
  document.getElementById('activityPromoteOverlay').classList.add('hidden');
}

// Promove o checklist ao board: calcula a data de cada tarefa, define boardId/date e muda o
// status da atividade para 'planejada'. Fonte de verdade única em activity.checklistTasks — o
// board passa a exibir essas tarefas via getTasksForDateAndBoard() (fe-14), sem duplicação.
function promoteChecklistToBoard(activity, boardId, dataInicio) {
  const preview = computeChecklistPromotionPreview(activity, dataInicio);
  preview.forEach(({ task, date }) => {
    task.boardId = boardId;
    task.date = date;
    task.deliveryDate = date;
  });
  activity.status = 'planejada';
  activity.dataInicio = dataInicio;
  activity.boardDestinoId = boardId;
  activity.updatedAt = Date.now();
  save();
  render();
  renderActivities();
}

// Cancela o planejamento: tarefas do checklist voltam ao estado pré-promoção (boardId/date
// nulos, completed zerado) e o status volta para quero_fazer. Nada é deletado da gestão de
// tarefas — só desassocia do board.
function cancelActivityPlan(activity) {
  (activity.checklistTasks || []).forEach(task => {
    task.boardId = null;
    task.date = null;
    task.deliveryDate = null;
    task.completed = false; // progresso zerado intencionalmente — ver spec "Cancelamento do plano"
  });
  activity.status = 'quero_fazer';
  activity.dataInicio = null;
  activity.boardDestinoId = null;
  activity.updatedAt = Date.now();
  save();
  render();
  renderActivities();
}

document.getElementById('activityPromoteDate').addEventListener('change', () => {
  const a = findActivity(activityDetailId);
  if (a) renderActivityPromotePreview(a);
  updateActivityPromoteConfirmState();
});
document.getElementById('activityPromoteBoard').addEventListener('change', updateActivityPromoteConfirmState);
document.getElementById('closeActivityPromote').addEventListener('click', closeActivityPromote);
document.getElementById('activityPromoteCancelBtn').addEventListener('click', closeActivityPromote);
document.getElementById('activityPromoteOverlay').addEventListener('click', e => { if (e.target.id === 'activityPromoteOverlay') closeActivityPromote(); });
document.getElementById('activityPromoteConfirmBtn').addEventListener('click', () => {
  const a = findActivity(activityDetailId);
  if (!a) return;
  const dataInicio = document.getElementById('activityPromoteDate').value;
  const boardId = document.getElementById('activityPromoteBoard').value;
  if (!dataInicio || !boardId) return;
  promoteChecklistToBoard(a, boardId, dataInicio);
  closeActivityPromote();
  openActivityDetail(a.id);
});

// ---------- registro de realização ----------
let editingRealizationId = null;

function starsInputHtml(rating) {
  return [1, 2, 3, 4, 5].map(n => `<button type="button" class="realization-star ${n <= rating ? 'filled' : ''}" data-star="${n}">★</button>`).join('');
}

function openActivityRealization(activityId, realizationId) {
  const a = findActivity(activityId);
  if (!a) return;
  activityDetailId = activityId;
  editingRealizationId = realizationId || null;
  const r = realizationId ? (a.realizacoes || []).find(x => x.id === realizationId) : null;
  const today = toKey(new Date());
  document.getElementById('activityRealizationFields').innerHTML = `
    <label>Data realizada
      <input type="date" id="real-data" max="${today}" value="${r ? r.data : today}">
    </label>
    <label>Gasto total (R$)
      <input type="number" min="0" id="real-gasto" value="${r && r.gasto_total != null ? r.gasto_total : ''}">
    </label>
    <label>Perfil vivido
      <select id="real-perfil">
        <option value="">Não definido</option>
        ${PERFIS_CUSTO_TIPOS.map(tipo => `<option value="${tipo}" ${r && r.perfil_vivido === tipo ? 'selected' : ''}>${PERFIS_CUSTO_LABELS[tipo]}</option>`).join('')}
      </select>
    </label>
    <label>Variação vivida
      <select id="real-variacao">
        <option value="">Nenhuma / não se aplica</option>
        ${(a.variacoes || []).map(v => `<option value="${v.id}" ${r && r.variacao_vivida_id === v.id ? 'selected' : ''}>${escapeHtml(v.nome)}</option>`).join('')}
      </select>
    </label>
    <label>Com quem foi
      <input type="text" id="real-com-quem" value="${escapeHtml(r ? (r.com_quem || '') : '')}">
    </label>
    <label>Avaliação</label>
    <div id="real-stars" class="realization-stars" data-rating="${r ? (r.avaliacao || 0) : 0}">${starsInputHtml(r ? (r.avaliacao || 0) : 0)}</div>
    <label>Nota
      <textarea id="real-nota" rows="2">${escapeHtml(r ? (r.nota || '') : '')}</textarea>
    </label>
  `;
  document.getElementById('activityRealizationOverlay').classList.remove('hidden');
}
function closeActivityRealization() {
  document.getElementById('activityRealizationOverlay').classList.add('hidden');
  editingRealizationId = null;
}

document.getElementById('activityRealizationFields').addEventListener('click', e => {
  const star = e.target.closest('.realization-star');
  if (!star) return;
  const n = Number(star.dataset.star);
  const starsEl = document.getElementById('real-stars');
  starsEl.dataset.rating = String(n);
  starsEl.innerHTML = starsInputHtml(n);
});

// Registra (ou edita) uma realização: adiciona/atualiza `activity.realizacoes`.
// Se for uma nova realização (não edição), muda o status para 'realizada' e pergunta
// se o usuário quer manter a atividade em Quero Fazer para refazê-la no futuro.
let pendingKeepActivityId = null;
function confirmActivityRealization() {
  const a = findActivity(activityDetailId);
  if (!a) return;
  const data = document.getElementById('real-data').value;
  const today = toKey(new Date());
  if (!data || data > today) { alert('A data realizada deve ser hoje ou uma data passada.'); return; }
  const gastoRaw = document.getElementById('real-gasto').value;
  const isNew = !editingRealizationId;
  const registro = {
    id: editingRealizationId || uid(),
    data,
    gasto_total: gastoRaw === '' ? null : Number(gastoRaw),
    perfil_vivido: document.getElementById('real-perfil').value || null,
    variacao_vivida_id: document.getElementById('real-variacao').value || null,
    com_quem: document.getElementById('real-com-quem').value.trim(),
    avaliacao: Number(document.getElementById('real-stars').dataset.rating) || 0,
    nota: document.getElementById('real-nota').value.trim(),
  };
  a.realizacoes = a.realizacoes || [];
  const idx = a.realizacoes.findIndex(x => x.id === registro.id);
  if (idx >= 0) a.realizacoes[idx] = registro; else a.realizacoes.push(registro);

  if (isNew) {
    // Nova realização: marca como realizada e pergunta se quer manter em Quero Fazer
    a.status = 'realizada';
    a.updatedAt = Date.now();
    save();
    closeActivityRealization();
    renderActivities();
    pendingKeepActivityId = a.id;
    const nameEl = document.getElementById('activityKeepQueroFazerName');
    if (nameEl) nameEl.textContent = a.name;
    document.getElementById('activityKeepQueroFazerOverlay').classList.remove('hidden');
  } else {
    // Edição de realização existente: só salva e volta para o detalhe
    a.updatedAt = Date.now();
    save();
    closeActivityRealization();
    openActivityDetail(a.id);
    renderActivities();
  }
}

document.getElementById('closeActivityRealization').addEventListener('click', closeActivityRealization);
document.getElementById('activityRealizationCancelBtn').addEventListener('click', closeActivityRealization);
document.getElementById('activityRealizationOverlay').addEventListener('click', e => { if (e.target.id === 'activityRealizationOverlay') closeActivityRealization(); });
document.getElementById('activityRealizationConfirmBtn').addEventListener('click', confirmActivityRealization);

// ---------- diálogo "Manter em Quero Fazer?" ----------
document.getElementById('activityKeepYesBtn').addEventListener('click', () => {
  document.getElementById('activityKeepQueroFazerOverlay').classList.add('hidden');
  const a = findActivity(pendingKeepActivityId);
  if (a) {
    // Mantém em Quero Fazer: duplica (atividade volta ao ciclo) — status volta para quero_fazer,
    // a realização já foi registrada em a.realizacoes e continua visível no histórico.
    a.status = 'quero_fazer';
    a.variacaoEscolhidaId = null;
    a.dataInicio = null;
    a.updatedAt = Date.now();
    save();
    renderActivities();
    openActivityDetail(a.id);
  }
  pendingKeepActivityId = null;
});
document.getElementById('activityKeepNoBtn').addEventListener('click', () => {
  document.getElementById('activityKeepQueroFazerOverlay').classList.add('hidden');
  const a = findActivity(pendingKeepActivityId);
  if (a) openActivityDetail(a.id);
  pendingKeepActivityId = null;
});

// ---------- toggle de visualização (Categoria / Status) ----------
document.getElementById('viewByCategoryBtn').addEventListener('click', () => {
  activityDisplayView = 'category';
  document.getElementById('viewByCategoryBtn').classList.add('active');
  document.getElementById('viewByStatusBtn').classList.remove('active');
  renderActivities();
});
document.getElementById('viewByStatusBtn').addEventListener('click', () => {
  activityDisplayView = 'status';
  document.getElementById('viewByStatusBtn').classList.add('active');
  document.getElementById('viewByCategoryBtn').classList.remove('active');
  renderActivities();
});

// ---------- exclusão de atividade ----------
// Bloqueada quando já houve ao menos 1 realização (ver Fluxo 7 da spec). O delete de `tasks`
// órfãs (checklist da atividade) acontece no servidor via FK `activity_id ... ON DELETE CASCADE`
// quando `saveState()` remove a atividade que não veio mais no payload.
function deleteActivity(id) {
  const a = findActivity(id);
  if (!a) return;
  if ((a.realizacoes || []).length >= 1) {
    alert('Esta atividade já foi realizada e não pode ser excluída.');
    return;
  }
  const taskCount = (a.checklistTasks || []).length;
  const msg = `Excluir "${a.name}" vai remover a atividade${taskCount ? ` e ${taskCount === 1 ? 'sua tarefa' : `suas ${taskCount} tarefas`} de checklist` : ''} permanentemente. Esta ação não pode ser desfeita. Deseja continuar?`;
  if (!confirm(msg)) return;
  activities = activities.filter(x => x.id !== id);
  save();
  closeActivityDetail();
  renderActivities();
}

// ---------- importação de JSON (Fluxo 3) ----------
// Validação em duas camadas: (1) campos obrigatórios presentes; (2) tipos corretos por campo,
// incluindo a estrutura de perfis_custo, variacoes e checklist_sugerido.
function validateActivityImportJson(json) {
  const errors = [];
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { valid: false, errors: [{ field: 'JSON', message: 'O conteúdo colado não é um objeto JSON válido.' }] };
  }
  if (!json.nome || typeof json.nome !== 'string' || !json.nome.trim()) {
    errors.push({ field: 'nome', message: 'Campo obrigatório ausente ou inválido (deve ser texto).' });
  }
  if (!json.categoria || typeof json.categoria !== 'string' || !json.categoria.trim()) {
    errors.push({ field: 'categoria', message: 'Campo obrigatório ausente ou inválido (deve ser texto).' });
  }

  const arrayFields = ['vibes', 'modalidades_duracao', 'meios_transporte', 'condicao_climatica_ideal', 'epoca_ideal', 'perfil_grupo', 'variacoes', 'checklist_sugerido'];
  arrayFields.forEach(f => {
    if (json[f] != null && !Array.isArray(json[f])) errors.push({ field: f, message: 'Deve ser uma lista (array).' });
  });

  if (json.perfis_custo != null) {
    if (typeof json.perfis_custo !== 'object' || Array.isArray(json.perfis_custo)) {
      errors.push({ field: 'perfis_custo', message: 'Deve ser um objeto com as chaves economico/padrao/conforto.' });
    } else {
      PERFIS_CUSTO_TIPOS.forEach(tipo => {
        const p = json.perfis_custo[tipo];
        if (p == null) return;
        ['baixa_temporada', 'alta_temporada'].forEach(temp => {
          const range = p[temp];
          if (range != null && (!Array.isArray(range) || range.length !== 2)) {
            errors.push({ field: `perfis_custo.${tipo}.${temp}`, message: 'Deve ser um array [min, max].' });
          }
        });
      });
    }
  }

  (json.variacoes || []).forEach((v, i) => {
    if (!v || typeof v !== 'object') { errors.push({ field: `variacoes[${i}]`, message: 'Deve ser um objeto.' }); return; }
    if (!v.nome) errors.push({ field: `variacoes[${i}].nome`, message: 'Nome da variação é obrigatório.' });
    if (v.epocas_cobertas != null && !Array.isArray(v.epocas_cobertas)) errors.push({ field: `variacoes[${i}].epocas_cobertas`, message: 'Deve ser uma lista.' });
  });

  (json.checklist_sugerido || []).forEach((c, i) => {
    if (!c || typeof c !== 'object') { errors.push({ field: `checklist_sugerido[${i}]`, message: 'Deve ser um objeto.' }); return; }
    if (!c.name) errors.push({ field: `checklist_sugerido[${i}].name`, message: 'Nome da tarefa é obrigatório.' });
    ['antecedencia_minima_dias', 'antecedencia_max_dias', 'antecedencia_rec_dias'].forEach(f => {
      if (c[f] != null && typeof c[f] !== 'number') errors.push({ field: `checklist_sugerido[${i}].${f}`, message: 'Deve ser número ou null.' });
    });
  });

  return { valid: errors.length === 0, errors };
}

// Converte o JSON do prompt de refinamento (snake_case) em um objeto Activity completo
// (camelCase — ver decisão de nomenclatura em "Registro de desenvolvimento"). Foto de capa não é
// importável via JSON (campo visual, preenchido só pela Etapa 1 do formulário).
function importJsonToActivity(json) {
  const now = Date.now();
  const perfisCusto = {};
  PERFIS_CUSTO_TIPOS.forEach(tipo => {
    const p = json.perfis_custo && json.perfis_custo[tipo];
    if (p) perfisCusto[tipo] = { baixa_temporada: p.baixa_temporada || null, alta_temporada: p.alta_temporada || null };
  });
  const variacoes = (json.variacoes || []).map(v => {
    const variation = {
      id: uid(),
      nome: v.nome || '',
      epocasCobertas: v.epocas_cobertas || [],
      incluiFeriadosProlongados: !!v.inclui_feriados_prolongados,
    };
    if (v.vibes && v.vibes.length) variation.vibes = v.vibes;
    if (v.condicao_climatica_ideal && v.condicao_climatica_ideal.length) variation.condicaoClimaticaIdeal = v.condicao_climatica_ideal;
    if (v.temperatura_minima_celsius != null) variation.temperaturaMiniCelsius = v.temperatura_minima_celsius;
    if (v.antecedencia_minima_dias != null) variation.antecedenciaMiniDias = v.antecedencia_minima_dias;
    if (v.decisao_ultima_hora != null) variation.decisaoUltimaHora = v.decisao_ultima_hora;
    if (v.perfis_custo && Object.keys(v.perfis_custo).length) variation.perfisCusto = v.perfis_custo;
    if (v.modalidades_duracao && v.modalidades_duracao.length) variation.modalidadesDuracao = v.modalidades_duracao;
    if (v.meios_transporte && v.meios_transporte.length) variation.meiosTransporte = v.meios_transporte;
    if (v.perfil_grupo && v.perfil_grupo.length) variation.perfilGrupo = v.perfil_grupo;
    if (v.evitar_alta_temporada != null) variation.evitarAltaTemporada = v.evitar_alta_temporada;
    if (v.notas) variation.notas = v.notas;
    return variation;
  });
  const activityId = uid();
  const checklistTasks = (json.checklist_sugerido || []).map(c => ({
    id: uid(), name: c.name, date: null, deliveryDate: null, link: '',
    priority: null, urgent: false, urgentRank: 0,
    delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: now,
    fieldValues: {}, team: [], boardId: null, activityId, archived: false,
    antecedenciaMiniDias: c.antecedencia_minima_dias ?? null,
    antecedenciaMaxDias: c.antecedencia_max_dias ?? null,
    antecedenciaRecDias: c.antecedencia_rec_dias ?? null,
  }));
  const activity = {
    id: activityId,
    name: json.nome,
    categoria: json.categoria,
    status: 'rascunho',
    descricao: json.descricao ?? null,
    fotoCapa: null,
    vibes: json.vibes || [],
    modalidadesDuracao: json.modalidades_duracao || [],
    meiosTransporte: json.meios_transporte || [],
    nivelPlanejamento: json.nivel_planejamento || null,
    antecedenciaMiniDias: json.antecedencia_minima_dias ?? null,
    decisaoUltimaHora: !!json.decisao_ultima_hora,
    localidade: null,
    distanciaSP: json.distancia_sp || null,
    condicaoClimaticaIdeal: json.condicao_climatica_ideal || [],
    temperaturaMiniCelsius: json.temperatura_minima_ideal_celsius ?? null,
    epocaIdeal: json.epoca_ideal || [],
    perfilGrupo: json.perfil_grupo || [],
    tamanhoGrupo: json.tamanho_grupo || null,
    condicionamentoFisico: json.condicionamento_fisico || null,
    evitarAltaTemporada: !!json.evitar_alta_temporada,
    repetivel: json.repetivel !== false,
    petFriendly: json.pet_friendly ?? null,
    perfisCusto,
    variacoes,
    notas: null,
    links: [],
    dataInicio: null,
    boardDestinoId: null,
    realizacoes: [],
    checklistTasks,
    createdAt: now,
    updatedAt: now,
  };
  // Entra com o status correto (quero_fazer ou rascunho) já a partir das condições mínimas
  // presentes no JSON — mesma regra da máquina de estados (fe-33).
  activity.status = activityMeetsQueroFazerConditions(activity) ? 'quero_fazer' : 'rascunho';
  return activity;
}

let activityImportParsed = null;

function renderActivityImportErrors(errors) {
  const el = document.getElementById('activityImportErrors');
  if (!errors.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `<ul>${errors.map(e => `<li><strong>${escapeHtml(e.field)}</strong>: ${escapeHtml(e.message)}</li>`).join('')}</ul>`;
}

function renderActivityImportPreview(activity) {
  const el = document.getElementById('activityImportPreview');
  if (!activity) { el.classList.add('hidden'); el.innerHTML = ''; return; }
  el.classList.remove('hidden');
  el.innerHTML = `
    <h4>Preview (revise e edite antes de confirmar)</h4>
    <label>Nome <input type="text" id="import-preview-name" value="${escapeHtml(activity.name)}"></label>
    <label>Categoria <input type="text" id="import-preview-categoria" value="${escapeHtml(activity.categoria)}"></label>
    ${detailRow('Status inicial', ACTIVITY_STATUS_LABELS[activity.status])}
    ${detailRow('Vibe', activity.vibes)}
    ${detailRow('Modalidades de duração', activity.modalidadesDuracao)}
    ${detailRow('Variações sazonais', activity.variacoes.map(v => v.nome))}
    ${detailRow('Checklist sugerido', activity.checklistTasks.map(t => t.name))}
  `;
}

function openActivityImport() {
  document.getElementById('activityImportTextarea').value = '';
  activityImportParsed = null;
  renderActivityImportErrors([]);
  renderActivityImportPreview(null);
  document.getElementById('activityImportConfirmBtn').disabled = true;
  document.getElementById('activityImportOverlay').classList.remove('hidden');
}
function closeActivityImport() {
  document.getElementById('activityImportOverlay').classList.add('hidden');
}

function validateActivityImportFromTextarea() {
  const raw = document.getElementById('activityImportTextarea').value.trim();
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    renderActivityImportErrors([{ field: 'JSON', message: 'JSON inválido: ' + err.message }]);
    renderActivityImportPreview(null);
    document.getElementById('activityImportConfirmBtn').disabled = true;
    return;
  }
  const { valid, errors } = validateActivityImportJson(json);
  renderActivityImportErrors(errors);
  if (!valid) {
    activityImportParsed = null;
    renderActivityImportPreview(null);
    document.getElementById('activityImportConfirmBtn').disabled = true;
    return;
  }
  activityImportParsed = importJsonToActivity(json);
  renderActivityImportPreview(activityImportParsed);
  document.getElementById('activityImportConfirmBtn').disabled = false;
}

function confirmActivityImport() {
  if (!activityImportParsed) return;
  const nameInput = document.getElementById('import-preview-name');
  const categoriaInput = document.getElementById('import-preview-categoria');
  if (nameInput && nameInput.value.trim()) activityImportParsed.name = nameInput.value.trim();
  if (categoriaInput && categoriaInput.value.trim()) activityImportParsed.categoria = categoriaInput.value.trim();
  activities.push(activityImportParsed);
  save();
  activityImportParsed = null;
  closeActivityImport();
  renderActivities();
}

document.getElementById('activityImportBtn').addEventListener('click', openActivityImport);
document.getElementById('closeActivityImport').addEventListener('click', closeActivityImport);
document.getElementById('activityImportCancelBtn').addEventListener('click', closeActivityImport);
document.getElementById('activityImportOverlay').addEventListener('click', e => { if (e.target.id === 'activityImportOverlay') closeActivityImport(); });
document.getElementById('activityImportValidateBtn').addEventListener('click', validateActivityImportFromTextarea);
document.getElementById('activityImportConfirmBtn').addEventListener('click', confirmActivityImport);

// ---------- painel de filtros ----------
function renderActivityFiltersPanel() {
  const panel = document.getElementById('activityFiltersPanel');
  const categorias = [...new Set(activities.map(a => a.categoria))];
  panel.innerHTML = `
    <label>Categoria
      <select id="filter-categoria">
        <option value="">Todas</option>
        ${categorias.map(c => `<option value="${escapeHtml(c)}" ${activityFilters.categoria === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
      </select>
    </label>
    <label>Vibe
      <select id="filter-vibe">
        <option value="">Todas</option>
        ${VIBES.map(v => `<option value="${escapeHtml(v)}" ${activityFilters.vibe === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
      </select>
    </label>
    <label>Status
      <select id="filter-status">
        <option value="">Todos</option>
        ${Object.keys(ACTIVITY_STATUS_LABELS).map(s => `<option value="${s}" ${activityFilters.status === s ? 'selected' : ''}>${ACTIVITY_STATUS_LABELS[s]}</option>`).join('')}
      </select>
    </label>
    <label>Modalidade de duração
      <select id="filter-modalidade">
        <option value="">Todas</option>
        ${MODALIDADES_DURACAO.map(m => `<option value="${escapeHtml(m)}" ${activityFilters.modalidade === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('')}
      </select>
    </label>
    <label>Custo máx. (baixa temporada, R$/pessoa)
      <input type="number" id="filter-custo-max" min="0" value="${activityFilters.custoMax ?? ''}">
    </label>
    <label>Época do ano
      <select id="filter-epoca">
        <option value="">Todas</option>
        ${EPOCAS.map(e => `<option value="${escapeHtml(e)}" ${activityFilters.epoca === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
      </select>
    </label>
    <button type="button" id="filter-clear-btn" class="btn-neutral-sm">Limpar filtros</button>
  `;

  // Handlers por propriedade: o painel persiste entre aberturas — evita duplicar bindings.
  panel.onchange = e => {
    if (e.target.id === 'filter-categoria') activityFilters.categoria = e.target.value || null;
    else if (e.target.id === 'filter-vibe') activityFilters.vibe = e.target.value || null;
    else if (e.target.id === 'filter-status') activityFilters.status = e.target.value || null;
    else if (e.target.id === 'filter-modalidade') activityFilters.modalidade = e.target.value || null;
    else if (e.target.id === 'filter-epoca') activityFilters.epoca = e.target.value || null;
    else return;
    renderActivities();
  };
  panel.oninput = e => {
    if (e.target.id === 'filter-custo-max') {
      activityFilters.custoMax = e.target.value === '' ? null : Number(e.target.value);
      renderActivities();
    }
  };
  panel.onclick = e => {
    if (e.target.id === 'filter-clear-btn') {
      activityFilters = { categoria: null, vibe: null, status: null, modalidade: null, custoMax: null, epoca: null };
      renderActivityFiltersPanel();
      renderActivities();
    }
  };
}

document.getElementById('activityFiltersBtn').addEventListener('click', () => {
  const panel = document.getElementById('activityFiltersPanel');
  const opening = panel.classList.contains('hidden');
  if (opening) renderActivityFiltersPanel();
  panel.classList.toggle('hidden');
});

// ---------- feriadosapi.com ----------
// Nota: o endpoint exato de feriadosapi.com não está documentado na spec além de "gratuito, 60
// req/min, feriados do estado de SP". A URL abaixo é a melhor tentativa com base no nome do
// serviço; como o fetch tem fallback silencioso em qualquer erro (rede, 404, formato inesperado),
// o app nunca quebra mesmo que o endpoint precise de ajuste — ver "Registro de desenvolvimento".
async function fetchHolidays() {
  if (holidaysCache !== null) return holidaysCache; // uma chamada por sessão (cache em memória)
  try {
    const year = new Date().getFullYear();
    const res = await fetch(`https://feriadosapi.com/api/v1/feriados/SP/${year}`);
    if (!res.ok) throw new Error('feriadosapi.com request failed');
    const json = await res.json();
    const list = Array.isArray(json) ? json : (json.feriados || json.holidays || []);
    holidaysCache = list.map(h => ({ date: h.date || h.data, name: h.name || h.nome || '' })).filter(h => h.date);
  } catch (err) {
    console.error('Falha ao carregar feriados via feriadosapi.com:', err);
    holidaysCache = [];
  }
  if (activityDetailId && !document.getElementById('activityDetailOverlay').classList.contains('hidden')) {
    const a = findActivity(activityDetailId);
    if (a) renderActivityDetailHolidays(a);
  }
  if (currentView === 'activities') renderActivities(); // atualiza chip de variação ativa por feriado prolongado
  return holidaysCache;
}

const ACTIVITY_MODALIDADES_SIMPLES = ['Parada rápida', 'Meio período', 'Dia inteiro', 'Bate volta', 'Final de semana'];
const ACTIVITY_MODALIDADES_PROLONGADAS = ['Feriado prolongado', 'Semana+'];

// Feriados/períodos futuros compatíveis com as modalidades de duração da atividade: atividades
// que só fazem sentido como feriado prolongado/viagem longa só veem os períodos de 3+ dias;
// as demais veem qualquer feriado futuro (simples ou prolongado).
function upcomingCompatibleHolidays(a) {
  if (!holidaysCache || !holidaysCache.length) return [];
  const today = toKey(new Date());
  const modalidades = a.modalidadesDuracao || [];
  const wantsProlonged = modalidades.some(m => ACTIVITY_MODALIDADES_PROLONGADAS.includes(m));
  const wantsSimple = !modalidades.length || modalidades.some(m => ACTIVITY_MODALIDADES_SIMPLES.includes(m));
  const results = [];
  const periods = findProlongedHolidayPeriods(holidaysCache);
  if (wantsProlonged || !modalidades.length) {
    periods.filter(p => p.end >= today).forEach(p => results.push({ label: `${fmtDateBR(p.start)} – ${fmtDateBR(p.end)} (prolongado)`, start: p.start }));
  }
  if (wantsSimple) {
    holidaysCache.filter(h => h.date >= today).forEach(h => results.push({ label: `${fmtDateBR(h.date)} · ${h.name}`, start: h.date }));
  }
  results.sort((x, y) => x.start.localeCompare(y.start));
  return results.slice(0, 5);
}

function renderActivityDetailHolidays(a) {
  const el = document.getElementById('activityDetailHolidays');
  if (!el) return;
  if (holidaysCache === null) { el.innerHTML = '<div class="activity-detail-empty">Carregando feriados...</div>'; return; }
  if (!holidaysCache.length) { el.innerHTML = '<div class="activity-detail-empty">Não foi possível carregar feriados</div>'; return; }
  const compat = upcomingCompatibleHolidays(a);
  el.innerHTML = compat.length
    ? `<ul class="activity-holidays-list">${compat.map(c => `<li>${escapeHtml(c.label)}</li>`).join('')}</ul>`
    : '<div class="activity-detail-empty">Nenhum feriado compatível encontrado.</div>';
}

// ================================================================
// FINANÇAS
// ================================================================

// --- Estado global de finanças ---
let financeState = { categories: [], transactions: [], plannedPurchases: [], wallets: [], budgetItems: [], envelopes: [], envelopeEventTypes: [] };
let financeMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let financeTab = 'geral';
let financeCatFilter = null;
let financeTxnTypeFilter = 'all';
let finTransactionType = 'expense';
let finTransactionNature = 'variable';
let finTransactionCatId = null;
let finTransactionWalletId = null;
let finTransactionEnvelopeId = null;
let finEditingTxnId = null;
let finPurchasePriority = 'medium';
let finEnvExpandedTypes = new Set(['Viagem', 'Social', 'Recorrentes', 'Projetos', 'Avulsos']);
let finEnvDraftKind = 'event';
let finEnvDraftEventType = 'Social';
let finEnvDraftColor = 'amber';
let finEnvDrawerId = null;
let finEnvEditingId = null;
// Planejamento state
let finPlanExpandedCats = new Set();
let finNewCatIcon = '📦';
let finNewCatColor = 'gray';
let finAddFixedIcon = '📌';
let finAddFixedCatId = null;

// MON e MONTH_NAMES já declarados no topo do arquivo

// --- Persistência ---
async function loadFinance() {
  try {
    const res = await fetch('/api/finance', { headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {} });
    const data = await res.json();
    if (!res.ok) { console.error('Erro ao carregar finanças:', data.error); return; }
    financeState.categories       = data.categories       || [];
    financeState.transactions     = data.transactions     || [];
    financeState.plannedPurchases = data.plannedPurchases || [];
    financeState.wallets          = data.wallets          || [];
    financeState.budgetItems      = data.budgetItems      || [];
    financeState.envelopes        = data.envelopes        || [];
    financeState.envelopeEventTypes = data.envelopeEventTypes || [];
    if (financeState.categories.length === 0) initDefaultFinanceCategories();
    ensureRecurringEnvelopeInstances();
    renderWalletSettings();
    if (currentView === 'finance') renderFinanceView();
  } catch (err) {
    console.error('Falha ao carregar finanças:', err);
  }
}

let finSaveTimer = null;
function saveFinance() {
  clearTimeout(finSaveTimer);
  finSaveTimer = setTimeout(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    fetch('/api/finance', {
      method: 'POST',
      headers,
      body: JSON.stringify(financeState),
    }).catch(err => console.error('Erro ao salvar finanças:', err));
  }, 300);
}

function initDefaultFinanceCategories() {
  const defaults = [
    { name: 'Moradia',      icon: '🏠', color: 'blue',   monthlyLimit: null, sortOrder: 0 },
    { name: 'Alimentação',  icon: '🍽️', color: 'green',  monthlyLimit: null, sortOrder: 1 },
    { name: 'Transporte',   icon: '🚗', color: 'amber',  monthlyLimit: null, sortOrder: 2 },
    { name: 'Saúde',        icon: '💊', color: 'teal',   monthlyLimit: null, sortOrder: 3 },
    { name: 'Lazer',        icon: '🎮', color: 'red',    monthlyLimit: null, sortOrder: 4 },
    { name: 'Outros',       icon: '📦', color: 'gray',   monthlyLimit: null, sortOrder: 5 },
  ];
  financeState.categories = defaults.map(d => ({ id: uid(), ...d }));
  saveFinance();
}

// --- Cálculos ---
function finGetSummary(month) {
  const y = month.getFullYear(), m = month.getMonth();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = (y === today.getFullYear() && m === today.getMonth());
  const dayOfMonth = isCurrentMonth ? today.getDate() : daysInMonth;

  const txns = financeState.transactions.filter(t => {
    const d = new Date(t.date + 'T12:00:00');
    return d.getFullYear() === y && d.getMonth() === m;
  });

  const income   = txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const expense  = txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const fixedExp = txns.filter(t => t.type === 'expense' && t.nature === 'fixed').reduce((s, t) => s + Number(t.amount), 0);
  const varExp   = txns.filter(t => t.type === 'expense' && t.nature === 'variable').reduce((s, t) => s + Number(t.amount), 0);
  const dailyRate = dayOfMonth > 0 ? varExp / dayOfMonth : 0;
  const projExp   = fixedExp + dailyRate * daysInMonth;
  const projSavings = income - projExp;

  const byCat = {};
  for (const t of txns.filter(t => t.type === 'expense')) {
    byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Number(t.amount);
  }

  return { income, expense, balance: income - expense, projExp, projSavings, dailyRate, dayOfMonth, daysInMonth, byCat, txns, isCurrentMonth };
}

function finGetInsights(summary) {
  const ins = [];
  const { income, projSavings, byCat, daysInMonth, dayOfMonth, dailyRate } = summary;
  const remaining = daysInMonth - dayOfMonth;

  if (income > 0) {
    if (projSavings > 0) {
      const pct = Math.round((projSavings / income) * 100);
      ins.push({ type: 'ok', text: `No ritmo atual você fecha o mês com <strong>R$&nbsp;${finFmt(projSavings)} de economia</strong> (${pct}% da receita).` });
    } else {
      ins.push({ type: 'alert', text: 'Atenção: no ritmo atual você vai <strong>gastar mais do que recebe</strong> este mês.' });
    }
  }

  for (const cat of financeState.categories) {
    if (!cat.monthlyLimit) continue;
    const spent = byCat[cat.id] || 0;
    const pct   = spent / cat.monthlyLimit;
    if (pct >= 1) {
      ins.push({ type: 'alert', text: `<strong>${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</strong> atingiu 100% do limite este mês.` });
    } else if (pct >= 0.75 && remaining > 5) {
      ins.push({ type: 'warn', text: `<strong>${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</strong> está em ${Math.round(pct * 100)}% do limite com ${remaining} dias restantes.` });
    }
  }

  if (dailyRate > 0) {
    ins.push({ type: 'info', text: `Média de gastos variáveis: <strong>R$&nbsp;${finFmt(dailyRate)}/dia</strong>.` });
  }

  return ins.slice(0, 4);
}

// --- Formatação ---
function finFmt(n) {
  const val = Math.round(Number(n) || 0);
  return val.toLocaleString('pt-BR');
}

function finFmtDate(dateStr) {
  const parts = dateStr.split('-');
  return `${parseInt(parts[2])} ${MON[parseInt(parts[1]) - 1]}`;
}

function finFmtDateFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} de ${MONTH_NAMES[d.getMonth()].toLowerCase()}`;
}

function finCatBarColor(color) {
  const map = { blue: 'var(--color-blue)', green: 'var(--color-green)', amber: '#C07C30', teal: '#1F7A6E', red: 'var(--color-terracotta)', gray: '#9A9488', purple: '#7B4FA0' };
  return map[color] || '#9A9488';
}

const FIN_ENV_DEFAULT_TYPES = [
  { name: 'Social',       icon: '🎉', color: 'amber'  },
  { name: 'Casal',        icon: '💛', color: 'red'    },
  { name: 'Viagem',       icon: '✈️', color: 'blue'   },
  { name: 'Rotina',       icon: '🍱', color: 'green'  },
  { name: 'Saúde',        icon: '💊', color: 'teal'   },
  { name: 'Casa',         icon: '🏠', color: 'purple' },
  { name: 'Profissional', icon: '💼', color: 'gray'   },
];

function finEnvTypes() {
  const custom = Array.isArray(financeState.envelopeEventTypes) ? financeState.envelopeEventTypes : [];
  const byName = new Map();
  [...FIN_ENV_DEFAULT_TYPES, ...custom].forEach(t => byName.set(t.name, t));
  return [...byName.values()];
}

function finEnvTypeMeta(typeName) {
  return finEnvTypes().find(t => t.name === typeName) || { name: typeName || 'Sem tipo', icon: '✉️', color: 'gray' };
}

function finMonthBounds(month) {
  const y = month.getFullYear(), m = month.getMonth();
  return {
    start: toKey(new Date(y, m, 1)),
    end: toKey(new Date(y, m + 1, 0)),
  };
}

function finDateInRange(date, start, end) {
  return (!start || date >= start) && (!end || date <= end);
}

function finEnvVisibleInMonth(env, month) {
  const { start, end } = finMonthBounds(month);
  if (env.kind === 'recurring' || env.kind === 'project') return env.status !== 'closed';
  if (!env.periodStart && !env.periodEnd) return env.status !== 'closed';
  return (!env.periodStart || env.periodStart <= end) && (!env.periodEnd || env.periodEnd >= start);
}

function finEnvTransactions(env, month = null) {
  const ids = new Set([env.id]);
  if (env.kind === 'project') financeState.envelopes.filter(e => e.parentId === env.id).forEach(e => ids.add(e.id));
  const txns = financeState.transactions.filter(t => t.type === 'expense' && ids.has(t.envelopeId));
  if (!month) return txns;
  const { start, end } = finMonthBounds(month);
  return txns.filter(t => t.date >= start && t.date <= end);
}

function finEnvBudget(env) {
  if (env.kind === 'project') {
    const subTotal = financeState.envelopes
      .filter(e => e.parentId === env.id && e.kind === 'sub')
      .reduce((s, e) => s + Number(e.budget || 0), 0);
    return Number(env.budget || subTotal || 0);
  }
  return Number(env.budget || 0);
}

function finEnvSpent(env, month = financeMonth) {
  return finEnvTransactions(env, month).reduce((s, t) => s + Number(t.amount || 0), 0);
}

function finEnvProgress(env, month = financeMonth) {
  const budget = finEnvBudget(env);
  const spent = finEnvSpent(env, month);
  const pctRaw = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const pct = Math.min(100, pctRaw);
  const color = pctRaw >= 100 ? 'var(--color-terracotta)' : pctRaw >= 75 ? '#C07C30' : finCatBarColor(env.color);
  const cls = pctRaw >= 100 ? 'fin-over' : pctRaw >= 75 ? 'fin-warn' : '';
  return { budget, spent, pct, pctRaw, color, cls };
}

function finEnvPeriodLabel(env) {
  if (env.kind === 'recurring') return env.recurrence === 'weekly' ? 'template semanal' : 'template mensal';
  if (env.kind === 'project') return 'projeto';
  if (env.kind === 'sub') return 'sub-envelope';
  if (env.periodStart && env.periodEnd) return `${finFmtDate(env.periodStart)} – ${finFmtDate(env.periodEnd)}`;
  if (env.periodStart) return `desde ${finFmtDate(env.periodStart)}`;
  if (env.periodEnd) return `até ${finFmtDate(env.periodEnd)}`;
  return 'sem período definido';
}

function finEnvPaceText(env, progress) {
  if (progress.budget <= 0) return 'sem orçamento definido';
  if (progress.pctRaw >= 100) return 'orçamento estourado';
  if (env.kind === 'recurring') return `${progress.pctRaw}% do ciclo atual`;
  if (env.kind === 'project') return `${progress.pctRaw}% do projeto`;
  if (!env.periodEnd || env.periodEnd < toKey(new Date())) return `${progress.pctRaw}% do orçamento`;
  const remaining = Math.max(0, Math.ceil((new Date(env.periodEnd + 'T12:00:00') - new Date()) / 86400000));
  return remaining ? `${progress.pctRaw}% usado · ${remaining} dias restantes` : `${progress.pctRaw}% usado · termina hoje`;
}

function ensureRecurringEnvelopeInstances() {
  const today = toKey(new Date());
  let changed = false;
  financeState.envelopes.filter(e => e.kind === 'recurring' && e.status !== 'closed').forEach(template => {
    const now = new Date(today + 'T12:00:00');
    let startDate;
    let endDate;
    if (template.recurrence === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      startDate = new Date(now);
      startDate.setDate(now.getDate() + mondayOffset);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
    }
    const periodStart = toKey(startDate);
    const periodEnd = toKey(endDate);
    const exists = financeState.envelopes.some(e => e.parentId === template.id && e.periodStart === periodStart);
    if (!exists) {
      financeState.envelopes.forEach(e => {
        if (e.parentId === template.id && e.kind === 'event' && e.status === 'open') {
          e.status = 'closed';
          e.closedAt = new Date().toISOString();
        }
      });
      financeState.envelopes.push({
        id: uid(),
        name: template.name,
        kind: 'event',
        eventType: template.eventType,
        icon: template.icon || '🔁',
        color: template.color || 'green',
        budget: template.budget || 0,
        periodStart,
        periodEnd,
        status: 'open',
        parentId: template.id,
        sortOrder: financeState.envelopes.length,
        createdAt: new Date().toISOString(),
      });
      changed = true;
    }
  });
  if (changed) saveFinance();
}

function finOpenEnvelopesForDate(date) {
  return financeState.envelopes
    .filter(e => e.status !== 'closed' && e.kind !== 'recurring')
    .filter(e => e.kind === 'sub' || e.kind === 'project' || finDateInRange(date, e.periodStart, e.periodEnd))
    .filter(e => e.kind !== 'project')
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

// --- Renderização principal ---
function renderFinanceView() {
  const el = document.getElementById('financeView');
  if (!el || el.classList.contains('hidden')) return;

  const label = MONTH_NAMES[financeMonth.getMonth()] + ' ' + financeMonth.getFullYear();
  const lblEl = document.getElementById('financeMonthLabel');
  if (lblEl) lblEl.textContent = label;

  const cats    = [...financeState.categories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const summary = finGetSummary(financeMonth);

  const tabDefs = [
    { id: 'geral',         label: 'Visão geral'    },
    { id: 'lancamentos',   label: 'Lançamentos'    },
    { id: 'envelopes',     label: 'Envelopes'      },
    { id: 'planejamento',  label: 'Planejamento'   },
    { id: 'planejados',    label: 'Planejados'     },
  ];

  el.innerHTML = `
    <div class="fin-tabs-row">
      ${tabDefs.map(t => `
        <button class="fin-tab ${financeTab === t.id ? 'active' : ''}" data-tab="${t.id}">${t.label}</button>
      `).join('')}
    </div>
    <div class="fin-tab-body">
      ${financeTab === 'geral'        ? renderFinanceGeral(summary, cats)          : ''}
      ${financeTab === 'lancamentos'  ? renderFinanceLancamentos(summary, cats)    : ''}
      ${financeTab === 'envelopes'    ? renderFinanceEnvelopes(summary, cats)      : ''}
      ${financeTab === 'planejamento' ? renderFinancePlanejamento(summary, cats)   : ''}
      ${financeTab === 'planejados'   ? renderFinancePlanejados(summary)           : ''}
    </div>
  `;

  // Tab navigation
  el.querySelectorAll('.fin-tab').forEach(btn => {
    btn.addEventListener('click', () => { financeTab = btn.dataset.tab; renderFinanceView(); });
  });

  // Tab-switch link (from geral → lançamentos)
  el.querySelectorAll('[data-tab-switch]').forEach(btn => {
    btn.addEventListener('click', () => { financeTab = btn.dataset.tabSwitch; renderFinanceView(); });
  });

  // Delete transactions
  el.querySelectorAll('[data-del-txn]').forEach(btn => {
    btn.addEventListener('click', () => {
      financeState.transactions = financeState.transactions.filter(t => t.id !== btn.dataset.delTxn);
      saveFinance(); renderFinanceView();
    });
  });

  // Edit transactions
  el.querySelectorAll('[data-edit-txn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const txn = financeState.transactions.find(t => t.id === btn.dataset.editTxn);
      if (txn) openFinTransactionModal(txn);
    });
  });

  // Delete purchases
  el.querySelectorAll('[data-del-purchase]').forEach(btn => {
    btn.addEventListener('click', () => {
      financeState.plannedPurchases = financeState.plannedPurchases.filter(p => p.id !== btn.dataset.delPurchase);
      saveFinance(); renderFinanceView();
    });
  });

  // Type filter
  el.querySelectorAll('[data-fin-type-filter]').forEach(btn => {
    btn.addEventListener('click', () => { financeTxnTypeFilter = btn.dataset.finTypeFilter; renderFinanceView(); });
  });

  // Cat filter
  el.querySelectorAll('[data-fin-cat-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.finCatFilter;
      financeCatFilter = financeCatFilter === v ? null : v;
      renderFinanceView();
    });
  });

  // Inline "Lançar" button in lancamentos tab
  const inlineBtn = el.querySelector('#finLancarBtnInline');
  if (inlineBtn) inlineBtn.addEventListener('click', () => openFinTransactionModal());

  // Add purchase buttons
  el.querySelectorAll('#finAddPurchaseBtn, #finAddPurchaseBtnGrid').forEach(btn => {
    btn.addEventListener('click', openFinPurchaseModal);
  });

  // ── Planejamento tab handlers ─────────────────────────────

  // Toggle category expand/collapse
  el.querySelectorAll('[data-toggle-cat]').forEach(header => {
    header.addEventListener('click', e => {
      // Don't toggle if clicking on an input/button inside the header
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      const catId = header.dataset.toggleCat;
      if (finPlanExpandedCats.has(catId)) finPlanExpandedCats.delete(catId);
      else finPlanExpandedCats.add(catId);
      renderFinanceView();
    });
  });

  // Edit monthly limit inline
  el.querySelectorAll('[data-cat-limit]').forEach(input => {
    const saveLimitChange = () => {
      const val = parseFloat(input.value);
      const cat = financeState.categories.find(c => c.id === input.dataset.catLimit);
      if (cat) {
        cat.monthlyLimit = (!isNaN(val) && val >= 0) ? val : null;
        saveFinance();
      }
    };
    input.addEventListener('change', saveLimitChange);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
    input.addEventListener('click', e => e.stopPropagation());
  });

  // "Sem limite" → inline input
  el.querySelectorAll('[data-set-limit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const catId = btn.dataset.setLimit;
      const input = document.createElement('input');
      input.type = 'number'; input.min = '0'; input.step = '0.01';
      input.className = 'fin-bud-limit-input'; input.placeholder = '0,00';
      btn.replaceWith(input);
      input.focus();
      const save = () => {
        const val = parseFloat(input.value);
        const cat = financeState.categories.find(c => c.id === catId);
        if (cat) {
          cat.monthlyLimit = (!isNaN(val) && val > 0) ? val : null;
          saveFinance();
        }
        renderFinanceView();
      };
      input.addEventListener('blur', save);
      input.addEventListener('keydown', e2 => { if (e2.key === 'Enter') input.blur(); if (e2.key === 'Escape') { input.value = ''; input.blur(); } });
    });
  });

  // Edit budget item amount inline
  el.querySelectorAll('[data-item-id]').forEach(input => {
    const saveItemAmt = () => {
      const val = parseFloat(input.value);
      const item = financeState.budgetItems.find(i => i.id === input.dataset.itemId);
      if (item && !isNaN(val) && val >= 0) { item.amount = val; saveFinance(); }
    };
    input.addEventListener('change', saveItemAmt);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  });

  // Delete budget item
  el.querySelectorAll('[data-del-budget-item]').forEach(btn => {
    btn.addEventListener('click', () => {
      financeState.budgetItems = financeState.budgetItems.filter(i => i.id !== btn.dataset.delBudgetItem);
      saveFinance(); renderFinanceView();
    });
  });

  // Open "add fixed item" modal
  el.querySelectorAll('[data-add-fixed-cat]').forEach(btn => {
    btn.addEventListener('click', () => {
      finAddFixedCatId = btn.dataset.addFixedCat;
      openFinAddFixedModal();
    });
  });

  // Open "new category" modal
  const addCatBtn = el.querySelector('#finAddCatBtn');
  if (addCatBtn) addCatBtn.addEventListener('click', openFinNewCatModal);

  // ── Envelopes tab handlers ────────────────────────────────
  el.querySelectorAll('[data-env-toggle]').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.tagName === 'BUTTON') return;
      const type = header.dataset.envToggle;
      if (finEnvExpandedTypes.has(type)) finEnvExpandedTypes.delete(type);
      else finEnvExpandedTypes.add(type);
      renderFinanceView();
    });
  });
  el.querySelectorAll('[data-env-open]').forEach(row => {
    row.addEventListener('click', () => openFinEnvelopeDrawer(row.dataset.envOpen));
  });
  el.querySelectorAll('[data-env-new]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openFinEnvelopeModal(btn.dataset.envNew || null);
    });
  });
  el.querySelectorAll('[data-env-assign-txn]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const txn = financeState.transactions.find(t => t.id === btn.dataset.envAssignTxn);
      if (txn) openFinTransactionModal(txn);
    });
  });
}

// --- Visão Geral ---
function renderFinanceGeral(summary, cats) {
  const { income, expense, balance, projSavings, byCat, dayOfMonth } = summary;
  const pctSpent = income > 0 ? Math.min(100, Math.round((expense / income) * 100)) : 0;

  const kpiHtml = `
    <div class="fin-kpi-grid">
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Receita do mês</div>
        <div class="fin-kpi-value" style="color:var(--color-green)">R$&nbsp;${finFmt(income)}</div>
        <span class="fin-tag fin-tag-gray">entradas</span>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Gastos até agora</div>
        <div class="fin-kpi-value">R$&nbsp;${finFmt(expense)}</div>
        <div class="fin-kpi-sub">${pctSpent}% da receita · ${dayOfMonth} dias</div>
        <div class="fin-kpi-bar"><div class="fin-kpi-bar-fill" style="width:${pctSpent}%;background:${pctSpent > 80 ? 'var(--color-terracotta)' : '#C07C30'}"></div></div>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Saldo atual</div>
        <div class="fin-kpi-value" style="color:${balance >= 0 ? 'var(--color-green)' : 'var(--color-terracotta)'}">R$&nbsp;${finFmt(balance)}</div>
        <span class="fin-tag ${balance >= 0 ? 'fin-tag-green' : 'fin-tag-red'}">${balance >= 0 ? '↑ no azul' : '↓ no vermelho'}</span>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Projeção fim do mês</div>
        <div class="fin-kpi-value" style="color:${projSavings >= 0 ? 'var(--color-green)' : 'var(--color-terracotta)'}">R$&nbsp;${finFmt(Math.abs(projSavings))}</div>
        <div class="fin-kpi-sub">${projSavings >= 0 ? 'economia estimada' : 'déficit estimado'}</div>
        <span class="fin-tag fin-tag-blue">ritmo atual</span>
      </div>
    </div>
  `;

  const catHtml = cats.map(cat => {
    const spent  = byCat[cat.id] || 0;
    const limit  = cat.monthlyLimit;
    const pct    = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const barClr = pct >= 100 ? 'var(--color-terracotta)' : pct >= 75 ? '#C07C30' : finCatBarColor(cat.color);
    const pctTag = limit
      ? `<span class="fin-cat-pct-tag ${pct >= 100 ? 'fin-cat-pct-over' : pct >= 75 ? 'fin-cat-pct-warn' : 'fin-cat-pct-ok'}">${pct}%</span>`
      : '';
    return `
      <div class="fin-cat-row">
        <div class="fin-cat-top">
          <span class="fin-cat-badge fin-c-${escapeHtml(cat.color)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</span>
          ${pctTag}
          <span class="fin-cat-spent${pct >= 100 ? ' fin-over' : ''}">R$&nbsp;${finFmt(spent)}</span>
          ${limit ? `<span class="fin-cat-limit">/&nbsp;R$&nbsp;${finFmt(limit)}</span>` : ''}
        </div>
        <div class="fin-cat-bar-wrap"><div class="fin-cat-bar" style="width:${pct || (spent > 0 ? 2 : 0)}%;background:${barClr}"></div></div>
      </div>
    `;
  }).join('') || '<div style="color:var(--color-text-tertiary);font:500 12.5px var(--font-sora)">Nenhuma categoria.</div>';

  const insights = finGetInsights(summary);
  const insHtml  = insights.map(i => `
    <div class="fin-insight-row">
      <div class="fin-insight-icon">${{ ok: '✅', warn: '⚡', info: '📊', alert: '🚨' }[i.type] || '💡'}</div>
      <div class="fin-insight-text">${i.text}</div>
    </div>
  `).join('') || '<div style="color:var(--color-text-tertiary);font:500 12.5px var(--font-sora)">Lance transações para ver insights.</div>';

  const recentTxns = [...financeState.transactions]
    .filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d.getFullYear() === financeMonth.getFullYear() && d.getMonth() === financeMonth.getMonth();
    })
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const recentHtml = recentTxns.length ? recentTxns.map(t => {
    const cat  = financeState.categories.find(c => c.id === t.categoryId);
    const sign = t.type === 'expense' ? '−' : '+';
    const cls  = t.type === 'expense' ? 'out' : 'in';
    return `
      <div class="fin-txn-item">
        ${cat
          ? `<span class="fin-cat-badge fin-c-${escapeHtml(cat.color)}" style="font-size:10.5px">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</span>`
          : t.type === 'income'
            ? `<span class="fin-cat-badge fin-c-green" style="font-size:10.5px">💰 Receita</span>`
            : `<span class="fin-cat-badge fin-c-gray" style="font-size:10.5px">Sem categoria</span>`}
        <div class="fin-txn-info">
          <div class="fin-txn-name">${escapeHtml(t.description)}</div>
          <div class="fin-txn-meta">${finFmtDate(t.date)}${t.nature === 'fixed' ? ' · fixo' : ''}</div>
        </div>
        <div class="fin-txn-amt ${cls}">${sign}&nbsp;R$&nbsp;${finFmt(t.amount)}</div>
      </div>
    `;
  }).join('') : '<div style="color:var(--color-text-tertiary);font:500 12.5px var(--font-sora);padding:8px 0">Nenhuma transação neste mês.</div>';

  return `
    ${kpiHtml}
    <div class="fin-body-grid">
      <div class="fin-col-left">
        <div class="fin-section">
          <div class="fin-section-head">
            <span class="fin-section-title">Gastos por categoria</span>
            <span class="fin-section-sub">${MONTH_NAMES[financeMonth.getMonth()]} ${financeMonth.getFullYear()}</span>
          </div>
          <div class="fin-section-body">${catHtml}</div>
        </div>
        <div class="fin-section">
          <div class="fin-section-head">
            <span class="fin-section-title">Histórico de gastos</span>
            <span class="fin-section-sub">últimos 6 meses</span>
          </div>
          <div class="fin-section-body">${renderFinanceHistChart()}</div>
        </div>
      </div>
      <div class="fin-col-right">
        <div class="fin-section">
          <div class="fin-section-head"><span class="fin-section-title">Insights</span></div>
          <div class="fin-section-body" style="padding-bottom:10px">${insHtml}</div>
        </div>
        <div class="fin-section">
          <div class="fin-section-head">
            <span class="fin-section-title">Últimos lançamentos</span>
            <button class="fin-link-btn" data-tab-switch="lancamentos">ver todos</button>
          </div>
          <div class="fin-section-body" style="padding-top:8px">${recentHtml}</div>
        </div>
      </div>
    </div>
  `;
}

// --- Histórico chart ---
function renderFinanceHistChart() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    months.push(new Date(financeMonth.getFullYear(), financeMonth.getMonth() - i, 1));
  }
  const totals = months.map(m => {
    const y = m.getFullYear(), mo = m.getMonth();
    return financeState.transactions
      .filter(t => { const d = new Date(t.date + 'T12:00:00'); return t.type === 'expense' && d.getFullYear() === y && d.getMonth() === mo; })
      .reduce((s, t) => s + Number(t.amount), 0);
  });
  const maxVal = Math.max(...totals, 1);
  const bars = months.map((m, i) => {
    const isCur = m.getFullYear() === financeMonth.getFullYear() && m.getMonth() === financeMonth.getMonth();
    const pct   = Math.round((totals[i] / maxVal) * 100);
    return `
      <div class="fin-hist-col">
        <div class="fin-hist-bar" style="height:${Math.max(pct, 3)}%;background:${isCur ? 'var(--color-green)' : '#D8D2C2'}"></div>
        <span class="fin-hist-lbl" style="color:${isCur ? 'var(--color-green)' : 'var(--color-text-tertiary)'};font-weight:${isCur ? '700' : '600'}">${MON[m.getMonth()]}</span>
      </div>
    `;
  }).join('');
  const prev5 = totals.slice(0, 5).filter(v => v > 0);
  const avg   = prev5.length ? prev5.reduce((a, b) => a + b, 0) / prev5.length : 0;
  return `
    <div class="fin-hist-wrap">${bars}</div>
    <div class="fin-hist-footer">
      <span>Média 5m: R$&nbsp;${finFmt(avg)}</span>
      <span>${MON[financeMonth.getMonth()]}: R$&nbsp;${finFmt(totals[5])}</span>
    </div>
  `;
}

// --- Lançamentos ---
function renderFinanceLancamentos(summary, cats) {
  const allTxns = [...financeState.transactions]
    .filter(t => {
      const d = new Date(t.date + 'T12:00:00');
      return d.getFullYear() === financeMonth.getFullYear() && d.getMonth() === financeMonth.getMonth();
    });

  let filtered = allTxns;
  if (financeTxnTypeFilter !== 'all') filtered = filtered.filter(t => t.type === financeTxnTypeFilter);
  if (financeCatFilter) filtered = filtered.filter(t => t.categoryId === financeCatFilter);
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const groups = {};
  filtered.forEach(t => { if (!groups[t.date]) groups[t.date] = []; groups[t.date].push(t); });

  const typeFilterHtml = ['all','expense','income'].map((k, _, arr) => {
    const labels = { all: 'Todos', expense: 'Gastos', income: 'Receitas' };
    return `<button class="fin-filter-pill ${financeTxnTypeFilter === k ? 'active' : ''}" data-fin-type-filter="${k}">${labels[k]}</button>`;
  }).join('');

  const catFilterHtml = cats.map(c =>
    `<button class="fin-filter-pill ${financeCatFilter === c.id ? 'active' : ''}" data-fin-cat-filter="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(c.name)}</button>`
  ).join('');

  const txnGroupHtml = Object.keys(groups).sort((a,b) => b.localeCompare(a)).map(date => {
    const items = groups[date].map(t => {
      const cat    = cats.find(c => c.id === t.categoryId);
      const wallet = financeState.wallets.find(w => w.id === t.walletId);
      const sign = t.type === 'expense' ? '−' : '+';
      const cls  = t.type === 'expense' ? 'out' : 'in';
      const metaParts = [t.nature === 'fixed' ? 'fixo · mensal' : 'variável'];
      if (wallet) metaParts.push(`${escapeHtml(wallet.icon)} ${escapeHtml(wallet.name)}`);
      return `
        <div class="fin-txn-full">
          ${cat
            ? `<span class="fin-cat-badge fin-c-${escapeHtml(cat.color)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</span>`
            : t.type === 'income'
              ? `<span class="fin-cat-badge fin-c-green">💰 Receita</span>`
              : `<span class="fin-cat-badge fin-c-gray">Sem categoria</span>`}
          <div class="fin-txn-info">
            <div class="fin-txn-name">${escapeHtml(t.description)}</div>
            <div class="fin-txn-meta">${metaParts.join(' · ')}</div>
          </div>
          <div class="fin-txn-amt ${cls}">${sign}&nbsp;R$&nbsp;${finFmt(t.amount)}</div>
          <button class="fin-txn-edit" data-edit-txn="${t.id}" title="Editar">✎</button>
          <button class="fin-txn-del" data-del-txn="${t.id}" title="Excluir">×</button>
        </div>
      `;
    }).join('');
    return `<div class="fin-date-label">${finFmtDateFull(date)}</div>${items}`;
  }).join('') || '<div class="fin-empty">Nenhuma transação neste mês.</div>';

  return `
    <div class="fin-lancamentos-header">
      <div>
        <div class="fin-view-title">Lançamentos — ${MONTH_NAMES[financeMonth.getMonth()]} ${financeMonth.getFullYear()}</div>
        <div class="fin-view-sub">${allTxns.length} transaç${allTxns.length === 1 ? 'ão' : 'ões'}</div>
      </div>
      <button class="fin-btn-brand" id="finLancarBtnInline">+ Lançar</button>
    </div>
    <div class="fin-filter-row">
      <span class="fin-filter-label">Filtrar:</span>
      ${typeFilterHtml}
      <div style="flex:1"></div>
      ${catFilterHtml}
    </div>
    <div class="fin-txn-list">${txnGroupHtml}</div>
  `;
}

// --- Envelopes ---
function renderFinanceEnvelopes(summary, cats) {
  const monthTxns = summary.txns.filter(t => t.type === 'expense');
  const visibleEnvs = financeState.envelopes
    .filter(e => finEnvVisibleInMonth(e, financeMonth))
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const openBudget = visibleEnvs.filter(e => e.status !== 'closed' && e.kind !== 'sub').reduce((s, e) => s + finEnvBudget(e), 0);
  const envTxnIds = new Set(financeState.envelopes.map(e => e.id));
  const contextual = monthTxns.filter(t => t.envelopeId && envTxnIds.has(t.envelopeId));
  const avulsos = monthTxns.filter(t => !t.envelopeId || !envTxnIds.has(t.envelopeId));
  const contextPct = monthTxns.length ? Math.round((contextual.reduce((s, t) => s + Number(t.amount), 0) / summary.expense) * 100) : 0;
  const envSpent = contextual.reduce((s, t) => s + Number(t.amount), 0);
  const avulsoTotal = avulsos.reduce((s, t) => s + Number(t.amount), 0);
  const budgetPct = openBudget > 0 ? Math.min(100, Math.round((envSpent / openBudget) * 100)) : 0;

  const groups = [];
  finEnvTypes().forEach(type => {
    const items = visibleEnvs.filter(e => e.kind === 'event' && e.eventType === type.name && !e.parentId);
    if (items.length) groups.push({ id: type.name, label: type.name, icon: type.icon, color: type.color, envs: items });
  });
  const recurringTemplates = visibleEnvs.filter(e => e.kind === 'recurring');
  if (recurringTemplates.length) {
    const instances = visibleEnvs.filter(e => e.parentId && recurringTemplates.some(t => t.id === e.parentId));
    groups.push({ id: 'Recorrentes', label: 'Recorrentes', icon: '🔁', color: 'green', envs: instances.length ? instances : recurringTemplates });
  }
  const projects = visibleEnvs.filter(e => e.kind === 'project');
  if (projects.length) groups.push({ id: 'Projetos', label: 'Projetos', icon: '🧩', color: 'purple', envs: projects });
  groups.push({ id: 'Avulsos', label: 'Avulsos', icon: '•', color: 'gray', envs: [], avulsos });

  const groupHtml = groups.map(group => renderFinanceEnvelopeGroup(group, avulsos)).join('');
  const byTypeRows = groups.filter(g => g.id !== 'Avulsos').map(group => {
    const spent = group.envs.reduce((s, env) => s + finEnvSpent(env, financeMonth), 0);
    return `
      <div class="fin-env-total-row">
        <span class="fin-env-total-name"><span class="fin-cat-badge fin-c-${escapeHtml(group.color)}">${escapeHtml(group.icon)} ${escapeHtml(group.label)}</span></span>
        <span class="fin-env-total-val">R$&nbsp;${finFmt(spent)}</span>
      </div>
    `;
  }).join('');

  const tips = [];
  if (contextPct < 60 && summary.expense > 0) tips.push({ tone: 'warn', icon: '📍', text: `Só <strong>${contextPct}%</strong> dos gastos do mês têm contexto. Comece pelos avulsos maiores.` });
  const over = visibleEnvs.find(e => finEnvProgress(e, financeMonth).pctRaw >= 100 && e.kind !== 'sub');
  if (over) tips.push({ tone: 'alert', icon: '!', text: `<strong>${escapeHtml(over.name)}</strong> passou do orçamento.` });
  const closeable = visibleEnvs.find(e => e.status === 'open' && e.periodEnd && e.periodEnd < toKey(new Date()));
  if (closeable) tips.push({ tone: 'info', icon: '✓', text: `<strong>${escapeHtml(closeable.name)}</strong> já terminou e pode ser encerrado.` });
  if (!tips.length) tips.push({ tone: 'ok', icon: '✓', text: 'Envelopes ajudam a responder quanto custaram seus eventos, hábitos e projetos.' });

  return `
    <div class="fin-bud-kpi-grid">
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Orçado · envelopes abertos</div>
        <div class="fin-kpi-value">R$&nbsp;${finFmt(openBudget)}</div>
        <div class="fin-kpi-sub">${visibleEnvs.filter(e => e.status !== 'closed' && e.kind !== 'sub').length} envelopes ativos em ${MONTH_NAMES[financeMonth.getMonth()].toLowerCase()}</div>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Realizado no mês</div>
        <div class="fin-kpi-value">R$&nbsp;${finFmt(envSpent)}</div>
        <div class="fin-kpi-sub">${budgetPct}% do orçado · ${summary.dayOfMonth} dias</div>
        <div class="fin-kpi-bar"><div class="fin-kpi-bar-fill" style="width:${budgetPct}%;background:${budgetPct >= 100 ? 'var(--color-terracotta)' : budgetPct >= 75 ? '#C07C30' : 'var(--color-green)'}"></div></div>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Avulsos do mês</div>
        <div class="fin-kpi-value" style="color:var(--color-text-secondary)">R$&nbsp;${finFmt(avulsoTotal)}</div>
        <div class="fin-kpi-sub">gastos sem envelope</div>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Gastos com contexto</div>
        <div class="fin-kpi-value" style="color:var(--color-green)">${contextPct}%</div>
        <div class="fin-kpi-sub">dos gastos de ${MONTH_NAMES[financeMonth.getMonth()].toLowerCase()} têm envelope</div>
        <div class="fin-kpi-bar"><div class="fin-kpi-bar-fill" style="width:${contextPct}%;background:var(--color-green)"></div></div>
      </div>
    </div>
    ${visibleEnvs.length === 0 && avulsos.length === 0 ? `
      <div class="fin-env-empty">
        <div class="fin-env-empty-art">✉️</div>
        <div class="fin-env-empty-title">Envelopes dão contexto aos seus gastos</div>
        <div class="fin-env-empty-sub">Crie um envelope para uma viagem, hábito semanal ou projeto e associe gastos no lançamento.</div>
        <button class="fin-btn-brand" data-env-new="">+ Novo envelope</button>
        <div class="fin-env-suggestions">
          <button data-env-new="Rotina">🍱 Marmita da semana</button>
          <button data-env-new="Viagem">✈️ Próxima viagem</button>
          <button data-env-new="Social">🎂 Aniversário</button>
        </div>
      </div>
    ` : `
      <div class="fin-bud-body">
        <div class="fin-bud-left">
          ${groupHtml}
          <button class="fin-bud-add-cat-btn" data-env-new="">
            <span style="font-size:16px">+</span> Novo envelope
          </button>
        </div>
        <div class="fin-bud-right">
          <div class="fin-section">
            <div class="fin-section-head">
              <span class="fin-section-title">Resumo por tipo</span>
              <span class="fin-section-sub">${MONTH_NAMES[financeMonth.getMonth()]} ${financeMonth.getFullYear()}</span>
            </div>
            <div class="fin-section-body" style="padding-top:8px;padding-bottom:8px">
              ${byTypeRows || '<div class="fin-empty">Nenhum envelope com gasto no mês.</div>'}
              <div class="fin-env-total-row" style="font-weight:700">
                <span class="fin-env-total-name">Avulsos</span>
                <span class="fin-env-total-val">R$&nbsp;${finFmt(avulsoTotal)}</span>
              </div>
            </div>
          </div>
          <div class="fin-section">
            <div class="fin-section-head"><span class="fin-section-title">Dicas</span></div>
            <div class="fin-section-body" style="padding-top:8px;padding-bottom:8px">
              ${tips.map(t => `<div class="fin-env-tip ${t.tone}"><span>${escapeHtml(t.icon)}</span><div>${t.text}</div></div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    `}
  `;
}

function renderFinanceEnvelopeGroup(group) {
  const isAvulso = group.id === 'Avulsos';
  const spent = isAvulso
    ? group.avulsos.reduce((s, t) => s + Number(t.amount || 0), 0)
    : group.envs.reduce((s, env) => s + finEnvSpent(env, financeMonth), 0);
  const budget = isAvulso ? 0 : group.envs.reduce((s, env) => s + finEnvBudget(env), 0);
  const pctRaw = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const pct = Math.min(100, pctRaw);
  const barColor = pctRaw >= 100 ? 'var(--color-terracotta)' : pctRaw >= 75 ? '#C07C30' : finCatBarColor(group.color);
  const cls = pctRaw >= 100 ? 'fin-over' : pctRaw >= 75 ? 'fin-warn' : '';
  const expanded = finEnvExpandedTypes.has(group.id);
  const rows = isAvulso ? renderFinanceAvulsoRows(group.avulsos) : group.envs.map(env => renderFinanceEnvelopeRow(env)).join('');
  const closedCount = financeState.envelopes.filter(e => e.status === 'closed' && (e.eventType === group.id || group.id === 'Projetos' && e.kind === 'project')).length;
  return `
    <div class="fin-bud-cat-card fin-env-card">
      <div class="fin-bud-cat-header ${expanded ? 'expanded' : ''}" data-env-toggle="${escapeHtml(group.id)}">
        <span class="fin-cat-badge fin-c-${escapeHtml(group.color)}">${escapeHtml(group.icon)} ${escapeHtml(group.label)}</span>
        <div class="fin-bud-cat-info">
          <div class="fin-bud-progress-row">
            <div class="fin-cat-bar-wrap" style="flex:1"><div class="fin-cat-bar" style="width:${pct || (spent > 0 ? 2 : 0)}%;background:${barColor}"></div></div>
            <span class="fin-bud-pct ${cls}">${budget ? pctRaw + '%' : '–'}</span>
          </div>
        </div>
        <span class="fin-env-count">${isAvulso ? `${group.avulsos.length} gastos` : `${group.envs.length} envelope${group.envs.length === 1 ? '' : 's'}`}</span>
        <div class="fin-bud-amounts">
          <span class="fin-bud-spent ${cls}">R$&nbsp;${finFmt(spent)}</span>
          ${budget ? `<span class="fin-bud-of">/ R$&nbsp;${finFmt(budget)}</span>` : ''}
        </div>
        <span class="fin-bud-expand-icon ${expanded ? 'open' : ''}">›</span>
      </div>
      ${expanded ? `
        <div class="fin-bud-fixed-list">
          <div class="fin-bud-fixed-head">${isAvulso ? 'Gastos avulsos' : 'Envelopes'}</div>
          ${rows || `<div class="fin-empty" style="padding:6px 0;text-align:left">Nada por aqui neste mês.</div>`}
          ${!isAvulso ? `<button class="fin-bud-add-fixed-btn" data-env-new="${escapeHtml(group.id)}"><span>+</span> Novo envelope em ${escapeHtml(group.label)}</button>` : ''}
          ${closedCount ? `<button class="fin-env-archive-link" type="button">ver arquivo (${closedCount} encerrados)</button>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

function renderFinanceEnvelopeRow(env, sub = false) {
  const p = finEnvProgress(env, financeMonth);
  const children = env.kind === 'project'
    ? financeState.envelopes.filter(e => e.parentId === env.id && e.kind === 'sub').map(e => renderFinanceEnvelopeRow(e, true)).join('')
    : '';
  return `
    <div class="fin-env-row ${sub ? 'sub' : ''} ${env.status === 'closed' ? 'closed' : ''}" data-env-open="${escapeHtml(env.id)}">
      <span class="fin-env-icon">${escapeHtml(env.icon || '✉️')}</span>
      <div class="fin-env-row-info">
        <div class="fin-env-row-name">${escapeHtml(env.name)}</div>
        <div class="fin-env-row-meta">${escapeHtml(finEnvPeriodLabel(env))} · ${escapeHtml(finEnvPaceText(env, p))}</div>
      </div>
      <div class="fin-env-row-bar"><div style="width:${p.pct || (p.spent > 0 ? 2 : 0)}%;background:${p.color}"></div></div>
      <div class="fin-bud-amounts">
        <span class="fin-bud-spent ${p.cls}" style="font-size:12px">R$&nbsp;${finFmt(p.spent)}</span>
        ${p.budget ? `<span class="fin-bud-of">/ ${finFmt(p.budget)}</span>` : ''}
      </div>
      <span class="fin-env-row-chevron">›</span>
    </div>
    ${children}
  `;
}

function renderFinanceAvulsoRows(avulsos) {
  return avulsos.sort((a, b) => b.date.localeCompare(a.date)).map(t => {
    const cat = financeState.categories.find(c => c.id === t.categoryId);
    return `
      <div class="fin-env-row">
        <span class="fin-env-icon">${cat ? escapeHtml(cat.icon) : '•'}</span>
        <div class="fin-env-row-info">
          <div class="fin-env-row-name">${escapeHtml(t.description)}</div>
          <div class="fin-env-row-meta">${finFmtDate(t.date)}${cat ? ` · ${escapeHtml(cat.name)}` : ''}</div>
        </div>
        <span class="fin-txn-amt out">− R$&nbsp;${finFmt(t.amount)}</span>
        <button class="fin-env-assign" data-env-assign-txn="${escapeHtml(t.id)}">+ envelope</button>
      </div>
    `;
  }).join('');
}

// --- Planejamento do Mês ---
function renderFinancePlanejamento(summary, cats) {
  const { byCat, dayOfMonth, daysInMonth, income } = summary;

  // KPI calculations
  const totalBudget = cats.reduce((s, c) => s + (c.monthlyLimit || 0), 0);
  const totalFixed  = financeState.budgetItems.reduce((s, i) => s + Number(i.amount), 0);
  const totalSpent  = Object.values(byCat).reduce((s, v) => s + v, 0);
  const available   = totalBudget - totalSpent;
  const pctFixed    = totalBudget > 0 ? Math.min(100, Math.round((totalFixed  / totalBudget) * 100)) : 0;
  const pctSpent    = totalBudget > 0 ? Math.min(100, Math.round((totalSpent  / totalBudget) * 100)) : 0;
  const daysLeft    = daysInMonth - dayOfMonth;

  const kpiHtml = `
    <div class="fin-bud-kpi-grid">
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Orçamento total</div>
        <div class="fin-kpi-value">${totalBudget > 0 ? `R$&nbsp;${finFmt(totalBudget)}` : '<span style="color:var(--color-text-tertiary);font-size:16px">–</span>'}</div>
        <div class="fin-kpi-sub">soma de todas as categorias</div>
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Gastos fixos planejados</div>
        <div class="fin-kpi-value">R$&nbsp;${finFmt(totalFixed)}</div>
        ${totalBudget > 0 ? `<div class="fin-kpi-sub">${pctFixed}% do orçamento</div>
        <div class="fin-kpi-bar"><div class="fin-kpi-bar-fill" style="width:${pctFixed}%;background:var(--color-blue)"></div></div>` : ''}
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Gasto até agora</div>
        <div class="fin-kpi-value" style="color:${pctSpent >= 90 ? 'var(--color-terracotta)' : pctSpent >= 70 ? '#C07C30' : 'var(--color-text)'}">R$&nbsp;${finFmt(totalSpent)}</div>
        ${totalBudget > 0 ? `<div class="fin-kpi-sub">${pctSpent}% do orçamento · ${dayOfMonth} dias</div>
        <div class="fin-kpi-bar"><div class="fin-kpi-bar-fill" style="width:${pctSpent}%;background:${pctSpent >= 90 ? 'var(--color-terracotta)' : '#C07C30'}"></div></div>` : `<div class="fin-kpi-sub">${dayOfMonth} dias do mês</div>`}
      </div>
      <div class="fin-kpi-card">
        <div class="fin-kpi-label">Disponível restante</div>
        <div class="fin-kpi-value" style="color:${available >= 0 ? 'var(--color-green)' : 'var(--color-terracotta)'}">R$&nbsp;${finFmt(Math.abs(available))}</div>
        <div class="fin-kpi-sub">${available >= 0 ? `para os próximos ${daysLeft} dias` : 'acima do orçamento'}</div>
      </div>
    </div>
  `;

  // Category cards
  const catCards = cats.map(cat => {
    const spent    = byCat[cat.id] || 0;
    const limit    = cat.monthlyLimit;
    const pct      = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const barClr   = pct >= 100 ? 'var(--color-terracotta)' : pct >= 75 ? '#C07C30' : finCatBarColor(cat.color);
    const spentCls = pct >= 100 ? 'fin-over' : pct >= 75 ? 'fin-warn' : '';
    const pctCls   = pct >= 100 ? 'fin-over' : pct >= 75 ? 'fin-warn' : '';
    const isExpanded = finPlanExpandedCats.has(cat.id);

    const items = financeState.budgetItems
      .filter(i => i.categoryId === cat.id)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const itemsHtml = items.length
      ? items.map(item => `
          <div class="fin-bud-fixed-item">
            <span class="fin-bud-fixed-icon">${escapeHtml(item.icon || '📌')}</span>
            <span class="fin-bud-fixed-name">${escapeHtml(item.description)}</span>
            <input type="number" class="fin-bud-fixed-amt" data-item-id="${item.id}" value="${Number(item.amount)}" min="0" step="0.01">
            <button class="fin-bud-fixed-del" data-del-budget-item="${item.id}" title="Remover">×</button>
          </div>
        `).join('')
      : `<div class="fin-empty" style="padding:6px 0;font-size:11.5px;text-align:left">Nenhum gasto fixo cadastrado.</div>`;

    return `
      <div class="fin-bud-cat-card">
        <div class="fin-bud-cat-header ${isExpanded ? 'expanded' : ''}" data-toggle-cat="${cat.id}">
          <span class="fin-cat-badge fin-c-${escapeHtml(cat.color)}">${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}</span>
          <div class="fin-bud-cat-info">
            <div class="fin-bud-progress-row">
              <div class="fin-cat-bar-wrap" style="flex:1">
                <div class="fin-cat-bar" style="width:${pct}%;background:${barClr}"></div>
              </div>
              <span class="fin-bud-pct ${pctCls}">${limit ? pct + '%' : '–'}</span>
            </div>
          </div>
          <div class="fin-bud-amounts">
            <span class="fin-bud-spent ${spentCls}">R$&nbsp;${finFmt(spent)}</span>
            <span class="fin-bud-of">/</span>
            ${limit !== null && limit !== undefined
              ? `<input type="number" class="fin-bud-limit-input" data-cat-limit="${cat.id}" value="${Number(limit)}" min="0" step="0.01" title="Editar orçamento">`
              : `<button class="fin-bud-no-limit" data-set-limit="${cat.id}">sem limite</button>`
            }
          </div>
          <span class="fin-bud-expand-icon ${isExpanded ? 'open' : ''}">›</span>
        </div>
        ${isExpanded ? `
          <div class="fin-bud-fixed-list">
            <div class="fin-bud-fixed-head">Gastos fixos mensais</div>
            ${itemsHtml}
            <button class="fin-bud-add-fixed-btn" data-add-fixed-cat="${cat.id}">
              <span>+</span> Adicionar gasto fixo
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  // Right panel: summary
  const catsWithLimit = cats.filter(c => c.monthlyLimit);
  const summaryRowsHtml = catsWithLimit.length
    ? catsWithLimit.map(cat => `
        <div class="fin-bud-total-row">
          <span class="fin-bud-total-name"><span>${escapeHtml(cat.icon)}</span> ${escapeHtml(cat.name)}</span>
          <span class="fin-bud-total-val">R$&nbsp;${finFmt(cat.monthlyLimit)}</span>
        </div>
      `).join('') + `
        <div style="height:1px;background:var(--color-border);margin:8px 0"></div>
        <div class="fin-bud-total-row" style="font-weight:700">
          <span class="fin-bud-total-name">Total planejado</span>
          <span class="fin-bud-total-val">R$&nbsp;${finFmt(totalBudget)}</span>
        </div>
        ${income > 0 ? `
          <div class="fin-bud-total-row">
            <span class="fin-bud-total-name" style="color:var(--color-text-secondary)">Receita do mês</span>
            <span class="fin-bud-total-val" style="color:var(--color-green)">R$&nbsp;${finFmt(income)}</span>
          </div>
          <div class="fin-bud-total-row" style="font-weight:700;border-bottom:none">
            <span class="fin-bud-total-name">Sobra prevista</span>
            <span class="fin-bud-total-val" style="color:${income - totalBudget >= 0 ? 'var(--color-green)' : 'var(--color-terracotta)'}">R$&nbsp;${finFmt(Math.abs(income - totalBudget))}</span>
          </div>
        ` : ''}
      `
    : `<div class="fin-empty">Defina orçamentos para ver o resumo.</div>`;

  // Right panel: fixed items
  const allFixed = financeState.budgetItems.map(item => {
    const cat = cats.find(c => c.id === item.categoryId);
    return { ...item, catName: cat ? cat.name : '' };
  }).sort((a, b) => Number(b.amount) - Number(a.amount));

  const fixedRowsHtml = allFixed.length
    ? allFixed.map(item => `
        <div class="fin-bud-total-row">
          <span class="fin-bud-total-name">${escapeHtml(item.icon || '📌')} ${escapeHtml(item.description)}</span>
          <span class="fin-bud-total-val">R$&nbsp;${finFmt(item.amount)}</span>
        </div>
      `).join('')
    : `<div class="fin-empty">Nenhum gasto fixo cadastrado ainda.</div>`;

  // Tips
  const tips = [];
  if (totalBudget > 0 && income > 0) {
    const sobra = income - totalBudget;
    if (sobra > 0) tips.push({ bg: 'var(--color-green-soft)', icon: '✅', text: `Com a receita atual, você tem <strong>R$&nbsp;${finFmt(sobra)}</strong> de sobra sobre o orçamento.` });
    else           tips.push({ bg: '#FDECEA',                 icon: '⚠️', text: `O orçamento planejado supera a receita em <strong>R$&nbsp;${finFmt(Math.abs(sobra))}</strong>.` });
  }
  if (totalBudget > 0 && pctFixed > 50) {
    tips.push({ bg: '#E7EEFB', icon: '📊', text: `Fixos representam <strong>${pctFixed}%</strong> do orçamento. Recomendado: menos de 50%.` });
  }
  if (daysLeft > 0 && totalBudget > 0 && available > 0) {
    tips.push({ bg: '#FEF2E4', icon: '💡', text: `Você tem <strong>R$&nbsp;${finFmt(Math.round(available / daysLeft))}/dia</strong> disponíveis até o fim do mês.` });
  }
  if (tips.length === 0) {
    tips.push({ bg: '#EEEBE4', icon: '📋', text: 'Defina orçamentos por categoria e cadastre gastos fixos para ver dicas de planejamento.' });
  }
  const tipsHtml = tips.slice(0, 3).map(t => `
    <div class="fin-bud-tip">
      <div class="fin-bud-tip-icon" style="background:${t.bg}">${t.icon}</div>
      <div class="fin-insight-text">${t.text}</div>
    </div>
  `).join('');

  return `
    ${kpiHtml}
    <div class="fin-bud-body">
      <div class="fin-bud-left">
        ${catCards}
        <button class="fin-bud-add-cat-btn" id="finAddCatBtn">
          <span style="font-size:16px">+</span> Nova categoria
        </button>
      </div>
      <div class="fin-bud-right">
        <div class="fin-section">
          <div class="fin-section-head">
            <span class="fin-section-title">Resumo</span>
            <span class="fin-section-sub">${MONTH_NAMES[financeMonth.getMonth()]} ${financeMonth.getFullYear()}</span>
          </div>
          <div class="fin-section-body" style="padding-top:8px;padding-bottom:8px">
            ${summaryRowsHtml}
          </div>
        </div>
        ${allFixed.length > 0 ? `
          <div class="fin-section">
            <div class="fin-section-head">
              <span class="fin-section-title">Fixos do mês</span>
              <span class="fin-section-sub">R$&nbsp;${finFmt(totalFixed)}</span>
            </div>
            <div class="fin-section-body" style="padding-top:8px;padding-bottom:8px">
              ${fixedRowsHtml}
            </div>
          </div>
        ` : ''}
        <div class="fin-section">
          <div class="fin-section-head"><span class="fin-section-title">Dicas</span></div>
          <div class="fin-section-body" style="padding-top:8px;padding-bottom:8px">
            ${tipsHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// --- Planejados ---
function renderFinancePlanejados(summary) {
  const { projSavings } = summary;
  const purchases = [...financeState.plannedPurchases].sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 };
    return (o[a.priority] || 1) - (o[b.priority] || 1);
  });
  const totalTarget = purchases.reduce((s, p) => s + Number(p.targetAmount), 0);
  const safeProj = Math.max(projSavings, 0);

  const summaryHtml = projSavings > 0 && purchases.length > 0 ? `
    <div class="fin-plan-summary">
      <div>
        <div class="fin-plan-summary-label">Meta total</div>
        <div class="fin-plan-summary-value">R$&nbsp;${finFmt(totalTarget)}</div>
      </div>
      <div class="fin-plan-summary-sep"></div>
      <div>
        <div class="fin-plan-summary-label">Tempo estimado</div>
        <div class="fin-plan-summary-value">~${projSavings > 0 ? (totalTarget / projSavings).toFixed(1) : '—'} meses</div>
      </div>
      <div style="flex:1"></div>
      <div class="fin-plan-summary-hint">Economia projetada: <strong>R$&nbsp;${finFmt(projSavings)}/mês</strong></div>
    </div>
  ` : '';

  const pLabel = { high: 'alta', medium: 'média', low: 'baixa' };
  const pClass = { high: 'fin-p-high', medium: 'fin-p-mid', low: 'fin-p-low' };

  const cardsHtml = purchases.map(p => {
    const pct = p.targetAmount > 0 ? Math.min(100, Math.round((p.savedAmount / p.targetAmount) * 100)) : 0;
    const months = safeProj > 0 ? ((p.targetAmount - p.savedAmount) / safeProj).toFixed(1) : '—';
    return `
      <div class="fin-plan-card">
        <div class="fin-plan-card-top">
          <span class="fin-priority ${pClass[p.priority] || 'fin-p-mid'}">${(pLabel[p.priority] || 'média')} prioridade</span>
          ${p.categoryLabel ? `<span class="fin-plan-cat">${escapeHtml(p.categoryLabel)}</span>` : ''}
          <button class="fin-plan-del" data-del-purchase="${p.id}" title="Excluir">×</button>
        </div>
        <div class="fin-plan-name">${escapeHtml(p.name)}</div>
        <div class="fin-plan-value">R$&nbsp;${finFmt(p.targetAmount)}</div>
        ${p.description ? `<div class="fin-plan-desc">${escapeHtml(p.description)}</div>` : ''}
        <div class="fin-plan-bar-wrap"><div class="fin-plan-bar" style="width:${pct}%"></div></div>
        <div class="fin-plan-months">💡 ~${months} meses de economia${p.savedAmount > 0 ? ` · R$&nbsp;${finFmt(p.savedAmount)} guardados` : ''}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="fin-planejados-header">
      <div>
        <div class="fin-view-title">Compras planejadas</div>
        <div class="fin-view-sub">Economia projetada: ~R$&nbsp;${finFmt(safeProj)}/mês</div>
      </div>
      <button class="fin-btn-brand" id="finAddPurchaseBtn">+ Adicionar</button>
    </div>
    ${summaryHtml}
    <div class="fin-plan-grid">
      ${cardsHtml}
      <button class="fin-plan-add-btn" id="finAddPurchaseBtnGrid">
        <span style="font-size:20px">+</span>
        <span>Adicionar compra planejada</span>
      </button>
    </div>
  `;
}

// --- Modal de transação ---
function openFinTransactionModal(txn) {
  finEditingTxnId       = txn ? txn.id : null;
  finTransactionType    = txn ? txn.type : 'expense';
  finTransactionNature  = txn ? txn.nature : 'variable';
  finTransactionCatId   = txn ? txn.categoryId : null;
  finTransactionWalletId = txn ? txn.walletId : null;
  finTransactionEnvelopeId = txn ? txn.envelopeId || null : null;
  renderFinTransactionModal();
  document.getElementById('finTransactionModal').classList.remove('hidden');
  document.getElementById('finTxnDate').value   = txn ? txn.date : toKey(new Date());
  document.getElementById('finTxnDesc').value   = txn ? txn.description : '';
  document.getElementById('finTxnAmount').value = txn ? txn.amount : '';
  document.getElementById('finTxnDesc').focus();
}

function renderFinTransactionModal() {
  document.getElementById('finModalTitle').textContent = finEditingTxnId ? 'Editar lançamento' : 'Novo lançamento';

  // Type tabs
  document.querySelectorAll('#finTypeTabs .fin-type-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === finTransactionType);
  });

  // Category pills
  const isCatVisible = finTransactionType === 'expense';
  document.getElementById('finCatField').style.display   = isCatVisible ? '' : 'none';
  document.getElementById('finNatureField').style.display = isCatVisible ? '' : 'none';
  const envField = document.getElementById('finEnvelopeField');
  if (envField) envField.style.display = isCatVisible ? '' : 'none';

  const catPills = document.getElementById('finCatPills');
  if (catPills) {
    catPills.innerHTML = financeState.categories.map(c => `
      <button type="button" class="fin-cat-pill ${finTransactionCatId === c.id ? 'selected' : ''}" data-cat="${c.id}">
        ${escapeHtml(c.icon)} ${escapeHtml(c.name)}
      </button>
    `).join('');
    catPills.querySelectorAll('.fin-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        finTransactionCatId = finTransactionCatId === btn.dataset.cat ? null : btn.dataset.cat;
        renderFinTransactionModal();
      });
    });
  }

  const envelopePills = document.getElementById('finEnvelopePills');
  if (envelopePills) {
    const date = document.getElementById('finTxnDate')?.value || toKey(new Date());
    const envs = finOpenEnvelopesForDate(date);
    envelopePills.innerHTML = envs.length
      ? envs.map(env => {
          const parent = env.parentId ? financeState.envelopes.find(e => e.id === env.parentId) : null;
          const label = parent && parent.kind === 'project' ? `${parent.name} › ${env.name}` : env.name;
          return `<button type="button" class="fin-cat-pill ${finTransactionEnvelopeId === env.id ? 'selected' : ''}" data-envelope="${env.id}">${escapeHtml(env.icon || '✉️')} ${escapeHtml(label)}</button>`;
        }).join('')
      : '<span class="fin-env-modal-empty">Nenhum envelope aberto cobre esta data.</span>';
    envelopePills.querySelectorAll('.fin-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        finTransactionEnvelopeId = finTransactionEnvelopeId === btn.dataset.envelope ? null : btn.dataset.envelope;
        renderFinTransactionModal();
      });
    });
  }

  // Nature buttons
  document.querySelectorAll('.fin-nature-btn[data-nature]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nature === finTransactionNature);
  });

  // Wallet pills
  const walletField = document.getElementById('finWalletField');
  if (walletField) walletField.style.display = financeState.wallets.length > 0 ? '' : 'none';
  const walletPills = document.getElementById('finWalletPills');
  if (walletPills) {
    walletPills.innerHTML = financeState.wallets.map(w => `
      <button type="button" class="fin-cat-pill ${finTransactionWalletId === w.id ? 'selected' : ''}" data-wallet="${w.id}">
        ${escapeHtml(w.icon)} ${escapeHtml(w.name)}
      </button>
    `).join('');
    walletPills.querySelectorAll('.fin-cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        finTransactionWalletId = finTransactionWalletId === btn.dataset.wallet ? null : btn.dataset.wallet;
        renderFinTransactionModal();
      });
    });
  }
}

function saveFinTransaction() {
  const desc   = document.getElementById('finTxnDesc').value.trim();
  const amount = parseFloat(document.getElementById('finTxnAmount').value);
  const date   = document.getElementById('finTxnDate').value;

  if (!desc)        { alert('Informe a descrição.'); return; }
  if (!amount || amount <= 0) { alert('Informe um valor válido.'); return; }
  if (!date)        { alert('Informe a data.'); return; }

  const txnData = {
    type:        finTransactionType,
    nature:      finTransactionType === 'expense' ? finTransactionNature : 'variable',
    description: desc,
    amount:      amount,
    date:        date,
    categoryId:  finTransactionType === 'expense' ? finTransactionCatId : null,
    walletId:    finTransactionWalletId,
    envelopeId:  finTransactionType === 'expense' ? finTransactionEnvelopeId : null,
  };

  if (finEditingTxnId) {
    const idx = financeState.transactions.findIndex(t => t.id === finEditingTxnId);
    if (idx !== -1) financeState.transactions[idx] = { ...financeState.transactions[idx], ...txnData };
  } else {
    financeState.transactions.push({ id: uid(), ...txnData });
  }

  finEditingTxnId = null;
  saveFinance();
  document.getElementById('finTransactionModal').classList.add('hidden');
  renderFinanceView();
}

// --- Modal de compra planejada ---
function openFinPurchaseModal() {
  finPurchasePriority = 'medium';
  document.getElementById('finPurchaseName').value     = '';
  document.getElementById('finPurchaseTarget').value   = '';
  document.getElementById('finPurchaseSaved').value    = '';
  document.getElementById('finPurchaseCatLabel').value = '';
  document.getElementById('finPurchaseDesc').value     = '';
  document.querySelectorAll('.fin-nature-btn[data-priority]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.priority === 'medium');
  });
  document.getElementById('finPurchaseModal').classList.remove('hidden');
  document.getElementById('finPurchaseName').focus();
}

function saveFinPurchase() {
  const name   = document.getElementById('finPurchaseName').value.trim();
  const target = parseFloat(document.getElementById('finPurchaseTarget').value) || 0;
  const saved  = parseFloat(document.getElementById('finPurchaseSaved').value)  || 0;
  const cat    = document.getElementById('finPurchaseCatLabel').value.trim();
  const desc   = document.getElementById('finPurchaseDesc').value.trim();

  if (!name)         { alert('Informe o nome da compra.'); return; }
  if (target <= 0)   { alert('Informe um valor alvo.'); return; }

  financeState.plannedPurchases.push({
    id:            uid(),
    name:          name,
    description:   desc || null,
    targetAmount:  target,
    savedAmount:   saved,
    priority:      finPurchasePriority,
    categoryLabel: cat || null,
    createdAt:     Date.now(),
  });

  saveFinance();
  document.getElementById('finPurchaseModal').classList.add('hidden');
  financeTab = 'planejados';
  renderFinanceView();
}

// --- Modal e drawer de envelopes ---
function openFinEnvelopeModal(typeName = null, env = null) {
  const meta = finEnvTypeMeta(env?.eventType || typeName || finEnvDraftEventType);
  finEnvEditingId = env ? env.id : null;
  finEnvDraftKind = env ? env.kind : 'event';
  finEnvDraftEventType = meta.name;
  finEnvDraftColor = env?.color || meta.color || 'gray';
  document.querySelector('#finEnvelopeModal h2').textContent = env ? 'Editar envelope' : 'Novo envelope';
  document.getElementById('finEnvelopeSave').textContent = env ? 'Salvar alterações' : 'Criar envelope';
  document.getElementById('finEnvName').value = env?.name || '';
  document.getElementById('finEnvBudget').value = env?.budget || '';
  document.getElementById('finEnvStart').value = env?.periodStart || toKey(new Date(financeMonth.getFullYear(), financeMonth.getMonth(), 1));
  document.getElementById('finEnvEnd').value = env?.periodEnd || '';
  document.getElementById('finEnvSubRows').innerHTML = '';
  if (env?.kind === 'project') {
    const subs = financeState.envelopes.filter(e => e.parentId === env.id && e.kind === 'sub');
    document.getElementById('finEnvSubRows').innerHTML = subs.map(s => `
      <div class="fin-env-sub-row" data-sub-id="${escapeHtml(s.id)}"><input type="text" value="${escapeHtml(s.name)}" placeholder="Nome"><input type="number" min="0" step="0.01" value="${Number(s.budget || 0)}" placeholder="0,00"></div>
    `).join('');
  }
  renderFinEnvelopeModal();
  document.getElementById('finEnvelopeModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('finEnvName').focus(), 80);
}

function closeFinEnvelopeModal() {
  finEnvEditingId = null;
  document.getElementById('finEnvelopeModal').classList.add('hidden');
}

function renderFinEnvelopeModal() {
  document.querySelectorAll('[data-env-kind]').forEach(btn => btn.classList.toggle('active', btn.dataset.envKind === finEnvDraftKind));
  document.getElementById('finEnvEventFields').style.display = finEnvDraftKind === 'project' ? 'none' : '';
  document.getElementById('finEnvPeriodFields').style.display = finEnvDraftKind === 'event' ? 'flex' : 'none';
  document.getElementById('finEnvRecurrenceField').classList.toggle('hidden', finEnvDraftKind !== 'recurring');
  document.getElementById('finEnvSubField').classList.toggle('hidden', finEnvDraftKind !== 'project');
  document.getElementById('finEnvBudgetLabel').childNodes[0].nodeValue = finEnvDraftKind === 'recurring' ? 'Orçamento por ciclo (R$) ' : finEnvDraftKind === 'project' ? 'Orçamento total (R$) ' : 'Orçamento (R$) ';

  const typePills = document.getElementById('finEnvTypePills');
  typePills.innerHTML = finEnvTypes().map(t => `
    <button type="button" class="fin-cat-pill ${finEnvDraftEventType === t.name ? 'selected' : ''}" data-env-type="${escapeHtml(t.name)}">${escapeHtml(t.icon)} ${escapeHtml(t.name)}</button>
  `).join('') + '<button type="button" class="fin-cat-pill" data-env-new-type>+ novo tipo</button>';
  typePills.querySelectorAll('[data-env-type]').forEach(btn => {
    btn.addEventListener('click', () => {
      const meta = finEnvTypeMeta(btn.dataset.envType);
      finEnvDraftEventType = meta.name;
      finEnvDraftColor = meta.color;
      renderFinEnvelopeModal();
    });
  });
  const newTypeBtn = typePills.querySelector('[data-env-new-type]');
  if (newTypeBtn) newTypeBtn.addEventListener('click', () => {
    const name = prompt('Nome do novo tipo de evento:');
    if (!name || !name.trim()) return;
    const icon = prompt('Ícone do tipo:', '✉️') || '✉️';
    const type = { name: name.trim(), icon: icon.trim() || '✉️', color: finEnvDraftColor || 'gray' };
    financeState.envelopeEventTypes = [...(financeState.envelopeEventTypes || []), type];
    finEnvDraftEventType = type.name;
    finEnvDraftColor = type.color;
    saveFinance();
    renderFinEnvelopeModal();
  });

  document.querySelectorAll('#finEnvColorPicker .fin-color-opt').forEach(btn => btn.classList.toggle('selected', btn.dataset.color === finEnvDraftColor));
  if (finEnvDraftKind === 'project') renderFinEnvSubRows();
}

function renderFinEnvSubRows() {
  const wrap = document.getElementById('finEnvSubRows');
  if (!wrap.children.length) {
    wrap.innerHTML = `
      <div class="fin-env-sub-row"><input type="text" placeholder="Identidade visual"><input type="number" min="0" step="0.01" placeholder="0,00"></div>
      <div class="fin-env-sub-row"><input type="text" placeholder="Equipamento"><input type="number" min="0" step="0.01" placeholder="0,00"></div>
    `;
  }
}

function saveFinEnvelope() {
  const name = document.getElementById('finEnvName').value.trim();
  const budget = parseFloat(document.getElementById('finEnvBudget').value) || 0;
  if (!name) { document.getElementById('finEnvName').focus(); return; }
  if (budget <= 0) { alert('Informe um orçamento.'); return; }

  const existing = finEnvEditingId ? financeState.envelopes.find(e => e.id === finEnvEditingId) : null;
  const base = {
    ...(existing || {}),
    id: uid(),
    name,
    kind: finEnvDraftKind,
    eventType: finEnvDraftKind === 'project' ? null : finEnvDraftEventType,
    icon: finEnvDraftKind === 'project' ? '🧩' : finEnvTypeMeta(finEnvDraftEventType).icon,
    color: finEnvDraftColor,
    budget,
    periodStart: finEnvDraftKind === 'event' ? document.getElementById('finEnvStart').value || null : null,
    periodEnd: finEnvDraftKind === 'event' ? document.getElementById('finEnvEnd').value || null : null,
    status: 'open',
    parentId: null,
    recurrence: finEnvDraftKind === 'recurring'
      ? (document.querySelector('[data-env-recurrence].active')?.dataset.envRecurrence || 'weekly')
      : null,
    sortOrder: existing?.sortOrder ?? financeState.envelopes.length,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
  if (existing) {
    base.id = existing.id;
    Object.assign(existing, base);
  } else {
    financeState.envelopes.push(base);
  }

  if (finEnvDraftKind === 'project') {
    const seenSubIds = new Set();
    const rows = [...document.querySelectorAll('#finEnvSubRows .fin-env-sub-row')];
    rows.forEach((row, idx) => {
      const inputs = row.querySelectorAll('input');
      const subName = inputs[0].value.trim();
      const subBudget = parseFloat(inputs[1].value) || 0;
      if (!subName || subBudget <= 0) return;
      const subId = row.dataset.subId;
      const existingSub = subId ? financeState.envelopes.find(e => e.id === subId) : null;
      const subData = {
        ...(existingSub || {}),
        id: uid(),
        name: subName,
        kind: 'sub',
        eventType: null,
        icon: '↳',
        color: finEnvDraftColor,
        budget: subBudget,
        periodStart: null,
        periodEnd: null,
        status: 'open',
        parentId: base.id,
        sortOrder: idx,
        createdAt: existingSub?.createdAt || new Date().toISOString(),
      };
      if (existingSub) {
        subData.id = existingSub.id;
        Object.assign(existingSub, subData);
        seenSubIds.add(existingSub.id);
      } else {
        financeState.envelopes.push(subData);
        seenSubIds.add(subData.id);
      }
    });
    if (existing) {
      financeState.envelopes = financeState.envelopes.filter(e => e.parentId !== existing.id || seenSubIds.has(e.id));
    }
  }

  closeFinEnvelopeModal();
  ensureRecurringEnvelopeInstances();
  saveFinance();
  financeTab = 'envelopes';
  renderFinanceView();
}

function openFinEnvelopeDrawer(id) {
  finEnvDrawerId = id;
  renderFinEnvelopeDrawer();
  document.getElementById('finEnvelopeDrawerOverlay').classList.remove('hidden');
  document.getElementById('finEnvelopeDrawer').classList.remove('hidden');
}

function closeFinEnvelopeDrawer() {
  finEnvDrawerId = null;
  document.getElementById('finEnvelopeDrawerOverlay').classList.add('hidden');
  document.getElementById('finEnvelopeDrawer').classList.add('hidden');
}

function renderFinEnvelopeDrawer() {
  const drawer = document.getElementById('finEnvelopeDrawer');
  const env = financeState.envelopes.find(e => e.id === finEnvDrawerId);
  if (!drawer || !env) return;
  const progress = finEnvProgress(env, financeMonth);
  const txns = finEnvTransactions(env, null).sort((a, b) => b.date.localeCompare(a.date));
  const byCat = {};
  txns.forEach(t => { byCat[t.categoryId || 'none'] = (byCat[t.categoryId || 'none'] || 0) + Number(t.amount); });
  const catRows = Object.entries(byCat).map(([catId, total]) => {
    const cat = financeState.categories.find(c => c.id === catId);
    const pct = progress.spent > 0 ? Math.round((total / progress.spent) * 100) : 0;
    return `
      <div class="fin-env-drawer-cat">
        <span>${cat ? `${escapeHtml(cat.icon)} ${escapeHtml(cat.name)}` : 'Sem categoria'}</span>
        <div><div style="width:${pct}%;background:${cat ? finCatBarColor(cat.color) : '#9A9488'}"></div></div>
        <strong>R$&nbsp;${finFmt(total)}</strong>
      </div>
    `;
  }).join('');
  const txnRows = txns.map(t => {
    const cat = financeState.categories.find(c => c.id === t.categoryId);
    return `
      <div class="fin-env-drawer-txn">
        <div>
          <strong>${escapeHtml(t.description)}</strong>
          <span>${finFmtDate(t.date)}${cat ? ` · ${escapeHtml(cat.name)}` : ''}</span>
        </div>
        <b>R$&nbsp;${finFmt(t.amount)}</b>
      </div>
    `;
  }).join('');
  const children = env.kind === 'project'
    ? financeState.envelopes.filter(e => e.parentId === env.id && e.kind === 'sub').map(e => renderFinanceEnvelopeRow(e, true)).join('')
    : '';
  const cycles = env.parentId
    ? financeState.envelopes.filter(e => e.parentId === env.parentId).sort((a, b) => b.periodStart.localeCompare(a.periodStart)).map(e => {
        const p = finEnvProgress(e, financeMonth);
        return `<div class="fin-env-drawer-txn"><div><strong>${finEnvPeriodLabel(e)}</strong><span>${e.status === 'closed' ? 'encerrado' : 'ciclo atual'}</span></div><b>R$&nbsp;${finFmt(p.spent)} / ${finFmt(p.budget)}</b></div>`;
      }).join('')
    : '';

  drawer.innerHTML = `
    <div class="fin-env-drawer-hd">
      <div class="fin-env-drawer-title-row">
        <h2>${escapeHtml(env.name)}</h2>
        <button type="button" class="close-btn" id="finEnvDrawerClose">&times;</button>
      </div>
      <div class="fin-env-drawer-meta">
        <span class="fin-cat-badge fin-c-${escapeHtml(env.color)}">${escapeHtml(env.icon || '✉️')} ${escapeHtml(env.eventType || (env.kind === 'project' ? 'Projeto' : 'Envelope'))}</span>
        <span>${escapeHtml(finEnvPeriodLabel(env))}</span>
      </div>
    </div>
    <div class="fin-env-drawer-bd">
      <div class="fin-env-drawer-big">
        <strong>R$&nbsp;${finFmt(progress.spent)}</strong>
        <span>/ R$&nbsp;${finFmt(progress.budget)}</span>
      </div>
      <div class="fin-cat-bar-wrap"><div class="fin-cat-bar" style="width:${progress.pct}%;background:${progress.color}"></div></div>
      <div class="fin-env-pace ${progress.pctRaw >= 100 ? 'alert' : 'good'}">${escapeHtml(finEnvPaceText(env, progress))}</div>
      <div class="fin-env-drawer-label">Gastos por categoria</div>
      ${catRows || '<div class="fin-empty">Nenhum gasto associado ainda.</div>'}
      ${children ? `<div class="fin-env-drawer-label">Sub-envelopes</div><div>${children}</div>` : ''}
      ${cycles ? `<div class="fin-env-drawer-label">Histórico de ciclos</div>${cycles}` : ''}
      <div class="fin-env-drawer-label">Lançamentos</div>
      ${txnRows || '<div class="fin-empty">Nenhum lançamento neste envelope.</div>'}
    </div>
    <div class="fin-env-drawer-ft">
      <button type="button" class="btn-neutral" id="finEnvEditBtn">Editar</button>
      <button type="button" class="btn-primary" id="finEnvCloseBtn">${env.status === 'closed' ? 'Reabrir' : 'Encerrar envelope'}</button>
      <button type="button" class="btn-neutral" id="finEnvDeleteBtn">Excluir</button>
    </div>
  `;
  document.getElementById('finEnvDrawerClose').addEventListener('click', closeFinEnvelopeDrawer);
  document.getElementById('finEnvCloseBtn').addEventListener('click', () => toggleFinEnvelopeClosed(env.id));
  document.getElementById('finEnvDeleteBtn').addEventListener('click', () => deleteFinEnvelope(env.id));
  document.getElementById('finEnvEditBtn').addEventListener('click', () => {
    closeFinEnvelopeDrawer();
    openFinEnvelopeModal(null, env);
  });
}

function toggleFinEnvelopeClosed(id) {
  const env = financeState.envelopes.find(e => e.id === id);
  if (!env) return;
  env.status = env.status === 'closed' ? 'open' : 'closed';
  env.closedAt = env.status === 'closed' ? new Date().toISOString() : null;
  saveFinance();
  renderFinanceView();
  renderFinEnvelopeDrawer();
}

function deleteFinEnvelope(id) {
  const ids = new Set([id, ...financeState.envelopes.filter(e => e.parentId === id).map(e => e.id)]);
  const count = financeState.transactions.filter(t => ids.has(t.envelopeId)).length;
  if (!confirm(count ? `Excluir este envelope? ${count} lançamento(s) virarão avulsos.` : 'Excluir este envelope?')) return;
  financeState.envelopes = financeState.envelopes.filter(e => !ids.has(e.id));
  financeState.transactions.forEach(t => { if (ids.has(t.envelopeId)) t.envelopeId = null; });
  saveFinance();
  closeFinEnvelopeDrawer();
  renderFinanceView();
}

// --- Registrar handlers dos modais de finanças ---
(function initFinanceModalHandlers() {
  // Transaction modal
  document.getElementById('finModalClose').addEventListener('click', () => {
    document.getElementById('finTransactionModal').classList.add('hidden');
  });
  document.getElementById('finModalCancel').addEventListener('click', () => {
    document.getElementById('finTransactionModal').classList.add('hidden');
  });
  document.getElementById('finModalSave').addEventListener('click', saveFinTransaction);
  document.getElementById('finTxnDate').addEventListener('change', renderFinTransactionModal);

  document.querySelectorAll('#finTypeTabs .fin-type-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      finTransactionType = btn.dataset.type;
      renderFinTransactionModal();
    });
  });

  document.querySelectorAll('.fin-nature-btn[data-nature]').forEach(btn => {
    btn.addEventListener('click', () => {
      finTransactionNature = btn.dataset.nature;
      document.querySelectorAll('.fin-nature-btn[data-nature]').forEach(b => b.classList.toggle('active', b.dataset.nature === finTransactionNature));
    });
  });

  // Close on overlay click
  document.getElementById('finTransactionModal').addEventListener('click', e => {
    if (e.target === document.getElementById('finTransactionModal'))
      document.getElementById('finTransactionModal').classList.add('hidden');
  });

  // Purchase modal
  document.getElementById('finPurchaseModalClose').addEventListener('click', () => {
    document.getElementById('finPurchaseModal').classList.add('hidden');
  });
  document.getElementById('finPurchaseModalCancel').addEventListener('click', () => {
    document.getElementById('finPurchaseModal').classList.add('hidden');
  });
  document.getElementById('finPurchaseModalSave').addEventListener('click', saveFinPurchase);

  document.querySelectorAll('.fin-nature-btn[data-priority]').forEach(btn => {
    btn.addEventListener('click', () => {
      finPurchasePriority = btn.dataset.priority;
      document.querySelectorAll('.fin-nature-btn[data-priority]').forEach(b => b.classList.toggle('active', b.dataset.priority === finPurchasePriority));
    });
  });

  document.getElementById('finPurchaseModal').addEventListener('click', e => {
    if (e.target === document.getElementById('finPurchaseModal'))
      document.getElementById('finPurchaseModal').classList.add('hidden');
  });

  // Envelope modal
  document.getElementById('finEnvelopeClose').addEventListener('click', closeFinEnvelopeModal);
  document.getElementById('finEnvelopeCancel').addEventListener('click', closeFinEnvelopeModal);
  document.getElementById('finEnvelopeSave').addEventListener('click', saveFinEnvelope);
  document.getElementById('finEnvelopeModal').addEventListener('click', e => {
    if (e.target === document.getElementById('finEnvelopeModal')) closeFinEnvelopeModal();
  });
  document.querySelectorAll('[data-env-kind]').forEach(btn => {
    btn.addEventListener('click', () => {
      finEnvDraftKind = btn.dataset.envKind;
      renderFinEnvelopeModal();
    });
  });
  document.querySelectorAll('[data-env-recurrence]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-env-recurrence]').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  document.querySelectorAll('#finEnvColorPicker .fin-color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      finEnvDraftColor = btn.dataset.color;
      renderFinEnvelopeModal();
    });
  });
  document.getElementById('finEnvAddSub').addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'fin-env-sub-row';
    row.innerHTML = '<input type="text" placeholder="Nome"><input type="number" min="0" step="0.01" placeholder="0,00">';
    document.getElementById('finEnvSubRows').appendChild(row);
  });
  document.getElementById('finEnvelopeDrawerOverlay').addEventListener('click', closeFinEnvelopeDrawer);
})();

// --- Modais de Planejamento ---
function openFinNewCatModal() {
  finNewCatIcon  = '📦';
  finNewCatColor = 'gray';
  document.getElementById('finNewCatName').value   = '';
  document.getElementById('finNewCatBudget').value = '';
  // Reset icon picker
  document.querySelectorAll('#finNewCatIconPicker .fin-icon-opt').forEach(b => b.classList.toggle('selected', b.dataset.icon === '📦'));
  // Reset color picker
  document.querySelectorAll('#finNewCatColorPicker .fin-color-opt').forEach(b => b.classList.toggle('selected', b.dataset.color === 'gray'));
  document.getElementById('finNewCatModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('finNewCatName').focus(), 80);
}

function closeFinNewCatModal() {
  document.getElementById('finNewCatModal').classList.add('hidden');
}

function saveFinNewCat() {
  const name   = document.getElementById('finNewCatName').value.trim();
  if (!name) { document.getElementById('finNewCatName').focus(); return; }
  const budget = parseFloat(document.getElementById('finNewCatBudget').value);
  const newCat = {
    id:           uid(),
    name,
    icon:         finNewCatIcon,
    color:        finNewCatColor,
    monthlyLimit: (!isNaN(budget) && budget > 0) ? budget : null,
    sortOrder:    financeState.categories.length,
  };
  financeState.categories.push(newCat);
  saveFinance();
  closeFinNewCatModal();
  financeTab = 'planejamento';
  renderFinanceView();
}

function openFinAddFixedModal() {
  finAddFixedIcon = '📌';
  document.getElementById('finAddFixedDesc').value   = '';
  document.getElementById('finAddFixedAmount').value = '';
  document.querySelectorAll('#finAddFixedIconPicker .fin-icon-opt').forEach(b => b.classList.toggle('selected', b.dataset.icon === '📌'));
  document.getElementById('finAddFixedModal').classList.remove('hidden');
  setTimeout(() => document.getElementById('finAddFixedDesc').focus(), 80);
}

function closeFinAddFixedModal() {
  document.getElementById('finAddFixedModal').classList.add('hidden');
}

function saveFinAddFixed() {
  const desc   = document.getElementById('finAddFixedDesc').value.trim();
  if (!desc) { document.getElementById('finAddFixedDesc').focus(); return; }
  const amount = parseFloat(document.getElementById('finAddFixedAmount').value) || 0;
  const newItem = {
    id:          uid(),
    categoryId:  finAddFixedCatId,
    description: desc,
    icon:        finAddFixedIcon,
    amount,
    sortOrder:   financeState.budgetItems.filter(i => i.categoryId === finAddFixedCatId).length,
  };
  financeState.budgetItems.push(newItem);
  saveFinance();
  closeFinAddFixedModal();
  renderFinanceView();
}

(function initPlanModalHandlers() {
  // New category modal
  document.getElementById('finNewCatClose').addEventListener('click', closeFinNewCatModal);
  document.getElementById('finNewCatCancel').addEventListener('click', closeFinNewCatModal);
  document.getElementById('finNewCatSave').addEventListener('click', saveFinNewCat);
  document.getElementById('finNewCatModal').addEventListener('click', e => {
    if (e.target === document.getElementById('finNewCatModal')) closeFinNewCatModal();
  });
  // Icon picker — new cat
  document.querySelectorAll('#finNewCatIconPicker .fin-icon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      finNewCatIcon = btn.dataset.icon;
      document.querySelectorAll('#finNewCatIconPicker .fin-icon-opt').forEach(b => b.classList.toggle('selected', b === btn));
    });
  });
  // Color picker — new cat
  document.querySelectorAll('#finNewCatColorPicker .fin-color-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      finNewCatColor = btn.dataset.color;
      document.querySelectorAll('#finNewCatColorPicker .fin-color-opt').forEach(b => b.classList.toggle('selected', b === btn));
    });
  });

  // Add fixed modal
  document.getElementById('finAddFixedClose').addEventListener('click', closeFinAddFixedModal);
  document.getElementById('finAddFixedCancel').addEventListener('click', closeFinAddFixedModal);
  document.getElementById('finAddFixedSave').addEventListener('click', saveFinAddFixed);
  document.getElementById('finAddFixedModal').addEventListener('click', e => {
    if (e.target === document.getElementById('finAddFixedModal')) closeFinAddFixedModal();
  });
  // Icon picker — add fixed
  document.querySelectorAll('#finAddFixedIconPicker .fin-icon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      finAddFixedIcon = btn.dataset.icon;
      document.querySelectorAll('#finAddFixedIconPicker .fin-icon-opt').forEach(b => b.classList.toggle('selected', b === btn));
    });
  });
  // Enter key on inputs
  ['finNewCatName', 'finNewCatBudget'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') saveFinNewCat(); });
  });
  ['finAddFixedDesc', 'finAddFixedAmount'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') saveFinAddFixed(); });
  });
})();

// --- Sidebar item e mês nav ---
document.getElementById('sidebarFinanceItem').addEventListener('click', () => setView('finance'));

document.getElementById('finPrevMonth').addEventListener('click', () => {
  financeMonth = new Date(financeMonth.getFullYear(), financeMonth.getMonth() - 1, 1);
  renderFinanceView();
});
document.getElementById('finNextMonth').addEventListener('click', () => {
  financeMonth = new Date(financeMonth.getFullYear(), financeMonth.getMonth() + 1, 1);
  renderFinanceView();
});

// Botão "Lançar" no topbar
document.getElementById('financeLancarBtn').addEventListener('click', () => openFinTransactionModal());

// ---------- autenticação ----------
function showLoginScreen() {
  document.getElementById('loginOverlay').classList.remove('hidden');
  document.getElementById('userMenu').classList.add('hidden');
}

function hideLoginScreen() {
  document.getElementById('loginOverlay').classList.add('hidden');
}

function updateUserMenu(user) {
  const menu = document.getElementById('userMenu');
  const avatar = document.getElementById('userAvatar');
  if (user) {
    menu.classList.remove('hidden');
    avatar.src = user.user_metadata?.avatar_url || '';
    avatar.alt = user.user_metadata?.full_name || user.email || '';
  } else {
    menu.classList.add('hidden');
  }
}

async function initAuth() {
  // Busca config pública do servidor (URL e anon key do Supabase)
  let cfg;
  try {
    const res = await fetch('/api/config');
    cfg = await res.json();
  } catch (err) {
    console.error('Falha ao buscar config:', err);
    // Sem auth (dev local sem .env): carrega direto
    await load();
    await loadFinance();
    return;
  }

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    // Dev mode sem Supabase: carrega direto sem login
    await load();
    await loadFinance();
    return;
  }

  supabaseClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

  // Escuta mudanças de auth (login, logout, refresh de token)
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session) {
      currentUser = session.user;
      authToken = session.access_token;
      posthog.identify(currentUser.id, { email: currentUser.email });
      updateUserMenu(currentUser);
      hideLoginScreen();
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        await load();
        await loadFinance();
      }
    } else {
      currentUser = null;
      authToken = null;
      posthog.reset();
      updateUserMenu(null);
      showLoginScreen();
    }
  });

  // Verifica sessão atual (caso o usuário já estava logado)
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    showLoginScreen();
  }
  // onAuthStateChange cuida do resto quando há sessão

  // Botão de login com Google
  document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    document.getElementById('loginError').classList.add('hidden');
    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Erro no login:', err);
      document.getElementById('loginError').classList.remove('hidden');
    }
  });

  // Botão de logout
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
  });
}

initAuth();
