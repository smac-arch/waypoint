import { keyStore, sandbox } from '../__mocks__/react-native';
import { SecureStorage } from '../src/platform/SecureStorage';

it('round trips AES-256-GCM ciphertext across storage instances', async () => {
  const storage = new SecureStorage();
  await storage.setItem('pod-photo:stop-sample-012', 'SAMPLE-PHOTO-BYTES');

  const raw = await sandbox.read('pod-photo:stop-sample-012');
  expect(raw).not.toContain('SAMPLE-PHOTO-BYTES');
  expect(await new SecureStorage().getItem('pod-photo:stop-sample-012')).toBe(
    'SAMPLE-PHOTO-BYTES',
  );
  expect(keyStore.getOrCreateKey).toHaveBeenCalledWith(
    'waypoint.pod.aes256.v1',
  );
});

it('uses a fresh nonce even for the same photo', async () => {
  const storage = new SecureStorage();
  await storage.setItem('photo', 'SAMPLE');
  const first = await sandbox.read('photo');
  await storage.setItem('photo', 'SAMPLE');
  expect(await sandbox.read('photo')).not.toBe(first);
});

it('rejects tampering and moving ciphertext to a different key', async () => {
  const storage = new SecureStorage();
  await storage.setItem('photo', 'SAMPLE');
  const raw = await sandbox.read('photo');
  if (!raw) throw new Error('Expected fixture ciphertext');
  await sandbox.write('other-photo', raw);
  await expect(storage.getItem('other-photo')).rejects.toThrow();

  const envelope: Record<string, unknown> = JSON.parse(raw);
  envelope.ciphertext = Buffer.from('tampered').toString('base64');
  await sandbox.write('photo', JSON.stringify(envelope));
  await expect(storage.getItem('photo')).rejects.toThrow();
});

it('returns null for missing keys and removes uploaded photos', async () => {
  const storage = new SecureStorage();
  expect(await storage.getItem('missing')).toBeNull();
  await storage.setItem('photo', 'SAMPLE');
  await storage.removeItem('photo');
  expect(await storage.getItem('photo')).toBeNull();
});

it('propagates keystore and disk failures instead of falling back to plaintext', async () => {
  const storage = new SecureStorage();
  keyStore.getOrCreateKey.mockRejectedValueOnce(new Error('Keystore locked'));
  await expect(storage.setItem('photo', 'SAMPLE')).rejects.toThrow(
    'Keystore locked',
  );
  expect(sandbox.write).not.toHaveBeenCalled();
  sandbox.write.mockRejectedValueOnce(new Error('Disk full'));
  await expect(storage.setItem('photo', 'SAMPLE')).rejects.toThrow('Disk full');
});

it('rejects keys that are not 256 bits and unknown envelope versions', async () => {
  const storage = new SecureStorage();
  keyStore.getOrCreateKey.mockResolvedValueOnce(
    Buffer.alloc(16).toString('base64'),
  );
  await expect(storage.setItem('photo', 'SAMPLE')).rejects.toThrow('256 bits');
  await sandbox.write('photo', '{"version":2}');
  await expect(storage.getItem('photo')).rejects.toThrow('envelope');
});
