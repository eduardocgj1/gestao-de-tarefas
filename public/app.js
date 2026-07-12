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
let dayPopupMode = 'plan';     // 'plan' | 'shutdown'
let dayPopupGrouping = {};     // boardId -> fieldId (in-memory only, resets on open)
let shutdownChoices = {};      // `${boardId}:${taskId}` -> { boardId, taskId, mode: 'tomorrow'|'custom'|'ignore', date }

let pomodoroSettings = { focus: 25, short: 5, long: 15 };
let pomodoro = { mode: 'focus', remaining: 25 * 60, running: false, cycle: 0, updatedAt: Date.now() };
let pomodoroTimerId = null;
let pomodoroExpanded = false;

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

const sidebarEl = document.getElementById('sidebar');
const sidebarBoardsEl = document.getElementById('sidebarBoards');
const sidebarAddBoardAreaEl = document.getElementById('sidebarAddBoardArea');
const sidebarCalendarItemEl = document.getElementById('sidebarCalendarItem');
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
function fmtMin(m) {
  m = Number(m) || 0;
  if (m === 0) return '0min';
  const h = Math.floor(m / 60), r = m % 60;
  if (h === 0) return `${r}min`;
  if (r === 0) return `${h}h`;
  return `${h}h${String(r).padStart(2, '0')}`;
}
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
async function load() {
  let res, data;
  try {
    res = await fetch('/api/tasks');
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
  if (!boards.length) {
    boards = [{ id: uid(), name: 'Trabalho', tasks: [], fields: [] }];
    activeBoardId = boards[0].id;
  }
  boards.forEach((b, i) => { if (!b.color) b.color = PALETTE[i % PALETTE.length]; });
  boards.forEach(b => b.tasks.forEach(t => { if (!t.team) t.team = []; }));

  calendarEvents = data.calendarEvents || [];
  people = data.people || [];
  exportViews = data.exportViews || {};

  pomodoroSettings = data.pomodoroSettings || { focus: 25, short: 5, long: 15 };
  pomodoro = data.pomodoro || { mode: 'focus', remaining: pomodoroSettings.focus * 60, running: false, cycle: 0, updatedAt: Date.now() };
  if (pomodoro.running) {
    const elapsed = Math.floor((Date.now() - pomodoro.updatedAt) / 1000);
    pomodoro.remaining -= elapsed;
    if (pomodoro.remaining <= 0) {
      pomodoro.remaining = 0;
      pomodoro.running = false;
    }
  }
  renderSidebar();
  updateAppTitle();
  render();
  renderPomodoro();
  if (pomodoro.running) startPomodoroInterval();
  if (migrated) save();
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boards, activeBoardId, pomodoroSettings, pomodoro, calendarEvents, people, exportViews }) });
  }, 250);
}
function savePomodoro() {
  pomodoro.updatedAt = Date.now();
  save();
}

// ---------- pomodoro ----------
const POMO_DOT_COLORS = { focus: '#3A6604', short: '#C1622D', long: '#3E6FBD' };
const POMO_LABELS = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' };

const pomodoroWidgetEl = document.getElementById('pomodoroWidget');
const pomoHeaderToggleEl = document.getElementById('pomoHeaderToggle');
const pomoTimeEl = document.getElementById('pomoTime');
const pomoDotEl = document.getElementById('pomoDot');
const pomoModeLabelEl = document.getElementById('pomoModeLabel');
const pomoToggleBtn = document.getElementById('pomoToggle');
const pomoResetBtn = document.getElementById('pomoReset');
const pomoDotsEl = document.getElementById('pomoDots');
const pomoTabs = document.querySelectorAll('.pomo-tab');

function fmtTime(s) {
  s = Math.max(0, Math.round(s));
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function togglePomodoroExpanded() {
  pomodoroExpanded = !pomodoroExpanded;
  pomodoroWidgetEl.classList.toggle('expanded', pomodoroExpanded);
}

function renderPomodoro() {
  pomoTimeEl.textContent = fmtTime(pomodoro.remaining);
  pomoDotEl.style.background = POMO_DOT_COLORS[pomodoro.mode];
  pomoModeLabelEl.textContent = POMO_LABELS[pomodoro.mode];
  pomoToggleBtn.textContent = pomodoro.running ? '⏸' : '▶';
  pomoToggleBtn.title = pomodoro.running ? 'Pausar' : `Iniciar ${POMO_LABELS[pomodoro.mode]}`;
  pomoTabs.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === pomodoro.mode));
  const filled = pomodoro.cycle % 4;
  pomoDotsEl.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('span');
    if (i < filled) dot.classList.add('filled');
    pomoDotsEl.appendChild(dot);
  }
}

function pomoBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, delay) => setTimeout(() => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.start();
      setTimeout(() => o.stop(), 260);
    }, delay);
    playTone(880, 0);
    playTone(1046, 300);
    setTimeout(() => ctx.close(), 700);
  } catch (e) {}
}

