import type { MlsPropertyPayload } from '@/types';

import { MLS_MEDIA_QUEUE_DEFAULTS } from '@/lib/constants';
import { mlsLogger } from '@/lib/logger';
import { MlsApiError } from '@/lib/utils/errors';
import {
  fetchActivePropertyMediaChunk,
  fetchFreshParentMedia,
  MlsParentUnavailableError,
} from '@/lib/utils/fetch';
import { mlsMediaBackoff } from '@/lib/utils/media-backoff';
import {
  isMlsMediaBudgetExhausted,
  MlsQuotaExceededError,
  mlsQuotaTracker,
} from '@/lib/utils/quota';
import { mapMemberMedia, mapOfficeMedia, type MappedMedia } from '@/maps/media.mapper';
import { mapProperty } from '@/maps/property.mapper';

import {
  checkpointMlsMediaQueueCursor,
  claimMlsMediaQueueCursor,
  finishMlsMediaQueueCursor,
} from '../repositories/media-queue-cursor.repository';
import {
  clearDeadMlsMediaQueueEntries,
  countPendingFreshMediaUrls,
  type DeadMlsMediaQueueSummary,
  findOldestIncompleteActiveListingTimestamp,
  listIncompleteActiveListingKeys,
  listIncompleteEntityKeys,
} from '../repositories/media-queue.repository';
import {
  enqueueResourceMediaBatch,
  reconcileResourceMediaBatch,
  type ResourceMediaBatchItem,
} from '../repositories/resource-media.repository';

const queueLogger = mlsLogger.child('media-queue');
const RECONCILE_BATCH_SIZE = 100;

export interface MlsMediaQueueRefreshSummary {
  acquired: boolean;
  skippedForBacklog: boolean;
  budgetExhausted: boolean;
  rateLimited: boolean;
  chunkFrom: string | null;
  recordsFetched: number;
  listingsQueued: number;
  entitiesQueued: number;
  pendingFreshUrls: number;
  deadEntries?: DeadMlsMediaQueueSummary;
  error?: string;
}

function latestTimestamp(records: MlsPropertyPayload[]): Date | null {
  let latest: number | null = null;
  for (const record of records) {
    const parsed = record.ModificationTimestamp ? Date.parse(record.ModificationTimestamp) : NaN;
    if (Number.isFinite(parsed) && (latest === null || parsed > latest)) latest = parsed;
  }
  return latest === null ? null : new Date(latest);
}

