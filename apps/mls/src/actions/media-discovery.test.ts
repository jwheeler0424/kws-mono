import { members, offices, properties } from '@kws/schema';
import { afterEach, expect, mock, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

const databaseModulePath = fileURLToPath(new URL('../lib/database.ts', import.meta.url));
const fetchModulePath = fileURLToPath(new URL('../lib/utils/fetch.ts', import.meta.url));
const quotaModulePath = fileURLToPath(new URL('../lib/utils/quota.ts', import.meta.url));
const resourceMediaModulePath = fileURLToPath(
  new URL('../repositories/resource-media.repository.ts', import.meta.url),
);
const cursorModulePath = fileURLToPath(
  new URL('../repositories/media-discovery-cursor.repository.ts', import.meta.url),
);

let cursorState: {
  phase: 'properties' | 'members' | 'offices' | 'complete';
  lastKey: string | null;
} = { phase: 'properties', lastKey: null };
let cursorLocked = false;
let quotaExhausted = false;
let propertyQueries = 0;
const parentRequests: string[] = [];
const enqueuedKeys: string[] = [];
const propertyParents = [
  { key: 'NWM_PROPERTY_1', listingId: 'NWM1' },
  { key: 'NWM_PROPERTY_2', listingId: 'NWM2' },
];

await mock.module(databaseModulePath, () => ({
  db: {
    select: () => {
      let table: unknown;
      const builder = {
        from(value: unknown) {
          table = value;
          return builder;
        },
        where() {
          return builder;
        },
        orderBy() {
          return builder;
        },
        async limit() {
          if (table === properties) {
            propertyQueries += 1;
            return propertyParents.filter((parent) => parent.key > (cursorState.lastKey ?? ''));
          }
          if (table === members || table === offices) return [];
          return [];
        },
      };
      return builder;
    },
  },
}));

await mock.module(fetchModulePath, () => ({
  MlsParentUnavailableError: class MlsParentUnavailableError extends Error {},
  fetchFreshParentMedia: async (_entityType: string, key: string) => {
    parentRequests.push(key);
    return [{ MediaKey: `${key}-photo`, MediaURL: `https://media.mlsgrid.com/${key}`, Order: 0 }];
  },
}));

await mock.module(quotaModulePath, () => ({
  isMlsMediaBudgetExhausted: () => quotaExhausted,
  MlsQuotaExceededError: class MlsQuotaExceededError extends Error {},
  mlsQuotaTracker: { snapshot: () => ({}) },
}));

await mock.module(resourceMediaModulePath, () => ({
  enqueueResourceMediaBatch: async (
    items: Array<{ mediaRecords: Array<{ mediaKey: string }> }>,
  ) => {
    enqueuedKeys.push(
      ...items.flatMap((item) => item.mediaRecords.map((record) => record.mediaKey)),
    );
  },
}));

await mock.module(cursorModulePath, () => ({
  claimMlsMediaDiscoveryCursor: async () => {
    if (cursorLocked) return null;
    cursorLocked = true;
    return { token: 'discovery-token', state: { ...cursorState } };
  },
  checkpointMlsMediaDiscoveryCursor: async (_token: string, state: typeof cursorState) => {
    cursorState = { ...state };
  },
  finishMlsMediaDiscoveryCursor: async () => {
    cursorLocked = false;
  },
}));

const { discoverLegacyMlsMedia } = await import('./media-discovery');

afterEach(() => {
  cursorState = { phase: 'properties', lastKey: null };
  cursorLocked = false;
  quotaExhausted = false;
  propertyQueries = 0;
  parentRequests.length = 0;
  enqueuedKeys.length = 0;
  mock.restore();
});

test('legacy discovery pauses on quota, resumes by key, and never refetches after completion', async () => {
  const options = {
    originatingSystemName: 'nwmls',
    memberKeys: [],
    officeKeys: [],
    maxParentsPerRun: 1,
  };

  const first = await discoverLegacyMlsMedia(options);
  expect(first.parentsScanned).toBe(1);
  expect(parentRequests).toEqual(['NWM_PROPERTY_1']);
  expect(cursorState).toEqual({ phase: 'properties', lastKey: 'NWM_PROPERTY_1' });

  quotaExhausted = true;
  const paused = await discoverLegacyMlsMedia(options);
  expect(paused.budgetExhausted).toBe(true);
  expect(parentRequests).toEqual(['NWM_PROPERTY_1']);
  expect(cursorState.lastKey).toBe('NWM_PROPERTY_1');

  quotaExhausted = false;
  await discoverLegacyMlsMedia(options);
  expect(parentRequests).toEqual(['NWM_PROPERTY_1', 'NWM_PROPERTY_2']);
  expect(cursorState.phase).toBe('members');
  expect(enqueuedKeys).toEqual(['NWM_PROPERTY_1-photo', 'NWM_PROPERTY_2-photo']);

  const completed = await discoverLegacyMlsMedia(options);
  expect(completed.completed).toBe(true);
  expect(cursorState.phase).toBe('complete');

  const repeated = await discoverLegacyMlsMedia(options);
  expect(repeated.completed).toBe(true);
  expect(propertyQueries).toBe(2);
  expect(parentRequests).toHaveLength(2);
});
