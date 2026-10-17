import { GoogleSignin } from '@react-native-google-signin/google-signin';

const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
let configured = false;

function initAuth() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: [DRIVE_FILE],
  });
  configured = true;
}

const currentEmail = () => GoogleSignin.getCurrentUser()?.user.email ?? null;

export async function signInSilently(): Promise<string | null> {
  initAuth();
  try {
    if (!(await GoogleSignin.hasPreviousSignIn())) return null;
    await GoogleSignin.signInSilently();
    return currentEmail();
  } catch {
    return null;
  }
}

export async function signIn(): Promise<string | null> {
  initAuth();
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const granted = GoogleSignin.getCurrentUser()?.scopes ?? [];
  if (!granted.includes(DRIVE_FILE)) {
    await GoogleSignin.addScopes({ scopes: [DRIVE_FILE] });
  }
  return currentEmail();
}

export const signOut = () => GoogleSignin.signOut();

export async function getAccessToken(): Promise<string> {
  initAuth();
  return (await GoogleSignin.getTokens()).accessToken;
}
