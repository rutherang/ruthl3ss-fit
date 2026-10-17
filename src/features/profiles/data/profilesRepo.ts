import { fmtDateTime } from '@/lib/format';
import type { SheetRecord } from '@/integrations/google/sheets';
import { flushPendingSheetWrites, queueSheetUpsert } from '@/integrations/google/sheetQueue';
import {
  getProfile as getCachedProfile,
  getProfiles as getCachedProfiles,
  saveProfile as saveCachedProfile,
} from '@/integrations/storage/profiles';
import type { Profile } from '@/types/profile';
import { validateProfileInput, type ProfileInput } from '../domain/profileValidation';

export const PROFILES_TAB = 'Profiles';
export const PROFILES_HEADERS = [
  'id',
  'name',
  'sex',
  'birthDate',
  'heightCm',
  'createdAt',
  'photoFileId',
];

export type ProfileSaveResult = {
  profile: Profile;
  syncStatus: 'saved' | 'queued' | 'error';
  syncError?: string;
};

let operationSequence = 0;

const normalizeAccount = (accountId: string) => accountId.trim().toLowerCase();

export function profileRecord(profile: Profile): SheetRecord {
  return {
    id: profile.id,
    name: profile.name,
    sex: profile.sex,
    birthDate: profile.birthDate,
    heightCm: profile.heightCm,
    createdAt: fmtDateTime(new Date(profile.createdAt).getTime()),
    photoFileId: profile.photoFileId ?? '',
  };
}

export function getProfiles(accountId: string): Promise<Profile[]> {
  return getCachedProfiles(normalizeAccount(accountId));
}

export function getProfile(accountId: string, profileId: string): Promise<Profile | null> {
  return getCachedProfile(normalizeAccount(accountId), profileId);
}

export async function saveProfile(
  accountId: string,
  input: ProfileInput,
): Promise<ProfileSaveResult> {
  const account = normalizeAccount(accountId);
  if (!account) throw new Error('Sign in to Google before saving a profile.');
  validateProfileInput(input);

  const now = new Date().toISOString();
  const profile: Profile = {
    ...input,
    id: input.id?.trim() || `p_${Date.now()}_${++operationSequence}`,
    name: input.name.trim(),
    createdAt: input.createdAt || now,
  };
  await saveCachedProfile(account, profile);

  const operationKey = `${profile.id}:profile:${Date.now()}:${++operationSequence}`;
  try {
    const syncStatus = await queueSheetUpsert(account, operationKey, {
      tab: PROFILES_TAB,
      headers: PROFILES_HEADERS,
      records: [profileRecord(profile)],
      idColumn: 'id',
      idValue: profile.id,
    });
    return { profile, syncStatus };
  } catch (cause: unknown) {
    return {
      profile,
      syncStatus: 'error',
      syncError: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

export function flushQueuedProfiles(accountId: string): Promise<boolean> {
  return flushPendingSheetWrites(normalizeAccount(accountId));
}
