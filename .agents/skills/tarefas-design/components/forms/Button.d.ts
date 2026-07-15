import React from 'react';

/** @startingPoint section="Components" subtitle="Dark / brand / neutral / soft-danger button" viewport="700x260" */
export interface ButtonProps {
  variant?: 'dark' | 'brand' | 'neutral' | 'brand-soft' | 'danger-soft';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
