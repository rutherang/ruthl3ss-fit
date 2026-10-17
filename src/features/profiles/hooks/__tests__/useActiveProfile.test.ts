import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useActiveProfile } from '../useActiveProfile';
import type { Profile } from '@/types/profile';

let mockEmail: string | null = 'one@example.com';
const mockProfilesByAccount = new Map<string, Profile[] | Promise<Profile[]>>();
const mockActiveIds = new Map<string, string | null>();
const mockSave = jest.fn();
const mockSetActiveId = jest.fn(async (accountId: string, profileId: string | null) => {
  mockActiveIds.set(accountId, profileId);
});
const mockFlush = jest.fn().mockResolvedValue(false);

jest.mock('@/features/account/useAccount', () => ({
  useAccount: () => ({ email: mockEmail, busy: false }),
}));
jest.mock('@/features/profiles/data/profilesRepo', () => ({
  flushQueuedProfiles: (...args: [string]) => mockFlush(...args),
  getProfiles: (accountId: string) => mockProfilesByAccount.get(accountId) ?? Promise.resolve([]),
  saveProfile: (...args: unknown[]) => mockSave(...args),
}));
jest.mock('@/integrations/storage/profiles', () => ({
  getActiveProfileId: async (accountId: string) => mockActiveIds.get(accountId) ?? null,
  setActiveProfileId: (...args: [string, string | null]) => mockSetActiveId(...args),
}));

const profile = (id: string, name: string): Profile => ({
  id,
  name,
  sex: 'female',
  birthDate: '1990-02-28',
  heightCm: 168,
  createdAt: '2020-01-01T00:00:00.000Z',
});

beforeEach(() => {
  mockEmail = 'one@example.com';
  mockProfilesByAccount.clear();
  mockActiveIds.clear();
  mockSave.mockReset();
  mockSetActiveId.mockClear();
  mockFlush.mockReset().mockResolvedValue(false);
  jest.spyOn(Network, 'addNetworkStateListener').mockReturnValue({ remove: jest.fn() });
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});

describe('useActiveProfile', () => {
  it('loads and activates the cached profile for the signed-in account', async () => {
    const cached = profile('one-profile', 'Runner One');
    mockProfilesByAccount.set('one@example.com', [cached]);
    mockActiveIds.set('one@example.com', cached.id);

    const { result } = await renderHook(() => useActiveProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.profiles).toEqual([cached]);
    expect(result.current.activeProfile).toEqual(cached);
  });

  it('does not expose one account profile while the next account loads', async () => {
    const first = profile('one-profile', 'Runner One');
    const second = profile('two-profile', 'Runner Two');
    let resolveSecond = (_profiles: Profile[]) => {};
    const secondProfilesPending = new Promise<Profile[]>((resolve) => {
      resolveSecond = resolve;
    });
    mockProfilesByAccount.set('one@example.com', [first]);
    mockProfilesByAccount.set('two@example.com', secondProfilesPending);
    mockActiveIds.set('one@example.com', first.id);
    mockActiveIds.set('two@example.com', second.id);

    const { result, rerender } = await renderHook(() => useActiveProfile());
    await waitFor(() => expect(result.current.activeProfile).toEqual(first));

    mockEmail = 'two@example.com';
    await rerender({});
    expect(result.current.activeProfile).toBeNull();
    expect(result.current.profiles).toEqual([]);

    await act(async () => resolveSecond([second]));
    await waitFor(() => expect(result.current.activeProfile).toEqual(second));
  });

  it('saves a new profile locally and makes it active when none is active', async () => {
    const saved = profile('new-profile', 'New Runner');
    mockSave.mockResolvedValue({
      profile: saved,
      syncStatus: 'queued',
    });
    const { result } = await renderHook(() => useActiveProfile());

    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.addProfile({
        name: saved.name,
        sex: saved.sex,
        birthDate: saved.birthDate,
        heightCm: saved.heightCm,
      });
    });

    expect(result.current.profiles).toEqual([saved]);
    expect(result.current.activeProfile).toEqual(saved);
    expect(mockSetActiveId).toHaveBeenCalledWith('one@example.com', saved.id);
  });
});
