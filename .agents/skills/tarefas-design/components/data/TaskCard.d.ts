import React from 'react';

/** @startingPoint section="Components" subtitle="Normal / urgent / completed task card" viewport="700x220" */
export interface TaskCardProps {
  name: string;
  duration?: string;
  tag?: string;
  urgent?: boolean;
  completed?: boolean;
  mit?: boolean;
  onToggle?: () => void;
  onOpen?: () => void;
}
