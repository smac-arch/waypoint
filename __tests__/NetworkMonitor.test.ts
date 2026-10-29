import {
  NetInfoStateType,
  NetInfoCellularGeneration,
  type NetInfoState,
} from '@react-native-community/netinfo';
import { emitNetworkState, onlineState } from '../__mocks__/netinfo';
import {
  NetworkMonitor,
  SignalQuality,
  signalQuality,
} from '../src/platform/NetworkMonitor';

it('checks current connectivity and rejects an unreachable internet connection', async () => {
  const monitor = new NetworkMonitor();
  expect(await monitor.isOnline()).toBe(true);
  emitNetworkState({ ...onlineState, isInternetReachable: false });
  expect(await monitor.isOnline()).toBe(false);
  emitNetworkState({
    type: NetInfoStateType.unknown,
    isConnected: null,
    isInternetReachable: null,
    details: null,
  });
  expect(await monitor.isOnline()).toBe(false);
});

it('notifies listeners and unsubscribes cleanly', () => {
  const listener = jest.fn();
  const unsubscribe = new NetworkMonitor().onChange(listener);
  expect(listener).toHaveBeenLastCalledWith(true, SignalQuality.Good);
  emitNetworkState({ ...onlineState, isConnected: false });
  expect(listener).toHaveBeenLastCalledWith(false, SignalQuality.Offline);
  unsubscribe();
  emitNetworkState(onlineState);
  expect(listener).toHaveBeenCalledTimes(2);
});

it('classifies weak WiFi and unknown signal strength without inventing a value', () => {
  expect(
    signalQuality({
      ...onlineState,
      details: { ...onlineState.details, strength: 20 },
    } as NetInfoState),
  ).toBe(SignalQuality.Weak);
  expect(
    signalQuality({
      type: NetInfoStateType.unknown,
      isConnected: true,
      isInternetReachable: null,
      details: null,
    }),
  ).toBe(SignalQuality.Unknown);
});

it.each([
  [NetInfoCellularGeneration['2g'], SignalQuality.Weak],
  [NetInfoCellularGeneration['3g'], SignalQuality.Weak],
  [NetInfoCellularGeneration['4g'], SignalQuality.Good],
  [NetInfoCellularGeneration['5g'], SignalQuality.Good],
] as const)('classifies cellular %s', (generation, expected) => {
  expect(
    signalQuality({
      type: NetInfoStateType.cellular,
      isConnected: true,
      isInternetReachable: true,
      details: {
        isConnectionExpensive: true,
        cellularGeneration: generation,
        carrier: 'Sample Carrier',
      },
    }),
  ).toBe(expected);
});
