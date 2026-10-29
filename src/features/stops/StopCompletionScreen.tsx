import React, { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { Stop } from '../../models/Stop';
import { OfflineError } from '../../platform/NetworkMonitor';
import type { StopCompletionService } from './StopCompletionService';

interface Props {
  stop: Stop;
  service: StopCompletionService;
}

type Step = 'scan' | 'photo' | 'signature' | 'complete' | 'done';

export function StopCompletionScreen({ stop, service }: Props) {
  const [step, setStep] = useState<Step>('scan');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(work: () => Promise<void>, next: Step) {
    setBusy(true);
    setError(null);
    try {
      await work();
      setStep(next);
    } catch (cause) {
      // Native/HTTP errors can contain personal data; never render raw messages.
      setError(
        cause instanceof OfflineError
          ? 'You are offline. Connect to continue this stop.'
          : 'This action could not be completed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.brand}>WAYPOINT DELIVER</Text>
      <Text style={styles.title}>Stop {stop.sequence}</Text>
      <Text>{stop.recipient.name}</Text>
      <Text>{stop.recipient.address}</Text>
      <View style={styles.actions}>
        <Button
          title="Scan"
          disabled={busy || step !== 'scan'}
          onPress={() => void run(() => service.scan(stop), 'photo')}
        />
        <Button
          title="Take photo"
          disabled={busy || step !== 'photo'}
          onPress={() =>
            void run(() => service.takePhoto(stop.id), 'signature')
          }
        />
        <Button
          title="Capture signature"
          disabled={busy || step !== 'signature'}
          onPress={() =>
            void run(() => service.captureSignature(stop.id), 'complete')
          }
        />
        <Button
          title="Complete stop"
          disabled={busy || step !== 'complete'}
          onPress={() => void run(() => service.completeStop(stop.id), 'done')}
        />
      </View>
      {busy && <ActivityIndicator accessibilityLabel="Waiting for action" />}
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {step === 'done' && (
        <Text>Stop completed. Ready for the next delivery.</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#f5f7fa', gap: 12 },
  brand: { fontSize: 12, fontWeight: '700', color: '#315b7c' },
  title: { fontSize: 28, fontWeight: '700', color: '#14283b' },
  actions: { gap: 16, marginVertical: 24 },
});
