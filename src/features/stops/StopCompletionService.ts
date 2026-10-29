import type { DispatchApiClient } from '../../api/DispatchApiClient';
import type { ProofOfDelivery } from '../../models/ProofOfDelivery';
import type { Stop } from '../../models/Stop';
import type { Logger } from '../../platform/Logger';
import type { CaptureDevice } from '../../platform/NativeBridge';
import {
  type NetworkMonitor,
  OfflineError,
} from '../../platform/NetworkMonitor';
import type { SecureStorage } from '../../platform/SecureStorage';

interface PendingCapture {
  stopId: string;
  photoKey: string;
  capturedAt: string;
  signatureBase64?: string;
}

interface Dependencies {
  api: Pick<DispatchApiClient, 'uploadProofOfDelivery' | 'completeStop'>;
  network: Pick<NetworkMonitor, 'isOnline'>;
  storage: Pick<SecureStorage, 'setItem' | 'getItem' | 'removeItem'>;
  captures: CaptureDevice;
  logger: Pick<Logger, 'info'>;
}

export class StopCompletionService {
  // Known risk: [INC-2026-031](../../../docs/incidents/INC-2026-031.md).
  // Photos are encrypted on disk, but signatures and their photo references die
  // with the process. TODO(offline-mode): replace pendingCaptures with a persistent
  // outbound queue per ADR-014; do not silently discard unsynced media.
  readonly pendingCaptures: PendingCapture[] = [];
  private readonly scanned = new Set<string>();
  private readonly busy = new Set<string>();
  private readonly uploaded = new Map<
    string,
    { proof: ProofOfDelivery; photoKey: string }
  >();

  constructor(private readonly deps: Dependencies) {}

  private async action<T>(stopId: string, work: () => Promise<T>): Promise<T> {
    if (this.busy.has(stopId))
      throw new Error('A stop action is already running.');
    this.busy.add(stopId);
    try {
      if (!(await this.deps.network.isOnline())) throw new OfflineError();
      return await work();
    } catch (error) {
      this.deps.logger.info('stop.action_failed', { stopId });
      throw error;
    } finally {
      this.busy.delete(stopId);
    }
  }

  async scan(stop: Stop): Promise<void> {
    await this.action(stop.id, async () => {
      if (stop.status !== 'pending')
        throw new Error('This stop is not pending.');
      const barcode = await this.deps.captures.scanParcel();
      if (barcode !== stop.parcelBarcode) {
        throw new Error('The scanned parcel does not belong to this stop.');
      }
      this.scanned.add(stop.id);
      this.deps.logger.info('stop.scan_verified', { stopId: stop.id });
    });
  }

  async takePhoto(stopId: string): Promise<void> {
    await this.action(stopId, async () => {
      if (!this.scanned.has(stopId)) throw new Error('Scan the parcel first.');
      if (this.uploaded.has(stopId)) {
        throw new Error(
          'Proof is already uploaded. Retry completing the stop.',
        );
      }
      if (this.pendingCaptures.some((capture) => capture.stopId === stopId)) {
        throw new Error('A photo has already been captured for this stop.');
      }
      const photo = await this.deps.captures.takePhoto();
      if (!photo) throw new Error('A photo is required.');
      const photoKey = `pod-photo:${stopId}`;
      await this.deps.storage.setItem(photoKey, photo);
      this.pendingCaptures.push({
        stopId,
        photoKey,
        capturedAt: new Date().toISOString(),
      });
    });
  }

  async captureSignature(stopId: string): Promise<void> {
    await this.action(stopId, async () => {
      const capture = this.pendingCaptures.find(
        (item) => item.stopId === stopId,
      );
      if (!capture)
        throw new Error('Take a photo before capturing a signature.');
      const signature = await this.deps.captures.captureSignature();
      if (!signature) throw new Error('A signature is required.');
      capture.signatureBase64 = signature;
    });
  }

  async completeStop(stopId: string): Promise<void> {
    await this.action(stopId, async () => {
      let uploaded = this.uploaded.get(stopId);
      if (!uploaded) {
        const capture = this.pendingCaptures.find(
          (item) => item.stopId === stopId,
        );
        if (!capture?.signatureBase64) {
          throw new Error('Scan, photo and signature are required.');
        }
        const photo = await this.deps.storage.getItem(capture.photoKey);
        if (!photo) throw new Error('The encrypted photo could not be found.');
        const proof = await this.deps.api.uploadProofOfDelivery(stopId, {
          photoBase64: photo,
          signatureBase64: capture.signatureBase64,
          capturedAt: capture.capturedAt,
        });
        uploaded = { proof, photoKey: capture.photoKey };
        this.uploaded.set(stopId, uploaded);
        this.pendingCaptures.splice(this.pendingCaptures.indexOf(capture), 1);
        this.deps.logger.info('stop.proof_uploaded', { stopId });
      }
      // Keep the receipt on cleanup/completion failure so foreground retries do
      // not upload the same proof again within this process.
      await this.deps.storage.removeItem(uploaded.photoKey);
      await this.deps.api.completeStop(stopId, uploaded.proof.id);
      this.uploaded.delete(stopId);
      this.scanned.delete(stopId);
      this.deps.logger.info('stop.completed', { stopId });
    });
  }

  async completeDelivery(stop: Stop): Promise<void> {
    await this.scan(stop);
    await this.takePhoto(stop.id);
    await this.captureSignature(stop.id);
    await this.completeStop(stop.id);
  }
}
