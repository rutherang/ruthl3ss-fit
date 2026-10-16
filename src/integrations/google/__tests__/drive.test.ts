import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from '../auth';
import { ensureFolder, resetDriveCache } from '../drive';

jest.mock('../auth', () => ({
  getAccessToken: jest.fn(),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { clearCachedAccessToken: jest.fn() },
}));

const response = (body: unknown, status = 200) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => '',
  });

const mockFetch = (fetchMock: jest.Mock) => {
  global.fetch = fetchMock as unknown as typeof fetch;
};

beforeEach(() => {
  resetDriveCache();
  jest.clearAllMocks();
});

describe('Drive integration', () => {
  it('retries once with a refreshed token after an unauthorized response', async () => {
    (getAccessToken as jest.Mock)
      .mockResolvedValueOnce('expired-token')
      .mockResolvedValueOnce('fresh-token');
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({}, 401))
      .mockResolvedValueOnce(response({ files: [{ id: 'folder1' }] }));
    mockFetch(fetchMock);

    await expect(ensureFolder('Ruthl3ssFit')).resolves.toBe('folder1');

    expect(GoogleSignin.clearCachedAccessToken).toHaveBeenCalledWith('expired-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer fresh-token');
  });

  it('clears the cached folder id when the account cache is reset', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ files: [{ id: 'first-account-folder' }] }))
      .mockResolvedValueOnce(response({ files: [{ id: 'second-account-folder' }] }));
    mockFetch(fetchMock);

    await expect(ensureFolder('Ruthl3ssFit')).resolves.toBe('first-account-folder');
    resetDriveCache();
    await expect(ensureFolder('Ruthl3ssFit')).resolves.toBe('second-account-folder');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
