import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from './auth';

export async function googleApi<T = Record<string, unknown>>(
  url: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401 && retry) {
    await GoogleSignin.clearCachedAccessToken(token); // expired token
    return googleApi<T>(url, init, false);
  }
  if (!res.ok) {
    throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  return (await res.json()) as T;
}
