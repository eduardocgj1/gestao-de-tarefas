import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  tone?: 'danger' | 'brand' | 'neutral';
}
