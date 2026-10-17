import { fireEvent, render } from '@testing-library/react-native';
import type { ComponentProps, PropsWithChildren } from 'react';
import ProfilePicker from '../ProfilePicker';
import type { Profile } from '@/types/profile';

jest.mock('react-native-paper', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const {
    Pressable,
    Text: NativeText,
    TextInput: NativeTextInput,
    View: NativeView,
  } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Button: ({
      children,
      onPress,
      accessibilityLabel,
    }: PropsWithChildren<{ onPress: () => void; accessibilityLabel?: string }>) =>
      React.createElement(
        Pressable,
        { onPress, accessibilityLabel },
        React.createElement(NativeText, null, children),
      ),
    Modal: ({ visible, children }: PropsWithChildren<{ visible: boolean }>) =>
      visible ? React.createElement(NativeView, null, children) : null,
    Text: ({ children }: PropsWithChildren) => React.createElement(NativeText, null, children),
    TextInput: (props: ComponentProps<typeof NativeTextInput>) =>
      React.createElement(NativeTextInput, props),
  };
});

const profiles: Profile[] = [
  {
    id: 'profile-1',
    name: 'Maya Chen',
    sex: 'female',
    birthDate: '1990-01-01',
    heightCm: 168,
    createdAt: '2020-01-01T00:00:00.000Z',
  },
];

it('shows generated avatars and calls the selection callback', async () => {
  const onProfileSelect = jest.fn();
  const screen = await render(
    <ProfilePicker
      profiles={profiles}
      loading={false}
      error={null}
      onProfileSelect={onProfileSelect}
    />,
  );

  await fireEvent.press(screen.getByText('Select Profile'));
  expect(screen.getByLabelText("Maya Chen's generated avatar, MC")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Select Maya Chen'));

  expect(onProfileSelect).toHaveBeenCalledWith('profile-1');
});
