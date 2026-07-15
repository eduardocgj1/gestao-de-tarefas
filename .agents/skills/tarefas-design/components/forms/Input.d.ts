import React from 'react';

export interface InputProps {
  label?: string;
  type?: 'text' | 'date' | 'number';
  value?: string | number;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  big?: boolean;
  style?: React.CSSProperties;
}
