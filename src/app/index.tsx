import { saveWorkout } from '@/google/sheets';
import { useGoogleAccount } from '@/google/useAccount';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Button, ScrollView } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { Text } from 'react-native-paper';
import { bleManager } from '../ble/manager';
import { MAX_KMH, MIN_KMH, Treadmill, TreadmillData, TreadmillEvent } from '../ble/treadmill';
import { WorkoutRecorder, WorkoutSummary, fmtPace, fmtTime } from '../lib/workoutRecorder';

const HEIGHT_CM = 152; // temporary; will come from the active profile
const treadmill = new Treadmill(bleManager);

export default function Home() {
  useKeepAwake();

  const [found, setFound] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<TreadmillData>({});
  const [target, setTarget] = useState(2.0);
  const [log, setLog] = useState<string[]>([]);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [live, setLive] = useState<WorkoutSummary | null>(null);
  const recorder = useRef<WorkoutRecorder | null>(null);
  const account = useGoogleAccount();
  const signedIn = useRef(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    signedIn.current = account.email !== null;
  }, [account.email]);

  const save = async (s: WorkoutSummary) => {
    setSaveState('saving');
    setSaveError('');
    try {
      await saveWorkout(s);
      setSaveState('saved');
    } catch (e: any) {
      setSaveError(e.message);
      setSaveState('error');
    }
  };

  const addLog = (m: string) => setLog((l) => [...l.slice(-40), m]);
  const run = (p: Promise<unknown>) =>
    p.catch((e: unknown) => addLog(`error: ${e instanceof Error ? e.message : String(e)}`));

  useEffect(
    () => () => {
      treadmill.disconnect(true);
    },
    [],
  );

  const finishWorkout = () => {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    const s = rec.summarize();
    setSummary(s);
    setLive(s);
    setSaveState('idle');
    if (s && signedIn.current) save(s);
  };

  const handleData = (d: TreadmillData) => {
    setData(d);
    const rec = recorder.current;
    if (rec) {
      rec.push(d);
      setLive(rec.summarize());
    }
  };

  const handleStatus = (e: TreadmillEvent) => {
    addLog(`status: ${e}`);
    if (e === 'started' && !recorder.current) {
      setSummary(null);
      setLive(null);
      recorder.current = new WorkoutRecorder(HEIGHT_CM);
    }
    if (e === 'stopped' || e === 'safety-key') finishWorkout();
  };

  const scan = () => {
    setFound([]);
    run(
      treadmill.scan(
        (d) => setFound((p) => (p.find((x) => x.id === d.id) ? p : [...p, d])),
        addLog,
      ),
    );
  };

  const connect = (d: Device) =>
    run(
      treadmill
        .connect(
          d.id,
          handleData,
          addLog,
          () => {
            finishWorkout();
            setConnected(false);
            addLog('Disconnected');
          },
          handleStatus,
        )
        .then(() => setConnected(true)),
    );

  const changeSpeed = (delta: number) => {
    const next = Math.min(MAX_KMH, Math.max(MIN_KMH, +(target + delta).toFixed(1)));
    setTarget(next);
    run(treadmill.setSpeed(next));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 60, gap: 8 }}>
      <Text>{account.email ? `Google: ${account.email}` : 'Not signed in to Google'}</Text>
      {account.email ? (
        <Button title="Sign out" onPress={account.signOut} />
      ) : (
        <Button title="Sign in with Google" onPress={account.signIn} disabled={account.busy} />
      )}
      {!!account.error && <Text style={{ color: 'red' }}>{account.error}</Text>}
      {!connected ? (
        <>
          <Button title="Scan for treadmill" onPress={scan} />
          {found.map((d) => (
            <Button key={d.id} title={`${d.name} (${d.rssi})`} onPress={() => connect(d)} />
          ))}
        </>
      ) : (
        <>
          <Text style={{ fontSize: 40, fontWeight: '700' }}>
            {data.speedKmh?.toFixed(1) ?? '--'} km/h
          </Text>
          <Text>Distance: {data.distanceM ?? '--'} m</Text>
          <Text>Time: {data.elapsedS ?? '--'} s</Text>
          <Text>Incline: {data.inclinePct ?? '--'} %</Text>
          <Text>Calories: {data.kcal ?? '--'} kcal</Text>
          <Text>Steps (est.): {live?.steps ?? '--'}</Text>
          <Text>Heart rate: {data.heartRate ?? '--'} bpm</Text>
          <Text style={{ fontSize: 10 }}>
            flags {data.flags?.toString(2).padStart(13, '0')} | {data.hex}
          </Text>

          <Button title="Start" onPress={() => run(treadmill.start())} />
          <Text>Target speed: {target.toFixed(1)} km/h</Text>
          <Button title="Speed +0.5" onPress={() => changeSpeed(0.5)} />
          <Button title="Speed -0.5" onPress={() => changeSpeed(-0.5)} />
          <Button title="STOP" color="red" onPress={() => run(treadmill.stop())} />
          <Button title="End workout" onPress={() => run(treadmill.disconnect(true))} />
        </>
      )}

      {summary && (
        <>
          <Text style={{ fontSize: 18, fontWeight: '600' }}>Last workout</Text>
          <Text>
            {fmtTime(summary.durationS)} · {(summary.distanceM / 1000).toFixed(2)} km · ~
            {summary.steps} steps · {summary.kcal} kcal
          </Text>
          <Text>
            Avg {summary.avgKmh.toFixed(1)} km/h · max {summary.maxKmh.toFixed(1)} km/h
          </Text>
          {summary.segments.map((g, i) => (
            <Text key={i} style={{ fontSize: 12 }}>
              #{i + 1} @{fmtTime(g.startS)}: {g.avgKmh.toFixed(1)} km/h for {fmtTime(g.durationS)},{' '}
              {g.distanceM.toFixed(0)} m, {fmtPace(g.paceMinPerKm)}, ~{g.steps} steps
            </Text>
          ))}
          <Text>
            {saveState === 'saving' && 'Saving to Google Sheets...'}
            {saveState === 'saved' && 'Saved to your Google Sheet ✓'}
            {saveState === 'error' && `Save failed: ${saveError}`}
            {saveState === 'idle' && !account.email && 'Sign in to save this workout'}
          </Text>
          {(saveState === 'error' || (saveState === 'idle' && account.email)) && (
            <Button title="Save to Google Sheets" onPress={() => save(summary)} />
          )}
        </>
      )}

      {log.map((l, i) => (
        <Text key={i} style={{ fontSize: 11 }}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}
