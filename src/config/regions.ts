export type Region = 'EU' | 'US';

export interface RegionConfig {
  region: Region;
  dispatchBaseUrl: string;
}

// Reserved domains keep the fixture app from reaching a live carrier tenant.
export const regions: Record<Region, RegionConfig> = {
  EU: {
    region: 'EU',
    dispatchBaseUrl: 'https://dispatch.eu.waypoint.example.invalid/v1',
  },
  US: {
    region: 'US',
    dispatchBaseUrl: 'https://dispatch.us.waypoint.example.invalid/v1',
  },
};

export const config: RegionConfig = regions.EU;
