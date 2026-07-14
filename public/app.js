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
  activities = data.activities || [];
  activities.forEach(a => { if (!a.checklistTasks) a.checklistTasks = []; });

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
  initWeather();
}
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ boards, activeBoardId, pomodoroSettings, pomodoro, calendarEvents, people, exportViews, activities }) });
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
  sidebarActivitiesItemEl.classList.toggle('active', currentView === 'activities');
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
  const titles = { calendar: 'Calendário', activities: 'Atividades' };
  document.getElementById('appTitle').textContent = titles[currentView] || (currentBoard() ? currentBoard().name : 'Tarefas 2026');
}

// ---------- view mode (board vs calendário vs atividades) ----------
function setView(view) {
  currentView = view;
  const isCalendar = view === 'calendar';
  const isActivities = view === 'activities';
  const isBoard = view === 'board';
  document.getElementById('board').classList.toggle('hidden', !isBoard);
  document.getElementById('calendarView').classList.toggle('hidden', !isCalendar);
  document.getElementById('activitiesView').classList.toggle('hidden', !isActivities);
  document.getElementById('boardLegend').classList.toggle('hidden', !isCalendar);
  document.getElementById('navBoardControls').classList.toggle('hidden', !isBoard);
  document.getElementById('navCalendarControls').classList.toggle('hidden', !isCalendar);
  document.getElementById('navActivitiesControls').classList.toggle('hidden', !isActivities);
  document.getElementById('exportReportBtn').classList.toggle('hidden', !isBoard);
  updateAppTitle();
  renderSidebar();
  if (isCalendar) {
    renderBoardLegend();
    initCalendarIfNeeded();
  } else if (isActivities) {
    renderActivities();
    fetchHolidays();
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
      ${items.map(t => cardHtml(t, false, currentBoard())).join('')}
    </div>
  </div>`;
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
      ${orderedItems.map(t => cardHtml(t, mitIds.includes(t.id), currentBoard())).join('')}
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

function cardHtml(t, isMit = false, board = currentBoard()) {
  const cls = ['card', t.urgent ? 'urgent' : 'normal', t.completed ? 'completed' : '', isMit ? 'mit' : ''].join(' ');
  const fields = (board && board.fields) || [];
  const fieldTags = fields.map(f => (t.fieldValues && t.fieldValues[f.id]) ? fieldTagHtml(f.id, t.fieldValues[f.id], board) : '').join('');
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
    if (t) return { task: t, source: 'checklist', board: null, activity: a };
  }
  return null;
}

// Resolve a tarefa/board/atividade da tarefa atualmente aberta no modal de edição (editingId),
// via findTaskAnywhere() — funciona tanto para tarefas de board quanto de checklist. Para
// tarefas de checklist (source === 'checklist'), `board` retorna um objeto sintético com
// `.tasks: []` para que funções que esperam `board.tasks` (ex.: setPriority/setCompleted) não
// quebrem; elas simplesmente não encontram irmãos para reordenar, o que é o comportamento correto
// para uma tarefa que ainda não está em nenhuma coluna do board.
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
      id: uid(), name: t.name, date: dateKey, deliveryDate: dateKey, link: t.link, duration: 0,
      priority: normalMax + 1, urgent: false, urgentRank: 0,
      delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
      fieldValues: {}, team: [],
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
  const found = board ? { task: findTask(id, board), source: 'board', board, activity: null } : findTaskAnywhere(id);
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
  f.duration.value = t.duration || 0;
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
  weatherSearchOpen = false;
  weatherSearchQuery = '';
  weatherSearchResults = [];
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
  renderWeatherInDayPopup(dayPopupDate);
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

dayPopupPanelEl.addEventListener('input', e => {
  if (e.target.id !== 'weatherCityInput') return;
  weatherSearchQuery = e.target.value;
  clearTimeout(weatherSearchTimer);
  weatherSearchTimer = setTimeout(async () => {
    weatherSearchResults = await searchCity(weatherSearchQuery);
    renderWeatherCityResults();
  }, 400);
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

function groupActivitiesByCategory(list) {
  const groups = new Map();
  list.forEach(a => {
    const key = a.categoria || 'Sem categoria';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(a);
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

const ACTIVITY_STATUS_LABELS = { rascunho: 'Rascunho', quero_fazer: 'Quero fazer', planejada: 'Planejada' };

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
  const vibes = a.vibes || [];
  const vibeChips = vibes.slice(0, 3).map(v => `<span class="tag activity-tag-vibe">${escapeHtml(v)}</span>`).join('');
  const vibeMore = vibes.length > 3 ? `<span class="tag activity-tag-more">+${vibes.length - 3}</span>` : '';
  const activeVariation = getActiveVariation(a);
  const cost = activityCostSummaryHtml(a);
  const realCount = (a.realizacoes || []).length;
  const durChips = (a.modalidadesDuracao || []).map(m => `<span class="tag activity-tag-duracao">${escapeHtml(m)}</span>`).join('');

  return `
  <div class="activity-card" data-id="${a.id}">
    ${a.fotoCapa ? `<div class="activity-card-cover" style="background-image:url('${a.fotoCapa}')"></div>` : ''}
    <div class="activity-card-top">
      <div class="activity-card-name">${escapeHtml(a.name)}</div>
      <span class="tag activity-tag-status activity-status-${a.status}">${ACTIVITY_STATUS_LABELS[a.status] || a.status}</span>
    </div>
    <div class="activity-card-chips">
      <span class="tag activity-tag-categoria">${escapeHtml(a.categoria)}</span>
      ${vibeChips}${vibeMore}
      ${activeVariation ? `<span class="tag activity-tag-variation">🕓 ${escapeHtml(activeVariation.nome)}</span>` : ''}
      ${realCount > 0 ? `<span class="tag activity-tag-realized">Realizada ${realCount}×</span>` : ''}
    </div>
    <div class="activity-card-meta">
      ${cost ? `<span class="activity-card-cost">${cost}</span>` : ''}
      ${durChips}
    </div>
  </div>`;
}

function activityGroupHtml(categoria, list) {
  return `
  <section class="activity-group">
    <h2 class="activity-group-title">${escapeHtml(categoria)}</h2>
    <div class="activity-group-grid">
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
  const groups = groupActivitiesByCategory(filtered);
  const groupsHtml = [...groups.entries()].map(([categoria, list]) => activityGroupHtml(categoria, list)).join('');

  container.innerHTML = banner + (groupsHtml || activitiesEmptyStateHtml());
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
    perfisCusto: {}, variacoes: [], notas: null, links: [],
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

function openActivityQuickCreate() {
  document.getElementById('activityQuickName').value = '';
  const sel = document.getElementById('activityQuickCategoria');
  sel.innerHTML = ACTIVITY_CATEGORIES.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = ACTIVITY_CATEGORIES[0];
  document.getElementById('activityQuickCategoriaCustomField').classList.add('hidden');
  document.getElementById('activityQuickCategoriaCustom').value = '';
  document.getElementById('activityQuickCategoriaCustomList').innerHTML =
    customCategoriesInUse().map(c => `<option value="${escapeHtml(c)}">`).join('');
  document.getElementById('activityQuickCreateOverlay').classList.remove('hidden');
  document.getElementById('activityQuickName').focus();
}
function closeActivityQuickCreate() {
  document.getElementById('activityQuickCreateOverlay').classList.add('hidden');
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

function activityVariationCardHtml(v, isActive) {
  const rows = ACTIVITY_VARIATION_MERGE_FIELDS
    .filter(f => v[f] != null && !(Array.isArray(v[f]) && !v[f].length))
    .map(f => detailRow(f, Array.isArray(v[f]) ? v[f] : String(v[f])))
    .join('');
  return `
  <div class="activity-variation-card${isActive ? ' active' : ''}" data-id="${v.id}">
    <div class="activity-variation-card-header">
      <strong>${escapeHtml(v.nome)}</strong>${isActive ? ' <span class="tag activity-tag-variation">Ativa agora</span>' : ''}
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
    ${variations.length ? variations.map(v => activityVariationCardHtml(v, active && active.id === v.id)).join('') : '<div class="activity-detail-empty">Nenhuma variação sazonal cadastrada.</div>'}
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
    ${detailRow('Data de início', a.dataInicio)}
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
  if (a.status !== 'rascunho') {
    buttons.push(`<button type="button" class="btn-neutral activity-realize-btn" data-id="${a.id}">Marcar como realizada</button>`);
  }
  buttons.push(`<button type="button" class="btn-neutral activity-delete-btn" data-id="${a.id}">Excluir atividade</button>`);
  return buttons.join('');
}

function openActivityDetail(id) {
  const a = findActivity(id);
  if (!a) return;
  activityDetailId = id;
  document.getElementById('activityDetailTitle').textContent = a.name;
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
      setCompleted(t, chk.checked, { tasks: a.checklistTasks });
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
        x.checklistTasks.push({
          id: uid(), name, date: null, deliveryDate: null, link: '', duration: 0,
          priority: null, urgent: false, urgentRank: 0,
          delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: Date.now(),
          fieldValues: {}, team: [], boardId: null, activityId: a.id,
          antecedenciaMiniDias: mini === '' ? null : Number(mini),
          antecedenciaRecDias: rec === '' ? null : Number(rec),
          antecedenciaMaxDias: max === '' ? null : Number(max),
        });
      });
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
        setCompleted(t, e.target.checked, { tasks: a.checklistTasks });
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
function computeChecklistPromotionPreview(a, dataInicio) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const inicio = new Date(dataInicio + 'T00:00:00');
  return (a.checklistTasks || []).map(t => {
    let taskDate = null;
    if (t.antecedenciaMiniDias != null) {
      const d = new Date(inicio);
      d.setDate(d.getDate() - t.antecedenciaMiniDias);
      taskDate = d < today ? toKey(today) : toKey(d);
    }
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

// Registra (ou edita) uma realização: adiciona/atualiza `activity.realizacoes` e volta o status
// para quero_fazer, independentemente do status anterior — permite realizar novamente depois.
function confirmActivityRealization() {
  const a = findActivity(activityDetailId);
  if (!a) return;
  const data = document.getElementById('real-data').value;
  const today = toKey(new Date());
  if (!data || data > today) { alert('A data realizada deve ser hoje ou uma data passada.'); return; }
  const gastoRaw = document.getElementById('real-gasto').value;
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
  a.status = 'quero_fazer';
  a.updatedAt = Date.now();
  save();
  closeActivityRealization();
  openActivityDetail(a.id);
  renderActivities();
}

document.getElementById('closeActivityRealization').addEventListener('click', closeActivityRealization);
document.getElementById('activityRealizationCancelBtn').addEventListener('click', closeActivityRealization);
document.getElementById('activityRealizationOverlay').addEventListener('click', e => { if (e.target.id === 'activityRealizationOverlay') closeActivityRealization(); });
document.getElementById('activityRealizationConfirmBtn').addEventListener('click', confirmActivityRealization);

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
    id: uid(), name: c.name, date: null, deliveryDate: null, link: '', duration: 0,
    priority: null, urgent: false, urgentRank: 0,
    delegated: false, delegatedTo: '', delegatedDate: '', completed: false, createdAt: now,
    fieldValues: {}, team: [], boardId: null, activityId,
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

load();
