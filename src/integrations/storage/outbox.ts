import * as SQLite from 'expo-sqlite';

export type OutboxEntry = {
  accountId: string;
  operationKey: string;
  kind: string;
  payload: string;
};

type OutboxRow = OutboxEntry;

let database: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  database ??= (async () => {
    const db = await SQLite.openDatabaseAsync('ruthl3ss-fit.db');
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id TEXT NOT NULL,
        operation_key TEXT NOT NULL,
        kind TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE (account_id, operation_key)
      );
    `);
    return db;
  })().catch((error: unknown) => {
    database = null;
    throw error;
  });
  return database;
}

export async function enqueueOutboxEntry(entry: OutboxEntry): Promise<void> {
  if (!entry.accountId.trim()) throw new Error('An account id is required for queued writes.');
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO outbox (account_id, operation_key, kind, payload, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    entry.accountId,
    entry.operationKey,
    entry.kind,
    entry.payload,
    Date.now(),
  );
}

export async function getOutboxEntries(accountId: string, kind: string): Promise<OutboxEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<OutboxRow>(
    `SELECT account_id AS accountId, operation_key AS operationKey, kind, payload
     FROM outbox WHERE account_id = ? AND kind = ? ORDER BY id`,
    accountId,
    kind,
  );
}

export async function removeOutboxEntry(accountId: string, operationKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM outbox WHERE account_id = ? AND operation_key = ?',
    accountId,
    operationKey,
  );
}
