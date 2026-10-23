import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccountContext, type AccountState } from '../../AccountProvider';
import SignInScreen from '../SignInScreen';

const base: AccountState = {
  email: null,
  ready: true,
  busy: false,
  error: '',
  signIn: jest.fn(),
  signOut: jest.fn(),
};

const renderWith = (over: Partial<AccountState> = {}) =>
  render(
    <AccountContext.Provider value={{ ...base, ...over }}>
      <SignInScreen />
    </AccountContext.Provider>,
  );

jest.mock('@/integrations/google/auth', () => ({
  signInSilently: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/integrations/google/sheets', () => ({
  resetSheetCache: jest.fn(),
}));

describe('SignInScreen', () => {
  it('starts Google sign-in when the button is pressed', async () => {
    const signIn = jest.fn().mockResolvedValue(undefined);
    await renderWith({ signIn });
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('disables the button while signing in', async () => {
    await renderWith({ busy: true });
    expect(
      screen.getByRole('button', { name: 'Continue with Google', disabled: true }),
    ).toBeTruthy();
  });

  it('shows a sign-in error', async () => {
    await renderWith({ error: 'Sign in failed' });
    expect(screen.getByText('Sign in failed')).toBeTruthy();
  });

  it('explains that a profile comes next', async () => {
    await renderWith();
    expect(screen.getByText('Next, you create your first profile.')).toBeTruthy();
  });
});