async function queueListingSnapshots(
  records: MlsPropertyPayload[],
  incompleteKeys: Set<string>,
): Promise<number> {
  const items: ResourceMediaBatchItem[] = [];
  for (const record of records) {
    if (record.MlgCanView !== true || !incompleteKeys.has(record.ListingKey)) continue;
    try {
      const mapped = mapProperty(record);
      if (mapped.mediaSnapshotPresent) {
        items.push({ resourceRecordKey: record.ListingKey, mediaRecords: mapped.media });
      }
    } catch (error) {
      queueLogger.warn('skipping listing with an invalid media snapshot', {
        resourceRecordKey: record.ListingKey,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  for (let start = 0; start < items.length; start += RECONCILE_BATCH_SIZE) {
    await reconcileResourceMediaBatch(items.slice(start, start + RECONCILE_BATCH_SIZE));
  }
  return items.length;
}

async function refreshActiveListingChunk(
  token: string,
  resumeFrom: Date | null,
  summary: MlsMediaQueueRefreshSummary,
): Promise<void> {
  const chunkFrom =
    (resumeFrom ? await findOldestIncompleteActiveListingTimestamp(resumeFrom) : null) ??
    (await findOldestIncompleteActiveListingTimestamp(null));
  if (!chunkFrom) {
    if (resumeFrom) await checkpointMlsMediaQueueCursor(token, null);
    return;
  }
  summary.chunkFrom = chunkFrom.toISOString();

  let records: MlsPropertyPayload[];
  try {
    records = await fetchActivePropertyMediaChunk(chunkFrom, MLS_MEDIA_QUEUE_DEFAULTS.chunkSize);
  } catch (error) {
    if (error instanceof MlsApiError && error.status === 429) {
      summary.rateLimited = true;
      await checkpointMlsMediaQueueCursor(
        token,
        new Date(chunkFrom.getTime() + MLS_MEDIA_QUEUE_DEFAULTS.rateLimitedSkipMs),
      );
      return;
    }
    throw error;
  }

  summary.recordsFetched = records.length;
  const incompleteKeys = await listIncompleteActiveListingKeys(
    records.map((record) => record.ListingKey),
  );
  summary.listingsQueued = await queueListingSnapshots(records, incompleteKeys);

  const latest = latestTimestamp(records);
  // A full chunk sharing one timestamp would otherwise be requested forever.
  const nextFrom =
    records.length < MLS_MEDIA_QUEUE_DEFAULTS.chunkSize || !latest
      ? null
      : latest.getTime() > chunkFrom.getTime()
        ? latest
        : new Date(chunkFrom.getTime() + 1);
  await checkpointMlsMediaQueueCursor(token, nextFrom);
}

async function refreshConfiguredEntities(
  entityType: 'members' | 'offices',
  keys: readonly string[],
  summary: MlsMediaQueueRefreshSummary,
): Promise<void> {
  for (const key of await listIncompleteEntityKeys(entityType, keys)) {
    if (isMlsMediaBudgetExhausted(mlsQuotaTracker.snapshot())) {
      summary.budgetExhausted = true;
      return;
    }
    try {
      const payloads = await fetchFreshParentMedia(entityType, key);
      const mapMedia = entityType === 'members' ? mapMemberMedia : mapOfficeMedia;
      const mediaRecords = payloads
        .map((payload) => mapMedia(payload, key))
        .filter((record): record is MappedMedia => record !== null);
      const item = { resourceRecordKey: key, mediaRecords };
      if (mediaRecords.length === payloads.length) {
        await reconcileResourceMediaBatch([item]);
      } else {
        await enqueueResourceMediaBatch([item]);
      }
      summary.entitiesQueued += 1;
    } catch (error) {
      if (!(error instanceof MlsParentUnavailableError)) throw error;
    }
  }
}

/**
 * Queues fresh media URLs in bulk; workers in runMlsMediaSync download them.
 */
export async function refreshMlsMediaQueue(options: {
  originatingSystemName: string;
  memberKeys: readonly string[];
  officeKeys: readonly string[];
}): Promise<MlsMediaQueueRefreshSummary> {
  const summary: MlsMediaQueueRefreshSummary = {
    acquired: false,
    skippedForBacklog: false,
    budgetExhausted: false,
    rateLimited: false,
    chunkFrom: null,
    recordsFetched: 0,
    listingsQueued: 0,
    entitiesQueued: 0,
    pendingFreshUrls: 0,
  };
  // Fresh URLs expire within the hour, so don't spend API requests on them while downloads are paused.
  if (mlsMediaBackoff.isPaused()) {
    summary.budgetExhausted = true;
    return summary;
  }
  const cursor = await claimMlsMediaQueueCursor(options.originatingSystemName);
  if (!cursor) return summary;
  summary.acquired = true;

  let failure: string | undefined;
  try {
    summary.deadEntries = await clearDeadMlsMediaQueueEntries();
    await refreshConfiguredEntities('offices', options.officeKeys, summary);
    await refreshConfiguredEntities('members', options.memberKeys, summary);

    summary.pendingFreshUrls = await countPendingFreshMediaUrls();
    if (isMlsMediaBudgetExhausted(mlsQuotaTracker.snapshot())) {
      summary.budgetExhausted = true;
    } else if (summary.pendingFreshUrls >= MLS_MEDIA_QUEUE_DEFAULTS.maxPendingFreshUrls) {
      summary.skippedForBacklog = true;
    } else {
      await refreshActiveListingChunk(cursor.token, cursor.resumeFrom, summary);
    }
  } catch (error) {
    if (error instanceof MlsQuotaExceededError) {
      summary.budgetExhausted = true;
    } else {
      failure = error instanceof Error ? error.message : String(error);
      summary.error = failure;
      queueLogger.warn('MLS media queue refresh paused with an error', { error: failure });
    }
  } finally {
    await finishMlsMediaQueueCursor(cursor.token, failure);
  }

  return summary;
}
