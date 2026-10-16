import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAccessToken } from './auth';

const SHEET_NAME = 'Ruthl3ssFit';
const FOLDER_NAME = 'Ruthl3ssFit';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
let folderPending: Promise<string> | null = null;

// All tabs are created now so later features don't need a migration.
const TABS: Record<string, string[]> = {
  Workouts: [
    'id',
    'profile_id',
    'started_at',
    'duration_s',
    'distance_m',
    'avg_kmh',
    'max_kmh',
    'avg_incline_pct',
    'kcal',
    'steps_est',
    'avg_hr',
    'max_hr',
    'segments',
  ],
  'Workout segments': [
    'workout_id',
    'seg_no',
    'start_s',
    'duration_s',
    'distance_m',
    'avg_kmh',
    'pace_min_per_km',
    'steps_est',
    'kcal',
  ],
  Profiles: ['id', 'name', 'sex', 'birth_date', 'height_cm', 'created_at'],
  'Weigh-ins': [
    'id',
    'profile_id',
    'measured_at',
    'weight_kg',
    'bmi',
    'fat_pct',
    'fat_kg',
    'water_kg',
    'muscle_kg',
    'bone_kg',
    'bmr_kcal',
    'formula_version',
  ],
};

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
    await GoogleSignin.clearCachedAccessToken(token); // expired token
    return api(url, init, false);
  }
  if (!res.ok) {
    throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 160)}`);
  }
  return res.json();
}

let pending: Promise<string> | null = null;
const done = new Set<string>();

export function resetSheetCache() {
  pending = null;
  folderPending = null;
  done.clear();
}

async function findOrCreateFolder(): Promise<string> {
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
  );
  const found = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}` + `&orderBy=createdTime&fields=files(id)`,
  );
  if (found.files?.length) return found.files[0].id as string;
  const created = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: FOLDER_MIME }),
  });
  return created.id as string;
}

export function ensureFolder(): Promise<string> {
  folderPending ??= findOrCreateFolder().catch((e) => {
    folderPending = null;
    throw e;
  });
  return folderPending;
}

async function moveToFolder(fileId: string, folderId: string) {
  const f = await api(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`);
  const parents: string[] = f.parents ?? [];
  if (parents.includes(folderId)) return;
  const remove = parents.length ? `&removeParents=${parents.join(',')}` : '';
  await api(
    `https://www.googleapis.com/drive/v3/files/${fileId}` + `?addParents=${folderId}${remove}`,
    { method: 'PATCH', body: '{}' },
  );
}

async function findOrCreate(): Promise<string> {
  const folderId = await ensureFolder();
  const q = encodeURIComponent(
    `name='${SHEET_NAME}' and trashed=false and ` +
      `mimeType='application/vnd.google-apps.spreadsheet'`,
  );
  const found = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}` + `&orderBy=createdTime&fields=files(id)`,
  );
  if (found.files?.length) {
    const id = found.files[0].id as string;
    await moveToFolder(id, folderId); // moves your existing test sheet too
    return id;
  }

  const created = await api('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    body: JSON.stringify({
      properties: { title: SHEET_NAME },
      sheets: Object.entries(TABS).map(([title, cols]) => ({
        properties: { title, gridProperties: { frozenRowCount: 1 } },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: cols.map((c) => ({
                  userEnteredValue: { stringValue: c },
                })),
              },
            ],
          },
        ],
      })),
    }),
  });
  const id = created.spreadsheetId as string;
  await moveToFolder(id, folderId);
  return id;
}

export function ensureSpreadsheet(): Promise<string> {
  pending ??= findOrCreate().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}

export type SheetCell = string | number;

export async function appendRows(tab: string, rows: SheetCell[][]) {
  const id = await ensureSpreadsheet();
  const range = encodeURIComponent(`'${tab}'!A1`);
  await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}` +
      `:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  );
}

// Callers provide stable operation keys so retried writes do not duplicate rows.
export async function appendRowsOnce(key: string, tab: string, rows: SheetCell[][]) {
  if (done.has(key)) return;
  await appendRows(tab, rows);
  done.add(key);
}
