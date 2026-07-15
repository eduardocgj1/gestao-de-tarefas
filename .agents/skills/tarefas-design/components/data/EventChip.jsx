import React from 'react';

/** EventChip — calendar-event pill shown above a day column's tasks or inside a calendar cell. */
export function EventChip({ name, dotColor = 'var(--brand)', bg = 'var(--brand-soft)', textColor = 'var(--text-primary)', span }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, font: '600 11px var(--font-sans)', color: textColor, background: bg, borderRadius: 8, padding: '5px 8px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {span && <span style={{ font: '600 9.5px var(--font-sans)', color: 'var(--text-tertiary)' }}>{span}</span>}
    </div>
  );
}
