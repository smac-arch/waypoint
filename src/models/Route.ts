import type { Stop } from './Stop';

export interface Route {
  id: string;
  serviceDate: string;
  stops: Stop[];
}
