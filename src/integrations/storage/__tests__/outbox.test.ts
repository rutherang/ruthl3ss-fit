import { enqueueOutboxEntry, getOutboxEntries, removeOutboxEntry } from '../outbox';

type MockRow = {
  account_id: string;
  operation_key: string;
  kind: string;
  payload: string;
  created_at: number;
  accountId?: string;
  operationKey?: string;
};

const mockRows: MockRow[] = [];
const mockDatabase = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  runAsync: jest.fn(async (sql: string, ...values: (string | number)[]) => {
    if (sql.startsWith('INSERT OR IGNORE')) {
      const [accountId, operationKey, kind, payload, createdAt] = values as [
        string,
        string,
        string,
        string,
        number,
      ];
      if (
        !mockRows.some((row) => row.account_id === accountId && row.operation_key === operationKey)
      ) {
        mockRows.push({
          account_id: accountId,
          operation_key: operationKey,
          kind,
          payload,
          created_at: createdAt,
        });
      }
    } else if (sql.startsWith('DELETE FROM outbox')) {
      const [accountId, operationKey] = values;
      const index = mockRows.findIndex(
        (row) => row.account_id === accountId && row.operation_key === operationKey,
      );
      if (index >= 0) mockRows.splice(index, 1);
    }
    return { changes: 1, lastInsertRowId: 1 };
  }),
  getAllAsync: jest.fn(async (_sql: string, accountId: string, kind: string) =>
    mockRows
      .filter((row) => row.account_id === accountId && row.kind === kind)
      .map((row) => ({
        accountId: row.account_id,
        operationKey: row.operation_key,
        kind: row.kind,
        payload: row.payload,
      })),
  ),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockImplementation(() => Promise.resolve(mockDatabase)),
}));

beforeEach(() => {
  mockRows.splice(0);
});

describe('durable outbox', () => {
  it('isolates pending writes by account', async () => {
    await enqueueOutboxEntry({
      accountId: 'one@example.com',
      operationKey: 'workout:1',
      kind: 'sheet',
      payload: '{"id":"one"}',
    });
    await enqueueOutboxEntry({
      accountId: 'two@example.com',
      operationKey: 'workout:1',
      kind: 'sheet',
      payload: '{"id":"two"}',
    });

    await expect(getOutboxEntries('one@example.com', 'sheet')).resolves.toMatchObject([
      { accountId: 'one@example.com', payload: '{"id":"one"}' },
    ]);
    await expect(getOutboxEntries('two@example.com', 'sheet')).resolves.toMatchObject([
      { accountId: 'two@example.com', payload: '{"id":"two"}' },
    ]);
  });

  it('keeps an operation key idempotent and removes only the selected account entry', async () => {
    const entry = {
      accountId: 'one@example.com',
      operationKey: 'workout:1',
      kind: 'sheet',
      payload: '{"id":"original"}',
    };
    await enqueueOutboxEntry(entry);
    await enqueueOutboxEntry({ ...entry, payload: '{"id":"replacement"}' });
    await enqueueOutboxEntry({ ...entry, accountId: 'two@example.com' });

    await removeOutboxEntry('one@example.com', 'workout:1');

    await expect(getOutboxEntries('one@example.com', 'sheet')).resolves.toEqual([]);
    await expect(getOutboxEntries('two@example.com', 'sheet')).resolves.toMatchObject([
      { payload: '{"id":"original"}' },
    ]);
  });

  it('rejects account-less writes instead of placing them in a shared queue', async () => {
    await expect(
      enqueueOutboxEntry({
        accountId: ' ',
        operationKey: 'workout:1',
        kind: 'sheet',
        payload: '{}',
      }),
    ).rejects.toThrow('An account id is required');
  });
});
