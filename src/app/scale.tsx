import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import type { ScaleReading } from '@/types/scale';
import { startScaleListener } from '../integrations/ble/scale';

const HEIGHT_CM = 152; // change to your height

export default function ScalePage() {
  const [live, setLive] = useState<ScaleReading | null>(null);
  const [history, setHistory] = useState<ScaleReading[]>([]);
  const [error, setError] = useState('');
  const sawMeasuring = useRef(false);
  const [hasMeasured, setHasMeasured] = useState(false);
  const saved = useRef(false);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let stopScan: (() => Promise<void>) | undefined;
      void startScaleListener((r) => {
        setLive(r);
        if (!r.final) {
          sawMeasuring.current = true;
          setHasMeasured(true);
          saved.current = false;
        } else if (sawMeasuring.current && !saved.current) {
          saved.current = true;
          setHistory((h) => [r, ...h]);
        }
      })
        .then((stop) => {
          if (focused) {
            stopScan = stop;
          } else {
            void stop().catch((e: unknown) => console.error('Unable to stop scale scan', e));
          }
        })
        .catch((e: unknown) => {
          if (focused) setError(e instanceof Error ? e.message : String(e));
        });

      return () => {
        focused = false;
        if (stopScan) {
          void stopScan().catch((e: unknown) => console.error('Unable to stop scale scan', e));
        }
      };
    }, []),
  );

  const bmi = live ? live.weightKg / (HEIGHT_CM / 100) ** 2 : null;
  const status = !live
    ? 'Step on the scale'
    : !live.final
      ? 'Measuring...'
      : hasMeasured
        ? 'Final reading'
        : 'Last reading (may be old)';

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 8 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Scale</Text>
      {!!error && <Text style={{ color: 'red' }}>{error}</Text>}
      <Text style={{ fontSize: 48, fontWeight: '700' }}>
        {live ? live.weightKg.toFixed(2) : '--'} kg
      </Text>
      <Text>{status}</Text>
      <Text>BMI: {bmi ? bmi.toFixed(1) : '--'}</Text>

      <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16 }}>This session</Text>
      {history.length === 0 && <Text>No weigh-ins yet</Text>}
      {history.map((h, i) => (
        <Text key={i}>
          {new Date(h.at).toLocaleTimeString()} {h.weightKg.toFixed(2)} kg
        </Text>
      ))}
    </ScrollView>
  );
}
