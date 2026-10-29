import type { Recipient } from './Recipient';

export interface Stop {
  id: string;
  sequence: number;
  parcelBarcode: string;
  recipient: Recipient;
  status: 'pending' | 'completed' | 'failed';
}
