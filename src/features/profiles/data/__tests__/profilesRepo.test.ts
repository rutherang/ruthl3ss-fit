import { saveProfile, profileRecord } from '../profilesRepo';
import type { Profile } from '@/types/profile';

const mockSaveCachedProfile = jest.fn();
const mockQueueSheetUpsert = jest.fn();

jest.mock('@/integrations/storage/profiles', () => ({
  getProfiles: jest.fn(),
  saveProfile: (...args: unknown[]) => mockSaveCachedProfile(...args),
}));

jest.mock('@/integrations/google/sheetQueue', () => ({
  flushPendingSheetWrites: jest.fn(),
  queueSheetUpsert: (...args: unknown[]) => mockQueueSheetUpsert(...args),
}));

beforeEach(() => {
  mockSaveCachedProfile.mockReset().mockResolvedValue(undefined);
  mockQueueSheetUpsert.mockReset().mockResolvedValue('saved');
});

const input = {
  id: 'profile-1',
  name: ' Test Runner ',
  sex: 'female' as const,
  birthDate: '1990-02-28',
  heightCm: 168,
  createdAt: '2020-01-01T00:00:00.000Z',
  photoFileId: 'drive-file-1',
};

describe('profile repository', () => {
  it('writes the normalized profile to local storage before queuing a Sheets upsert', async () => {
    const events: string[] = [];
    mockSaveCachedProfile.mockImplementation(async () => events.push('local'));
    mockQueueSheetUpsert.mockImplementation(async () => {
      events.push('queue');
      return 'queued';
    });

    const result = await saveProfile(' Runner@Example.com ', input);

    expect(events).toEqual(['local', 'queue']);
    expect(mockSaveCachedProfile).toHaveBeenCalledWith(
      'runner@example.com',
      expect.objectContaining({ ...input, name: 'Test Runner' }),
    );
    expect(mockQueueSheetUpsert).toHaveBeenCalledWith(
      'runner@example.com',
      expect.stringContaining('profile-1:profile:'),
      expect.objectContaining({
        tab: 'Profiles',
        idColumn: 'id',
        idValue: 'profile-1',
        records: [expect.objectContaining({ name: 'Test Runner', photoFileId: 'drive-file-1' })],
      }),
    );
    expect(result.syncStatus).toBe('queued');
  });

  it('keeps the local profile and reports a remote sync failure', async () => {
    mockQueueSheetUpsert.mockRejectedValue(new Error('Google unavailable'));

    const result = await saveProfile('runner@example.com', input);

    expect(mockSaveCachedProfile).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      profile: { id: 'profile-1' },
      syncStatus: 'error',
      syncError: 'Google unavailable',
    });
  });

  it('converts profile data into feature-owned sheet columns', () => {
    const profile: Profile = {
      id: 'profile-1',
      name: 'Test Runner',
      sex: 'female',
      birthDate: '1990-02-28',
      heightCm: 168,
      createdAt: '2020-01-01T00:00:00.000Z',
    };

    expect(profileRecord(profile)).toEqual({
      id: 'profile-1',
      name: 'Test Runner',
      sex: 'female',
      birthDate: '1990-02-28',
      heightCm: 168,
      createdAt: expect.any(String),
      photoFileId: '',
    });
  });

  it('rejects invalid profile fields before local persistence', async () => {
    await expect(
      saveProfile('runner@example.com', { ...input, birthDate: '1990-02-30' }),
    ).rejects.toThrow('Enter a valid calendar date.');

    expect(mockSaveCachedProfile).not.toHaveBeenCalled();
    expect(mockQueueSheetUpsert).not.toHaveBeenCalled();
  });
});
