import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { startScaleListener } from '@/integrations/ble/scale';
import { useScaleSession } from '../hooks/useScaleSession';

const TEMP_HEIGHT_CM = 152; // Phase 4: comes from the active profile

export default function ScaleScreen() {
  // Listen only while this tab is on screen.
  const [active, setActive] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const s = useScaleSession({
    active,
    listen: startScaleListener,
    heightCm: TEMP_HEIGHT_CM,
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scale</Text>
      {!!s.error && <Text style={styles.error}>{s.error}</Text>}
      <Text style={styles.weight}>{s.live ? s.live.weightKg.toFixed(2) : '--'} kg</Text>
      <Text>{s.status}</Text>
      <Text>BMI: {s.bmi ? s.bmi.toFixed(1) : '--'}</Text>

      <Text style={styles.heading}>This session</Text>
      {s.history.length === 0 && <Text>No weigh-ins yet</Text>}
      {s.history.map((h, i) => (
        <Text key={i}>
          {new Date(h.at).toLocaleTimeString()} {h.weightKg.toFixed(2)} kg
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 60, gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  error: { color: 'red' },
  weight: { fontSize: 48, fontWeight: '700' },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 16 },
});
