import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { pickProfilePhoto } from '@/integrations/media/profilePhotoPicker';
import { uploadProfilePhoto } from '@/integrations/google/profilePhotos';
import { ProfileFormScreen } from '../ProfileFormScreen';
import type { Profile } from '@/types/profile';

jest.mock('@/integrations/media/profilePhotoPicker', () => ({
  pickProfilePhoto: jest.fn(),
}));
jest.mock('@/integrations/google/profilePhotos', () => ({
  uploadProfilePhoto: jest.fn(),
}));

const savedProfile: Profile = {
  id: 'profile-1',
  name: 'Test Runner',
  sex: 'female',
  birthDate: '1990-02-28',
  heightCm: 168,
  createdAt: '2020-01-01T00:00:00.000Z',
};
const pickedPhoto = {
  uri: 'file:///profile.jpg',
  fileName: 'profile.jpg',
  mimeType: 'image/jpeg',
};

beforeEach(() => {
  jest.mocked(pickProfilePhoto).mockReset().mockResolvedValue(pickedPhoto);
  jest.mocked(uploadProfilePhoto).mockReset().mockRejectedValue(new Error('offline'));
});

it('keeps the locally saved profile and lets the user continue if photo upload fails', async () => {
  const onSave = jest.fn().mockResolvedValue({
    profile: savedProfile,
    syncStatus: 'queued',
  });
  const onSaved = jest.fn();
  const screen = await render(
    <ProfileFormScreen profile={null} onSave={onSave} onCancel={jest.fn()} onSaved={onSaved} />,
  );

  await fireEvent.changeText(screen.getByTestId('profile-name'), 'Test Runner');
  await fireEvent.changeText(screen.getByTestId('profile-birth-date'), '1990-02-28');
  await fireEvent.changeText(screen.getByTestId('profile-height-cm'), '168');
  await fireEvent.press(screen.getByText('Choose photo'));
  await fireEvent.press(screen.getByText('Save profile'));

  await waitFor(() =>
    expect(
      screen.getByText(/Profile details are saved on this device, but the photo upload failed/),
    ).toBeTruthy(),
  );
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onSaved).not.toHaveBeenCalled();

  await fireEvent.press(screen.getByText('Continue without photo'));
  expect(onSaved).toHaveBeenCalledTimes(1);
}, 15000);
