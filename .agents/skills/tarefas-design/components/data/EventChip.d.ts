import React from 'react';

export interface EventChipProps {
  name: string;
  dotColor?: string;
  bg?: string;
  textColor?: string;
  /** e.g. "1/2" for a multi-day event span */
  span?: string;
}
