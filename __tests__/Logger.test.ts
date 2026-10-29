import { Logger, redact } from '../src/platform/Logger';
import { sampleStop } from '../src/fixtures/sampleStop';

it('keeps only a stop ID, removing personal data, media and nested fields', () => {
  expect(
    redact({
      stopId: sampleStop.id,
      ...sampleStop.recipient,
      recipient: sampleStop.recipient,
      photoBase64: 'SAMPLE',
      signatureBase64: 'SAMPLE',
      error: new Error(sampleStop.recipient.address),
    }),
  ).toEqual({ stopId: sampleStop.id });
});

it.each([undefined, null, 123, 'Kerkstraat 12, Sampletown', 'stop-x\naddress'])(
  'drops invalid stop ID %s',
  (stopId) => {
    expect(redact({ stopId })).toEqual({});
  },
);

it('redacts before writing to the sink and does not mutate the input', () => {
  const sink = jest.fn();
  const input = { stopId: sampleStop.id, name: 'Sample Recipient' };
  new Logger(sink).info('stop.completed', input);
  expect(sink).toHaveBeenCalledWith('stop.completed', {
    stopId: sampleStop.id,
  });
  expect(input.name).toBe('Sample Recipient');
});
