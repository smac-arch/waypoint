import type { Stop } from '../models/Stop';

export const sampleStop: Stop = {
  id: 'stop-sample-012',
  sequence: 12,
  parcelBarcode: 'SAMPLE-PARCEL-012',
  recipient: {
    name: 'Sample Recipient',
    address: 'Kerkstraat 12, Sampletown',
    phone: '+1-202-555-0142',
  },
  status: 'pending',
};
