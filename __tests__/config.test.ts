import { featureFlags } from '../src/config/featureFlags';
import { createRegionConfig, regions } from '../src/config/regions';

describe('region configuration', () => {
  it.each(['EU', 'US'] as const)(
    '%s defaults offlineMode to the disabled feature flag',
    (region) => {
      expect(regions[region]).toEqual(
        expect.objectContaining({
          region,
          offlineMode: featureFlags.offlineMode,
          dispatchBaseUrl: expect.stringContaining(
            `${region.toLowerCase()}.waypoint.example.invalid`,
          ),
        }),
      );
    },
  );

  it.each(['EU', 'US'] as const)(
    '%s supports enabling and disabling offlineMode',
    (region) => {
      expect(
        createRegionConfig(region, { offlineMode: true }).offlineMode,
      ).toBe(true);
      expect(
        createRegionConfig(region, { offlineMode: false }).offlineMode,
      ).toBe(false);
    },
  );
});
