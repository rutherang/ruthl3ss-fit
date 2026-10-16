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
      .mockResolvedValueOnce(ok({ files: [{ id: 'folder1' }] })) // find folder
      .mockResolvedValueOnce(ok({ files: [{ id: 'sheet1' }] })) // find sheet
      .mockResolvedValueOnce(ok({ parents: ['folder1'] })) // sheet is in folder
      .mockResolvedValueOnce(ok()) // append to Workouts
      .mockResolvedValueOnce(ok()); // append to Workout segments
    (global as any).fetch = fetchMock;

    await saveWorkout(summary);

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(fetchMock.mock.calls[0][0]).toContain('mimeType%3D');
    expect(fetchMock.mock.calls[1][0]).toContain('mimeType%3D');
    expect(fetchMock.mock.calls[2][0]).toBe(
      'https://www.googleapis.com/drive/v3/files/sheet1?fields=parents',
    );
    const body = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(body.values[0][0]).toBe('w_1700000000000');
  });

  it('retries only the part that failed, without duplicating rows', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(ok({ files: [{ id: 'folder1' }] })) // find folder
      .mockResolvedValueOnce(ok({ files: [{ id: 'sheet1' }] })) // find sheet
      .mockResolvedValueOnce(ok({ parents: ['folder1'] })) // sheet is in folder
      .mockResolvedValueOnce(ok()) // Workouts saved
      .mockResolvedValueOnce(fail()) // segments fail
      .mockResolvedValueOnce(ok()); // segments retry works
    (global as any).fetch = fetchMock;

    await expect(saveWorkout(summary)).rejects.toThrow('Google 500');
    await saveWorkout(summary);

    // Folder, sheet, and parent checks run once. The workout is saved once,
    // while the failed segment append is retried.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });
});
