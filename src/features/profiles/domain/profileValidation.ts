import type { Profile } from '@/types/profile';

export type ProfileInput = Omit<Profile, 'id' | 'createdAt'> & {
  id?: string;
  createdAt?: string;
};

export function validateProfileInput(profile: ProfileInput, now = new Date()): void {
  const name = profile.name.trim();
  if (!name) throw new Error('A profile name is required.');
  if (name.length > 80) throw new Error('A profile name must be 80 characters or fewer.');

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(profile.birthDate);
  if (!match) throw new Error('Enter the birth date in YYYY-MM-DD format.');
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error('Enter a valid calendar date.');
  }

  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  if (parsedDate > today) throw new Error('Birth date cannot be in the future.');

  if (!Number.isInteger(profile.heightCm) || profile.heightCm < 50 || profile.heightCm > 250) {
    throw new Error('Height must be a whole number between 50 and 250 cm.');
  }
}
