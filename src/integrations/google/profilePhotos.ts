import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from './auth';

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const SAFE_IMAGE_TYPE = /^image\/(?:jpeg|png|webp)$/;

export async function uploadProfilePhoto(
  uri: string,
  fileName: string,
  mimeType: string,
  retry = true,
): Promise<string> {
  if (!SAFE_IMAGE_TYPE.test(mimeType)) {
    throw new Error('Choose a JPEG, PNG, or WebP image for the profile photo.');
  }

  const fileResponse = await fetch(uri);
  if (!fileResponse.ok) throw new Error('Unable to read the selected profile photo.');
  const image = await fileResponse.blob();
  if (image.size === 0) throw new Error('The selected profile photo is empty.');

  const boundary = `ruthl3ssfit_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const safeName = fileName.replace(/[\\/"\r\n]/g, '_').slice(0, 120) || 'profile-photo';
  const body = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name: safeName, mimeType }),
      `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`,
      image,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );

  const token = await getAccessToken();
  const response = await fetch(`${UPLOAD_URL}?uploadType=multipart&fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (response.status === 401 && retry) {
    await GoogleSignin.clearCachedAccessToken(token);
    return uploadProfilePhoto(uri, fileName, mimeType, false);
  }
  if (!response.ok) {
    throw new Error(`Google Drive photo upload failed (${response.status}).`);
  }

  const result: { id?: unknown } = await response.json();
  if (typeof result.id !== 'string' || !result.id) {
    throw new Error('Google Drive uploaded the photo without returning a file ID.');
  }
  return result.id;
}
