import React from 'react';

/**
 * Button — primary actions across Tarefas: default (dark), brand (green),
 * neutral (sand), and destructive-soft (terracotta) variants.
 */
export function Button({
  variant = 'neutral',
  size = 'md',
  disabled = false,
  onClick,
  children,
  style,
  ...rest
}) {
  const variants = {
    dark: { background: 'var(--dark-action)', color: 'var(--text-on-dark)', hoverBg: 'var(--dark-action-hover)' },
    brand: { background: 'var(--brand)', color: '#fff', hoverBg: 'var(--brand-hover)' },
    neutral: { background: 'var(--surface-neutral-button)', color: 'var(--text-primary)', hoverBg: 'var(--surface-neutral-button-hover)' },
    'brand-soft': { background: 'var(--brand-soft)', color: 'var(--brand)', hoverBg: 'var(--brand-soft-hover)' },
    'danger-soft': { background: 'var(--danger-button-bg)', color: 'var(--danger)', hoverBg: 'var(--danger-soft)' },
  };
  const sizes = {
    sm: { padding: '7px 12px', font: '700 11px var(--font-sans)', borderRadius: 'var(--radius-md)' },
    md: { padding: '11px 16px', font: 'var(--font-button)', borderRadius: 'var(--radius-2xl)' },
    lg: { padding: '12px', font: 'var(--font-button)', borderRadius: 'var(--radius-2xl)' },
  };
  const v = variants[variant] || variants.neutral;
  const s = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: hover && !disabled ? v.hoverBg : v.background,
        color: v.color,
        padding: s.padding,
        font: s.font,
        borderRadius: s.borderRadius,
        fontFamily: 'var(--font-sans)',
        transition: 'background .1s ease',
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
