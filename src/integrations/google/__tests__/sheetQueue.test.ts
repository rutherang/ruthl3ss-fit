import { queueSheetAppend, flushPendingSheetWrites } from '../sheetQueue';
import type { SheetAppendTask } from '../sheetQueue';

type MockEntry = {
  accountId: string;
  operationKey: string;
  kind: string;
  payload: string;
};

const mockEntries: MockEntry[] = [];
const mockNetworkState = { isConnected: true, isInternetReachable: true };
const mockGetOutboxEntries = jest.fn(async (accountId: string, kind: string) =>
  mockEntries.filter((entry) => entry.accountId === accountId && entry.kind === kind),
);
const mockEnqueueOutboxEntry = jest.fn(async (entry: MockEntry) => {
  if (
    !mockEntries.some(
      (existing) =>
        existing.accountId === entry.accountId && existing.operationKey === entry.operationKey,
    )
  ) {
    mockEntries.push(entry);
  }
});
const mockRemoveOutboxEntry = jest.fn(async (accountId: string, operationKey: string) => {
  const index = mockEntries.findIndex(
    (entry) => entry.accountId === accountId && entry.operationKey === operationKey,
  );
  if (index >= 0) mockEntries.splice(index, 1);
});
const mockAppendRecords = jest.fn().mockResolvedValue(undefined);
const mockRecordExists = jest.fn().mockResolvedValue(false);

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn(async () => mockNetworkState),
}));
jest.mock('@/integrations/storage/outbox', () => ({
  enqueueOutboxEntry: (...args: [MockEntry]) => mockEnqueueOutboxEntry(...args),
  getOutboxEntries: (...args: [string, string]) => mockGetOutboxEntries(...args),
  removeOutboxEntry: (...args: [string, string]) => mockRemoveOutboxEntry(...args),
}));
jest.mock('../sheets', () => ({
  appendRecords: (...args: unknown[]) => mockAppendRecords(...args),
  recordExists: (...args: unknown[]) => mockRecordExists(...args),
}));

const task: SheetAppendTask = {
  tab: 'Workouts',
  headers: ['id'],
  records: [{ id: 'w_1' }],
  idColumn: 'id',
  idValue: 'w_1',
};

beforeEach(() => {
  mockEntries.splice(0);
  mockNetworkState.isConnected = true;
  mockNetworkState.isInternetReachable = true;
  mockAppendRecords.mockReset().mockResolvedValue(undefined);
  mockRecordExists.mockReset().mockResolvedValue(false);
  mockGetOutboxEntries.mockClear();
  mockEnqueueOutboxEntry.mockClear();
  mockRemoveOutboxEntry.mockClear();
});

describe('Google Sheets write queue', () => {
  it('persists a write and leaves it queued while offline', async () => {
    mockNetworkState.isConnected = false;

    await expect(queueSheetAppend('one@example.com', 'w_1', task)).resolves.toBe('queued');

    expect(mockEntries).toHaveLength(1);
    expect(mockAppendRecords).not.toHaveBeenCalled();
  });

  it('checks the remote key before appending and removes a completed entry', async () => {
    await expect(queueSheetAppend('one@example.com', 'w_1', task)).resolves.toBe('saved');

    expect(mockRecordExists).toHaveBeenCalledWith('Workouts', ['id'], 'id', 'w_1');
    expect(mockAppendRecords).toHaveBeenCalledWith('Workouts', ['id'], [{ id: 'w_1' }]);
    expect(mockEntries).toHaveLength(0);
  });

  it('does not append again when the id already exists remotely', async () => {
    mockRecordExists.mockResolvedValue(true);
    await mockEnqueueOutboxEntry({
      accountId: 'one@example.com',
      operationKey: 'w_1',
      kind: 'google-sheet-append',
      payload: JSON.stringify(task),
    });

    await flushPendingSheetWrites('one@example.com');

    expect(mockAppendRecords).not.toHaveBeenCalled();
    expect(mockEntries).toHaveLength(0);
  });

  it('keeps failed writes in the queue for a later retry', async () => {
    mockAppendRecords.mockRejectedValueOnce(new Error('Google 500'));

    await expect(queueSheetAppend('one@example.com', 'w_1', task)).rejects.toThrow('Google 500');

    expect(mockEntries).toHaveLength(1);
  });
});
