import { beforeEach, describe, expect, it, mock } from 'bun:test';

const checkpoints: string[] = [];
const completions: Array<string | undefined> = [];
await mock.module('../repositories/sync-cursor.repository.ts', () => ({
  claimSyncCursor: async () => ({ token: 'test', timestamp: '2026-09-16T00:00:00Z' }),
  checkpointSyncCursor: async (_token: string, timestamp?: Date) => {
    if (timestamp) checkpoints.push(timestamp.toISOString());
  },
  finishSyncCursor: async (_token: string, error?: string) => {
    completions.push(error);
  },
}));
await mock.module('../lib/history-store.ts', () => ({
  persistHistoryPage: async () => {},
  quarantineInvalidTimestampRecords: async ({
    records,
  }: {
    records: Record<string, unknown>[];
  }) => ({ validRecords: records, summary: { quarantinedCount: 0 } }),
}));
const { syncResource } = await import('./sync-resource');

beforeEach(() => {
  checkpoints.length = 0;
  completions.length = 0;
});

describe('received-page replication checkpoints', () => {
  it('advances using received timestamps even when ingestion retains no rows', async () => {
    const result = await syncResource({
      resource: 'Property',
      osn: 'nwmls',
      getLatestTimestamp: async () => null,
      getTimestamp: (record) => record.ModificationTimestamp,
      fetchFn: async function* () {
        yield {
          value: [{ ModificationTimestamp: '2026-09-17T00:00:00Z' }],
          requestUrl: 'https://api.mlsgrid.com/v2/Property',
        };
      },
      upsert: async () => new Date(0),
    });
    expect(result.errors).toBe(0);
    expect(checkpoints).toEqual(['2026-09-17T00:00:00.000Z']);
  });

  it('does not checkpoint a failed page or continue to a later page', async () => {
    const result = await syncResource({
      resource: 'Property',
      osn: 'nwmls',
      getLatestTimestamp: async () => null,
      getTimestamp: (record) => record.ModificationTimestamp,
      fetchFn: async function* () {
        yield { value: [{ ModificationTimestamp: '2026-09-17T00:00:00Z' }], requestUrl: 'first' };
        yield { value: [{ ModificationTimestamp: '2026-09-18T00:00:00Z' }], requestUrl: 'second' };
      },
      upsert: async () => {
        throw new Error('ingestion failed');
      },
    });
    expect(result.errors).toBe(1);
    expect(checkpoints).toEqual([]);
    expect(completions).toContain('ingestion failed');
  });
});
