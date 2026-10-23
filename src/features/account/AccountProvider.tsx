import * as auth from '@/integrations/google/auth';
import { resetSheetCache } from '@/integrations/google/sheets';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AccountState = {
  email: string | null;
  ready: boolean; // the first silent sign-in has finished
  busy: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    auth
      .signInSilently()
      .then((e) => alive && setEmail(e))
      .catch((cause: unknown) => {
        if (alive) {
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      })
      .finally(() => {
        if (alive) {
          setBusy(false);
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  const signIn = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      setEmail(await auth.signIn());
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      await auth.signOut();
      resetSheetCache();
      setEmail(null);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(
    () => ({ email, ready, busy, error, signIn, signOut }),
    [email, ready, busy, error, signIn, signOut],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
