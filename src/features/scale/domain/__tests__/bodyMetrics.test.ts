import { bmiLevel, computeMetrics, fatLevel } from '../bodyMetrics';

describe('body metrics', () => {
  it('classifies BMI at its boundaries', () => {
    expect(bmiLevel(18.4)).toBe('low');
    expect(bmiLevel(18.5)).toBe('normal');
    expect(bmiLevel(25)).toBe('high');
    expect(bmiLevel(30)).toBe('obese');
  });

  it('classifies body-fat levels by sex', () => {
    expect(fatLevel(9, 'male')).toBe('low');
    expect(fatLevel(18, 'male')).toBe('normal');
    expect(fatLevel(27, 'female')).toBe('normal');
    expect(fatLevel(33, 'female')).toBe('obese');
  });

  it('computes rounded metrics from weight and profile measurements', () => {
    expect(computeMetrics(70, { sex: 'male', age: 30, heightCm: 175 })).toMatchObject({
      weightKg: 70,
      bmi: 22.9,
      bmiLevel: 'normal',
      bmrKcal: 1649,
    });
  });
});
