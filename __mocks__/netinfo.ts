import type {
  NetInfoState,
  NetInfoStateType as StateType,
  NetInfoWifiState,
} from '@react-native-community/netinfo';

export const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  wifi: 'wifi',
  cellular: 'cellular',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
} as const;

export const NetInfoCellularGeneration = {
  '2g': '2g',
  '3g': '3g',
  '4g': '4g',
  '5g': '5g',
} as const;

export const onlineState: NetInfoWifiState = {
  type: 'wifi' as StateType.wifi,
  isConnected: true,
  isInternetReachable: true,
  details: {
    isConnectionExpensive: false,
    ssid: 'Sample WiFi',
    bssid: null,
    strength: 80,
    ipAddress: '192.0.2.1',
    subnet: '255.255.255.0',
    frequency: 2400,
    linkSpeed: 72,
    rxLinkSpeed: 72,
    txLinkSpeed: 72,
  },
};

let state: NetInfoState = onlineState;
const listeners = new Set<(value: NetInfoState) => void>();

const NetInfo = {
  fetch: jest.fn(async () => state),
  addEventListener: jest.fn((listener: (value: NetInfoState) => void) => {
    listeners.add(listener);
    listener(state);
    return () => {
      listeners.delete(listener);
    };
  }),
};

export function emitNetworkState(value: NetInfoState): void {
  state = value;
  listeners.forEach((listener) => listener(value));
}

export function resetNetworkMock(): void {
  state = onlineState;
  listeners.clear();
  NetInfo.fetch.mockImplementation(async () => state);
}

export default NetInfo;
