import React from 'react';

/** Checkbox — native checkbox with the app's row layout + label pattern. */
export function Checkbox({ checked, onChange, label, readOnly = false }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: readOnly ? 'default' : 'pointer', fontFamily: 'var(--font-sans)' }}>
      <input type="checkbox" checked={checked} onChange={onChange} readOnly={readOnly} style={{ pointerEvents: readOnly ? 'none' : 'auto' }} />
      {label && <span style={{ font: '700 12.5px var(--font-sans)', color: 'var(--text-primary)' }}>{label}</span>}
    </label>
  );
}