function stopPomodoroInterval() {
  clearInterval(pomodoroTimerId);
  pomodoroTimerId = null;
}
function startPomodoroInterval() {
  stopPomodoroInterval();
  pomodoroTimerId = setInterval(tickPomodoro, 1000);
}

function setPomodoroMode(mode) {
  stopPomodoroInterval();
  pomodoro.mode = mode;
  pomodoro.remaining = pomodoroSettings[mode] * 60;
  pomodoro.running = false;
  savePomodoro();
  renderPomodoro();
}

function nextPomodoroMode() {
  if (pomodoro.mode === 'focus') {
    pomodoro.cycle++;
    pomodoro.mode = (pomodoro.cycle % 4 === 0) ? 'long' : 'short';
  } else {
    pomodoro.mode = 'focus';
  }
  pomodoro.remaining = pomodoroSettings[pomodoro.mode] * 60;
}

function togglePomodoro() {
  if (pomodoro.running) {
    stopPomodoroInterval();
    pomodoro.running = false;
  } else {
    startPomodoroInterval();
    pomodoro.running = true;
  }
  savePomodoro();
  renderPomodoro();
}

function resetPomodoro() {
  stopPomodoroInterval();
  pomodoro.running = false;
  pomodoro.remaining = pomodoroSettings[pomodoro.mode] * 60;
  savePomodoro();
  renderPomodoro();
}

function tickPomodoro() {
  pomodoro.remaining--;
  if (pomodoro.remaining <= 0) {
    stopPomodoroInterval();
    pomodoro.running = false;
    pomoBeep();
    nextPomodoroMode();
    savePomodoro();
  } else if (pomodoro.remaining % 15 === 0) {
    savePomodoro();
  }
  renderPomodoro();
}

function editPomodoroTime() {
  if (pomodoro.running) return;
  const input = prompt('Novo tempo (mm:ss ou minutos):', fmtTime(pomodoro.remaining));
  if (input == null) return;
  const trimmed = input.trim();
  let seconds = null;
  if (trimmed.includes(':')) {
    const [m, s] = trimmed.split(':').map(Number);
    if (!isNaN(m) && !isNaN(s)) seconds = m * 60 + s;
  } else {
    const minutes = Number(trimmed);
    if (!isNaN(minutes)) seconds = Math.round(minutes * 60);
  }
  if (seconds == null || seconds < 0) return;
  pomodoro.remaining = seconds;
  savePomodoro();
  renderPomodoro();
}

pomoTabs.forEach(btn => btn.addEventListener('click', () => setPomodoroMode(btn.dataset.mode)));
pomoToggleBtn.addEventListener('click', togglePomodoro);
pomoResetBtn.addEventListener('click', resetPomodoro);
pomoTimeEl.addEventListener('click', e => { e.stopPropagation(); editPomodoroTime(); });
pomoTimeEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.stopPropagation(); editPomodoroTime(); } });
pomoHeaderToggleEl.addEventListener('click', togglePomodoroExpanded);

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
    btn.innerHTML = '<span class="sidebar-add-board-icon">+</span><span>Novo board</span>';
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
  if (activeBoardId === id) activeBoardId = boards[0].id;
  save();
  setView('board');
}

function updateAppTitle() {
  document.getElementById('appTitle').textContent = currentView === 'calendar' ? 'Calendário' : (currentBoard() ? currentBoard().name : 'Tarefas 2026');
}

// ---------- view mode (board vs calendário) ----------
function setView(view) {
  currentView = view;
  const isCalendar = view === 'calendar';
  document.getElementById('board').classList.toggle('hidden', isCalendar);
  document.getElementById('calendarView').classList.toggle('hidden', !isCalendar);
  document.getElementById('boardLegend').classList.toggle('hidden', !isCalendar);
  document.getElementById('navBoardControls').classList.toggle('hidden', isCalendar);
  document.getElementById('navCalendarControls').classList.toggle('hidden', !isCalendar);
  document.getElementById('exportReportBtn').classList.toggle('hidden', isCalendar);
  updateAppTitle();
  renderSidebar();
  if (isCalendar) {
    renderBoardLegend();
    initCalendarIfNeeded();
  } else {
    render();
  }
}

document.getElementById('sidebarCollapseBtn').addEventListener('click', toggleSidebar);
document.getElementById('sidebarExpandBtn').addEventListener('click', toggleSidebar);
sidebarCalendarItemEl.addEventListener('click', () => setView('calendar'));

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
  const count = currentBoard().tasks.filter(t => t.fieldValues && t.fieldValues[fieldId] === valueId).length;
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
function tasksFor(key, board = currentBoard()) { return board.tasks.filter(t => t.date === key).sort(compare); }

function setPriority(task, newPriority, board = currentBoard()) {
  const dateKey = task.date;
  const normal = board.tasks.filter(t => t.date === dateKey && !t.urgent && !t.completed && t.id !== task.id).sort((a, b) => (a.priority || 0) - (b.priority || 0));
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
    if (!task.urgent) {
      const normal = board.tasks.filter(t => t.date === dateKey && !t.urgent && !t.completed && t.id !== task.id)
        .sort((a, b) => (a.priority || 0) - (b.priority || 0));
      normal.forEach((t, i) => (t.priority = i + 1));
    }
  } else {
    task.completed = false;
    task.completedAt = null;
    if (!task.urgent) {
      const max = board.tasks.filter(t => t.date === dateKey && !t.urgent && !t.completed && t.id !== task.id)
        .reduce((m, t) => Math.max(m, t.priority || 0), 0);
      task.priority = max + 1;
    }
  }
}

