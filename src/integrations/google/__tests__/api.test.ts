import { googleApi } from '../api';

const mockClear = jest.fn();

jest.mock('../auth', () => ({
  getAccessToken: jest.fn().mockResolvedValue('tok'),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: { clearCachedAccessToken: (t: string) => mockClear(t) },
}));

const res = (status: number, body: unknown = {}) => ({
  ok: status < 400,
  status,
  json: async () => body,
  text: async () => 'boom',
});

describe('googleApi', () => {
  it('refreshes the token once after a 401', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(res(401))
      .mockResolvedValueOnce(res(200, { ok: true }));
    (global as any).fetch = fetchMock;

    await expect(googleApi('https://x.test')).resolves.toEqual({ ok: true });
    expect(mockClear).toHaveBeenCalledWith('tok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws with the status on other failures', async () => {
    (global as any).fetch = jest.fn().mockResolvedValue(res(500));
    await expect(googleApi('https://x.test')).rejects.toThrow('Google 500');
  });
});
