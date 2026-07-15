import React from 'react';

/** TaskCard — the core unit of the day-column board: normal / urgent / completed task. */
export function TaskCard({ name, duration, tag, urgent = false, completed = false, mit = false, onToggle, onOpen }) {
  const accent = urgent ? 'var(--task-urgent-border)' : completed ? 'var(--task-done-border)' : 'var(--task-normal-border)';
  const bg = urgent ? 'var(--task-urgent-bg)' : completed ? 'var(--task-done-bg)' : 'var(--task-normal-bg)';
  return (
    <div
      onClick={onOpen}
      style={{
        borderRadius: 'var(--radius-xl)',
        padding: '9px 11px',
        cursor: 'pointer',
        borderLeft: `3px solid ${accent}`,
        background: bg,
        opacity: completed ? 0.55 : 1,
        fontFamily: 'var(--font-sans)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
        <input type="checkbox" checked={completed} onChange={onToggle} onClick={(e) => e.stopPropagation()} style={{ marginTop: 2 }} />
        <div style={{ flex: 1, font: '600 13px var(--font-sans)', color: 'var(--text-primary)', textDecoration: completed ? 'line-through' : 'none', wordBreak: 'break-word' }}>{name}</div>
        {mit && <span title="Prioridade do dia" style={{ fontSize: 12 }}>⭐</span>}
        {urgent && <span style={{ font: '700 9px var(--font-sans)', color: 'var(--danger)' }}>URGENTE</span>}
      </div>
      {(duration || tag) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 5, font: 'var(--font-meta)', color: 'var(--text-meta)' }}>
          {duration && <span>⏱ {duration}</span>}
          {tag && <span>{tag}</span>}
        </div>
      )}
    </div>
  );
}
