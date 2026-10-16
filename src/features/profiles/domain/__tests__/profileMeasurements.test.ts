import type { Profile } from '@/types/profile';
import { profileMeasurements, DEFAULT_PROFILE_MEASUREMENTS } from '../profileMeasurements';

const profile: Profile = {
  id: 'profile-1',
  name: 'Runner',
  sex: 'female',
  birthDate: '1990-10-17',
  heightCm: 168,
  createdAt: '2020-01-01T00:00:00.000Z',
};

describe('profileMeasurements', () => {
  it('uses the documented fallback values when no profile is active', () => {
    expect(profileMeasurements(null, new Date(2026, 9, 16))).toEqual({
      ...DEFAULT_PROFILE_MEASUREMENTS,
      usingDefaults: true,
    });
  });

  it('uses profile height, sex, and birthday-aware age', () => {
    expect(profileMeasurements(profile, new Date(2026, 9, 16))).toEqual({
      heightCm: 168,
      age: 35,
      sex: 'female',
      usingDefaults: false,
    });
  });
});
