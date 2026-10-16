import { act, renderHook } from '@testing-library/react-native';
import type { ScaleReading } from '@/types/scale';
import { useScaleSession, type ScaleListen } from '../useScaleSession';

const reading = (weightKg: number, final: boolean): ScaleReading => ({
  weightKg,
  impedanceRaw: final ? 6000 : 0,
  final,
  at: 1_700_000_000_000,
});

function fakeListen() {
  let emit: (r: ScaleReading) => void = () => {};
  const stop = jest.fn();
  const listen: ScaleListen = jest.fn(async (onReading) => {
    emit = onReading;
    return stop;
  });
  return { listen, stop, send: (r: ScaleReading) => emit(r) };
}

async function setup(active = true) {
  const f = fakeListen();
  const hook = await renderHook(
    (p: { active: boolean }) =>
      useScaleSession({ active: p.active, listen: f.listen, heightCm: 152 }),
    { initialProps: { active } },
  );
  return { ...hook, ...f };
}

describe('useScaleSession', () => {
  it('listens only while active', async () => {
    const { listen, stop, rerender } = await setup(true);
    expect(listen).toHaveBeenCalledTimes(1);
    await rerender({ active: false });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('does not listen while inactive', async () => {
    const { listen } = await setup(false);
    expect(listen).not.toHaveBeenCalled();
  });

  it('records a weigh-in once it has watched the weight settle', async () => {
    const { result, send } = await setup();
    expect(result.current.status).toBe('Step on the scale');

    await act(async () => send(reading(62.8, false)));
    expect(result.current.status).toBe('Measuring...');

    await act(async () => send(reading(62.9, true)));
    expect(result.current.status).toBe('Final reading');
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].weightKg).toBe(62.9);
    expect(result.current.bmi).toBeCloseTo(27.2, 1);
  });

  it('does not add the same weigh-in twice', async () => {
    const { result, send } = await setup();
    await act(async () => {
      send(reading(62.8, false));
      send(reading(62.9, true));
      send(reading(62.9, true));
      send(reading(62.9, true));
    });
    expect(result.current.history).toHaveLength(1);
  });

  it('records a second weigh-in after a new measurement', async () => {
    const { result, send } = await setup();
    await act(async () => {
      send(reading(62.8, false));
      send(reading(62.9, true));
      send(reading(63.4, false));
      send(reading(63.5, true));
    });
    expect(result.current.history.map((h) => h.weightKg)).toEqual([63.5, 62.9]);
  });

  it('ignores the old reading the scale keeps re-broadcasting', async () => {
    const { result, send } = await setup();
    await act(async () => send(reading(62.9, true)));
    expect(result.current.status).toBe('Last reading (may be old)');
    expect(result.current.history).toHaveLength(0);
  });

  it('shows an error when listening fails', async () => {
    const listen: ScaleListen = jest.fn().mockRejectedValue(new Error('no bluetooth'));
    const { result } = await renderHook(() =>
      useScaleSession({ active: true, listen, heightCm: 152 }),
    );
    await act(async () => {});
    expect(result.current.error).toBe('no bluetooth');
  });
});