// CalendarView.jsx — monthly grid with event chips + FAB to add an event.
function TarefasCalendarView({ cells, onOpenDay, onOpenEventModal }) {
  const { Fab } = window.TarefasDesignSystem_671953;
  const dow = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return (
    <main style={{ flex: 1, overflowY: 'auto', padding: '20px 26px', position: 'relative' }}>
      <div style={{ position: 'absolute', right: 34, bottom: 24, zIndex: 5 }}>
        <Fab title="Novo evento" onClick={onOpenEventModal} />
      </div>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-panel)', boxShadow: 'var(--shadow-card)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid var(--border-subtle)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
          {dow.map((d) => <span key={d} style={{ padding: '12px 0', textAlign: 'center', font: '700 10.5px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{d}</span>)}
        </div>
        <div style={{ padding: '16px 16px 6px', font: '700 14px var(--font-sans)', color: 'var(--text-primary)' }}>Julho 2026</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((cell, i) => (
            <div key={i} onClick={() => onOpenDay(cell.key)} style={{ minHeight: 100, borderTop: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)', padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer', background: cell.outside ? 'var(--surface-sunken)' : 'var(--surface)' }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '700 11.5px var(--font-sans)', background: cell.today ? 'var(--brand)' : 'transparent', color: cell.today ? '#fff' : (cell.outside ? 'var(--sand-700)' : 'var(--text-secondary)') }}>{cell.num}</span>
              {cell.events.map((ev, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 4, font: '600 10px var(--font-sans)', color: ev.textColor, background: ev.bg, borderRadius: 6, padding: '3px 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: ev.dot, flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
window.TarefasCalendarView = TarefasCalendarView;
