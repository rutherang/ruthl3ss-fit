import * as Network from 'expo-network';
import {
  enqueueOutboxEntry,
  getOutboxEntries,
  removeOutboxEntry,
} from '@/integrations/storage/outbox';
import { appendRecords, recordExists, upsertRecord, type SheetRecord } from './sheets';

const KIND = 'google-sheet-append';

export type SheetAppendTask = {
  tab: string;
  headers: string[];
  records: SheetRecord[];
  idColumn: string;
  idValue: string;
  operation?: 'append' | 'upsert';
};

const flushes = new Map<string, Promise<boolean>>();

async function flushAccount(accountId: string): Promise<boolean> {
  const networkState = await Network.getNetworkStateAsync();
  if (networkState.isConnected === false || networkState.isInternetReachable === false) {
    return false;
  }
  while (true) {
    const items = await getOutboxEntries(accountId, KIND);
    if (!items.length) return true;
    for (const item of items) {
      const task = JSON.parse(item.payload) as SheetAppendTask;
      if (task.operation === 'upsert') {
        const record = task.records[0];
        if (!record) throw new Error(`Queued upsert "${item.operationKey}" has no record.`);
        await upsertRecord(task.tab, task.headers, record, task.idColumn, task.idValue);
      } else if (!(await recordExists(task.tab, task.headers, task.idColumn, task.idValue))) {
        await appendRecords(task.tab, task.headers, task.records);
      }
      await removeOutboxEntry(accountId, item.operationKey);
    }
  }
}

export function flushPendingSheetWrites(accountId: string): Promise<boolean> {
  const existing = flushes.get(accountId);
  if (existing) return existing;

  const run = flushAccount(accountId);
  const tracked = run.finally(() => {
    if (flushes.get(accountId) === tracked) flushes.delete(accountId);
  });
  flushes.set(accountId, tracked);
  return tracked;
}

export async function queueSheetAppend(
  accountId: string,
  operationKey: string,
  task: SheetAppendTask,
): Promise<'saved' | 'queued'> {
  return queueSheetWrite(accountId, operationKey, task, 'append');
}

export async function queueSheetUpsert(
  accountId: string,
  operationKey: string,
  task: SheetAppendTask,
): Promise<'saved' | 'queued'> {
  if (task.records.length !== 1) {
    throw new Error('A queued sheet upsert must contain exactly one record.');
  }
  return queueSheetWrite(accountId, operationKey, task, 'upsert');
}

async function queueSheetWrite(
  accountId: string,
  operationKey: string,
  task: SheetAppendTask,
  operation: 'append' | 'upsert',
): Promise<'saved' | 'queued'> {
  await enqueueOutboxEntry({
    accountId,
    operationKey,
    kind: KIND,
    payload: JSON.stringify({ ...task, operation }),
  });
  try {
    while (true) {
      const flushed = await flushPendingSheetWrites(accountId);
      const remaining = await getOutboxEntries(accountId, KIND);
      if (!remaining.some((entry) => entry.operationKey === operationKey)) return 'saved';
      if (!flushed) return 'queued';
    }
  } catch (error) {
    let state: Network.NetworkState;
    try {
      state = await Network.getNetworkStateAsync();
    } catch {
      throw error;
    }
    if (state.isConnected === false || state.isInternetReachable === false) return 'queued';
    throw error;
  }
}
