import type { Profile, Sex } from '@/types/profile';
import { ageFromBirthDate } from './age';

export const DEFAULT_PROFILE_MEASUREMENTS = {
  heightCm: 152,
  age: 25,
  sex: 'male',
} as const satisfies { heightCm: number; age: number; sex: Sex };

export function profileMeasurements(profile: Profile | null, now = new Date()) {
  if (!profile) {
    return { ...DEFAULT_PROFILE_MEASUREMENTS, usingDefaults: true };
  }

  return {
    heightCm: profile.heightCm,
    age: ageFromBirthDate(profile.birthDate, now),
    sex: profile.sex,
    usingDefaults: false,
  };
}
