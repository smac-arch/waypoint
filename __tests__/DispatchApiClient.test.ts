import {
  DispatchApiClient,
  DispatchApiError,
} from '../src/api/DispatchApiClient';
import { regions } from '../src/config/regions';
import { FailedDeliveryReason } from '../src/models/FailedDeliveryReason';
import { OfflineError } from '../src/platform/NetworkMonitor';

function setup(region: 'EU' | 'US' = 'EU') {
  const transport = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();
  transport.mockResolvedValue(
    new Response(JSON.stringify({ id: 'route-sample' })),
  );
  const network = { isOnline: jest.fn(async () => true) };
  return {
    client: new DispatchApiClient(regions[region], network, transport),
    transport,
    network,
  };
}

it.each(['EU', 'US'] as const)(
  'uses the %s region base URL and encodes IDs',
  async (region) => {
    const { client, transport } = setup(region);
    await expect(client.getRoute('route/sample')).resolves.toEqual({
      id: 'route-sample',
    });
    expect(transport).toHaveBeenCalledWith(
      `${regions[region].dispatchBaseUrl}/routes/route%2Fsample`,
      expect.objectContaining({ method: 'GET' }),
    );
  },
);

it('uploads media then posts completion and structured failure reasons', async () => {
  const { client, transport } = setup();
  const media = {
    photoBase64: 'SAMPLE-PHOTO',
    signatureBase64: 'SAMPLE-SIGNATURE',
    capturedAt: '2026-10-01T10:00:00.000Z',
  };
  await client.uploadProofOfDelivery('stop-sample', media);
  transport.mockImplementation(async () => new Response(null, { status: 204 }));
  await client.completeStop('stop-sample', 'proof-sample');
  await client.reportFailedDelivery(
    'stop-sample',
    FailedDeliveryReason.RecipientUnavailable,
  );
  expect(transport.mock.calls.map(([url]) => url)).toEqual([
    `${regions.EU.dispatchBaseUrl}/stops/stop-sample/proof-of-delivery`,
    `${regions.EU.dispatchBaseUrl}/stops/stop-sample/complete`,
    `${regions.EU.dispatchBaseUrl}/stops/stop-sample/failed`,
  ]);
  expect(transport.mock.calls[0]?.[1]?.body).toBe(JSON.stringify(media));
  expect(transport.mock.calls[2]?.[1]?.body).toBe(
    JSON.stringify({ reason: 'recipient_unavailable' }),
  );
});

it('checks online state for every endpoint without starting a request offline', async () => {
  const { client, network, transport } = setup();
  network.isOnline.mockResolvedValue(false);
  await expect(client.getRoute('route-sample')).rejects.toThrow(OfflineError);
  await expect(
    client.completeStop('stop-sample', 'proof-sample'),
  ).rejects.toThrow(OfflineError);
  await expect(
    client.reportFailedDelivery(
      'stop-sample',
      FailedDeliveryReason.AccessBlocked,
    ),
  ).rejects.toThrow(OfflineError);
  await expect(
    client.uploadProofOfDelivery('stop-sample', {
      photoBase64: 'SAMPLE',
      signatureBase64: 'SAMPLE',
      capturedAt: '2026-10-01',
    }),
  ).rejects.toThrow(OfflineError);
  expect(transport).not.toHaveBeenCalled();
});

it('exposes HTTP status without response bodies containing personal data', async () => {
  const { client, transport } = setup();
  transport.mockResolvedValue(
    new Response('Sample Recipient', { status: 503 }),
  );
  await expect(client.getRoute('route-sample')).rejects.toEqual(
    new DispatchApiError(503),
  );
});
