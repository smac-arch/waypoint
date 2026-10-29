import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export enum SignalQuality {
  Offline = 'offline',
  Unknown = 'unknown',
  Weak = 'weak',
  Good = 'good',
}

export class OfflineError extends Error {
  constructor() {
    super('A network connection is required to complete this action.');
    this.name = 'OfflineError';
  }
}

function connected(state: NetInfoState): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}

export function signalQuality(state: NetInfoState): SignalQuality {
  if (!connected(state)) return SignalQuality.Offline;
  if (state.type === 'wifi') {
    const strength = state.details.strength;
    return strength == null
      ? SignalQuality.Unknown
      : strength < 40
        ? SignalQuality.Weak
        : SignalQuality.Good;
  }
  if (state.type === 'cellular') {
    const generation = state.details.cellularGeneration;
    if (generation === '2g' || generation === '3g') return SignalQuality.Weak;
    if (generation === '4g' || generation === '5g') return SignalQuality.Good;
  }
  return SignalQuality.Unknown;
}

export class NetworkMonitor {
  async isOnline(): Promise<boolean> {
    return connected(await NetInfo.fetch());
  }

  onChange(
    listener: (online: boolean, quality: SignalQuality) => void,
  ): () => void {
    return NetInfo.addEventListener((state) => {
      listener(connected(state), signalQuality(state));
    });
  }
}
