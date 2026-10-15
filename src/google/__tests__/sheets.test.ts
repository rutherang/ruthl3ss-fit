import { WorkoutSummary } from '../../lib/workoutRecorder';
import { resetSheetCache, saveWorkout } from '../sheets';

jest.mock('../auth', () => ({
  getAccessToken: jest.fn().mockResolvedValue('test-token'),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { clearCachedAccessToken: jest.fn() },
}));

const ok = (body: unknown = {}) =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => '',
  });
const fail = () =>
  Promise.resolve({
    ok: false,
    status: 500,
    json: async () => ({}),
    text: async () => 'boom',
  });

const summary: WorkoutSummary = {
  startedAt: 1_700_000_000_000,
  durationS: 600,
  distanceM: 1000,
  steps: 1400,
  avgKmh: 6,
  maxKmh: 6,
  avgInclinePct: 0,
  kcal: 60,
  segments: [
    {
      startS: 1,
      durationS: 600,
      distanceM: 1000,
      steps: 1400,
      avgKmh: 6,
      paceMinPerKm: 10,
      kcal: 60,
    },
  ],
};

beforeEach(() => resetSheetCache());

describe('saveWorkout', () => {
  it('finds the sheet, then appends the workout and its segments', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(ok({ files: [{ id: 'sheet1' }] })) // find sheet
      .mockResolvedValueOnce(ok()) // append to Workouts
      .mockResolvedValueOnce(ok()); // append to Workout segments
    (global as any).fetch = fetchMock;

    await saveWorkout(summary);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.values[0][0]).toBe('w_1700000000000');
  });

  it('retries only the part that failed, without duplicating rows', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(ok({ files: [{ id: 'sheet1' }] }))
      .mockResolvedValueOnce(ok()) // Workouts saved
      .mockResolvedValueOnce(fail()) // segments fail
      .mockResolvedValueOnce(ok()); // segments retry works
    (global as any).fetch = fetchMock;

    await expect(saveWorkout(summary)).rejects.toThrow('Google 500');
    await saveWorkout(summary);

    // find + Workouts once + segments twice = 4, not 5
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
