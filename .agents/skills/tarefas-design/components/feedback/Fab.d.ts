import React from 'react';

export interface FabProps {
  onClick?: () => void;
  title?: string;
  children?: React.ReactNode;
}
