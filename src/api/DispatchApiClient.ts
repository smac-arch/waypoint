import type { RegionConfig } from '../config/regions';
import type { FailedDeliveryReason } from '../models/FailedDeliveryReason';
import type {
  ProofOfDelivery,
  ProofOfDeliveryUpload,
} from '../models/ProofOfDelivery';
import type { Route } from '../models/Route';
import { NetworkMonitor, OfflineError } from '../platform/NetworkMonitor';

export class DispatchApiError extends Error {
  constructor(readonly status: number) {
    // Never include response bodies or URLs; they may contain recipient data.
    super(`Dispatch request failed (HTTP ${status}).`);
    this.name = 'DispatchApiError';
  }
}

/** Foreground, awaited requests only. No retries, background sync or offline cache. */
export class DispatchApiClient {
  constructor(
    private readonly config: RegionConfig,
    private readonly network: Pick<NetworkMonitor, 'isOnline'>,
    private readonly transport: typeof fetch = fetch,
  ) {}

  private async request(path: string, body?: unknown): Promise<Response> {
    if (!(await this.network.isOnline())) throw new OfflineError();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await this.transport(
        `${this.config.dispatchBaseUrl}${path}`,
        {
          method: body === undefined ? 'GET' : 'POST',
          headers: {
            Accept: 'application/json',
            ...(body === undefined
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new DispatchApiError(response.status);
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getRoute(routeId: string): Promise<Route> {
    const response = await this.request(
      `/routes/${encodeURIComponent(routeId)}`,
    );
    return response.json();
  }

  async uploadProofOfDelivery(
    stopId: string,
    proof: ProofOfDeliveryUpload,
  ): Promise<ProofOfDelivery> {
    const response = await this.request(
      `/stops/${encodeURIComponent(stopId)}/proof-of-delivery`,
      proof,
    );
    return response.json();
  }

  async completeStop(stopId: string, proofId: string): Promise<void> {
    await this.request(`/stops/${encodeURIComponent(stopId)}/complete`, {
      proofId,
    });
  }

  async reportFailedDelivery(
    stopId: string,
    reason: FailedDeliveryReason,
  ): Promise<void> {
    await this.request(`/stops/${encodeURIComponent(stopId)}/failed`, {
      reason,
    });
  }
}
