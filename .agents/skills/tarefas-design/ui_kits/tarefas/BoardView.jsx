// BoardView.jsx — day-columns board (main task-management view).
function TarefasBoardView({ days, onOpenDay, onOpenTask, onToggleTask }) {
  const { TaskCard, EventChip, ProgressRing } = window.TarefasDesignSystem_671953;
  return (
    <main style={{ flex: 1, display: 'flex', gap: 14, padding: '20px 26px', overflowX: 'auto', alignItems: 'flex-start' }}>
      {days.map((day) => (
        <div key={day.key} style={{ width: 236, minWidth: 236, background: 'var(--surface)', borderRadius: 'var(--radius-panel)', boxShadow: 'var(--shadow-card)', display: 'flex', flexDirection: 'column', maxHeight: '100%' }}>
          <div onClick={() => onOpenDay(day.key)} style={{ padding: '14px 15px 12px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ font: '700 13.5px var(--font-sans)', color: day.isToday ? 'var(--brand)' : 'var(--text-primary)' }}>{day.label}</span>
              <ProgressRing pct={day.pct} />
            </div>
            <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-tertiary)' }}>{day.summary}</div>
            <div style={{ font: '600 10.5px var(--font-sans)', color: 'var(--text-tertiary)', marginTop: 2 }}>{day.timeSummary}</div>
          </div>
          {day.events.length > 0 && (
            <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px dashed var(--border-subtle)' }}>
              {day.events.map((ev, i) => <EventChip key={i} {...ev} />)}
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 40 }}>
            {day.tasks.map((task) => (
              <TaskCard key={task.id} name={task.name} duration={task.duration} tag={task.tag} urgent={task.urgent} completed={task.completed} mit={task.mit}
                onOpen={() => onOpenTask(day.key, task.id)} onToggle={() => onToggleTask(day.key, task.id)} />
            ))}
          </div>
          <div style={{ padding: '8px 10px 12px' }}>
            <input placeholder="+ Nova tarefa" style={{ width: '100%', border: '1px solid var(--border-default)', borderRadius: 10, padding: '8px 10px', font: '500 12.5px var(--font-sans)', background: 'var(--surface-sunken)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      ))}
    </main>
  );
}
window.TarefasBoardView = TarefasBoardView;
