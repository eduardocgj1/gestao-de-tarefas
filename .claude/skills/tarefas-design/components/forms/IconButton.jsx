import React from 'react';

/** IconButton — square glyph-only button (settings gear, drawer close, nav arrows). */
export function IconButton({ size = 32, active = false, onClick, title, children, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: 'none',
        width: size,
        height: size,
        borderRadius: 'var(--radius-lg)',
        background: active ? 'var(--brand-soft)' : (hover ? 'var(--surface-neutral-button-hover)' : 'var(--surface-neutral-button)'),
        color: active ? 'var(--brand)' : 'var(--text-secondary)',
        fontSize: size >= 32 ? 14 : 13,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-sans)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
