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
import { translate, type Locale } from '../../i18n';
import type { StopCompletionService } from './StopCompletionService';

interface Props {
  stop: Stop;
  service: StopCompletionService;
  locale?: Locale;
}

type Step = 'scan' | 'photo' | 'signature' | 'complete' | 'done';

export function StopCompletionScreen({ stop, service, locale = 'en' }: Props) {
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
          ? translate(locale, 'offlineError')
          : translate(locale, 'genericError'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <Text style={styles.brand}>{translate(locale, 'brand')}</Text>
      <Text style={styles.title}>
        {translate(locale, 'stopTitle', { sequence: stop.sequence })}
      </Text>
      <Text>{stop.recipient.name}</Text>
      <Text>{stop.recipient.address}</Text>
      <View style={styles.actions}>
        <Button
          title={translate(locale, 'scan')}
          disabled={busy || step !== 'scan'}
          onPress={() => void run(() => service.scan(stop), 'photo')}
        />
        <Button
          title={translate(locale, 'takePhoto')}
          disabled={busy || step !== 'photo'}
          onPress={() =>
            void run(() => service.takePhoto(stop.id), 'signature')
          }
        />
        <Button
          title={translate(locale, 'captureSignature')}
          disabled={busy || step !== 'signature'}
          onPress={() =>
            void run(() => service.captureSignature(stop.id), 'complete')
          }
        />
        <Button
          title={translate(locale, 'completeStop')}
          disabled={busy || step !== 'complete'}
          onPress={() => void run(() => service.completeStop(stop.id), 'done')}
        />
      </View>
      {busy && (
        <ActivityIndicator
          accessibilityLabel={translate(locale, 'waitingForAction')}
        />
      )}
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {step === 'done' && <Text>{translate(locale, 'completed')}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, backgroundColor: '#f5f7fa', gap: 12 },
  brand: { fontSize: 12, fontWeight: '700', color: '#315b7c' },
  title: { fontSize: 28, fontWeight: '700', color: '#14283b' },
  actions: { gap: 16, marginVertical: 24 },
});
