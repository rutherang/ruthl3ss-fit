import { render } from '@testing-library/react-native';
import { getAvatarColor, getAvatarInitials, ProfileAvatar } from '../ProfileAvatar';

describe('profile avatar', () => {
  it('generates initials from one or multiple name parts', () => {
    expect(getAvatarInitials('  maya  chen ')).toBe('MC');
    expect(getAvatarInitials('runner')).toBe('RU');
    expect(getAvatarInitials('  ')).toBe('?');
  });

  it('uses a stable color for the same seed', () => {
    expect(getAvatarColor('profile-123')).toBe(getAvatarColor('profile-123'));
    expect(getAvatarColor('profile-123')).not.toBe(getAvatarColor('profile-456'));
  });

  it('renders a generated avatar when no photo is supplied', async () => {
    const screen = await render(<ProfileAvatar name="Maya Chen" seed="profile-1" />);

    expect(screen.getByLabelText("Maya Chen's generated avatar, MC")).toBeTruthy();
    expect(screen.getByText('MC')).toBeTruthy();
  });

  it('uses an optional selected photo instead of the generated avatar', async () => {
    const screen = await render(<ProfileAvatar name="Maya Chen" photoUri="file:///maya.jpg" />);

    expect(screen.getByLabelText("Maya Chen's profile photo")).toBeTruthy();
    expect(screen.queryByText('MC')).toBeNull();
  });
});
