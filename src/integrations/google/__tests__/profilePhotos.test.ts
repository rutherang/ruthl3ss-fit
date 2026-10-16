import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from '../auth';
import { uploadProfilePhoto } from '../profilePhotos';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    clearCachedAccessToken: jest.fn(),
  },
}));
jest.mock('../auth', () => ({
  getAccessToken: jest.fn(),
}));

const response = (value: object) => value as Response;

beforeEach(() => {
  jest.mocked(getAccessToken).mockReset().mockResolvedValue('access-token');
  jest.mocked(GoogleSignin.clearCachedAccessToken).mockReset().mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('uploadProfilePhoto', () => {
  it('uploads the selected image using the Google access token and returns its Drive ID', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        response({
          ok: true,
          blob: async () => new Blob(['image bytes'], { type: 'image/jpeg' }),
        }),
      )
      .mockResolvedValueOnce(
        response({
          ok: true,
          status: 200,
          json: async () => ({ id: 'drive-photo-id' }),
        }),
      );

    await expect(
      uploadProfilePhoto('file:///photo.jpg', 'profile.jpg', 'image/jpeg'),
    ).resolves.toBe('drive-photo-id');

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('uploadType=multipart'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );
  });

  it('rejects unsupported formats before making a request', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');

    await expect(
      uploadProfilePhoto('file:///photo.gif', 'profile.gif', 'image/gif'),
    ).rejects.toThrow('Choose a JPEG, PNG, or WebP image for the profile photo.');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
