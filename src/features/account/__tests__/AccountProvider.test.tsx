import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import * as auth from '@/integrations/google/auth';
import { resetSheetCache } from '@/integrations/google/sheets';
import { AccountProvider } from '../AccountProvider';
import { useAccount } from '../useAccount';

jest.mock('@/integrations/google/auth', () => ({
  signInSilently: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));
jest.mock('@/integrations/google/sheets', () => ({
  resetSheetCache: jest.fn(),
}));

const mocked = auth as jest.Mocked<typeof auth>;
const wrapper = ({ children }: { children: ReactNode }) => (
  <AccountProvider>{children}</AccountProvider>
);
// Two separate hook calls stand in for two screens.
const setup = async () => {
  const hook = await renderHook(() => ({ a: useAccount(), b: useAccount() }), {
    wrapper,
  });
  await waitFor(() => expect(hook.result.current.a.busy).toBe(false));
  return hook;
};

beforeEach(() => jest.resetAllMocks());

describe('AccountProvider', () => {
  it('restores a previous sign-in silently', async () => {
    mocked.signInSilently.mockResolvedValue('me@example.com');
    const { result } = await setup();
    expect(result.current.a.email).toBe('me@example.com');
  });

  it('stays signed out when there is no previous sign-in', async () => {
    mocked.signInSilently.mockResolvedValue(null);
    const { result } = await setup();
    expect(result.current.a.email).toBeNull();
  });

  it('shares one state between consumers after sign-in', async () => {
    mocked.signInSilently.mockResolvedValue(null);
    mocked.signIn.mockResolvedValue('me@example.com');
    const { result } = await setup();

    await act(async () => {
      await result.current.a.signIn();
    });

    expect(result.current.a.email).toBe('me@example.com');
    expect(result.current.b.email).toBe('me@example.com');
  });

  it('reports a failed sign-in and stays signed out', async () => {
    mocked.signInSilently.mockResolvedValue(null);
    mocked.signIn.mockRejectedValue(new Error('cancelled'));
    const { result } = await setup();

    await act(async () => {
      await result.current.a.signIn();
    });

    expect(result.current.b.error).toBe('cancelled');
    expect(result.current.b.email).toBeNull();
    expect(result.current.b.busy).toBe(false);
  });

  it('clears the account and the sheet cache on sign-out', async () => {
    mocked.signInSilently.mockResolvedValue('me@example.com');
    mocked.signOut.mockResolvedValue(null);
    const { result } = await setup();

    await act(async () => {
      await result.current.a.signOut();
    });

    expect(result.current.b.email).toBeNull();
    expect(resetSheetCache).toHaveBeenCalled();
  });

  it('keeps the account and reports a sign-out failure', async () => {
    mocked.signInSilently.mockResolvedValue('me@example.com');
    mocked.signOut.mockRejectedValue(new Error('sign-out failed'));
    const { result } = await setup();

    await act(async () => {
      await result.current.a.signOut();
    });

    expect(result.current.a.email).toBe('me@example.com');
    expect(result.current.a.error).toBe('sign-out failed');
    expect(result.current.a.busy).toBe(false);
    expect(resetSheetCache).not.toHaveBeenCalled();
  });
});
