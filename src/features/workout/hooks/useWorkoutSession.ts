import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import type { Device } from 'react-native-ble-plx';
import {
  MAX_KMH,
  MIN_KMH,
  type Treadmill,
  type TreadmillEvent,
} from '@/integrations/ble/treadmill';
import type { TreadmillData } from '@/types/treadmill';
import { WorkoutRecorder, type WorkoutSummary } from '../domain/workoutRecorder';

export type SaveState = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

export type TreadmillPort = Pick<
  Treadmill,
  'scan' | 'connect' | 'start' | 'stop' | 'setSpeed' | 'disconnect'
>;

type Deps = {
  treadmill: TreadmillPort;
  heightCm: number;
  canSave: boolean;
  save: (summary: WorkoutSummary) => Promise<'saved' | 'queued'>;
  retryQueued: () => Promise<boolean>;
};

export function useWorkoutSession({
  treadmill,
  heightCm,
  canSave,
  save: persist,
  retryQueued,
}: Deps) {
  const [found, setFound] = useState<Device[]>([]);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<TreadmillData>({});
  const [targetKmh, setTargetKmh] = useState(2.0);
  const [log, setLog] = useState<string[]>([]);
  const [liveSteps, setLiveSteps] = useState<number | null>(null);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');
  const recorder = useRef<WorkoutRecorder | null>(null);

  // Callbacks handed to the treadmill outlive one render, so they read the
  // latest values through refs.
  const latest = useRef({ canSave, heightCm, persist });
  useEffect(() => {
    latest.current = { canSave, heightCm, persist };
  });

  useEffect(() => {
    if (!canSave) return;
    let active = true;

    const flush = () => {
      void retryQueued()
        .then((synced) => {
          if (active && synced) {
            setSaveState((current) => (current === 'queued' ? 'saved' : current));
          }
        })
        .catch((cause: unknown) => {
          if (!active) return;
          setSaveError(cause instanceof Error ? cause.message : String(cause));
          setSaveState('error');
        });
    };

    flush();
    const networkSubscription = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flush();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') flush();
    });

    return () => {
      active = false;
      networkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [canSave, retryQueued]);

  useEffect(
    () => () => {
      void treadmill.disconnect(true);
    },
    [treadmill],
  );

  const addLog = (m: string) => setLog((l) => [...l.slice(-40), m]);
  const run = (p: Promise<unknown>) =>
    p.catch((cause: unknown) =>
      addLog(`error: ${cause instanceof Error ? cause.message : String(cause)}`),
    );

  const save = async (s: WorkoutSummary) => {
    setSaveState('saving');
    setSaveError('');
    try {
      const result = await latest.current.persist(s);
      setSaveState(result);
    } catch (cause: unknown) {
      setSaveError(cause instanceof Error ? cause.message : String(cause));
      setSaveState('error');
    }
  };

  const finishWorkout = () => {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    setLiveSteps(null);
    const s = rec.summarize();
    setSummary(s);
    setSaveState('idle');
    if (s && latest.current.canSave) void save(s);
  };

  const handleData = (d: TreadmillData) => {
    setData(d);
    recorder.current?.push(d);
    setLiveSteps(recorder.current?.summarize()?.steps ?? null);
  };

  const handleStatus = (e: TreadmillEvent) => {
    addLog(`status: ${e}`);
    if (e === 'started' && !recorder.current) {
      setSummary(null);
      setSaveState('idle');
      recorder.current = new WorkoutRecorder(latest.current.heightCm);
    }
    if (e === 'stopped' || e === 'safety-key') finishWorkout();
  };

  const scan = () => {
    setFound([]);
    return run(
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
    const next = Math.min(MAX_KMH, Math.max(MIN_KMH, +(targetKmh + delta).toFixed(1)));
    setTargetKmh(next);
    return run(treadmill.setSpeed(next));
  };

  return {
    found,
    connected,
    data,
    targetKmh,
    log,
    liveSteps,
    summary,
    saveState,
    saveError,
    scan,
    connect,
    start: () => run(treadmill.start()),
    stop: () => run(treadmill.stop()),
    endWorkout: () => run(treadmill.disconnect(true)),
    changeSpeed,
    save,
  };
}
