import React from 'react';

/** Input — text/date/number field used in task, event, and settings forms. */
export function Input({ label, type = 'text', value, placeholder, onChange, style, big = false }) {
  const field = (
    <input
      type={type}
      defaultValue={value}
      placeholder={placeholder}
      onChange={onChange}
      style={
        big
          ? { width: '100%', border: 'none', font: '700 17px var(--font-sans)', padding: 0, outline: 'none' }
          : {
              display: 'block',
              width: '100%',
              marginTop: label ? 5 : 0,
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-lg)',
              padding: '9px 10px',
              font: '500 13px var(--font-sans)',
              background: 'var(--surface-sunken)',
              outline: 'none',
              fontFamily: 'var(--font-sans)',
              boxSizing: 'border-box',
              ...style,
            }
      }
    />
  );
  if (!label) return field;
  return (
    <label style={{ display: 'block', font: 'var(--font-section-label)', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-label)' }}>
      {label}
      {field}
    </label>
  );
}
