import React from 'react';

/** @startingPoint section="Components" subtitle="Centered dialog overlay" viewport="700x360" */
export interface ModalProps {
  width?: number;
  large?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}
