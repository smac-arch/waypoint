import { NativeModules } from 'react-native';

export interface SecureKeyStore {
  /** Hardware-backed 32-byte key, returned as base64; never persist in JS storage. */
  getOrCreateKey(alias: string): Promise<string>;
}

export interface AppSandbox {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface CaptureDevice {
  scanParcel(): Promise<string>;
  takePhoto(): Promise<string>;
  captureSignature(): Promise<string>;
}

function requiredModule<T>(name: string): T {
  const module: T | undefined = NativeModules[name];
  if (!module) throw new Error(`Native adapter ${name} is not installed.`);
  return module;
}

export const nativeBridge = {
  keyStore: () => requiredModule<SecureKeyStore>('WaypointKeyStore'),
  sandbox: () => requiredModule<AppSandbox>('WaypointAppSandbox'),
  captures: () => requiredModule<CaptureDevice>('WaypointCaptureDevice'),
};
