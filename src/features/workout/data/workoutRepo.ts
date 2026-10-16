import { fmtDateTime, round1 } from '@/lib/format';
import type { SheetRecord } from '@/integrations/google/sheets';
import { flushPendingSheetWrites, queueSheetAppend } from '@/integrations/google/sheetQueue';
import type { WorkoutSummary } from '../domain/workoutRecorder';

export const WORKOUT_TAB = 'Workouts';
export const WORKOUT_HEADERS = [
  'id',
  'profile_id',
  'started_at',
  'duration_s',
  'distance_m',
  'avg_kmh',
  'max_kmh',
  'avg_incline_pct',
  'kcal',
  'steps_est',
  'avg_hr',
  'max_hr',
  'segments',
];

export const SEGMENT_TAB = 'Workout segments';
export const SEGMENT_HEADERS = [
  'workout_id',
  'seg_no',
  'start_s',
  'duration_s',
  'distance_m',
  'avg_kmh',
  'pace_min_per_km',
  'steps_est',
  'kcal',
];

export function workoutRecord(w: WorkoutSummary, id: string, profileId: string): SheetRecord {
  return {
    id,
    profile_id: profileId,
    started_at: fmtDateTime(w.startedAt),
    duration_s: w.durationS,
    distance_m: Math.round(w.distanceM),
    avg_kmh: round1(w.avgKmh),
    max_kmh: round1(w.maxKmh),
    avg_incline_pct: round1(w.avgInclinePct),
    kcal: w.kcal,
    steps_est: w.steps,
    avg_hr: w.avgHr ?? '',
    max_hr: w.maxHr ?? '',
    segments: w.segments.length,
  };
}

export function segmentRecords(w: WorkoutSummary, id: string): SheetRecord[] {
  return w.segments.map((g, i) => ({
    workout_id: id,
    seg_no: i + 1,
    start_s: g.startS,
    duration_s: g.durationS,
    distance_m: Math.round(g.distanceM),
    avg_kmh: round1(g.avgKmh),
    pace_min_per_km: g.paceMinPerKm === null ? '' : Math.round(g.paceMinPerKm * 100) / 100,
    steps_est: g.steps,
    kcal: g.kcal,
  }));
}

export async function saveWorkout(
  w: WorkoutSummary,
  accountId: string,
  profileId = 'default',
): Promise<'saved' | 'queued'> {
  const account = accountId.trim().toLocaleLowerCase();
  if (!account) throw new Error('Sign in to Google before saving a workout.');
  const id = `w_${w.startedAt}`;
  const workoutTask = await queueSheetAppend(account, `${id}:workout`, {
    tab: WORKOUT_TAB,
    headers: WORKOUT_HEADERS,
    records: [workoutRecord(w, id, profileId)],
    idColumn: 'id',
    idValue: id,
  });
  const segmentsTask = await queueSheetAppend(account, `${id}:segments`, {
    tab: SEGMENT_TAB,
    headers: SEGMENT_HEADERS,
    records: segmentRecords(w, id),
    idColumn: 'workout_id',
    idValue: id,
  });
  return workoutTask === 'queued' || segmentsTask === 'queued' ? 'queued' : 'saved';
}

export function flushQueuedWorkouts(accountId: string): Promise<boolean> {
  return flushPendingSheetWrites(accountId.trim().toLocaleLowerCase());
}
