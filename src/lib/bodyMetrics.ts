export type Sex = 'male' | 'female';
export type Level = 'low' | 'normal' | 'high' | 'obese';
export type Person = { sex: Sex; age: number; heightCm: number };

export function bmiLevel(bmi: number): Level {
  if (bmi < 18.5) return 'low';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'high';
  return 'obese';
}

export function fatLevel(pct: number, sex: Sex): Level {
  const [a, b, c] = sex === 'male' ? [10, 20, 25] : [18, 28, 33];
  if (pct < a) return 'low';
  if (pct < b) return 'normal';
  if (pct < c) return 'high';
  return 'obese';
}

export function ageFromBirthDate(iso: string, now = new Date()): number {
  const b = new Date(iso);
  let age = now.getFullYear() - b.getFullYear();
  const before =
    now.getMonth() < b.getMonth() ||
    (now.getMonth() === b.getMonth() && now.getDate() < b.getDate());
  return before ? age - 1 : age;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function computeMetrics(w: number, p: Person) {
  const male = p.sex === 'male';
  const m = p.heightCm / 100;
  const bmi = w / (m * m);

  // Body fat: average of a lean-mass method (Boer) and BMI method (Deurenberg)
  const boerLean = male
    ? 0.407 * w + 0.267 * p.heightCm - 19.2
    : 0.252 * w + 0.473 * p.heightCm - 48.3;
  const fatBoer = ((w - boerLean) / w) * 100;
  const fatDeur = 1.2 * bmi + 0.23 * p.age - 10.8 * (male ? 1 : 0) - 5.4;
  const fatPct = Math.min(60, Math.max(3, (fatBoer + fatDeur) / 2));

  const fatKg = (w * fatPct) / 100;
  const leanKg = w - fatKg;
  const waterKg = 0.732 * leanKg;
  const boneKg = 0.061 * leanKg; // rough rule of thumb
  const muscleKg = leanKg - boneKg;
  const proteinKg = leanKg - waterKg - boneKg;
  const standardKg = (p.heightCm - 100) * 0.9;
  const bmr = 10 * w + 6.25 * p.heightCm - 5 * p.age + (male ? 5 : -161);

  return {
    weightKg: r1(w),
    bmi: r1(bmi),
    bmiLevel: bmiLevel(bmi),
    fatPct: r1(fatPct),
    fatKg: r1(fatKg),
    fatLevel: fatLevel(fatPct, p.sex),
    leanKg: r1(leanKg),
    waterKg: r1(waterKg),
    waterPct: r1((waterKg / w) * 100),
    boneKg: Math.round(boneKg * 100) / 100,
    muscleKg: r1(muscleKg),
    proteinKg: r1(proteinKg),
    proteinPct: r1((proteinKg / w) * 100),
    standardWeightKg: r1(standardKg),
    obesityDegreePct: r1(((w - standardKg) / standardKg) * 100),
    bmrKcal: Math.round(bmr),
  };
}
