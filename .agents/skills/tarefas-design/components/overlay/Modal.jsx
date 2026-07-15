import React from 'react';

/** Modal — centered overlay dialog used for task/event/settings forms and the expanded day drawer. */
export function Modal({ width = 360, onClose, children, large = false }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: large ? 'var(--overlay-scrim-strong)' : 'var(--overlay-scrim)',
        zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn .15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto', background: 'var(--surface)',
          borderRadius: large ? 'var(--radius-modal-lg)' : 'var(--radius-modal)', padding: 22, position: 'relative',
          boxShadow: large ? 'var(--shadow-modal-lg)' : 'var(--shadow-modal)', animation: 'modalIn .18s ease',
          fontFamily: 'var(--font-sans)', boxSizing: 'border-box',
        }}
      >
        {children}
      </div>
    </div>
  );
}
