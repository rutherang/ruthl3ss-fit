import { ageFromBirthDate } from '../age';

describe('ageFromBirthDate', () => {
  const birthDate = '2000-06-15T12:00:00';

  it('does not count a birthday that has not happened yet this year', () => {
    expect(ageFromBirthDate(birthDate, new Date(2025, 5, 14))).toBe(24);
  });

  it('counts the birthday on the birthday itself', () => {
    expect(ageFromBirthDate(birthDate, new Date(2025, 5, 15))).toBe(25);
  });

  it('counts the birthday after it has passed', () => {
    expect(ageFromBirthDate(birthDate, new Date(2025, 5, 16))).toBe(25);
  });
});
