import { afterAll, beforeEach, expect, mock, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

import { MlsApiError } from '@/lib/utils/errors';

const modulePath = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));
// Bun module mocks are process-wide, so keep every real export available to later test files.
const actualFetch = { ...(await import('../lib/utils/fetch')) };
const actualQuota = { ...(await import('../lib/utils/quota')) };
const actualCursor = { ...(await import('../repositories/media-queue-cursor.repository')) };
const actualQueue = { ...(await import('../repositories/media-queue.repository')) };
const actualResourceMedia = { ...(await import('../repositories/resource-media.repository')) };

let chunk: Array<Record<string, unknown>> = [];
let chunkError: unknown;
let pendingFreshUrls = 0;
let expiredInBacklog = 0;
const events: string[] = [];
let incompleteKeys = new Set<string>();
let checkpoints: Array<string | null> = [];
let reconciledKeys: string[] = [];
const requestedChunks: string[] = [];
const oldestIncomplete = new Date('2026-09-01T00:00:00Z');

await mock.module(modulePath('../lib/utils/fetch.ts'), () => ({
  ...actualFetch,
  fetchFreshParentMedia: async () => [],
  fetchActivePropertyMediaChunk: async (from: Date) => {
    requestedChunks.push(from.toISOString());
    if (chunkError) throw chunkError;
    return chunk;
  },
}));
await mock.module(modulePath('../lib/utils/quota.ts'), () => ({
  ...actualQuota,
  isMlsMediaBudgetExhausted: () => false,
  mlsQuotaTracker: { snapshot: () => ({}) },
}));
await mock.module(modulePath('../repositories/media-queue-cursor.repository.ts'), () => ({
  ...actualCursor,
  claimMlsMediaQueueCursor: async () => ({ token: 'token', resumeFrom: null }),
  checkpointMlsMediaQueueCursor: async (_token: string, resumeFrom: Date | null) => {
    checkpoints.push(resumeFrom?.toISOString() ?? null);
  },
  finishMlsMediaQueueCursor: async () => {},
}));
await mock.module(modulePath('../repositories/media-queue.repository.ts'), () => ({
  ...actualQueue,
  clearDeadMlsMediaQueueEntries: async () => {
    events.push('clear-dead');
    pendingFreshUrls = Math.max(0, pendingFreshUrls - expiredInBacklog);
    return {
      expiredUrlsCleared: expiredInBacklog,
      urlLessRowsMarked: 0,
      deadRefreshMarkersCleared: 0,
    };
  },
  countPendingFreshMediaUrls: async () => {
    events.push('count-backlog');
    return pendingFreshUrls;
  },
  findOldestIncompleteActiveListingTimestamp: async () => oldestIncomplete,
  listIncompleteActiveListingKeys: async () => incompleteKeys,
  listIncompleteEntityKeys: async () => [],
}));
await mock.module(modulePath('../repositories/resource-media.repository.ts'), () => ({
  ...actualResourceMedia,
  enqueueResourceMediaBatch: async () => {},
  reconcileResourceMediaBatch: async (items: Array<{ resourceRecordKey: string }>) => {
    reconciledKeys.push(...items.map((item) => item.resourceRecordKey));
  },
}));

const { refreshMlsMediaQueue } = await import('./media-queue-refresh');
const options = { originatingSystemName: 'nwmls', memberKeys: [], officeKeys: [] };

function listing(key: string, modifiedAt: string) {
  return {
    ListingKey: key,
    MlgCanView: true,
    ModificationTimestamp: modifiedAt,
    Media: [{ MediaKey: `${key}-photo`, MediaURL: `https://media.mlsgrid.com/${key}`, Order: 0 }],
  };
}

beforeEach(() => {
  chunk = [];
  chunkError = undefined;
  pendingFreshUrls = 0;
  expiredInBacklog = 0;
  events.length = 0;
  incompleteKeys = new Set();
  checkpoints = [];
  reconciledKeys = [];
  requestedChunks.length = 0;
});

afterAll(async () => {
  await mock.module(modulePath('../lib/utils/fetch.ts'), () => actualFetch);
  await mock.module(modulePath('../lib/utils/quota.ts'), () => actualQuota);
  await mock.module(
    modulePath('../repositories/media-queue-cursor.repository.ts'),
    () => actualCursor,
  );
  await mock.module(modulePath('../repositories/media-queue.repository.ts'), () => actualQueue);
  await mock.module(
    modulePath('../repositories/resource-media.repository.ts'),
    () => actualResourceMedia,
  );
  mock.restore();
});

test('queues only incomplete listings from the chunk and restarts after the final chunk', async () => {
  chunk = [listing('NWM1', '2026-09-01T00:00:00Z'), listing('NWM2', '2026-09-02T00:00:00Z')];
  incompleteKeys = new Set(['NWM2']);

  const summary = await refreshMlsMediaQueue(options);

  expect(requestedChunks).toEqual(['2026-09-01T00:00:00.000Z']);
  expect(reconciledKeys).toEqual(['NWM2']);
  expect(summary.listingsQueued).toBe(1);
  expect(checkpoints).toEqual([null]);
});

test('advances the cursor to the newest record of a full chunk', async () => {
  chunk = Array.from({ length: 1000 }, (_, index) =>
    listing(`NWM${index}`, new Date(oldestIncomplete.getTime() + index * 1_000).toISOString()),
  );

  await refreshMlsMediaQueue(options);

  expect(checkpoints).toEqual([new Date(oldestIncomplete.getTime() + 999_000).toISOString()]);
});

test('skips the chunk window ahead an hour when MLS Grid rate-limits it', async () => {
  chunkError = new MlsApiError(429, '/Property', '');

  const summary = await refreshMlsMediaQueue(options);

  expect(summary.rateLimited).toBe(true);
  expect(reconciledKeys).toEqual([]);
  expect(checkpoints).toEqual(['2026-09-01T01:00:00.000Z']);
});

test('does not request a new chunk while workers still have a large fresh-URL backlog', async () => {
  pendingFreshUrls = 4000;

  const summary = await refreshMlsMediaQueue(options);

  expect(summary.skippedForBacklog).toBe(true);
  expect(summary.pendingFreshUrls).toBe(4000);
  expect(requestedChunks).toEqual([]);
  expect(checkpoints).toEqual([]);
});

test('clears expired links before measuring the backlog so dead links never block refresh', async () => {
  pendingFreshUrls = 4500;
  expiredInBacklog = 1000;

  const summary = await refreshMlsMediaQueue(options);

  expect(events.indexOf('clear-dead')).toBeLessThan(events.indexOf('count-backlog'));
  expect(summary.deadEntries?.expiredUrlsCleared).toBe(1000);
  expect(summary.skippedForBacklog).toBe(false);
  expect(requestedChunks).toEqual(['2026-09-01T00:00:00.000Z']);
});

test('requests a chunk just below the backlog cap', async () => {
  pendingFreshUrls = 3999;

  const summary = await refreshMlsMediaQueue(options);

  expect(summary.skippedForBacklog).toBe(false);
  expect(requestedChunks).toHaveLength(1);
});
