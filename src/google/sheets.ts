import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { WorkoutSummary } from '../lib/workoutRecorder';
import { getAccessToken } from './auth';

const SHEET_NAME = 'Ruthl3ssFit';

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
    throw new Error(
      `Google ${res.status}: ${(await res.text()).slice(0, 160)}`,
    );
  }
  return res.json();
}

let pending: Promise<string> | null = null;
const done = new Set<string>();

export function resetSheetCache() {
  pending = null;
  done.clear();
}

async function findOrCreate(): Promise<string> {
  const q = encodeURIComponent(
    `name='${SHEET_NAME}' and trashed=false and ` +
      `mimeType='application/vnd.google-apps.spreadsheet'`,
  );
  const found = await api(
    `https://www.googleapis.com/drive/v3/files?q=${q}` +
      `&orderBy=createdTime&fields=files(id)`,
  );
  if (found.files?.length) return found.files[0].id as string;

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
  return created.spreadsheetId as string;
}

export function ensureSpreadsheet(): Promise<string> {
  pending ??= findOrCreate().catch((e) => {
    pending = null;
    throw e;
  });
  return pending;
}

type Cell = string | number;

async function append(tab: string, rows: Cell[][]) {
  const id = await ensureSpreadsheet();
  const range = encodeURIComponent(`'${tab}'!A1`);
  await api(
    `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${range}` +
      `:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: rows }) },
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
const fmtLocal = (ms: number) => {
  const d = new Date(ms);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
};
const r1 = (n: number) => Math.round(n * 10) / 10;

// Each part is remembered once saved, so a retry never duplicates rows.
async function once(key: string, fn: () => Promise<void>) {
  if (done.has(key)) return;
  await fn();
  done.add(key);
}

export async function saveWorkout(w: WorkoutSummary, profileId = 'default') {
  const id = `w_${w.startedAt}`;
  await once(`${id}:workout`, () =>
    append('Workouts', [
      [
        id,
        profileId,
        fmtLocal(w.startedAt),
        w.durationS,
        Math.round(w.distanceM),
        r1(w.avgKmh),
        r1(w.maxKmh),
        r1(w.avgInclinePct),
        w.kcal,
        w.steps,
        w.avgHr ?? '',
        w.maxHr ?? '',
        w.segments.length,
      ],
    ]),
  );
  await once(`${id}:segments`, () =>
    append(
      'Workout segments',
      w.segments.map((g, i) => [
        id,
        i + 1,
        g.startS,
        g.durationS,
        Math.round(g.distanceM),
        r1(g.avgKmh),
        g.paceMinPerKm === null ? '' : Math.round(g.paceMinPerKm * 100) / 100,
        g.steps,
        g.kcal,
      ]),
    ),
  );
}
