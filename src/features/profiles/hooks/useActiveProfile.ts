import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Network from 'expo-network';
import { useAccount } from '@/features/account/useAccount';
import {
  flushQueuedProfiles,
  getProfiles,
  saveProfile,
  type ProfileSaveResult,
} from '@/features/profiles/data/profilesRepo';
import { getActiveProfileId, setActiveProfileId } from '@/integrations/storage/profiles';
import type { Profile } from '@/types/profile';
import type { ProfileInput } from '../domain/profileValidation';

export function useActiveProfile() {
  const { email, busy: accountBusy } = useAccount();
  const accountId = email?.trim().toLowerCase() ?? null;
  const accountRef = useRef(accountId);

  const [loadedAccount, setLoadedAccount] = useState<string | null>(null);
  const [profilesState, setProfilesState] = useState<Profile[]>([]);
  const [activeProfileState, setActiveProfileState] = useState<Profile | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  useEffect(() => {
    accountRef.current = accountId;
  }, [accountId]);

  useEffect(() => {
    let current = true;
    if (accountBusy || !accountId) {
      return () => {
        current = false;
      };
    }

    void Promise.resolve()
      .then(() => {
        if (current) {
          setError(null);
          setSyncNotice(null);
        }
        return Promise.all([getProfiles(accountId), getActiveProfileId(accountId)]);
      })
      .then(([profiles, activeId]) => {
        if (!current) return;
        const activeProfile = profiles.find((profile) => profile.id === activeId) ?? null;
        setProfilesState(profiles);
        setActiveProfileState(activeProfile);
        setLoadedAccount(accountId);
      })
      .catch((cause: unknown) => {
        if (current) setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => {
        if (current) setLoadingState(false);
      });

    return () => {
      current = false;
    };
  }, [accountId, accountBusy]);

  const retrySync = useCallback(
    () => (accountId ? flushQueuedProfiles(accountId) : Promise.resolve(false)),
    [accountId],
  );

  useEffect(() => {
    if (!accountId || accountBusy) return;
    let current = true;
    const flush = () => {
      void retrySync()
        .then((synced) => {
          if (current && synced) {
            setSyncNotice((notice) =>
              notice?.startsWith('Profile saved') ? 'All profile changes synced.' : notice,
            );
          }
        })
        .catch((cause: unknown) => {
          if (current) {
            setSyncNotice(
              `Profile sync failed: ${cause instanceof Error ? cause.message : String(cause)}`,
            );
          }
        });
    };
    flush();
    const network = Network.addNetworkStateListener((state) => {
      if (state.isConnected && state.isInternetReachable !== false) flush();
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') flush();
    });
    return () => {
      current = false;
      network.remove();
      appState.remove();
    };
  }, [accountId, accountBusy, retrySync]);

  const setActiveProfile = useCallback(
    async (profileId: string) => {
      if (!accountId) throw new Error('Sign in to choose an active profile.');
      const profile = profilesState.find((item) => item.id === profileId);
      if (!profile) throw new Error('That profile is not available for this account.');
      setError(null);
      await setActiveProfileId(accountId, profileId);
      if (accountRef.current === accountId) setActiveProfileState(profile);
    },
    [accountId, profilesState],
  );

  const persistProfile = useCallback(
    async (input: ProfileInput): Promise<ProfileSaveResult> => {
      if (!accountId) throw new Error('Sign in to save a profile.');
      setError(null);
      const result = await saveProfile(accountId, input);
      if (accountRef.current === accountId) {
        setProfilesState((current) => {
          const withoutSaved = current.filter((profile) => profile.id !== result.profile.id);
          return [...withoutSaved, result.profile].sort((a, b) => a.name.localeCompare(b.name));
        });
        if (!activeProfileState) {
          await setActiveProfileId(accountId, result.profile.id);
          setActiveProfileState(result.profile);
        } else if (activeProfileState.id === result.profile.id) {
          setActiveProfileState(result.profile);
        }
        setLoadedAccount(accountId);
        setSyncNotice(
          result.syncStatus === 'saved'
            ? 'Profile saved and synced.'
            : result.syncStatus === 'queued'
              ? 'Profile saved on this device; waiting for internet to sync.'
              : `Profile saved on this device, but sync failed: ${result.syncError}`,
        );
      }
      return result;
    },
    [accountId, activeProfileState],
  );

  const addProfile = useCallback(
    (profile: Omit<ProfileInput, 'id'>) => persistProfile(profile),
    [persistProfile],
  );

  const updateProfile = useCallback(
    (profile: ProfileInput & { id: string }) => persistProfile(profile),
    [persistProfile],
  );

  const belongsToCurrentAccount = loadedAccount === accountId;
  return {
    activeProfile: accountId && belongsToCurrentAccount ? activeProfileState : null,
    profiles: accountId && belongsToCurrentAccount ? profilesState : [],
    loading: accountBusy || (!!accountId && (loadingState || !belongsToCurrentAccount) && !error),
    error: accountId ? error : null,
    syncNotice: accountId ? syncNotice : null,
    setActiveProfile,
    addProfile,
    updateProfile,
  };
}
