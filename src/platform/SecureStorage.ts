import { Buffer } from '@craftzdog/react-native-buffer';
import crypto from 'react-native-quick-crypto';
import { nativeBridge } from './NativeBridge';

interface Envelope {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

/** INC-2026-031 interim fix: encrypted POD photos in the private app sandbox. */
export class SecureStorage {
  private async key(): Promise<Buffer> {
    const key = Buffer.from(
      await nativeBridge.keyStore().getOrCreateKey('waypoint.pod.aes256.v1'),
      'base64',
    );
    if (key.length !== 32)
      throw new Error('Secure storage key must be 256 bits.');
    return key;
  }

  async setItem(key: string, value: string): Promise<void> {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', await this.key(), iv);
    cipher.setAAD(Buffer.from(key));
    const ciphertext = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    const envelope: Envelope = {
      version: 1,
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
    await nativeBridge.sandbox().write(key, JSON.stringify(envelope));
  }

  async getItem(key: string): Promise<string | null> {
    const value = await nativeBridge.sandbox().read(key);
    if (value === null) return null;
    const envelope: Envelope = JSON.parse(value);
    if (
      envelope.version !== 1 ||
      typeof envelope.iv !== 'string' ||
      typeof envelope.tag !== 'string' ||
      typeof envelope.ciphertext !== 'string'
    ) {
      throw new Error('Unsupported or invalid secure storage envelope.');
    }
    const iv = Buffer.from(envelope.iv, 'base64');
    const tag = Buffer.from(envelope.tag, 'base64');
    if (iv.length !== 12 || tag.length !== 16) {
      throw new Error('Invalid secure storage authentication metadata.');
    }
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      await this.key(),
      iv,
    );
    decipher.setAAD(Buffer.from(key));
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  async removeItem(key: string): Promise<void> {
    await nativeBridge.sandbox().remove(key);
  }
}