// ---------- MIT (prioridades do dia) ----------
function mitStorageKey(boardId, dateKey) { return `mit-${boardId}-${dateKey}`; }
function getMitIds(boardId, dateKey) {
  try { return JSON.parse(localStorage.getItem(mitStorageKey(boardId, dateKey))) || []; }
  catch (e) { return []; }
}
function setMitIds(boardId, dateKey, ids) {
  localStorage.setItem(mitStorageKey(boardId, dateKey), JSON.stringify(ids.slice(0, 3)));
}
function toggleMit(boardId, dateKey, taskId) {
  const ids = getMitIds(boardId, dateKey);
  const i = ids.indexOf(taskId);
  if (i >= 0) ids.splice(i, 1);
  else {
    if (ids.length >= 3) return;
    ids.push(taskId);
  }
  setMitIds(boardId, dateKey, ids);
}

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

  board.innerHTML = days.map(d => columnHtml(d)).join('');
}

function columnHtml(d) {
  const key = toKey(d);
  const items = tasksFor(key);
  const total = items.length;
  const done = items.filter(t => t.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const planned = items.reduce((s, t) => s + (Number(t.duration) || 0), 0);
  const doneMin = items.filter(t => t.completed).reduce((s, t) => s + (Number(t.duration) || 0), 0);
  const remaining = planned - doneMin;
  const events = eventsForBoardDate(activeBoardId, key);

  const mitIds = getMitIds(activeBoardId, key).filter(id => items.some(t => t.id === id));
  const orderedItems = [
    ...mitIds.map(id => items.find(t => t.id === id)),
    ...items.filter(t => !mitIds.includes(t.id)),
  ];

  return `
  <div class="column">
    <div class="col-header" data-date="${key}">
      <div class="col-header-top">
        <div class="col-title">${label(d)}</div>
        <span class="col-progress-ring"></span>
      </div>
      <div class="col-stats">
        <span>${total} tarefas · ${done} concluídas · ${pct}%</span>
        <span>Previsto ${fmtMin(planned)} · Feito ${fmtMin(doneMin)} · Resta ${fmtMin(remaining)}</span>
      </div>
    </div>
    ${events.length ? `<div class="col-events">${events.map(ev => eventChipHtml(ev, key)).join('')}</div>` : ''}
    <div class="col-body" data-date="${key}">
      ${orderedItems.map(t => cardHtml(t, mitIds.includes(t.id))).join('')}
    </div>
    <form class="add-form" data-date="${key}">
      <input type="text" placeholder="+ nova tarefa" required>
      <button type="button" class="add-recurring-btn" data-date="${key}" title="Nova tarefa recorrente">🔁</button>
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

function cardHtml(t, isMit = false) {
  const cls = ['card', t.urgent ? 'urgent' : 'normal', t.completed ? 'completed' : '', isMit ? 'mit' : ''].join(' ');
  const fields = currentBoard().fields || [];
  const fieldTags = fields.map(f => (t.fieldValues && t.fieldValues[f.id]) ? fieldTagHtml(f.id, t.fieldValues[f.id]) : '').join('');
  return `
  <div class="${cls}" draggable="true" data-id="${t.id}">
    ${t.seriesId ? '<span class="recurring-badge" title="Tarefa recorrente">🔁</span>' : ''}
    <div class="card-top">
      <input type="checkbox" class="chk-done" ${t.completed ? 'checked' : ''}>
      <div class="card-name">${escapeHtml(t.name)}</div>
      ${isMit ? '<span class="badge mit-badge" title="Prioridade do dia">⭐</span>' : ''}
      ${t.urgent ? '<span class="badge">URGENTE</span>' : ''}
    </div>
    <div class="card-meta">
      ${t.duration ? `<span>⏱ ${fmtMin(t.duration)}</span>` : ''}
      ${!t.completed && t.priority ? `<span>#${t.priority}</span>` : ''}
      ${t.delegated ? `<span>👤 ${escapeHtml(t.delegatedTo || '-')}</span>` : ''}
      ${t.link ? `<a href="${escapeHtml(t.link)}" target="_blank" rel="noopener">🔗</a>` : ''}
      ${fieldTags}
    </div>
  </div>`;
}

// ---------- add / update / delete ----------
function addTask(dateKey, name) {
  const tasks = currentBoard().tasks;
  const normalMax = tasks.filter(t => t.date === dateKey && !t.urgent).reduce((m, t) => Math.max(m, t.priority || 0), 0);
  tasks.push({
    id: uid(), name, date: dateKey, deliveryDate: dateKey, link: '', duration: 0,
    priority: normalMax + 1, urgent: false, urgentRank: 0,
    delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
    fieldValues: {}, team: [],
  });
  save(); render();
}
function findTask(id, board = currentBoard()) { return board.tasks.find(t => t.id === id); }
function deleteTask(id, board = currentBoard()) {
  board.tasks = board.tasks.filter(t => t.id !== id);
  save(); refreshCalendarAndBoard();
}

// ---------- create modal ----------
const createTaskOverlay = document.getElementById('createTaskOverlay');
const ct = {
  name: document.getElementById('ct-name'),
  date: document.getElementById('ct-date'),
  link: document.getElementById('ct-link'),
};
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
const saveCreateTaskBtn = document.getElementById('saveCreateTask');

const WEEKDAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const WEEKDAY_LABEL_PT = { mon: 'seg', tue: 'ter', wed: 'qua', thu: 'qui', fri: 'sex', sat: 'sáb', sun: 'dom' };

let createTaskDateKey = null;
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
    rule.dayOfMonth = new Date((ct.date.value || createTaskDateKey) + 'T00:00:00').getDate();
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
  // em vez de deixar passar em branco e falhar silenciosamente ao clicar "Salvar tarefa".
  const hasZeroOccurrences = !rule.endDate || generateRecurrenceInstances(rule, ct.date.value || createTaskDateKey).length === 0;
  if (hasZeroOccurrences) {
    recurrenceSummaryEl.textContent = 'Esse padrão não gera nenhuma ocorrência antes da data de término.';
    recurrenceSummaryEl.classList.add('error');
  } else {
    recurrenceSummaryEl.textContent = formatRecurrenceSummary(rule);
    recurrenceSummaryEl.classList.remove('error');
  }
  saveCreateTaskBtn.disabled = hasZeroOccurrences;
}

function selectRecTab(type) {
  recActiveTab = type;
  recTabs.forEach(t => t.classList.toggle('active', t.dataset.type === type));
  recSections.forEach(s => s.classList.toggle('active', s.dataset.section === type));
  updateRecurrenceSummary();
}

function openCreateTaskModal(dateKey) {
  createTaskDateKey = dateKey;
  ct.name.value = '';
  ct.date.value = dateKey;
  ct.link.value = '';

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
  saveCreateTaskBtn.disabled = false;
  selectRecTab('daily');

  createTaskOverlay.classList.remove('hidden');
}
function closeCreateTaskModal() {
  createTaskOverlay.classList.add('hidden');
  createTaskDateKey = null;
}

document.getElementById('closeCreateTaskModal').addEventListener('click', closeCreateTaskModal);
document.getElementById('cancelCreateTask').addEventListener('click', closeCreateTaskModal);
createTaskOverlay.addEventListener('click', e => { if (e.target === createTaskOverlay) closeCreateTaskModal(); });

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
    saveCreateTaskBtn.disabled = false;
  }
});

weekdayPillEls.forEach(p => p.addEventListener('click', () => {
  p.classList.toggle('selected');
  updateRecurrenceSummary();
}));
document.querySelectorAll('input[name="rec-daily"]').forEach(r => r.addEventListener('change', updateRecurrenceSummary));
recCustomIntervalEl.addEventListener('input', updateRecurrenceSummary);
recEndDateEl.addEventListener('change', updateRecurrenceSummary);
ct.date.addEventListener('change', () => {
  recMonthlyDayEl.textContent = new Date((ct.date.value || createTaskDateKey) + 'T00:00:00').getDate();
  updateRecurrenceSummary();
});

board.addEventListener('click', e => {
  const addRecurringBtn = e.target.closest('.add-recurring-btn');
  if (addRecurringBtn) { openCreateTaskModal(addRecurringBtn.dataset.date); }
});

// ---------- create modal: aviso de volume (>90 instâncias) ----------
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

function handleSaveCreateTask() {
  if (saveCreateTaskBtn.disabled) return;
  const name = ct.name.value.trim();
  if (!name) return;
  const startDateKey = ct.date.value || createTaskDateKey;

  if (!recurrenceOn) {
    commitCreateTask(null, [startDateKey]);
    return;
  }

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

  commitCreateTask(rule, dates);
}

saveCreateTaskBtn.addEventListener('click', handleSaveCreateTask);
cancelVolumeBtnEl.addEventListener('click', closeConfirmVolumeOverlay);
confirmVolumeOverlay.addEventListener('click', e => { if (e.target === confirmVolumeOverlay) closeConfirmVolumeOverlay(); });
confirmVolumeBtnEl.addEventListener('click', () => {
  const rule = pendingRecurrenceRule, dates = pendingRecurrenceDates;
  confirmVolumeOverlay.classList.add('hidden');
  pendingRecurrenceRule = null;
  pendingRecurrenceDates = null;
  commitCreateTask(rule, dates);
});

function commitCreateTask(rule, dates) {
  const board = currentBoard();
  const tasks = board.tasks;
  const name = ct.name.value.trim();
  const link = ct.link.value.trim();

  function pushInstance(dateKey, seriesId, recurrenceRule) {
    const normalMax = tasks.filter(t => t.date === dateKey && !t.urgent).reduce((m, t) => Math.max(m, t.priority || 0), 0);
    tasks.push({
      id: uid(), name, date: dateKey, deliveryDate: dateKey, link, duration: 0,
      priority: normalMax + 1, urgent: false, urgentRank: 0,
      delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
      fieldValues: {}, team: [],
      seriesId, recurrenceRule, isException: false,
    });
  }

  if (!rule) {
    pushInstance(dates[0], null, null);
  } else {
    const seriesId = uid();
    dates.forEach(dateKey => pushInstance(dateKey, seriesId, rule));
  }

  closeCreateTaskModal();
  save();
  render();
}

// ---------- modal ----------
const overlay = document.getElementById('modalOverlay');
const fFieldsContainer = document.getElementById('f-fields');
const f = {
  name: document.getElementById('f-name'),
  date: document.getElementById('f-date'),
  link: document.getElementById('f-link'),
  duration: document.getElementById('f-duration'),
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
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  return findTask(editingId, board);
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

function openModal(id, board = currentBoard()) {
  editingId = id;
  editingTaskBoardId = board.id;
  const t = findTask(id, board);
  if (t.seriesId && t.recurrenceRule && !t.isException) {
    // Instâncias já marcadas isException se comportam como tarefa comum (não perguntam escopo ao
    // editar/excluir) — mostrar a barra de série aqui induziria o usuário a achar que a edição vai
    // perguntar escopo, quando na verdade não vai (ver critério de aceite sobre isException).
    seriesInfoTextEl.textContent = formatSeriesInfoText(t);
    seriesInfoBarEl.classList.remove('hidden');
  } else {
    seriesInfoBarEl.classList.add('hidden');
  }
  f.name.value = t.name;
  f.date.value = t.deliveryDate || t.date;
  f.link.value = t.link || '';
  renderModalFields(t, board);
  document.getElementById('taskModalMeta').innerHTML = taskModalMetaHtml(t, board);
  renderTeamSection(t);
  f.duration.value = t.duration || 0;
  f.delegated.checked = t.delegated;
  f.delegatedTo.value = t.delegatedTo || '';
  f.delegatedDate.value = t.delegatedDate || '';
  f.priority.value = t.priority || 1;
  f.urgent.checked = t.urgent;
  f.completed.checked = t.completed;
  delegateFields.classList.toggle('hidden', !t.delegated);
  priorityField.classList.toggle('hidden', t.completed);
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
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  const t = findTask(editingId, board);
  if (t && fn) {
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
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  if (editingId) openModal(editingId, board);
});
confirmEditScopeOverlay.addEventListener('click', e => { if (e.target === confirmEditScopeOverlay) cancelEditScopeBtn.click(); });

function applyPatchWithScope(t, board, fn, scope) {
  if (scope === 'all') {
    board.tasks
      .filter(x => x.seriesId === t.seriesId && !x.isException && x.date >= t.date)
      .forEach(x => fn(x, board));
  } else {
    fn(t, board);
  }
  save();
  refreshCalendarAndBoard();
}

// directPatch: aplica a mutação diretamente na instância aberta, sem passar pela pergunta de
// escopo — usado pelos campos que mudam a data da tarefa (f.date/f.delegatedDate), cujo
// comportamento ao mover uma instância de série é sempre virar exceção (fe-16), nunca propagar
// para a série.
function directPatch(fn) {
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  const t = findTask(editingId, board);
  if (!t) return;
  fn(t, board);
  save(); refreshCalendarAndBoard();
}

function patch(fn) {
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  const t = findTask(editingId, board);
  if (!t) return;

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
f.link.addEventListener('input', () => patch(t => (t.link = f.link.value)));
f.duration.addEventListener('input', () => patch(t => (t.duration = Number(f.duration.value) || 0)));
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

deleteScopeOnlyThisBtn.addEventListener('click', () => {
  closeDeleteScopeModal();
  if (!editingId) return;
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  deleteTask(editingId, board);
  closeModal();
});
deleteScopeAllFutureBtn.addEventListener('click', () => {
  closeDeleteScopeModal();
  if (!editingId) return;
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  const t = findTask(editingId, board);
  if (!t) return;
  deleteSeriesFromInstance(t, board);
  closeModal();
});
cancelDeleteScopeBtn.addEventListener('click', closeDeleteScopeModal);
confirmDeleteScopeOverlay.addEventListener('click', e => { if (e.target === confirmDeleteScopeOverlay) closeDeleteScopeModal(); });

document.getElementById('deleteTask').addEventListener('click', () => {
  if (!editingId) return;
  const board = boards.find(b => b.id === editingTaskBoardId) || currentBoard();
  const t = findTask(editingId, board);
  if (!t) return;
  if (t.seriesId && !t.isException) {
    openDeleteScopeModal(t);
    return;
  }
  deleteTask(editingId, board);
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
  const title = e.target.closest('.col-title');
  if (title) { openDayPopup(title.closest('.col-header').dataset.date); return; }
  const chip = e.target.closest('.event-chip');
  if (chip) { openEventModal(chip.dataset.eventId); return; }
  if (e.target.classList.contains('chk-done')) {
    const card = e.target.closest('.card');
    const t = findTask(card.dataset.id);
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
  const ordered = ids.map(id => findTask(id));
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
  pomoSetFocus.value = pomodoroSettings.focus;
  pomoSetShort.value = pomodoroSettings.short;
  pomoSetLong.value = pomodoroSettings.long;
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

const pomoSetFocus = document.getElementById('pomoSetFocus');
const pomoSetShort = document.getElementById('pomoSetShort');
const pomoSetLong = document.getElementById('pomoSetLong');
pomoSetFocus.addEventListener('change', () => { pomodoroSettings.focus = Number(pomoSetFocus.value) || pomodoroSettings.focus; save(); });
pomoSetShort.addEventListener('change', () => { pomodoroSettings.short = Number(pomoSetShort.value) || pomodoroSettings.short; save(); });
pomoSetLong.addEventListener('change', () => { pomodoroSettings.long = Number(pomoSetLong.value) || pomodoroSettings.long; save(); });

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
    const classes = ['day-cell'];
    if (isToday) classes.push('today');
    if (isWeekend || isHoliday) classes.push('weekend');
    return `<div class="${classes.join(' ')}" data-date="${key}">
      <button type="button" class="day-cell-add-event" data-date="${key}" title="Novo evento">+</button>
      <div class="day-num">${d.getDate()}</div>
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

// ---------- day drawer: docked / expanded hosting ----------
const dayDrawerDockedEl = document.getElementById('dayDrawerDocked');
const dayDrawerResizeHandleEl = document.getElementById('dayDrawerResizeHandle');
const dayPopupPanelEl = document.getElementById('dayPopupPanel');
const dayPopupOverlayEl = document.getElementById('dayPopupOverlay');
const dayPopupModalHostEl = document.getElementById('dayPopupModalHost');
const dayPopupExpandBtnEl = document.getElementById('dayPopupExpandBtn');

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
  attachDayPopupPanel();
}

function openDayPopup(dateKey) {
  dayPopupDate = dateKey;
  dayPopupMode = 'plan';
  dayPopupGrouping = {};
  shutdownChoices = {};
  dayDrawerExpanded = false;
  renderDayPopup();
  attachDayPopupPanel();
}
function closeDayPopup() {
  dayPopupDate = null;
  dayPopupMode = 'plan';
  shutdownChoices = {};
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

function dayPopupBoardChecklistHtml() {
  return boards.map(b => {
    const visible = isBoardVisibleInPopup(b.id);
    return `
    <label class="day-popup-board-check${visible ? ' checked' : ''}">
      <input type="checkbox" class="day-popup-board-toggle" data-board-id="${b.id}" ${visible ? 'checked' : ''}>
      <span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}
    </label>
  `;
  }).join('');
}

function dayPopupLoadBarHtml(items) {
  const planned = items.reduce((s, t) => s + (Number(t.duration) || 0), 0);
  const doneMin = items.filter(t => t.completed).reduce((s, t) => s + (Number(t.duration) || 0), 0);
  const remaining = planned - doneMin;
  return `Previsto ${fmtMin(planned)} · Feito ${fmtMin(doneMin)} · Resta ${fmtMin(remaining)}`;
}

function dayPopupTaskRowHtml(t, b, isMit, mitCount) {
  const cls = ['day-popup-task-row', t.completed ? 'completed' : ''].join(' ');
  const fields = b.fields || [];
  const fieldTags = fields.map(f => (t.fieldValues && t.fieldValues[f.id]) ? fieldTagHtml(f.id, t.fieldValues[f.id], b) : '').join('');
  const starDisabled = !isMit && mitCount >= 3;
  return `
  <div class="${cls}">
    <input type="checkbox" class="daypopup-chk-done" data-task-id="${t.id}" data-board-id="${b.id}" ${t.completed ? 'checked' : ''}>
    <button type="button" class="day-popup-task-name" data-task-id="${t.id}" data-board-id="${b.id}">${escapeHtml(t.name)}</button>
    <div class="day-popup-task-meta">
      ${t.duration ? `<span>⏱ ${fmtMin(t.duration)}</span>` : ''}
      ${fieldTags}
      <button type="button" class="mit-star ${isMit ? 'active' : ''} ${starDisabled ? 'disabled' : ''}" data-task-id="${t.id}" data-board-id="${b.id}" title="Marcar como prioridade do dia">⭐</button>
      <button type="button" class="adiar-btn" data-task-id="${t.id}" data-board-id="${b.id}" title="Adiar para amanhã">→</button>
    </div>
  </div>`;
}

function dayPopupBoardSectionHtml(b) {
  const key = dayPopupDate;
  const items = tasksFor(key, b);
  let mitIds = getMitIds(b.id, key);
  const resolvable = mitIds.filter(id => items.some(t => t.id === id));
  if (resolvable.length !== mitIds.length) { setMitIds(b.id, key, resolvable); mitIds = resolvable; }
  const mitTasks = mitIds.map(id => items.find(t => t.id === id));
  const restTasks = items.filter(t => !mitIds.includes(t.id));
  const events = eventsForBoardDate(b.id, key);
  const fieldId = dayPopupGrouping[b.id] || '';
  const field = fieldId ? findField(fieldId, b) : null;

  let groupsHtml;
  if (!field) {
    groupsHtml = restTasks.map(t => dayPopupTaskRowHtml(t, b, false, mitIds.length)).join('');
  } else {
    const buckets = field.values.map(v => ({
      label: v.name,
      items: restTasks.filter(t => t.fieldValues && t.fieldValues[fieldId] === v.id),
    })).filter(bucket => bucket.items.length);
    const unclassified = restTasks.filter(t => !t.fieldValues || !field.values.some(v => v.id === t.fieldValues[fieldId]));
    if (unclassified.length) buckets.push({ label: 'Sem classificação', items: unclassified });
    groupsHtml = buckets.map(bucket => `
      <div class="day-popup-group-label">${escapeHtml(bucket.label)}</div>
      ${bucket.items.map(t => dayPopupTaskRowHtml(t, b, false, mitIds.length)).join('')}
    `).join('');
  }

  return `
  <div class="day-popup-board-section" data-board-id="${b.id}">
    <div class="day-popup-board-section-header">
      <div class="day-popup-board-name"><span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}</div>
      <select class="day-popup-group-select" data-board-id="${b.id}">
        <option value="">Sem agrupamento</option>
        ${(b.fields || []).map(f => `<option value="${f.id}" ${fieldId === f.id ? 'selected' : ''}>Por ${escapeHtml(f.name)}</option>`).join('')}
      </select>
    </div>
    <div class="day-popup-load-bar">${dayPopupLoadBarHtml(items)}</div>
    ${events.length ? `<div class="day-popup-events">${events.map(ev => eventChipHtml(ev, key)).join('')}</div>` : ''}
    <div class="day-popup-mit-section">
      <h4>Prioridades do Dia</h4>
      ${mitTasks.length ? mitTasks.map(t => dayPopupTaskRowHtml(t, b, true, mitIds.length)).join('') : '<div class="day-popup-mit-placeholder">Marque até 3 prioridades</div>'}
    </div>
    ${groupsHtml}
  </div>`;
}

function shutdownTaskRowHtml(t, b) {
  const key = `${b.id}:${t.id}`;
  const choice = shutdownChoices[key] || { boardId: b.id, taskId: t.id, mode: 'tomorrow', date: '' };
  return `
  <div class="shutdown-task-row">
    <span class="shutdown-task-name">${escapeHtml(t.name)}</span>
    <div class="shutdown-choices" data-choice-key="${key}">
      <button type="button" class="shutdown-choice-btn ${choice.mode === 'tomorrow' ? 'selected' : ''}" data-mode="tomorrow">Amanhã</button>
      <button type="button" class="shutdown-choice-btn ${choice.mode === 'custom' ? 'selected' : ''}" data-mode="custom">Outra data</button>
      ${choice.mode === 'custom' ? `<input type="date" class="shutdown-date-input" data-choice-key="${key}" value="${choice.date || ''}">` : ''}
      <button type="button" class="shutdown-choice-btn ${choice.mode === 'ignore' ? 'selected' : ''}" data-mode="ignore">Ignorar</button>
    </div>
  </div>`;
}

function shutdownPanelHtml() {
  const visible = boards.filter(b => isBoardVisibleInPopup(b.id));
  const groups = visible.map(b => {
    const items = tasksFor(dayPopupDate, b).filter(t => !t.completed);
    if (!items.length) return '';
    return `
    <div class="shutdown-board-group">
      <h4><span class="dot" style="background:${b.color}"></span>${escapeHtml(b.name)}</h4>
      ${items.map(t => shutdownTaskRowHtml(t, b)).join('')}
    </div>`;
  }).join('');
  const hasAny = visible.some(b => tasksFor(dayPopupDate, b).some(t => !t.completed));
  return hasAny ? groups : '<div class="shutdown-empty">Nenhuma tarefa pendente nos boards visíveis.</div>';
}

function enterShutdownMode() {
  dayPopupMode = 'shutdown';
  shutdownChoices = {};
  boards.filter(b => isBoardVisibleInPopup(b.id)).forEach(b => {
    tasksFor(dayPopupDate, b).filter(t => !t.completed).forEach(t => {
      shutdownChoices[`${b.id}:${t.id}`] = { boardId: b.id, taskId: t.id, mode: 'tomorrow', date: '' };
    });
  });
  renderDayPopup();
}
function exitShutdownMode() {
  dayPopupMode = 'plan';
  shutdownChoices = {};
  renderDayPopup();
}
function applyShutdown() {
  const tomorrow = toKey(addDays(new Date(dayPopupDate + 'T00:00:00'), 1));
  Object.values(shutdownChoices).forEach(choice => {
    if (choice.mode === 'ignore') return;
    const board = boards.find(b => b.id === choice.boardId);
    const t = board && findTask(choice.taskId, board);
    if (!t) return;
    const newDate = (choice.mode === 'custom' && choice.date) ? choice.date : tomorrow;
    const prevDate = t.date;
    t.date = newDate;
    t.deliveryDate = newDate;
    markExceptionIfMoved(t, prevDate);
  });
  save();
  refreshCalendarAndBoard();
  closeDayPopup();
}

function renderDayPopup() {
  if (!dayPopupDate) return;
  const d = new Date(dayPopupDate + 'T00:00:00');
  document.getElementById('dayPopupHeader').textContent = label(d);
  document.getElementById('dayPopupSubtitle').textContent = dayPopupMode === 'shutdown' ? 'Fechando o dia' : 'Visão do dia';
  document.getElementById('dayPopupBoardChecklist').innerHTML = dayPopupBoardChecklistHtml();

  const bodyEl = document.getElementById('dayPopupBody');
  if (dayPopupMode === 'shutdown') {
    bodyEl.innerHTML = shutdownPanelHtml();
  } else {
    const visible = boards.filter(b => isBoardVisibleInPopup(b.id));
    bodyEl.innerHTML = visible.length
      ? visible.map(dayPopupBoardSectionHtml).join('')
      : '<div class="shutdown-empty">Nenhum board selecionado.</div>';
  }

  document.getElementById('dayPopupFooter').innerHTML = dayPopupMode === 'shutdown'
    ? `<button type="button" id="shutdownBackBtn" class="shutdown-back-btn">Voltar</button>
       <button type="button" id="shutdownApplyBtn" class="shutdown-apply-btn">Encerrar</button>`
    : `<button type="button" id="shutdownEnterBtn" class="shutdown-btn">Fechar o Dia</button>`;
}

document.getElementById('closeDayPopup').addEventListener('click', closeDayPopup);

dayPopupOverlayEl.addEventListener('click', e => {
  if (e.target.id === 'dayPopupOverlay') closeDayPopup();
});

dayPopupPanelEl.addEventListener('click', e => {
  const star = e.target.closest('.mit-star');
  if (star) {
    if (star.classList.contains('disabled')) return;
    toggleMit(star.dataset.boardId, dayPopupDate, star.dataset.taskId);
    refreshCalendarAndBoard();
    renderDayPopup();
    return;
  }

  const adiar = e.target.closest('.adiar-btn');
  if (adiar) {
    const board = boards.find(b => b.id === adiar.dataset.boardId);
    const t = board && findTask(adiar.dataset.taskId, board);
    if (t) {
      const prevDate = t.date;
      const tomorrowKey = toKey(addDays(new Date(dayPopupDate + 'T00:00:00'), 1));
      t.date = tomorrowKey;
      t.deliveryDate = tomorrowKey;
      markExceptionIfMoved(t, prevDate);
      save();
      refreshCalendarAndBoard();
      renderDayPopup();
    }
    return;
  }

  const nameBtn = e.target.closest('.day-popup-task-name');
  if (nameBtn) {
    const board = boards.find(b => b.id === nameBtn.dataset.boardId);
    if (board) openModal(nameBtn.dataset.taskId, board);
    return;
  }

  const shutdownChoiceBtn = e.target.closest('.shutdown-choice-btn');
  if (shutdownChoiceBtn) {
    const choiceKey = shutdownChoiceBtn.closest('.shutdown-choices').dataset.choiceKey;
    const choice = shutdownChoices[choiceKey];
    if (choice) {
      choice.mode = shutdownChoiceBtn.dataset.mode;
      if (choice.mode === 'custom' && !choice.date) {
        choice.date = toKey(addDays(new Date(dayPopupDate + 'T00:00:00'), 1));
      }
      renderDayPopup();
    }
    return;
  }

  if (e.target.id === 'shutdownEnterBtn') { enterShutdownMode(); return; }
  if (e.target.id === 'shutdownBackBtn') { exitShutdownMode(); return; }
  if (e.target.id === 'shutdownApplyBtn') { applyShutdown(); return; }
});

dayPopupPanelEl.addEventListener('change', e => {
  if (e.target.classList.contains('day-popup-board-toggle')) {
    toggleBoardVisibility(e.target.dataset.boardId);
    return;
  }
  if (e.target.classList.contains('daypopup-chk-done')) {
    const board = boards.find(b => b.id === e.target.dataset.boardId);
    const t = board && findTask(e.target.dataset.taskId, board);
    if (t) {
      setCompleted(t, e.target.checked, board);
      save();
      refreshCalendarAndBoard();
      renderDayPopup();
    }
    return;
  }
  if (e.target.classList.contains('day-popup-group-select')) {
    dayPopupGrouping[e.target.dataset.boardId] = e.target.value;
    renderDayPopup();
    return;
  }
  if (e.target.classList.contains('shutdown-date-input')) {
    const choice = shutdownChoices[e.target.dataset.choiceKey];
    if (choice) { choice.mode = 'custom'; choice.date = e.target.value; }
    return;
  }
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
  return b.tasks.filter(t => keys.includes(t.date));
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

load();
