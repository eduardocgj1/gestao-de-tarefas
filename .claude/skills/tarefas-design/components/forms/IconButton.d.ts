import React from 'react';

export interface IconButtonProps {
  size?: number;
  active?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
