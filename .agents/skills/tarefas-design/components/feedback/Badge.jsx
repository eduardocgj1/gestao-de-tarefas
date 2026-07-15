import React from 'react';

/** Badge — small text label; URGENTE task marker is the only current usage. */
export function Badge({ children, tone = 'danger' }) {
  const tones = { danger: 'var(--danger)', brand: 'var(--brand)', neutral: 'var(--text-secondary)' };
  return <span style={{ font: '700 9px var(--font-sans)', color: tones[tone] || tones.danger, letterSpacing: '.02em' }}>{children}</span>;
}
