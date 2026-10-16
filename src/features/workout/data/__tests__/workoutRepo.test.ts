import { queueSheetAppend } from '@/integrations/google/sheetQueue';
import type { SheetRecord } from '@/integrations/google/sheets';
import type { WorkoutSummary } from '../../domain/workoutRecorder';
import {
  SEGMENT_HEADERS,
  SEGMENT_TAB,
  WORKOUT_HEADERS,
  WORKOUT_TAB,
  saveWorkout,
  segmentRecords,
  workoutRecord,
} from '../workoutRepo';

jest.mock('@/integrations/google/sheetQueue', () => ({
  queueSheetAppend: jest.fn(),
}));

const queue = queueSheetAppend as jest.Mock;

// A different startedAt per test keeps their saved-parts memory separate.
const summary = (startedAt: number): WorkoutSummary => ({
  startedAt,
  durationS: 600,
  distanceM: 1000.4,
  steps: 1400,
  avgKmh: 6.04,
  maxKmh: 6.5,
  avgInclinePct: 0,
  kcal: 60,
  avgHr: undefined,
  maxHr: undefined,
  segments: [
    {
      startS: 1,
      durationS: 600,
      distanceM: 1000.4,
      steps: 1400,
      avgKmh: 6.04,
      paceMinPerKm: 9.9967,
      kcal: 60,
    },
  ],
});

beforeEach(() => queue.mockReset());

describe('record mapping', () => {
  it('rounds and names the workout columns', () => {
    const r = workoutRecord(summary(1_700_000_000_000), 'w_1', 'default');
    expect(r).toMatchObject({
      id: 'w_1',
      profile_id: 'default',
      distance_m: 1000,
      avg_kmh: 6,
      max_kmh: 6.5,
      avg_hr: '',
      segments: 1,
    });
    expect(String(r.started_at)).toMatch(/^2023-11-1[45] \d{2}:\d{2}:\d{2}$/);
  });

  it('maps every segment with its workout id and number', () => {
    const [s] = segmentRecords(summary(1_700_000_000_001), 'w_1');
    expect(s).toMatchObject({
      workout_id: 'w_1',
      seg_no: 1,
      distance_m: 1000,
      pace_min_per_km: 10,
    });
  });

  it('only uses columns that exist in the headers', () => {
    const w = workoutRecord(summary(1_700_000_000_002), 'w_1', 'default');
    const s = segmentRecords(summary(1_700_000_000_002), 'w_1')[0];
    const unknown = (rec: SheetRecord, headers: string[]) =>
      Object.keys(rec).filter((k) => !headers.includes(k));
    expect(unknown(w, WORKOUT_HEADERS)).toEqual([]);
    expect(unknown(s, SEGMENT_HEADERS)).toEqual([]);
  });
});

describe('saveWorkout', () => {
  it('queues account-scoped records with stable operation keys', async () => {
    queue.mockResolvedValue('saved');
    const workout = summary(1_700_000_000_010);

    await expect(saveWorkout(workout, '  Athlete@Example.com ')).resolves.toBe('saved');

    expect(queue.mock.calls).toEqual([
      [
        'athlete@example.com',
        'w_1700000000010:workout',
        expect.objectContaining({ tab: WORKOUT_TAB, idValue: 'w_1700000000010' }),
      ],
      [
        'athlete@example.com',
        'w_1700000000010:segments',
        expect.objectContaining({ tab: SEGMENT_TAB, idValue: 'w_1700000000010' }),
      ],
    ]);
  });

  it('keeps a failed operation retryable with the same stable key', async () => {
    queue
      .mockResolvedValueOnce('saved')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('saved')
      .mockResolvedValueOnce('saved');
    const w = summary(1_700_000_000_020);

    await expect(saveWorkout(w, 'one@example.com')).rejects.toThrow('boom');
    await expect(saveWorkout(w, 'one@example.com')).resolves.toBe('saved');

    expect(queue.mock.calls.map((call) => call[1])).toEqual([
      'w_1700000000020:workout',
      'w_1700000000020:segments',
      'w_1700000000020:workout',
      'w_1700000000020:segments',
    ]);
  });

  it('returns queued when a write is waiting for connectivity', async () => {
    queue.mockResolvedValueOnce('saved').mockResolvedValueOnce('queued');

    await expect(saveWorkout(summary(1_700_000_000_030), 'one@example.com')).resolves.toBe(
      'queued',
    );
  });
});
