import { stepLengthM } from '../steps';

describe('stepLengthM', () => {
  it('grows with speed', () => {
    expect(stepLengthM(3, 170)).toBeLessThan(stepLengthM(6, 170));
    expect(stepLengthM(6, 170)).toBeLessThan(stepLengthM(10, 170));
  });

  it('scales with height', () => {
    expect(stepLengthM(5, 180) / stepLengthM(5, 150)).toBeCloseTo(1.2);
  });

  it('interpolates between table points', () => {
    // halfway between 0.39 (4 km/h) and 0.42 (5 km/h)
    expect(stepLengthM(4.5, 170)).toBeCloseTo(0.405 * 1.7, 3);
  });

  it('clamps outside the table', () => {
    expect(stepLengthM(0, 170)).toBe(stepLengthM(2, 170));
    expect(stepLengthM(30, 170)).toBe(stepLengthM(18, 170));
  });
});
