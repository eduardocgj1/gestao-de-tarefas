import React from 'react';

/** ProgressRing — small ring used in a day-column header to show task completion. */
export function ProgressRing({ size = 24, pct = 0 }) {
  // Visual approximation of the reference's border-based ring (top segment colored).
  const deg = Math.max(8, Math.min(352, (pct / 100) * 360));
  return (
    <span
      style={{
        width: size, height: size, borderRadius: '50%', display: 'inline-block',
        background: `conic-gradient(var(--brand) 0deg ${deg}deg, var(--border-subtle) ${deg}deg 360deg)`,
        position: 'relative',
      }}
    >
      <span style={{ position: 'absolute', inset: 3, borderRadius: '50%', background: 'var(--surface)' }} />
    </span>
  );
}
