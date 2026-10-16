import { useCallback, useEffect, useState } from 'react';
import * as auth from './auth';
import { resetDriveCache } from './drive';
import { resetSheetCache } from './sheets';

export function useGoogleAccount() {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    auth
      .signInSilently()
      .then(setEmail)
      .finally(() => setBusy(false));
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setEmail(await auth.signIn());
    } catch (e: any) {
      setError(e?.message ?? 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await auth.signOut();
    resetSheetCache(); // the next account gets its own sheet
    resetDriveCache();
    setEmail(null);
  }, []);

  return { email, busy, error, signIn, signOut };
}
