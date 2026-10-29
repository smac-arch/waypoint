import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { captures } from '../__mocks__/react-native';
import { StopCompletionScreen } from '../src/features/stops/StopCompletionScreen';
import { StopCompletionService } from '../src/features/stops/StopCompletionService';
import { sampleStop } from '../src/fixtures/sampleStop';
import type { Locale } from '../src/i18n';
import { NetworkMonitor, OfflineError } from '../src/platform/NetworkMonitor';
import { SecureStorage } from '../src/platform/SecureStorage';

function renderScreen(locale: Locale = 'en') {
  const api = {
    uploadProofOfDelivery: jest.fn(async () => ({
      id: 'proof-sample-012',
      stopId: sampleStop.id,
      capturedAt: '2026-10-01T10:00:00.000Z',
    })),
    completeStop: jest.fn(async () => {}),
  };
  const service = new StopCompletionService({
    api,
    network: new NetworkMonitor(),
    storage: new SecureStorage(),
    captures,
    logger: { info: jest.fn() },
  });
  let screen: ReactTestRenderer;
  act(() => {
    screen = create(
      <StopCompletionScreen
        stop={sampleStop}
        service={service}
        locale={locale}
      />,
    );
  });
  return { screen: screen!, service, api };
}

it('guides the driver through all four actions and confirms completion', async () => {
  const { screen, api } = renderScreen();
  for (const title of [
    'Scan',
    'Take photo',
    'Capture signature',
    'Complete stop',
  ]) {
    expect(screen.root.findByProps({ title }).props.disabled).toBe(false);
    await act(async () => {
      screen.root.findByProps({ title }).props.onPress();
    });
  }
  expect(api.completeStop).toHaveBeenCalledWith(
    sampleStop.id,
    'proof-sample-012',
  );
  expect(JSON.stringify(screen.toJSON())).toContain('Stop completed');
  expect(
    screen.root.findByProps({ title: 'Complete stop' }).props.disabled,
  ).toBe(true);
  act(() => screen.unmount());
});

it('waits with a spinner, then enables the next action', async () => {
  const { screen, service } = renderScreen();
  let finishScan: (() => void) | undefined;
  jest.spyOn(service, 'scan').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishScan = resolve;
      }),
  );
  act(() => {
    screen.root.findByProps({ title: 'Scan' }).props.onPress();
  });
  expect(
    screen.root.findAllByProps({ accessibilityLabel: 'Waiting for action' }),
  ).not.toHaveLength(0);
  expect(screen.root.findByProps({ title: 'Take photo' }).props.disabled).toBe(
    true,
  );
  await act(async () => {
    finishScan?.();
  });
  expect(screen.root.findByProps({ title: 'Take photo' }).props.disabled).toBe(
    false,
  );
  act(() => screen.unmount());
});

it('shows actionable offline feedback and allows retry without exposing raw errors', async () => {
  const { screen, service } = renderScreen();
  jest.spyOn(service, 'scan').mockRejectedValueOnce(new OfflineError());
  await act(async () => {
    screen.root.findByProps({ title: 'Scan' }).props.onPress();
  });
  expect(JSON.stringify(screen.toJSON())).toContain('You are offline');
  expect(screen.root.findByProps({ title: 'Scan' }).props.disabled).toBe(false);
  jest
    .spyOn(service, 'scan')
    .mockRejectedValueOnce(new Error('PRIVATE-PAYLOAD'));
  await act(async () => {
    screen.root.findByProps({ title: 'Scan' }).props.onPress();
  });
  expect(JSON.stringify(screen.toJSON())).not.toContain('PRIVATE-PAYLOAD');
  act(() => screen.unmount());
});

it('renders stop actions and offline feedback in the selected language', async () => {
  const { screen, service } = renderScreen('fr');
  jest.spyOn(service, 'scan').mockRejectedValueOnce(new OfflineError());
  expect(screen.root.findByProps({ title: 'Scanner' })).toBeDefined();
  await act(async () => {
    screen.root.findByProps({ title: 'Scanner' }).props.onPress();
  });
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Vous êtes hors ligne. Connectez-vous pour continuer cet arrêt.',
  );
  act(() => screen.unmount());
});
