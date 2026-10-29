import React from 'react';
import { DispatchApiClient } from './src/api/DispatchApiClient';
import { config } from './src/config/regions';
import { StopCompletionScreen } from './src/features/stops/StopCompletionScreen';
import { StopCompletionService } from './src/features/stops/StopCompletionService';
import { sampleStop } from './src/fixtures/sampleStop';
import { Logger } from './src/platform/Logger';
import { nativeBridge } from './src/platform/NativeBridge';
import { NetworkMonitor } from './src/platform/NetworkMonitor';
import { SecureStorage } from './src/platform/SecureStorage';

const network = new NetworkMonitor();

// TODO(WD-218): replace the fixture with the authenticated route assignment.
export default function App() {
  const [service] = React.useState(
    () =>
      new StopCompletionService({
        api: new DispatchApiClient(config, network),
        network,
        storage: new SecureStorage(),
        captures: nativeBridge.captures(),
        logger: new Logger(),
      }),
  );
  return (
    <StopCompletionScreen
      key={sampleStop.id}
      stop={sampleStop}
      service={service}
    />
  );
}
