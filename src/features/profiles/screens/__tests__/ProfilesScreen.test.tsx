import { fireEvent, render } from '@testing-library/react-native';
import ProfilesScreen from '../ProfilesScreen';
import type { Profile } from '@/types/profile';

const mockSetActiveProfile = jest.fn().mockResolvedValue(undefined);
const mockProfile: Profile = {
  id: 'profile-1',
  name: 'Test Runner',
  sex: 'female',
  birthDate: '1990-02-28',
  heightCm: 168,
  createdAt: '2020-01-01T00:00:00.000Z',
};
const mockUseActiveProfile = jest.fn();

jest.mock('@/features/account/components/AccountBar', () => ({
  AccountBar: () => null,
}));
jest.mock('../ProfileFormScreen', () => ({
  ProfileFormScreen: () => null,
}));
jest.mock('@/features/profiles/hooks/useActiveProfile', () => ({
  useActiveProfile: () => mockUseActiveProfile(),
}));

beforeEach(() => {
  mockSetActiveProfile.mockClear();
  mockUseActiveProfile.mockReturnValue({
    activeProfile: null,
    profiles: [mockProfile],
    loading: false,
    error: null,
    syncNotice: null,
    setActiveProfile: mockSetActiveProfile,
    addProfile: jest.fn(),
    updateProfile: jest.fn(),
  });
});

it('shows cached profiles and lets the user select one as active', async () => {
  const screen = await render(<ProfilesScreen />);

  expect(screen.getByText('Test Runner')).toBeTruthy();
  await fireEvent.press(screen.getByText('Use profile'));

  expect(mockSetActiveProfile).toHaveBeenCalledWith('profile-1');
}, 15000);
