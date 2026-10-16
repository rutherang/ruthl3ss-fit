import { WorkoutRecorder } from '../workoutRecorder';

type Plan = [seconds: number, kmh: number][];

// Feeds one packet per second, like the treadmill does.
function feed(rec: WorkoutRecorder, plan: Plan) {
  let t = 0;
  let m = 0;
  for (const [secs, kmh] of plan) {
    for (let i = 0; i < secs; i++) {
      t += 1;
      m += kmh / 3.6;
      rec.push({
        elapsedS: t,
        distanceM: Math.round(m), // the treadmill reports whole metres
        speedKmh: kmh,
        kcal: Math.round(t / 10),
      });
    }
  }
}

const newRec = () => new WorkoutRecorder(152);

describe('WorkoutRecorder', () => {
  it('returns null with fewer than two samples', () => {
    const rec = newRec();
    expect(rec.summarize()).toBeNull();
    feed(rec, [[1, 3]]);
    expect(rec.summarize()).toBeNull();
  });

  it('ignores packets missing time, speed or distance', () => {
    const rec = newRec();
    rec.push({ speedKmh: 3 });
    expect(rec.summarize()).toBeNull();
  });

  it('carries forward optional readings when later packets omit them', () => {
    const rec = newRec();
    rec.push({
      elapsedS: 1,
      distanceM: 1,
      speedKmh: 3,
      kcal: 5,
      inclinePct: 2,
      heartRate: 100,
    });
    rec.push({ elapsedS: 2, distanceM: 2, speedKmh: 3 });

    expect(rec.summarize()).toMatchObject({
      kcal: 0,
      avgInclinePct: 2,
      avgHr: 100,
      maxHr: 100,
    });
  });

  it('splits a workout into one segment per speed level', () => {
    const rec = newRec();
    feed(rec, [
      [180, 3],
      [300, 6],
      [180, 3],
    ]);
    const s = rec.summarize()!;

    expect(s.segments).toHaveLength(3);
    expect(s.segments[0].avgKmh).toBeCloseTo(3, 0);
    expect(s.segments[1].avgKmh).toBeCloseTo(6, 0);
    expect(s.segments[2].avgKmh).toBeCloseTo(3, 0);
    expect(s.distanceM).toBeGreaterThan(795);
    expect(s.distanceM).toBeLessThan(805);
    expect(s.maxKmh).toBe(6);
  });

  it('counts fewer steps per metre at a faster speed', () => {
    const rec = newRec();
    feed(rec, [
      [180, 3],
      [300, 6],
    ]);
    const [slow, fast] = rec.summarize()!.segments;
    expect(fast.steps / fast.distanceM).toBeLessThan(
      slow.steps / slow.distanceM,
    );
  });

  it('totals the steps of all segments', () => {
    const rec = newRec();
    feed(rec, [
      [120, 3],
      [120, 5],
      [120, 8],
    ]);
    const s = rec.summarize()!;
    expect(s.steps).toBe(s.segments.reduce((a, g) => a + g.steps, 0));
  });

  it('does not split on a short blip', () => {
    const rec = newRec();
    feed(rec, [
      [60, 3],
      [4, 6],
      [60, 3],
    ]);
    expect(rec.summarize()!.segments).toHaveLength(1);
  });

  it('treats a speed ramp as one change, not many', () => {
    const rec = newRec();
    feed(rec, [
      [60, 3],
      [1, 3.5],
      [1, 4.5],
      [1, 5.5],
      [200, 6],
    ]);
    expect(rec.summarize()!.segments).toHaveLength(2);
  });

  it('starts over when the treadmill resets its clock', () => {
    const rec = newRec();
    feed(rec, [[30, 3]]);
    feed(rec, [[20, 3]]); // time restarts at 1
    expect(rec.summarize()!.durationS).toBe(19);
  });
});
