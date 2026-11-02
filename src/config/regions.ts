import { featureFlags, type FeatureFlags } from './featureFlags';

export type Region = 'EU' | 'US';

export interface RegionConfig {
  region: Region;
  dispatchBaseUrl: string;
  offlineMode: boolean;
}

// Reserved domains keep the fixture app from reaching a live carrier tenant.
const dispatchBaseUrls: Record<Region, string> = {
  EU: 'https://dispatch.eu.waypoint.example.invalid/v1',
  US: 'https://dispatch.us.waypoint.example.invalid/v1',
};

export function createRegionConfig(
  region: Region,
  flags: FeatureFlags = featureFlags,
): RegionConfig {
  return {
    region,
    dispatchBaseUrl: dispatchBaseUrls[region],
    offlineMode: flags.offlineMode,
  };
}

export const regions: Record<Region, RegionConfig> = {
  EU: createRegionConfig('EU'),
  US: createRegionConfig('US'),
};

export const config: RegionConfig = regions.EU;
