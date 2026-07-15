import React from 'react';

/** BoardPill — clickable board-identity chip (sidebar nav row or drawer checklist pill). */
export function BoardPill({ name, color, active = false, checked, showCheckbox = false, onClick, compact = false }) {
  if (showCheckbox) {
    return (
      <label
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-pill)', padding: '6px 12px 6px 8px', cursor: 'pointer',
          background: checked ? 'var(--surface-sunken)' : 'var(--surface)', opacity: checked ? 1 : 0.5,
          fontFamily: 'var(--font-sans)',
        }}
      >
        <input type="checkbox" checked={checked} readOnly style={{ pointerEvents: 'none' }} />
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ font: '600 12px var(--font-sans)', color: 'var(--text-primary)' }}>{name}</span>
      </label>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={name}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, border: 'none', cursor: 'pointer',
        padding: '9px 8px', borderRadius: 'var(--radius-xl)', textAlign: 'left',
        background: active ? 'var(--brand-soft)' : 'transparent',
        color: active ? 'var(--brand)' : 'var(--text-primary)',
        font: '600 13px var(--font-sans)', width: compact ? 'auto' : '100%',
      }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {!compact && <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>}
    </button>
  );
}
