import React from 'react';

/** Fab — floating action button, bottom-right of the calendar view ("+ novo evento"). */
export function Fab({ onClick, title, children = '+' }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 'var(--fab-size)', height: 'var(--fab-size)', borderRadius: '50%', border: 'none',
        background: hover ? 'var(--dark-action-hover)' : 'var(--dark-action)', color: '#fff',
        fontSize: 24, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: 'var(--shadow-fab)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
      }}
    >
      {children}
    </button>
  );
}
