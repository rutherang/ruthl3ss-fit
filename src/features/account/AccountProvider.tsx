import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as auth from '@/integrations/google/auth';
import { resetSheetCache } from '@/integrations/google/sheets';

export type AccountState = {
  email: string | null;
  busy: boolean;
  error: string;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

export const AccountContext = createContext<AccountState | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    auth
      .signInSilently()
      .then((e) => alive && setEmail(e))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
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
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ email, busy, error, signIn, signOut }),
    [email, busy, error, signIn, signOut],
  );
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}