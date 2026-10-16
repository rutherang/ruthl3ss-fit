import {
  getActiveProfileId,
  getProfiles,
  getProfile,
  saveProfile,
  deleteProfile,
  setActiveProfileId,
} from '../profiles';

type MockRow = {
  accountId: string;
  id: string;
  name: string;
  sex: string;
  birthDate: string;
  heightCm: number;
  createdAt: string;
  photoFileId?: string;
  profileId?: string;
};

const mockProfiles: MockRow[] = [];
const mockActiveProfiles: { accountId: string; profileId: string }[] = [];

const mockProfilesDatabase = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn(async (sql: string, ...values: (string | number)[]) => {
    if (sql.startsWith('INSERT OR REPLACE INTO profiles')) {
      const [accountId, id, name, sex, birthDate, heightCm, createdAt, photoFileId] = values as [
        string,
        string,
        string,
        string,
        string,
        number,
        string,
        string | null,
      ];

      const existingIndex = mockProfiles.findIndex(
        (row) => row.accountId === accountId && row.id === id,
      );

      if (existingIndex >= 0) {
        mockProfiles[existingIndex] = {
          accountId,
          id,
          name,
          sex,
          birthDate,
          heightCm,
          createdAt,
          photoFileId: photoFileId ?? undefined,
        };
      } else {
        mockProfiles.push({
          accountId,
          id,
          name,
          sex,
          birthDate,
          heightCm,
          createdAt,
          photoFileId: photoFileId ?? undefined,
        });
      }
    } else if (sql.startsWith('DELETE FROM profiles')) {
      const [accountId, id] = values as [string, string];
      const index = mockProfiles.findIndex((row) => row.accountId === accountId && row.id === id);
      if (index >= 0) mockProfiles.splice(index, 1);
    }
    return { changes: 1, lastInsertRowId: 1 };
  }),
  getAllAsync: jest.fn(async (_sql: string, accountId: string) =>
    mockProfiles
      .filter((row) => row.accountId === accountId)
      .map((row) => ({
        id: row.id,
        name: row.name,
        sex: row.sex,
        birthDate: row.birthDate,
        heightCm: row.heightCm,
        createdAt: row.createdAt,
        photoFileId: row.photoFileId,
      })),
  ),
  getFirstAsync: jest.fn(async (_sql: string, accountId: string, profileId: string) => {
    const row = mockProfiles.find((row) => row.accountId === accountId && row.id === profileId);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      sex: row.sex,
      birthDate: row.birthDate,
      heightCm: row.heightCm,
      createdAt: row.createdAt,
      photoFileId: row.photoFileId,
    };
  }),
};

const mockActiveProfileDatabase = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn(async (sql: string, ...values: (string | number)[]) => {
    if (sql.startsWith('INSERT OR REPLACE INTO active_profile')) {
      const [accountId, profileId] = values as [string, string];
      const existingIndex = mockActiveProfiles.findIndex((row) => row.accountId === accountId);

      if (existingIndex >= 0) {
        mockActiveProfiles[existingIndex] = { accountId, profileId };
      } else {
        mockActiveProfiles.push({ accountId, profileId });
      }
    } else if (sql.startsWith('DELETE FROM active_profile')) {
      const [accountId] = values as [string];
      const index = mockActiveProfiles.findIndex((row) => row.accountId === accountId);
      if (index >= 0) mockActiveProfiles.splice(index, 1);
    }
    return { changes: 1, lastInsertRowId: 1 };
  }),
  getFirstAsync: jest.fn(async (_sql: string, accountId: string) => {
    const row = mockActiveProfiles.find((row) => row.accountId === accountId);
    if (!row) return null;
    return { profileId: row.profileId };
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest
    .fn()
    .mockImplementation(() => Promise.resolve(mockProfilesDatabase))
    .mockImplementationOnce(() => Promise.resolve(mockProfilesDatabase))
    .mockImplementation(() => Promise.resolve(mockActiveProfileDatabase)),
}));

beforeEach(() => {
  mockProfiles.splice(0);
  mockActiveProfiles.splice(0);
});

describe('Profile storage', () => {
  const testAccount = 'test@example.com';
  const testProfile = {
    id: 'test-profile-1',
    name: 'Test User',
    sex: 'male' as const,
    birthDate: '1990-01-01',
    heightCm: 180,
    createdAt: new Date().toISOString(),
    photoFileId: 'test-photo-id',
  };

  it('should save and retrieve a profile', async () => {
    await saveProfile(testAccount, testProfile);

    const profiles = await getProfiles(testAccount);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: testProfile.id,
      name: testProfile.name,
      sex: testProfile.sex,
      birthDate: testProfile.birthDate,
      heightCm: testProfile.heightCm,
      createdAt: testProfile.createdAt,
      photoFileId: testProfile.photoFileId,
    });
  });

  it('should retrieve a specific profile by ID', async () => {
    await saveProfile(testAccount, testProfile);

    const profile = await getProfile(testAccount, testProfile.id);
    expect(profile).toMatchObject({
      id: testProfile.id,
      name: testProfile.name,
      sex: testProfile.sex,
      birthDate: testProfile.birthDate,
      heightCm: testProfile.heightCm,
      createdAt: testProfile.createdAt,
      photoFileId: testProfile.photoFileId,
    });
  });

  it('should update an existing profile', async () => {
    await saveProfile(testAccount, testProfile);

    const updatedProfile = {
      ...testProfile,
      name: 'Updated Name',
      heightCm: 185,
    };
    await saveProfile(testAccount, updatedProfile);

    const profiles = await getProfiles(testAccount);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      id: testProfile.id,
      name: 'Updated Name',
      heightCm: 185,
    });
  });

  it('should delete a profile', async () => {
    await saveProfile(testAccount, testProfile);

    let profiles = await getProfiles(testAccount);
    expect(profiles).toHaveLength(1);

    await deleteProfile(testAccount, testProfile.id);

    profiles = await getProfiles(testAccount);
    expect(profiles).toHaveLength(0);
  });

  it('should set and get active profile ID', async () => {
    await saveProfile(testAccount, testProfile);
    await setActiveProfileId(testAccount, testProfile.id);

    const activeProfileId = await getActiveProfileId(testAccount);
    expect(activeProfileId).toBe(testProfile.id);
  });

  it('should clear active profile ID', async () => {
    await saveProfile(testAccount, testProfile);
    await setActiveProfileId(testAccount, testProfile.id);
    await setActiveProfileId(testAccount, null);

    const activeProfileId = await getActiveProfileId(testAccount);
    expect(activeProfileId).toBeNull();
  });

  it('isolates profiles by normalized account ID', async () => {
    await saveProfile(' One@Example.com ', testProfile);

    await expect(getProfiles('one@example.com')).resolves.toHaveLength(1);
    await expect(getProfiles('two@example.com')).resolves.toEqual([]);
  });

  it('does not activate a profile that is not cached for the account', async () => {
    await expect(setActiveProfileId(testAccount, 'missing')).rejects.toThrow(
      'Cannot activate a profile that does not exist.',
    );
  });

  it('should return empty array for profiles when no account', async () => {
    const profiles = await getProfiles('');
    expect(profiles).toEqual([]);
  });

  it('should return null for profile when no account or profile ID', async () => {
    const profile = await getProfile('', 'any-id');
    expect(profile).toBeNull();

    const profile2 = await getProfile('test@example.com', '');
    expect(profile2).toBeNull();
  });
});
