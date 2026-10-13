import { beforeEach, describe, expect, it } from 'bun:test';

import type { SyncResourceDependencies } from './sync-resource';

const checkpoints: string[] = [];
const completions: Array<string | undefined> = [];

function createDependencies(): SyncResourceDependencies {
  return {
    claimSyncCursor: async () => ({
      token: '00000000-0000-4000-8000-000000000000',
      timestamp: '2026-09-16T00:00:00Z',
    }),
    checkpointSyncCursor: async (_token, timestamp) => {
      if (timestamp) checkpoints.push(timestamp.toISOString());
    },
    finishSyncCursor: async (_token, error) => {
      completions.push(error);
    },
    persistHistoryPage: async () => {},
    quarantineInvalidTimestampRecords: async ({ records }) => ({
      validRecords: records,
      summary: {
        checkedCount: records.length,
        validCount: records.length,
        quarantinedCount: 0,
      },
    }),
  };
}

beforeEach(() => {
  checkpoints.length = 0;
  completions.length = 0;
});

describe('received-page replication checkpoints', () => {
  it('advances using received timestamps even when ingestion retains no rows', async () => {
    const result = await import('./sync-resource').then(({ syncResource }) =>
      syncResource(
        {
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
        },
        createDependencies(),
      ),
    );
    expect(result.errors).toBe(0);
    expect(checkpoints).toEqual(['2026-09-17T00:00:00.000Z']);
    expect(completions).toEqual([undefined]);
  });

  it('does not checkpoint a failed page or continue to a later page', async () => {
    const result = await import('./sync-resource').then(({ syncResource }) =>
      syncResource(
        {
          resource: 'Property',
          osn: 'nwmls',
          getLatestTimestamp: async () => null,
          getTimestamp: (record) => record.ModificationTimestamp,
          fetchFn: async function* () {
            yield {
              value: [{ ModificationTimestamp: '2026-09-17T00:00:00Z' }],
              requestUrl: 'first',
            };
            yield {
              value: [{ ModificationTimestamp: '2026-09-18T00:00:00Z' }],
              requestUrl: 'second',
            };
          },
          upsert: async () => {
            throw new Error('ingestion failed');
          },
        },
        createDependencies(),
      ),
    );
    expect(result.errors).toBe(1);
    expect(checkpoints).toEqual([]);
    expect(completions).toEqual(['ingestion failed']);
  });
});
