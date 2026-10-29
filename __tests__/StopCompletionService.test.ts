import { captures } from '../__mocks__/react-native';
import { emitNetworkState, onlineState } from '../__mocks__/netinfo';
import { StopCompletionService } from '../src/features/stops/StopCompletionService';
import { sampleStop } from '../src/fixtures/sampleStop';
import type { ProofOfDelivery } from '../src/models/ProofOfDelivery';
import { NetworkMonitor, OfflineError } from '../src/platform/NetworkMonitor';
import { SecureStorage } from '../src/platform/SecureStorage';

function setup() {
  const api = {
    uploadProofOfDelivery: jest.fn(async () => ({
      id: 'proof-sample-012',
      stopId: sampleStop.id,
      capturedAt: '2026-10-01T10:00:00.000Z',
    })),
    completeStop: jest.fn<Promise<void>, [string, string]>(async () => {}),
  };
  const storage = new SecureStorage();
  const logger = { info: jest.fn() };
  const service = new StopCompletionService({
    api,
    network: new NetworkMonitor(),
    storage,
    captures,
    logger,
  });
  return { service, api, storage, logger };
}

async function prepare(service: StopCompletionService) {
  await service.scan(sampleStop);
  await service.takePhoto(sampleStop.id);
  await service.captureSignature(sampleStop.id);
}

it('awaits scan → encrypted photo → signature → upload → completion online', async () => {
  const { service, api, storage, logger } = setup();
  await service.completeDelivery(sampleStop);

  expect(captures.scanParcel).toHaveBeenCalledTimes(1);
  expect(api.uploadProofOfDelivery).toHaveBeenCalledWith(
    sampleStop.id,
    expect.objectContaining({
      photoBase64: 'c2FtcGxlLXBob3Rv',
      signatureBase64: 'c2FtcGxlLXNpZ25hdHVyZQ==',
    }),
  );
  expect(api.completeStop).toHaveBeenCalledWith(
    sampleStop.id,
    'proof-sample-012',
  );
  expect(service.pendingCaptures).toEqual([]);
  expect(await storage.getItem(`pod-photo:${sampleStop.id}`)).toBeNull();
  expect(logger.info).toHaveBeenLastCalledWith('stop.completed', {
    stopId: sampleStop.id,
  });
});

it('throws offline before capturing anything', async () => {
  const { service, api } = setup();
  emitNetworkState({ ...onlineState, isConnected: false });

  await expect(service.completeDelivery(sampleStop)).rejects.toThrow(
    OfflineError,
  );
  expect(captures.scanParcel).not.toHaveBeenCalled();
  expect(api.completeStop).not.toHaveBeenCalled();
});

it('keeps pending captures and blocks completion until upload is acknowledged', async () => {
  const { service, api } = setup();
  await prepare(service);
  let acknowledge!: (proof: ProofOfDelivery) => void;
  let started!: () => void;
  const uploadStarted = new Promise<void>((resolve) => {
    started = resolve;
  });
  api.uploadProofOfDelivery.mockImplementationOnce(() => {
    started();
    return new Promise<ProofOfDelivery>((resolve) => {
      acknowledge = resolve;
    });
  });

  const completion = service.completeStop(sampleStop.id);
  await uploadStarted;
  expect(service.pendingCaptures).toHaveLength(1);
  expect(api.completeStop).not.toHaveBeenCalled();
  acknowledge({
    id: 'proof-sample-012',
    stopId: sampleStop.id,
    capturedAt: '2026-10-01T10:00:00.000Z',
  });
  await completion;
  expect(service.pendingCaptures).toHaveLength(0);
  expect(api.completeStop).toHaveBeenCalledTimes(1);
});

it('does not advance capture state if the photo cannot be encrypted and stored', async () => {
  const { service, storage } = setup();
  await service.scan(sampleStop);
  jest.spyOn(storage, 'setItem').mockRejectedValueOnce(new Error('Disk full'));
  await expect(service.takePhoto(sampleStop.id)).rejects.toThrow('Disk full');
  expect(service.pendingCaptures).toHaveLength(0);
  await expect(service.captureSignature(sampleStop.id)).rejects.toThrow(
    'photo',
  );
});

it('preserves pending media on upload failure, then permits a foreground retry', async () => {
  const { service, api, storage } = setup();
  await prepare(service);
  api.uploadProofOfDelivery.mockRejectedValueOnce(new Error('HTTP 503'));

  await expect(service.completeStop(sampleStop.id)).rejects.toThrow('HTTP 503');
  expect(service.pendingCaptures).toHaveLength(1);
  expect(await storage.getItem(`pod-photo:${sampleStop.id}`)).not.toBeNull();
  expect(api.completeStop).not.toHaveBeenCalled();

  await service.completeStop(sampleStop.id);
  expect(service.pendingCaptures).toHaveLength(0);
});

it('does not reupload proof when stop completion fails after upload', async () => {
  const { service, api } = setup();
  await prepare(service);
  api.completeStop.mockRejectedValueOnce(new Error('HTTP 502'));

  await expect(service.completeStop(sampleStop.id)).rejects.toThrow('HTTP 502');
  await service.completeStop(sampleStop.id);

  expect(api.uploadProofOfDelivery).toHaveBeenCalledTimes(1);
  expect(api.completeStop).toHaveBeenCalledTimes(2);
});

it('retains the upload receipt if local photo cleanup fails', async () => {
  const { service, api, storage } = setup();
  await prepare(service);
  jest
    .spyOn(storage, 'removeItem')
    .mockRejectedValueOnce(new Error('Disk busy'));

  await expect(service.completeStop(sampleStop.id)).rejects.toThrow(
    'Disk busy',
  );
  expect(api.completeStop).not.toHaveBeenCalled();
  await service.completeStop(sampleStop.id);
  expect(api.uploadProofOfDelivery).toHaveBeenCalledTimes(1);
});

it('retains pending captures if connectivity drops before completion', async () => {
  const { service, api } = setup();
  await prepare(service);
  emitNetworkState({ ...onlineState, isInternetReachable: false });

  await expect(service.completeStop(sampleStop.id)).rejects.toThrow(
    OfflineError,
  );
  expect(service.pendingCaptures).toHaveLength(1);
  expect(api.uploadProofOfDelivery).not.toHaveBeenCalled();
});

it('rejects out-of-order actions and incorrect parcels', async () => {
  const { service, api } = setup();
  await expect(service.takePhoto(sampleStop.id)).rejects.toThrow('Scan');
  await expect(service.captureSignature(sampleStop.id)).rejects.toThrow(
    'photo',
  );
  await expect(service.completeStop(sampleStop.id)).rejects.toThrow('required');
  captures.scanParcel.mockResolvedValueOnce('SAMPLE-WRONG-PARCEL');
  await expect(service.scan(sampleStop)).rejects.toThrow('does not belong');
  expect(api.completeStop).not.toHaveBeenCalled();
});

it('rejects concurrent actions for the same stop', async () => {
  const { service } = setup();
  const firstScan = service.scan(sampleStop);
  await expect(service.scan(sampleStop)).rejects.toThrow('already running');
  await firstScan;
});
