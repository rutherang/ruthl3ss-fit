import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { startScaleListener } from '@/integrations/ble/scale';
import { useScaleSession } from '../hooks/useScaleSession';
import { useActiveProfile } from '@/features/profiles/hooks/useActiveProfile';
import { profileMeasurements } from '@/features/profiles/domain/profileMeasurements';
import ProfilePicker from '@/features/profiles/components/ProfilePicker';

export default function ScaleScreen() {
  // Listen only while this tab is on screen.
  const [active, setActive] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, []),
  );

  const { activeProfile, profiles, loading, error, setActiveProfile } = useActiveProfile();
  const { heightCm, age, sex, usingDefaults } = profileMeasurements(activeProfile);
  const [profileError, setProfileError] = useState<string | null>(null);

  const s = useScaleSession({
    active,
    listen: startScaleListener,
    heightCm,
    age,
    sex,
  });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scale</Text>
      <ProfilePicker
        profiles={profiles}
        loading={loading}
        error={error}
        title={activeProfile ? `Profile: ${activeProfile.name}` : 'Choose profile'}
        onProfileSelect={(profileId) => {
          setProfileError(null);
          void setActiveProfile(profileId).catch((cause: unknown) => {
            setProfileError(cause instanceof Error ? cause.message : String(cause));
          });
        }}
      />
      {!!profileError && <Text style={styles.error}>{profileError}</Text>}
      {usingDefaults && (
        <Text>Add an active profile to personalize body composition estimates.</Text>
      )}
      {!!s.error && <Text style={styles.error}>{s.error}</Text>}
      <Text style={styles.weight}>{s.live ? s.live.weightKg.toFixed(2) : '--'} kg</Text>
      <Text>{s.status}</Text>
      {s.bmi !== null && s.bmi !== undefined && (
        <>
          <Text>BMI: {s.bmi.toFixed(1)}</Text>
          {s.bmiLevel !== undefined && <Text>BMI Level: {s.bmiLevel}</Text>}
          {s.fatPct !== undefined && <Text>Body Fat: {s.fatPct.toFixed(1)}%</Text>}
          {s.fatLevel !== undefined && <Text>Fat Level: {s.fatLevel}</Text>}
          {s.bmrKcal !== undefined && <Text>BMR: {s.bmrKcal} kcal/day</Text>}
        </>
      )}

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
