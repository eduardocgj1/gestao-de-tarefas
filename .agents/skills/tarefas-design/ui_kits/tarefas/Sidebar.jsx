// Sidebar.jsx — Tarefas app: board nav, calendar nav, pomodoro widget.
// Plain global-scope component (not a DS-bundled primitive) built from DS components.
function TarefasSidebar({ open, onToggle, boards, activeBoardId, onSelectBoard, view, onSelectCalendar, addingBoard, onStartAddBoard, onCancelAddBoard, pomoExpanded, onTogglePomo }) {
  const { IconButton } = window.TarefasDesignSystem_671953;
  return (
    <aside style={{ width: open ? 236 : 64, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', padding: '16px 0', transition: 'var(--transition-sidebar)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 16px', marginBottom: 8, borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--brand)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14 }}>T</div>
        {open && <span style={{ font: '700 14.5px var(--font-sans)', whiteSpace: 'nowrap' }}>Tarefas</span>}
        <div style={{ flex: 1 }} />
        {open && <IconButton size={26} onClick={onToggle}>‹</IconButton>}
      </div>
      {!open && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 12px' }}>
          <IconButton size={32} onClick={onToggle}>›</IconButton>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px', overflowY: 'auto' }}>
        {open && <div style={{ font: '700 10px var(--font-sans)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.06em', padding: '8px 8px 6px' }}>Boards</div>}
        {boards.map((b) => (
          <button key={b.id} type="button" onClick={() => onSelectBoard(b.id)} title={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', padding: '9px 8px', borderRadius: 10, textAlign: 'left', background: activeBoardId === b.id ? 'var(--brand-soft)' : 'transparent', color: activeBoardId === b.id ? 'var(--brand)' : 'var(--text-primary)', font: '600 13px var(--font-sans)' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
            {open && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</span>}
          </button>
        ))}
        {!addingBoard ? (
          <button type="button" onClick={onStartAddBoard} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', background: 'transparent', cursor: 'pointer', padding: '9px 8px', borderRadius: 10, textAlign: 'left', color: 'var(--text-tertiary)', font: '600 13px var(--font-sans)' }}>
            <span style={{ width: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>+</span>
            {open && <span>Novo board</span>}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px' }}>
            <input autoFocus placeholder="Nome do board" style={{ flex: 1, minWidth: 0, border: '1px solid var(--brand)', borderRadius: 8, padding: '6px 8px', font: '600 12.5px var(--font-sans)', background: '#fff', outline: 'none' }} />
            <button type="button" onClick={onCancelAddBoard} style={{ border: 'none', background: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
          </div>
        )}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '10px 4px' }} />
        <button type="button" onClick={onSelectCalendar} style={{ display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer', padding: '9px 8px', borderRadius: 10, textAlign: 'left', background: view === 'calendar' ? 'var(--brand-soft)' : 'transparent', color: view === 'calendar' ? 'var(--brand)' : 'var(--text-primary)', font: '600 13px var(--font-sans)' }}>
          <span style={{ width: 16, height: 16, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 13, height: 12, border: '1.5px solid currentColor', borderRadius: 3, position: 'relative', display: 'block' }}>
              <span style={{ position: 'absolute', top: 3, left: 0, right: 0, height: 1.5, background: 'currentColor' }} />
            </span>
          </span>
          {open && <span>Calendário</span>}
        </button>
      </div>
      <div style={{ padding: 10, marginTop: 'auto' }}>
        <div style={{ border: '1px solid var(--border-default)', borderRadius: 14, padding: open ? 12 : '10px 6px', background: 'var(--surface-sunken)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={onTogglePomo}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)', flexShrink: 0 }} />
            {open && <span style={{ font: '600 11.5px var(--font-sans)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Foco</span>}
            <div style={{ flex: 1 }} />
            {open && <span style={{ font: '700 15px var(--font-sans)', color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>24:12</span>}
          </div>
          {open && pomoExpanded && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, background: 'var(--brand)', color: '#fff', font: '600 10.5px var(--font-sans)' }}>Foco</span>
                <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, color: 'var(--text-tertiary)', font: '600 10.5px var(--font-sans)' }}>Curta</span>
                <span style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 7, color: 'var(--text-tertiary)', font: '600 10.5px var(--font-sans)' }}>Longa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--dark-action)', color: '#fff', fontSize: 11, cursor: 'pointer' }}>▶</button>
                <button type="button" style={{ width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 13, cursor: 'pointer' }}>↺</button>
                <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand)' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--sand-500)' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--sand-500)' }} />
                  <span style={{ width: 6, height: 6, borderRadius: '50%', border: '1px solid var(--sand-500)' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
window.TarefasSidebar = TarefasSidebar;
