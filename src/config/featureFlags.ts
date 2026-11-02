export interface FeatureFlags {
  offlineMode: boolean;
}

export const featureFlags = {
  offlineMode: false,
} as const;
