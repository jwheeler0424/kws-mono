// ---------------------------------------------------------------------------
// Generic sync resource loop
// ---------------------------------------------------------------------------
// Drives one full pass over a single MLS Grid resource:
//   1. Read latest DB modificationTimestamp watermark for the resource
//   2. Page through results via the async generator using afterTimestamp filter
//   3. Upsert each page
//   4. Return aggregate run metrics
// ---------------------------------------------------------------------------

import type { MlsResource } from '@/types';

import { MLS_SYNC_DEFAULTS } from '@/lib/constants';
import { persistHistoryPage, quarantineInvalidTimestampRecords } from '@/lib/history-store';
import { logger } from '@/lib/logger';

import type { ErrorDetail, ODataPageBatch, SyncResult } from '../types';

// ---------------------------------------------------------------------------
// Configuration contract
// ---------------------------------------------------------------------------

export interface SyncResourceConfig<TPayload extends Record<string, unknown>> {
  /** MLS Grid resource name */
  resource: MlsResource;
  osn: string;
  /** Async generator that pages through the resource */
  fetchFn: (
    osn: string,
    options?: {
      afterTimestamp?: Date;
      beforeTimestamp?: Date;
      startUrl?: string;
    },
  ) => AsyncGenerator<ODataPageBatch<TPayload>>;
  /** DB high-watermark for this resource */
  getLatestTimestamp: () => Promise<Date | string | null | undefined>;
  /** Extract the source modification timestamp from payload records */
  getTimestamp: (record: TPayload) => string | undefined;
  /** Upsert a visible record */
  upsert: (records: TPayload[]) => Promise<Date>;
}

function normalizeTimestamp(input: Date | string | null | undefined): Date | undefined {
  if (!input) {
    return undefined;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

// ---------------------------------------------------------------------------
// syncResource
// ---------------------------------------------------------------------------

export async function syncResource<TPayload extends Record<string, unknown>>(
  config: SyncResourceConfig<TPayload>,
): Promise<SyncResult> {
  const { resource, osn, getTimestamp } = config;
  const startedAt = Date.now();

  let upserted = 0;
  let errors = 0;
  let quarantined = 0;
  const errorDetails: ErrorDetail[] = [];

  logger.info('sync started', { resource, osn });

  const dbWatermark = normalizeTimestamp(await config.getLatestTimestamp());
  let activeAfterTimestamp = dbWatermark;

  const overlapMs = Math.max(MLS_SYNC_DEFAULTS.deltaOverlapMs, MLS_SYNC_DEFAULTS.minDeltaOverlapMs);
  const precisionSafetyMs = MLS_SYNC_DEFAULTS.timestampPrecisionSafetyMs;

  if (activeAfterTimestamp && overlapMs + precisionSafetyMs > 0) {
    activeAfterTimestamp = new Date(activeAfterTimestamp.getTime() - overlapMs - precisionSafetyMs);
  }

  logger.info('delta sync', {
    resource,
    osn,
    ...(activeAfterTimestamp ? { afterTimestamp: activeAfterTimestamp.toISOString() } : {}),
  });

  try {
    let page = 0;

    for await (const pageBatch of config.fetchFn(osn, {
      afterTimestamp: activeAfterTimestamp,
    })) {
      const pageSanitized = await quarantineInvalidTimestampRecords({
        resource,
        records: pageBatch.value,
        getTimestamp,
        context: {
          phase: 'delta-sync',
          osn,
          page: page + 1,
          requestUrl: pageBatch.requestUrl,
        },
      });
      quarantined += pageSanitized.summary.quarantinedCount;

      const batch = pageSanitized.validRecords;
      if (batch.length === 0) {
        logger.warn('sync page skipped after timestamp quarantine', {
          resource,
          osn,
          page: page + 1,
          requestUrl: pageBatch.requestUrl,
          quarantinedInPage: pageSanitized.summary.quarantinedCount,
        });
        continue;
      }

      await persistHistoryPage({
        resource,
        records: batch,
        getTimestamp,
      });

      await config.upsert(batch);
      page++;

      upserted += batch.length;

      logger.trace('sync page complete', {
        resource,
        osn,
        page,
        upserted: batch.length,
        quarantined,
        requestUrl: pageBatch.requestUrl,
        nextUrl: pageBatch.nextUrl,
      });

      logger.info('resource batch complete', {
        resource,
        osn,
        page,
        recordCount: batch.length,
        quarantined,
      });
    }

    if (errors > 0) {
      const message = `sync finished with ${errors} record error${errors === 1 ? '' : 's'}`;
      logger.warn('sync finished with record errors', {
        resource,
        osn,
        errors,
      });

      return {
        resource,
        osn,
        upserted,
        errors,
        durationMs: Date.now() - startedAt,
        error: `${message}; quarantined=${quarantined}`,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    }

    logger.info('sync complete', { resource, osn });

    return {
      resource,
      osn,
      upserted,
      errors,
      durationMs: Date.now() - startedAt,
      error: quarantined > 0 ? `quarantined=${quarantined}` : undefined,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error('sync failed', { resource, osn, message });

    return {
      resource,
      osn,
      upserted,
      errors: errors + 1,
      durationMs: Date.now() - startedAt,
      error: message,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    };
  }
}

/* oxlint-enable no-await-in-loop */
