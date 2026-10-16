import { useCallback, useState } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import { Button, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { AccountBar } from '@/features/account/components/AccountBar';
import { useAccount } from '@/features/account/useAccount';
import { bleManager } from '@/integrations/ble/manager';
import { Treadmill } from '@/integrations/ble/treadmill';
import { fmtPace, fmtTime } from '@/lib/format';
import { flushQueuedWorkouts, saveWorkout } from '../data/workoutRepo';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useActiveProfile } from '@/features/profiles/hooks/useActiveProfile';
import { profileMeasurements } from '@/features/profiles/domain/profileMeasurements';
import ProfilePicker from '@/features/profiles/components/ProfilePicker';
import type { WorkoutSummary } from '../domain/workoutRecorder';

const treadmill = new Treadmill(bleManager);

export default function WorkoutScreen() {
  useKeepAwake();
  const { email } = useAccount();
  const { activeProfile, profiles, loading, error, setActiveProfile } = useActiveProfile();
  const [profileError, setProfileError] = useState<string | null>(null);

  const adaptedSave = useCallback(
    (summary: WorkoutSummary) => {
      if (!email) throw new Error('Sign in to Google before saving a workout.');
      return saveWorkout(summary, email);
    },
    [email],
  );
  const retryQueued = useCallback(
    () => (email ? flushQueuedWorkouts(email) : Promise.resolve(false)),
    [email],
  );

  const { heightCm, usingDefaults } = profileMeasurements(activeProfile);

  const s = useWorkoutSession({
    treadmill,
    heightCm,
    canSave: email !== null,
    save: adaptedSave,
    retryQueued,
  });
  const { summary } = s;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AccountBar />
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
      {usingDefaults && <Text>Add an active profile to personalize estimated workout steps.</Text>}
      {!s.connected ? (
        <>
          <Button title="Scan for treadmill" onPress={s.scan} />
          {s.found.map((d) => (
            <Button key={d.id} title={`${d.name} (${d.rssi})`} onPress={() => s.connect(d)} />
          ))}
        </>
      ) : (
        <>
          <Text style={styles.speed}>{s.data.speedKmh?.toFixed(1) ?? '--'} km/h</Text>
          <Text>Distance: {s.data.distanceM ?? '--'} m</Text>
          <Text>Time: {s.data.elapsedS ?? '--'} s</Text>
          <Text>Incline: {s.data.inclinePct ?? '--'} %</Text>
          <Text>Calories: {s.data.kcal ?? '--'} kcal</Text>
          <Text>Steps (est.): {s.liveSteps ?? '--'}</Text>
          <Text>Heart rate: {s.data.heartRate ?? '--'} bpm</Text>
          <Text style={styles.debug}>
            flags {s.data.flags?.toString(2).padStart(13, '0')} | {s.data.hex}
          </Text>

          <Button title="Start" onPress={s.start} />
          <Text>Target speed: {s.targetKmh.toFixed(1)} km/h</Text>
          <Button title="Speed +0.5" onPress={() => s.changeSpeed(0.5)} />
          <Button title="Speed -0.5" onPress={() => s.changeSpeed(-0.5)} />
          <Button title="STOP" color="red" onPress={s.stop} />
          <Button title="End workout" onPress={s.endWorkout} />
        </>
      )}

      {summary && (
        <>
          <Text style={styles.heading}>Last workout</Text>
          <Text>
            {fmtTime(summary.durationS)} · {(summary.distanceM / 1000).toFixed(2)} km · ~
            {summary.steps} steps · {summary.kcal} kcal
          </Text>
          <Text>
            Avg {summary.avgKmh.toFixed(1)} km/h · max {summary.maxKmh.toFixed(1)} km/h
          </Text>
          {summary.segments.map((g, i) => (
            <Text key={i} style={styles.segment}>
              #{i + 1} @{fmtTime(g.startS)}: {g.avgKmh.toFixed(1)} km/h for {fmtTime(g.durationS)},{' '}
              {g.distanceM.toFixed(0)} m, {fmtPace(g.paceMinPerKm)}, ~{g.steps} steps
            </Text>
          ))}
          <Text>
            {s.saveState === 'saving' && 'Saving to Google Sheets...'}
            {s.saveState === 'saved' && 'Saved to your Google Sheet ✓'}
            {s.saveState === 'queued' && 'Saved on this device; waiting for internet to sync'}
            {s.saveState === 'error' && `Save failed: ${s.saveError}`}
            {s.saveState === 'idle' && email === null && 'Sign in to save this workout'}
          </Text>
          {(s.saveState === 'error' ||
            s.saveState === 'queued' ||
            (s.saveState === 'idle' && email !== null)) && (
            <Button title="Save to Google Sheets" onPress={() => s.save(summary)} />
          )}
        </>
      )}

      {s.log.map((l, i) => (
        <Text key={i} style={styles.log}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 60, gap: 8 },
  speed: { fontSize: 40, fontWeight: '700' },
  debug: { fontSize: 10 },
  heading: { fontSize: 18, fontWeight: '600' },
  segment: { fontSize: 12 },
  log: { fontSize: 11 },
  error: { color: '#c62828' },
});
