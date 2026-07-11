
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function migrate() {
  const raw = fs.readFileSync(path.join(__dirname, 'data.json'), 'utf8');
  const data = JSON.parse(raw);
  const { boards = [], calendarEvents = [], people = [],
          activeBoardId, pomodoroSettings, pomodoro, exportViews = {} } = data;

  console.log(`Migrando ${boards.length} boards, ${boards.reduce((a,b)=>a+(b.tasks||[]).length,0)} tasks, ${calendarEvents.length} eventos, ${people.length} pessoas...`);

  // 1. Boards
  const { error: e1 } = await supabase.from('boards').upsert(
    boards.map(b => ({ id: b.id, name: b.name, color: b.color || null, fields: b.fields || [] })),
    { onConflict: 'id' }
  );
  if (e1) throw new Error('Boards: ' + e1.message);
  console.log('✓ Boards inseridos');

  // 2. Tasks
  const allTasks = boards.flatMap(b => (b.tasks || []).map(t => ({
    id: t.id, board_id: b.id, name: t.name,
    task_date: t.date || null, delivery_date: t.deliveryDate || null,
    link: t.link || '', duration: t.duration ?? 0, priority: t.priority ?? null,
    urgent: t.urgent ?? false, urgent_rank: t.urgentRank ?? 0,
    delegated: t.delegated ?? false, delegated_to: t.delegatedTo || '',
    delegated_date: t.delegatedDate || null, completed: t.completed ?? false,
    created_at: t.createdAt ?? null, completed_at: t.completedAt ?? null,
    field_values: t.fieldValues ?? {}, team: t.team ?? [],
  })));
  if (allTasks.length > 0) {
    const { error: e2 } = await supabase.from('tasks').upsert(allTasks, { onConflict: 'id' });
    if (e2) throw new Error('Tasks: ' + e2.message);
  }
  console.log(`✓ ${allTasks.length} tasks inseridas`);

  // 3. Calendar events
  if (calendarEvents.length > 0) {
    const { error: e3 } = await supabase.from('calendar_events').upsert(
      calendarEvents.map(e => ({
        id: e.id, name: e.name,
        start_date: e.startDate || null, end_date: e.endDate || null,
        board_ids: e.boardIds ?? [], is_holiday: e.isHoliday ?? false,
      })),
      { onConflict: 'id' }
    );
    if (e3) throw new Error('Events: ' + e3.message);
  }
  console.log(`✓ ${calendarEvents.length} eventos inseridos`);

  // 4. People
  if (people.length > 0) {
    const { error: e4 } = await supabase.from('people').upsert(people, { onConflict: 'id' });
    if (e4) throw new Error('People: ' + e4.message);
  }
  console.log(`✓ ${people.length} pessoas inseridas`);

  // 5. App state
  const { error: e5 } = await supabase.from('app_state').upsert([
    { key: 'activeBoardId',    value: activeBoardId    ?? null },
    { key: 'pomodoroSettings', value: pomodoroSettings ?? {} },
    { key: 'pomodoro',         value: pomodoro         ?? {} },
    { key: 'exportViews',      value: exportViews      ?? {} },
  ], { onConflict: 'key' });
  if (e5) throw new Error('AppState: ' + e5.message);
  console.log('✓ Estado do app inserido');

  console.log('\n✅ Migração concluída!');
}

migrate().catch(err => { console.error('❌ Erro:', err.message); process.exit(1); });
