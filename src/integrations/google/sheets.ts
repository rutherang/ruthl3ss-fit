import { googleApi } from './api';
import { ensureFolder, findFile, MIME, moveToFolder, resetDriveCache } from './drive';

const SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets';
const APP_NAME = 'Ruthl3ssFit'; // folder and spreadsheet name

export type Cell = string | number;
export type SheetRecord = Record<string, Cell>;

type SpreadsheetCreated = {
  spreadsheetId?: string;
  sheets?: { properties?: { sheetId?: number } }[];
};
type SpreadsheetMetadata = {
  sheets?: { properties?: { sheetId?: number; title?: string } }[];
};
type ValuesResponse = { values?: Cell[][] };

let spreadsheetPending: Promise<string> | null = null;
let pristineSheetId: number | null = null; // default tab of a sheet we created
const tabPending = new Map<string, Promise<string[]>>();
let tabSetupQueue: Promise<void> = Promise.resolve();

export function resetSheetCache() {
  spreadsheetPending = null;
  pristineSheetId = null;
  tabPending.clear();
  resetDriveCache();
}

async function findOrCreateSpreadsheet(): Promise<string> {
  const folderId = await ensureFolder(APP_NAME);
  const existing = await findFile(APP_NAME, MIME.spreadsheet);
  if (existing) {
    await moveToFolder(existing, folderId);
    return existing;
  }
  const created = await googleApi<SpreadsheetCreated>(SHEETS, {
    method: 'POST',
    body: JSON.stringify({ properties: { title: APP_NAME } }),
  });
  pristineSheetId = created.sheets?.[0]?.properties?.sheetId ?? null;
  if (!created.spreadsheetId) {
    throw new Error('Google Sheets created a spreadsheet without an ID.');
  }
  await moveToFolder(created.spreadsheetId, folderId);
  return created.spreadsheetId;
}

export function ensureSpreadsheet(): Promise<string> {
  spreadsheetPending ??= findOrCreateSpreadsheet().catch((e) => {
    spreadsheetPending = null;
    throw e;
  });
  return spreadsheetPending;
}

const colLetter = (n: number): string => {
  let s = '';
  for (; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
};

async function setupTab(tab: string, headers: string[]): Promise<string[]> {
  const id = await ensureSpreadsheet();
  const meta = await googleApi<SpreadsheetMetadata>(
    `${SHEETS}/${id}?fields=sheets.properties(sheetId,title)`,
  );
  if (!Array.isArray(meta.sheets)) {
    throw new Error('Google Sheets returned no worksheet metadata.');
  }
  const tabs = meta.sheets.map(({ properties }) => {
    if (typeof properties?.sheetId !== 'number' || typeof properties.title !== 'string') {
      throw new Error('Google Sheets returned invalid worksheet metadata.');
    }
    return { sheetId: properties.sheetId, title: properties.title };
  });

  if (!tabs.some((t) => t.title === tab)) {
    // A sheet we just created has an empty default tab: reuse it.
    const reuse = tabs.find((t) => t.sheetId === pristineSheetId);
    const properties = { title: tab, gridProperties: { frozenRowCount: 1 } };
    const request = reuse
      ? {
          updateSheetProperties: {
            properties: { sheetId: reuse.sheetId, ...properties },
            fields: 'title,gridProperties.frozenRowCount',
          },
        }
      : { addSheet: { properties } };
    await googleApi(`${SHEETS}/${id}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests: [request] }),
    });
    if (reuse) pristineSheetId = null;
  }

  const row = await googleApi<ValuesResponse>(
    `${SHEETS}/${id}/values/${encodeURIComponent(`'${tab}'!1:1`)}`,
  );
  const headerRow = row.values?.[0] ?? [];
  if (!headerRow.every((value): value is string => typeof value === 'string')) {
    throw new Error(`Google Sheets returned a non-text header row for "${tab}".`);
  }
  const current = headerRow;
  const missing = headers.filter((h) => !current.includes(h));
  if (missing.length) {
    const start = encodeURIComponent(`'${tab}'!${colLetter(current.length + 1)}1`);
    await googleApi(`${SHEETS}/${id}/values/${start}?valueInputOption=RAW`, {
      method: 'PUT',
      body: JSON.stringify({ values: [missing] }),
    });
  }
  return [...current, ...missing]; // the sheet's real header order
}

// Creates the tab if needed, adds missing header columns, and returns the
// sheet's actual header row. Safe to call on every save.
export function ensureTab(tab: string, headers: string[]): Promise<string[]> {
  const inProgress = tabPending.get(tab);
  if (inProgress) return inProgress;

  const setup = tabSetupQueue.then(() => setupTab(tab, headers));
  tabSetupQueue = setup.then(
    () => undefined,
    () => undefined,
  );
  const pending = setup.finally(() => {
    if (tabPending.get(tab) === pending) tabPending.delete(tab);
  });
  tabPending.set(tab, pending);
  return pending;
}

export async function appendRecords(
  tab: string,
  headers: string[],
  records: SheetRecord[],
): Promise<void> {
  if (!records.length) return;
  const actual = await ensureTab(tab, headers);
  const id = await ensureSpreadsheet();
  const values = records.map((r) => actual.map((h) => r[h] ?? ''));
  const range = encodeURIComponent(`'${tab}'!A1`);
  await googleApi(
    `${SHEETS}/${id}/values/${range}:append` +
      `?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) },
  );
}

export async function upsertRecord(
  tab: string,
  headers: string[],
  record: SheetRecord,
  keyColumn: string,
  keyValue: string,
): Promise<void> {
  if (!headers.includes(keyColumn)) {
    throw new Error(`Sheet "${tab}" does not define key column "${keyColumn}".`);
  }

  const actual = await ensureTab(tab, headers);
  const keyIndex = actual.indexOf(keyColumn);
  const id = await ensureSpreadsheet();
  const keyLetter = colLetter(keyIndex + 1);
  const keyRange = encodeURIComponent(`'${tab}'!${keyLetter}2:${keyLetter}`);
  const result = await googleApi<ValuesResponse>(`${SHEETS}/${id}/values/${keyRange}`);
  const rowIndex = (result.values ?? []).findIndex((row) => String(row[0] ?? '') === keyValue);
  const values = actual.map((header) => record[header] ?? '');

  if (rowIndex < 0) {
    await appendRecords(tab, headers, [record]);
    return;
  }

  const rowNumber = rowIndex + 2;
  const range = encodeURIComponent(
    `'${tab}'!A${rowNumber}:${colLetter(actual.length)}${rowNumber}`,
  );
  await googleApi(`${SHEETS}/${id}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    body: JSON.stringify({ values: [values] }),
  });
}

export async function recordExists(
  tab: string,
  headers: string[],
  keyColumn: string,
  keyValue: string,
): Promise<boolean> {
  const actual = await ensureTab(tab, headers);
  const column = actual.indexOf(keyColumn);
  if (column < 0) throw new Error(`Sheet "${tab}" is missing key column "${keyColumn}".`);
  const id = await ensureSpreadsheet();
  const range = encodeURIComponent(`'${tab}'!${colLetter(column + 1)}:${colLetter(column + 1)}`);
  const result = await googleApi<ValuesResponse>(`${SHEETS}/${id}/values/${range}`);
  return (result.values ?? []).some((row: Cell[]) => String(row[0] ?? '') === keyValue);
}
