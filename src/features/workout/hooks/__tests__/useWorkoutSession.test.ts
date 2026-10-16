import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import type { Device } from 'react-native-ble-plx';
import { MAX_KMH } from '@/integrations/ble/treadmill';
import type { TreadmillData } from '@/types/treadmill';
import { useWorkoutSession, type TreadmillPort } from '../useWorkoutSession';

let networkListener: Parameters<typeof Network.addNetworkStateListener>[0] | undefined;

beforeEach(() => {
  networkListener = undefined;
  jest.spyOn(Network, 'addNetworkStateListener').mockImplementation((listener) => {
    networkListener = listener;
    return { remove: jest.fn() };
  });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }));
});

type Callbacks = {
  onData?: (d: TreadmillData) => void;
  onDisconnect?: () => void;
  onStatus?: (e: string) => void;
};

function fakeTreadmill() {
  const cb: Callbacks = {};
  const mock = {
    scan: jest.fn().mockResolvedValue(undefined),
    connect: jest.fn(
      async (
        _id: string,
        onData: Callbacks['onData'],
        _log: unknown,
        onDisconnect: Callbacks['onDisconnect'],
        onStatus: Callbacks['onStatus'],
      ) => {
        Object.assign(cb, { onData, onDisconnect, onStatus });
      },
    ),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    setSpeed: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(async () => cb.onDisconnect?.()),
  };
  return { port: mock as unknown as TreadmillPort, mock, cb };
}

const sample = (t: number, kmh = 3): TreadmillData => ({
  elapsedS: t,
  distanceM: Math.round((t * kmh) / 3.6),
  speedKmh: kmh,
  kcal: 0,
});

async function setup(
  opts: {
    canSave?: boolean;
    heightCm?: number;
    save?: jest.Mock;
    retryQueued?: jest.Mock;
  } = {},
) {
  const { port, mock, cb } = fakeTreadmill();
  const save = opts.save ?? jest.fn().mockResolvedValue('saved');
  const hook = await renderHook(() =>
    useWorkoutSession({
      treadmill: port,
      heightCm: opts.heightCm ?? 152,
      canSave: opts.canSave ?? true,
      save,
      retryQueued: opts.retryQueued ?? jest.fn().mockResolvedValue(false),
    }),
  );
  await act(async () => {
    await hook.result.current.connect({ id: 'fs-1' } as Device);
  });
  return { ...hook, mock, cb, save };
}

async function runWorkout(cb: Callbacks, seconds = 30) {
  await act(async () => {
    cb.onStatus?.('started');
    for (let t = 1; t <= seconds; t++) cb.onData?.(sample(t));
  });
}

describe('useWorkoutSession', () => {
  it('shows live data once connected', async () => {
    const { result, cb } = await setup();
    expect(result.current.connected).toBe(true);
    await act(async () => cb.onData?.(sample(5, 4)));
    expect(result.current.data.speedKmh).toBe(4);
  });

  it('saves the finished workout once when the treadmill stops', async () => {
    const { result, cb, save } = await setup();
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('stopped'));

    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toMatchObject({ durationS: 29 });
    expect(result.current.saveState).toBe('saved');
    expect(result.current.summary?.segments).toHaveLength(1);
  });

  it('uses the configured profile height for estimated workout steps', async () => {
    const shorter = await setup({ heightCm: 150 });
    await runWorkout(shorter.cb);
    await act(async () => shorter.cb.onStatus?.('stopped'));

    const taller = await setup({ heightCm: 190 });
    await runWorkout(taller.cb);
    await act(async () => taller.cb.onStatus?.('stopped'));

    expect(shorter.result.current.summary?.steps).toBeGreaterThan(
      taller.result.current.summary?.steps ?? 0,
    );
  });

  it('shows the summary but does not save when signed out', async () => {
    const { result, cb, save } = await setup({ canSave: false });
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('stopped'));

    expect(save).not.toHaveBeenCalled();
    expect(result.current.summary).not.toBeNull();
    expect(result.current.saveState).toBe('idle');
  });

  it('reports a failed save and can retry it', async () => {
    const save = jest.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('saved');
    const { result, cb } = await setup({ save });
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('stopped'));

    expect(result.current.saveState).toBe('error');
    expect(result.current.saveError).toBe('offline');

    await act(async () => {
      await result.current.save(result.current.summary!);
    });
    expect(result.current.saveState).toBe('saved');
  });

  it('keeps an offline save marked queued until sync succeeds', async () => {
    const save = jest.fn().mockResolvedValue('queued');
    const { result, cb } = await setup({ save });
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('stopped'));

    expect(result.current.saveState).toBe('queued');
  });

  it('retries a queued save when connectivity returns', async () => {
    const retryQueued = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const save = jest.fn().mockResolvedValue('queued');
    const { result, cb } = await setup({ save, retryQueued });
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('stopped'));

    expect(result.current.saveState).toBe('queued');
    await act(async () => {
      networkListener?.({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(retryQueued).toHaveBeenCalledTimes(2);
  });

  it('does not end the workout on pause', async () => {
    const { result, cb } = await setup();
    await runWorkout(cb);
    await act(async () => cb.onStatus?.('paused'));
    expect(result.current.summary).toBeNull();
  });

  it('ignores samples that arrive before a started event', async () => {
    const { result, cb, save } = await setup();
    await act(async () => {
      for (let t = 1; t <= 10; t++) cb.onData?.(sample(t));
      cb.onStatus?.('stopped');
    });
    expect(result.current.summary).toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('finishes the workout if the treadmill disconnects', async () => {
    const { result, cb } = await setup();
    await runWorkout(cb);
    await act(async () => cb.onDisconnect?.());
    expect(result.current.connected).toBe(false);
    expect(result.current.summary).not.toBeNull();
  });

  it('keeps the target speed within the treadmill limits', async () => {
    const { result, mock } = await setup();
    await act(async () => {
      await result.current.changeSpeed(100);
    });
    expect(mock.setSpeed).toHaveBeenLastCalledWith(MAX_KMH);
    expect(result.current.targetKmh).toBe(MAX_KMH);
  });
});
