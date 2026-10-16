import { ensureTab, recordExists, resetSheetCache } from '../sheets';

jest.mock('../api', () => ({
  googleApi: (...args: unknown[]) => mockGoogleApi(...args),
}));
jest.mock('../drive', () => ({
  ensureFolder: jest.fn().mockResolvedValue('folder1'),
  findFile: jest.fn().mockResolvedValue(null),
  MIME: {
    folder: 'application/vnd.google-apps.folder',
    spreadsheet: 'application/vnd.google-apps.spreadsheet',
  },
  moveToFolder: jest.fn().mockResolvedValue(undefined),
  resetDriveCache: jest.fn(),
}));

const mockGoogleApi = jest.fn();

beforeEach(() => {
  resetSheetCache();
  mockGoogleApi.mockReset();
});

describe('ensureTab', () => {
  it('preserves existing header order and appends any missing columns', async () => {
    mockGoogleApi
      .mockResolvedValueOnce({ spreadsheetId: 'sheet1', sheets: [{ properties: { sheetId: 0 } }] })
      .mockResolvedValueOnce({ sheets: [{ properties: { sheetId: 0, title: 'Workouts' } }] })
      .mockResolvedValueOnce({ values: [['id', 'created_at']] })
      .mockResolvedValueOnce({});

    await expect(
      ensureTab('Workouts', ['id', 'started_at', 'created_at', 'profile_id']),
    ).resolves.toEqual(['id', 'created_at', 'started_at', 'profile_id']);

    expect(mockGoogleApi.mock.calls[3][0]).toContain("'Workouts'!C1");
    expect(JSON.parse(mockGoogleApi.mock.calls[3][1].body).values).toEqual([
      ['started_at', 'profile_id'],
    ]);

    mockGoogleApi
      .mockResolvedValueOnce({ sheets: [{ properties: { sheetId: 0, title: 'Workouts' } }] })
      .mockResolvedValueOnce({ values: [['id', 'created_at', 'started_at', 'profile_id']] })
      .mockResolvedValueOnce({});
    await expect(
      ensureTab('Workouts', ['id', 'created_at', 'started_at', 'profile_id', 'new_column']),
    ).resolves.toEqual(['id', 'created_at', 'started_at', 'profile_id', 'new_column']);
  });

  it('serializes setup for distinct tabs on a newly created spreadsheet', async () => {
    const tabs = [{ sheetId: 0, title: 'Sheet1' }];
    mockGoogleApi.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === 'https://sheets.googleapis.com/v4/spreadsheets') {
        return {
          spreadsheetId: 'sheet1',
          sheets: [{ properties: { sheetId: 0 } }],
        };
      }
      if (url.includes('?fields=sheets.properties')) {
        return { sheets: tabs.map((properties) => ({ properties })) };
      }
      if (url.includes(':batchUpdate')) {
        const { requests } = JSON.parse(String(init?.body));
        const request = requests[0];
        if (request.updateSheetProperties) {
          const { sheetId, title } = request.updateSheetProperties.properties;
          const tab = tabs.find((entry) => entry.sheetId === sheetId);
          if (tab) tab.title = title;
        } else {
          tabs.push({
            sheetId: tabs.length,
            title: request.addSheet.properties.title,
          });
        }
        return {};
      }
      if (url.includes('/values/')) {
        if (init?.method === 'PUT') return {};
        return {};
      }
      return {};
    });

    await Promise.all([ensureTab('Workouts', ['id']), ensureTab('Profiles', ['id', 'name'])]);

    expect(tabs.map(({ title }) => title)).toEqual(['Workouts', 'Profiles']);
  });

  it('finds a durable idempotency key using the persisted header position', async () => {
    mockGoogleApi
      .mockResolvedValueOnce({ spreadsheetId: 'sheet1', sheets: [{ properties: { sheetId: 0 } }] })
      .mockResolvedValueOnce({ sheets: [{ properties: { sheetId: 1, title: 'Workouts' } }] })
      .mockResolvedValueOnce({ values: [['created_at', 'id']] })
      .mockResolvedValueOnce({ values: [['id'], ['w_1']] });

    await expect(recordExists('Workouts', ['id', 'created_at'], 'id', 'w_1')).resolves.toBe(true);

    expect(decodeURIComponent(mockGoogleApi.mock.calls[3][0])).toContain("'Workouts'!B:B");
  });
});
