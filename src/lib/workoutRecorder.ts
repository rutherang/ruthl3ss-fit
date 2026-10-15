import { TreadmillData } from '../ble/treadmill';
import { stepLengthM } from './steps';

type Sample = {
  t: number; // treadmill elapsed seconds
  kmh: number;
  m: number; // cumulative distance, metres
  kcal: number;
  incline: number;
  hr: number;
};

export type Segment = {
  startS: number;
  durationS: number;
  distanceM: number;
  steps: number;
  avgKmh: number;
  paceMinPerKm: number | null;
  kcal: number;
};

export type WorkoutSummary = {
  startedAt: number;
  durationS: number;
  distanceM: number;
  steps: number;
  avgKmh: number;
  maxKmh: number;
  avgInclinePct: number;
  kcal: number;
  avgHr?: number;
  maxHr?: number;
  segments: Segment[];
};

const WINDOW_S = 5; // speed must be steady this long to count as a change
const STABLE_RANGE = 0.2; // km/h spread allowed inside that window
const MIN_CHANGE = 0.3; // km/h difference that starts a new segment
const MIN_SEGMENT_S = 10; // shorter segments are absorbed

export const fmtTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export const fmtPace = (p: number | null) => {
  if (p === null) return '--';
  const sec = Math.round(p * 60);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}/km`;
};

export class WorkoutRecorder {
  private samples: Sample[] = [];
  readonly startedAt = Date.now();

  constructor(
    private heightCm: number,
    private calibration = 1, // multiply steps if you know the real count
  ) {}

  push(d: TreadmillData) {
    if (
      d.elapsedS === undefined ||
      d.distanceM === undefined ||
      d.speedKmh === undefined
    )
      return;
    let last: Sample | undefined = this.samples[this.samples.length - 1];
    if (last && d.elapsedS < last.t) {
      this.samples = []; // the treadmill reset its clock: a new run began
      last = undefined;
    }
    if (last && d.elapsedS === last.t) return; // at most one sample a second
  }

  summarize(): WorkoutSummary | null {
    const s = this.samples;
    if (s.length < 2) return null;

    // Steps for each second, using that second's speed.
    const steps = [0];
    for (let i = 1; i < s.length; i++) {
      const dd = Math.max(0, s[i].m - s[i - 1].m);
      steps.push(
        (dd / stepLengthM(s[i].kmh, this.heightCm)) * this.calibration,
      );
    }

    // Find where the speed settled at a new level.
    const bounds = [0];
    let ref = s[0].kmh;
    for (let i = WINDOW_S - 1; i < s.length; i++) {
      const start = i - WINDOW_S + 1;
      const win = s.slice(start, i + 1).map((x) => x.kmh);
      const stable = Math.max(...win) - Math.min(...win) < STABLE_RANGE;
      const mean = win.reduce((a, b) => a + b, 0) / win.length;
      if (stable && Math.abs(mean - ref) >= MIN_CHANGE) {
        const prev = bounds[bounds.length - 1];
        if (s[start].t - s[prev].t >= MIN_SEGMENT_S) bounds.push(start);
        ref = mean;
      }
    }

    const ends = [...bounds.slice(1), s.length - 1];
    const segments: Segment[] = bounds.map((a, k) => {
      const b = ends[k];
      const durationS = s[b].t - s[a].t;
      const distanceM = s[b].m - s[a].m;
      let st = 0;
      for (let i = a + 1; i <= b; i++) st += steps[i];
      return {
        startS: s[a].t,
        durationS,
        distanceM,
        steps: Math.round(st),
        avgKmh: durationS > 0 ? (distanceM / durationS) * 3.6 : 0,
        paceMinPerKm:
          distanceM > 0 ? durationS / 60 / (distanceM / 1000) : null,
        kcal: s[b].kcal - s[a].kcal,
      };
    });

    const first = s[0];
    const last = s[s.length - 1];
    const durationS = last.t - first.t;
    const distanceM = last.m - first.m;
    const hrs = s.map((x) => x.hr).filter((h) => h > 0);
    return {
      startedAt: this.startedAt,
      durationS,
      distanceM,
      steps: segments.reduce((a, g) => a + g.steps, 0),
      avgKmh: durationS > 0 ? (distanceM / durationS) * 3.6 : 0,
      maxKmh: Math.max(...s.map((x) => x.kmh)),
      avgInclinePct: s.reduce((a, x) => a + x.incline, 0) / s.length,
      kcal: last.kcal - first.kcal,
      avgHr: hrs.length
        ? Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
        : undefined,
      maxHr: hrs.length ? Math.max(...hrs) : undefined,
      segments,
    };
  }
}
