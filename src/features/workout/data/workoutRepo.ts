import { appendRowsOnce } from '@/google/sheets';
import type { WorkoutSummary } from '@/features/workout/domain/workoutRecorder';

const pad = (value: number) => String(value).padStart(2, '0');

function formatLocalDateTime(timestamp: number) {
  const date = new Date(timestamp);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

const roundToTenth = (value: number) => Math.round(value * 10) / 10;

export async function saveWorkout(workout: WorkoutSummary, profileId = 'default') {
  const workoutId = `w_${workout.startedAt}`;

  await appendRowsOnce(`${workoutId}:workout`, 'Workouts', [
    [
      workoutId,
      profileId,
      formatLocalDateTime(workout.startedAt),
      workout.durationS,
      Math.round(workout.distanceM),
      roundToTenth(workout.avgKmh),
      roundToTenth(workout.maxKmh),
      roundToTenth(workout.avgInclinePct),
      workout.kcal,
      workout.steps,
      workout.avgHr ?? '',
      workout.maxHr ?? '',
      workout.segments.length,
    ],
  ]);

  await appendRowsOnce(
    `${workoutId}:segments`,
    'Workout segments',
    workout.segments.map((segment, index) => [
      workoutId,
      index + 1,
      segment.startS,
      segment.durationS,
      Math.round(segment.distanceM),
      roundToTenth(segment.avgKmh),
      segment.paceMinPerKm === null ? '' : Math.round(segment.paceMinPerKm * 100) / 100,
      segment.steps,
      segment.kcal,
    ]),
  );
}
