import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from './auth';

const FOLDER_NAME = 'Ruthl3ssFit';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
let folderPending: Promise<string> | null = null;

async function api(url: string, init: RequestInit = {}, retry = true) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status === 401 && retry) {
    await GoogleSignin.clearCachedAccessToken(token);
    return api(url, init, false);
  }
  if (!res.ok) {
    throw new Error(`Google Drive ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  return res.json();
}

export async function findFile(name: string, mimeType: string): Promise<string | null> {
  const q = encodeURIComponent(`name='${name}' and mimeType='${mimeType}' and trashed=false`);
  const found = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=createdTime&fields=files(id)`,
  );
  return found.files?.[0]?.id ?? null;
}

async function findOrCreateFolder(): Promise<string> {
  const folderId = await findFile(FOLDER_NAME, FOLDER_MIME);
  if (folderId) return folderId;
  const created = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  return created.id as string;
}

export function resetDriveCache() {
  folderPending = null;
}

export function ensureFolder(): Promise<string> {
  folderPending ??= findOrCreateFolder().catch((e) => {
    folderPending = null;
    throw e;
  });
  return folderPending;
}

export async function moveToFolder(fileId: string, folderId: string) {
  const f = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`);
  const parents: string[] = f.parents ?? [];
  if (parents.includes(folderId)) return;
  const remove = parents.length ? `&removeParents=${parents.join(',')}` : '';
  await api(
    `https://www.googleapis.com/drive/v3/files/${fileId}` + `?addParents=${folderId}${remove}`,
    { method: 'PATCH', body: '{}' },
  );
}
