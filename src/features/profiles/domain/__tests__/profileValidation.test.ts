import { validateProfileInput, type ProfileInput } from '../profileValidation';

const validProfile: ProfileInput = {
  name: 'Test Runner',
  sex: 'female',
  birthDate: '1990-02-28',
  heightCm: 168,
};

describe('validateProfileInput', () => {
  it('accepts a valid profile', () => {
    expect(() => validateProfileInput(validProfile, new Date(2026, 9, 16))).not.toThrow();
  });

  it.each(['1990-02-29', '1990-13-01', '1990-00-10'])(
    'rejects invalid calendar date %s',
    (birthDate) => {
      expect(() =>
        validateProfileInput({ ...validProfile, birthDate }, new Date(2026, 9, 16)),
      ).toThrow('Enter a valid calendar date.');
    },
  );

  it('requires the ISO calendar-date format', () => {
    expect(() => validateProfileInput({ ...validProfile, birthDate: 'tomorrow' })).toThrow(
      'Enter the birth date in YYYY-MM-DD format.',
    );
  });

  it('rejects dates after today', () => {
    expect(() =>
      validateProfileInput({ ...validProfile, birthDate: '2026-10-17' }, new Date(2026, 9, 16)),
    ).toThrow('Birth date cannot be in the future.');
  });

  it.each([49, 251, 168.5])('rejects invalid height %s', (heightCm) => {
    expect(() => validateProfileInput({ ...validProfile, heightCm })).toThrow(
      'Height must be a whole number between 50 and 250 cm.',
    );
  });
});
