import { createElement, type ReactNode } from 'react';
import { randomBytes } from 'node:crypto';

const files = new Map<string, string>();
const keys = new Map<string, string>();

export const sandbox = {
  read: jest.fn(async (key: string) => files.get(key) ?? null),
  write: jest.fn(async (key: string, value: string) => {
    files.set(key, value);
  }),
  remove: jest.fn(async (key: string) => {
    files.delete(key);
  }),
};

export const keyStore = {
  getOrCreateKey: jest.fn(async (alias: string) => {
    let key = keys.get(alias);
    if (!key) {
      key = randomBytes(32).toString('base64');
      keys.set(alias, key);
    }
    return key;
  }),
};

export const captures = {
  scanParcel: jest.fn(async () => 'SAMPLE-PARCEL-012'),
  takePhoto: jest.fn(async () => 'c2FtcGxlLXBob3Rv'),
  captureSignature: jest.fn(async () => 'c2FtcGxlLXNpZ25hdHVyZQ=='),
};

export const NativeModules = {
  WaypointKeyStore: keyStore,
  WaypointAppSandbox: sandbox,
  WaypointCaptureDevice: captures,
};

function host(name: string) {
  return ({ children, ...props }: { children?: ReactNode }) =>
    createElement(name, props, children);
}

export const View = host('View');
export const SafeAreaView = host('SafeAreaView');
export const Text = host('Text');
export const Button = host('Button');
export const ActivityIndicator = host('ActivityIndicator');
export const StyleSheet = { create: <T>(styles: T): T => styles };

export function resetNativeMocks(): void {
  files.clear();
  keys.clear();
  sandbox.read.mockImplementation(async (key) => files.get(key) ?? null);
  sandbox.write.mockImplementation(async (key, value) => {
    files.set(key, value);
  });
  sandbox.remove.mockImplementation(async (key) => {
    files.delete(key);
  });
  keyStore.getOrCreateKey.mockImplementation(async (alias) => {
    let key = keys.get(alias);
    if (!key) {
      key = randomBytes(32).toString('base64');
      keys.set(alias, key);
    }
    return key;
  });
  captures.scanParcel.mockResolvedValue('SAMPLE-PARCEL-012');
  captures.takePhoto.mockResolvedValue('c2FtcGxlLXBob3Rv');
  captures.captureSignature.mockResolvedValue('c2FtcGxlLXNpZ25hdHVyZQ==');
}
