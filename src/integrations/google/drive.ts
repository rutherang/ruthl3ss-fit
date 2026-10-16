import { googleApi } from './api';

const FILES = 'https://www.googleapis.com/drive/v3/files';

export const MIME = {
  folder: 'application/vnd.google-apps.folder',
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
} as const;

type DriveFileList = { files?: { id: string }[] };
type DriveFileCreated = { id?: string };
type DriveFileParents = { parents?: string[] };

const folders = new Map<string, Promise<string>>();

export function resetDriveCache() {
  folders.clear();
}

// Oldest file with this name and type that the app can see.
export async function findFile(name: string, mimeType: string): Promise<string | null> {
  const safe = name.replace(/'/g, "\\'");
  const q = encodeURIComponent(`name='${safe}' and mimeType='${mimeType}' and trashed=false`);
  const res = await googleApi<DriveFileList>(
    `${FILES}?q=${q}&orderBy=createdTime&fields=files(id)`,
  );
  return res.files?.[0]?.id ?? null;
}

async function findOrCreateFolder(name: string): Promise<string> {
  const found = await findFile(name, MIME.folder);
  if (found) return found;
  const created = await googleApi<DriveFileCreated>(`${FILES}?fields=id`, {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: MIME.folder }),
  });
  if (!created.id) throw new Error(`Google Drive created folder "${name}" without an ID.`);
  return created.id;
}

export function ensureFolder(name: string): Promise<string> {
  let p = folders.get(name);
  if (!p) {
    p = findOrCreateFolder(name).catch((e) => {
      folders.delete(name);
      throw e;
    });
    folders.set(name, p);
  }
  return p;
}

export async function moveToFolder(fileId: string, folderId: string) {
  const f = await googleApi<DriveFileParents>(`${FILES}/${fileId}?fields=parents`);
  const parents: string[] = f.parents ?? [];
  if (parents.includes(folderId)) return;
  const remove = parents.length ? `&removeParents=${parents.join(',')}` : '';
  await googleApi(`${FILES}/${fileId}?addParents=${folderId}${remove}`, {
    method: 'PATCH',
    body: '{}',
  });
}
