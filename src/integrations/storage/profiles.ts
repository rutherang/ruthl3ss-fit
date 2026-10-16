import * as SQLite from 'expo-sqlite';
import type { Profile } from '@/types/profile';

type ProfileRow = Omit<Profile, 'photoFileId'> & {
  photoFileId: string | null;
};

const accountKey = (accountId: string) => accountId.trim().toLowerCase();

let profilesDb: Promise<SQLite.SQLiteDatabase> | null = null;
let activeProfileDb: Promise<SQLite.SQLiteDatabase> | null = null;

async function getProfilesDatabase(): Promise<SQLite.SQLiteDatabase> {
  profilesDb ??= (async () => {
    const db = await SQLite.openDatabaseAsync('ruthl3ss-fit-profiles.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS profiles (
        accountId TEXT NOT NULL,
        id TEXT NOT NULL,
        name TEXT NOT NULL,
        sex TEXT NOT NULL,
        birthDate TEXT NOT NULL,
        heightCm INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        photoFileId TEXT,
        PRIMARY KEY (accountId, id)
      );
    `);
    return db;
  })().catch((error: unknown) => {
    profilesDb = null;
    throw error;
  });
  return profilesDb;
}

async function getActiveProfileDatabase(): Promise<SQLite.SQLiteDatabase> {
  activeProfileDb ??= (async () => {
    const db = await SQLite.openDatabaseAsync('ruthl3ss-fit-active-profile.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS active_profile (
        accountId TEXT PRIMARY KEY,
        profileId TEXT NOT NULL
      );
    `);
    return db;
  })().catch((error: unknown) => {
    activeProfileDb = null;
    throw error;
  });
  return activeProfileDb;
}

export async function getProfiles(accountId: string): Promise<Profile[]> {
  const key = accountKey(accountId);
  if (!key) return [];
  const db = await getProfilesDatabase();
  const rows = await db.getAllAsync<ProfileRow>(
    'SELECT id, name, sex, birthDate, heightCm, createdAt, photoFileId FROM profiles WHERE accountId = ? ORDER BY name COLLATE NOCASE',
    key,
  );
  return rows.map((row) => ({
    ...row,
    photoFileId: row.photoFileId ?? undefined,
  }));
}

export async function getProfile(accountId: string, profileId: string): Promise<Profile | null> {
  const key = accountKey(accountId);
  if (!key || !profileId.trim()) return null;
  const db = await getProfilesDatabase();
  const row = await db.getFirstAsync<ProfileRow>(
    'SELECT id, name, sex, birthDate, heightCm, createdAt, photoFileId FROM profiles WHERE accountId = ? AND id = ?',
    key,
    profileId.trim(),
  );
  if (!row) return null;
  return {
    ...row,
    photoFileId: row.photoFileId ?? undefined,
  };
}

export async function saveProfile(accountId: string, profile: Profile): Promise<void> {
  const key = accountKey(accountId);
  if (!key) throw new Error('An account id is required to save a profile.');
  if (!profile.id.trim()) throw new Error('A profile id is required to save a profile.');

  const db = await getProfilesDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO profiles (
      accountId, id, name, sex, birthDate, heightCm, createdAt, photoFileId
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    key,
    profile.id.trim(),
    profile.name.trim(),
    profile.sex,
    profile.birthDate,
    profile.heightCm,
    profile.createdAt,
    profile.photoFileId ?? null,
  );
}

export async function deleteProfile(accountId: string, profileId: string): Promise<void> {
  const key = accountKey(accountId);
  if (!key || !profileId.trim()) return;
  const db = await getProfilesDatabase();
  await db.runAsync('DELETE FROM profiles WHERE accountId = ? AND id = ?', key, profileId.trim());
}

export async function getActiveProfileId(accountId: string): Promise<string | null> {
  const key = accountKey(accountId);
  if (!key) return null;
  const db = await getActiveProfileDatabase();
  const row = await db.getFirstAsync<{ profileId: string }>(
    'SELECT profileId FROM active_profile WHERE accountId = ?',
    key,
  );
  return row?.profileId ?? null;
}

export async function setActiveProfileId(
  accountId: string,
  profileId: string | null,
): Promise<void> {
  const key = accountKey(accountId);
  if (!key) throw new Error('An account id is required to set active profile.');
  const db = await getActiveProfileDatabase();

  if (profileId === null) {
    await db.runAsync('DELETE FROM active_profile WHERE accountId = ?', key);
  } else {
    const profile = await getProfile(key, profileId);
    if (!profile) throw new Error('Cannot activate a profile that does not exist.');
    await db.runAsync(
      `INSERT OR REPLACE INTO active_profile (accountId, profileId) VALUES (?, ?)`,
      key,
      profileId.trim(),
    );
  }
}
