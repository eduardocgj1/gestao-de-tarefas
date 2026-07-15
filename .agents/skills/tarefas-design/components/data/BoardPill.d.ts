import React from 'react';

export interface BoardPillProps {
  name: string;
  color: string;
  active?: boolean;
  checked?: boolean;
  showCheckbox?: boolean;
  compact?: boolean;
  onClick?: () => void;
}
