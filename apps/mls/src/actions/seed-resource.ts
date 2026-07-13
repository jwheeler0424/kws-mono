import { env } from '@kws/config';

import type { ErrorDetail, MlsResource, ODataPageBatch, SyncResult } from '@/types';

import { MLS_SYNC_DEFAULTS } from '@/lib/constants';
import {
  persistHistoryPage,
  quarantineInvalidTimestampRecords,
  replayHistoryResource,
} from '@/lib/history-store';
import { logger } from '@/lib/logger';

function formatErrorDetail(err: unknown): {
  message: string;
  stack?: string;
  meta?: Record<string, unknown>;
} {
  if (!(err instanceof Error)) {
    return { message: String(err) };
  }

  const cause = (err as Error & { cause?: unknown }).cause;
  const causeObj =
    cause && typeof cause === 'object' ? (cause as Record<string, unknown>) : undefined;

  // Drizzle wraps the underlying PG error on `cause`.
  const causeMessage =
    causeObj && typeof causeObj.message === 'string' ? causeObj.message : undefined;

  const meta: Record<string, unknown> = {};
  if (causeObj && typeof causeObj.code === 'string') meta.code = causeObj.code;
  if (causeObj && typeof causeObj.detail === 'string') {
    meta.detail = causeObj.detail;
  }
  if (causeObj && typeof causeObj.constraint === 'string') {
    meta.constraint = causeObj.constraint;
  }
  if (causeObj && typeof causeObj.column === 'string') {
    meta.column = causeObj.column;
  }

  return {
    message: causeMessage ?? err.message,
    stack: err.stack,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
}

// ---------------------------------------------------------------------------
// Configuration contract
// ---------------------------------------------------------------------------

export interface SeedResourceConfig<TPayload extends Record<string, unknown>> {
  /** MLS Grid resource name */
  resource: MlsResource;
  osn: string;
  afterTimestamp?: Date;
  beforeTimestamp?: Date;
  startUrl?: string;
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
  /** Primary key extractor used for local replay dedupe */
  getKey: (record: TPayload) => string;
  /** Upsert a visible record */
  upsert: (records: TPayload[]) => Promise<Date>;
  /** Optional record scope filter applied to replay and API pages before upsert */
  filterRecord?: (record: TPayload) => boolean;
  /** Optional history replay batch size override for this resource */
  replayBatchSize?: number;
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

function toMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function getMemorySnapshot() {
  const memory = process.memoryUsage();
  return {
    rssMb: toMb(memory.rss),
    heapUsedMb: toMb(memory.heapUsed),
    heapTotalMb: toMb(memory.heapTotal),
    externalMb: toMb(memory.external),
  };
}

// ---------------------------------------------------------------------------
// seedResource
// ---------------------------------------------------------------------------

export async function seedResource<TPayload extends Record<string, unknown>>(
  config: SeedResourceConfig<TPayload>,
): Promise<SyncResult> {
  const {
    resource,
    osn,
    afterTimestamp,
    beforeTimestamp,
    startUrl,
    getLatestTimestamp,
    getTimestamp,
    getKey,
    filterRecord,
    replayBatchSize,
  } = config;
  const startedAt = Date.now();

  let upserted = 0;
  let errors = 0;
  let quarantined = 0;
  let maxTimestamp: Date | null = null;
  const errorDetails: ErrorDetail[] = [];

  logger.info('seed started', { resource, osn });

  let resumeAfterTimestamp: Date | undefined;
  if (env.MLS_START_DATE) {
    resumeAfterTimestamp = env.MLS_START_DATE;
  }

  const dbWatermark = normalizeTimestamp(await getLatestTimestamp());
  if (dbWatermark && (!resumeAfterTimestamp || dbWatermark > resumeAfterTimestamp)) {
    resumeAfterTimestamp = dbWatermark;
  }

  const activeStartUrl = startUrl;
  let activeBeforeTimestamp = beforeTimestamp;
  let activeAfterTimestamp = afterTimestamp ?? (activeStartUrl ? undefined : resumeAfterTimestamp);

  logger.info('initial seed', {
    resource,
    osn,
    ...(activeStartUrl ? { resumeFromUrl: activeStartUrl } : {}),
    ...(activeAfterTimestamp ? { afterTimestamp: activeAfterTimestamp.toISOString() } : {}),
  });

  try {
    let page = 0;
    let replayBatches = 0;
    let replayRecords = 0;
    let scopeFilteredOut = 0;

    const pipelinePrefetchEnabled = MLS_SYNC_DEFAULTS.seedFetchIngestOverlapEnabled;
    const pipelineQueueDepth = Math.max(1, MLS_SYNC_DEFAULTS.seedFetchIngestQueueDepth);

    // Local-first replay: only process history records newer than the current
    // replay watermark so restarts do not reprocess stale chunks.
    logger.info('history replay phase started', {
      resource,
      osn,
      ...(activeAfterTimestamp ? { afterTimestamp: activeAfterTimestamp.toISOString() } : {}),
    });

    for await (const replayBatch of replayHistoryResource<TPayload>({
      resource,
      batchSize: replayBatchSize,
      afterTimestamp: activeAfterTimestamp,
      getTimestamp,
    })) {
      const replaySanitized = await quarantineInvalidTimestampRecords({
        resource,
        records: replayBatch,
        getTimestamp,
        context: {
          phase: 'seed-replay',
          osn,
          page,
        },
      });
      quarantined += replaySanitized.summary.quarantinedCount;

      const inScopeReplay = replaySanitized.validRecords.filter((record) => {
        if (!filterRecord) {
          return true;
        }
        const keep = filterRecord(record);
        if (!keep) {
          scopeFilteredOut++;
        }
        return keep;
      });

      const deduped = inScopeReplay.filter((record) => getKey(record).length > 0);

      if (deduped.length === 0) {
        continue;
      }

      maxTimestamp = await config.upsert(deduped);

      if (!activeAfterTimestamp || maxTimestamp > activeAfterTimestamp) {
        activeAfterTimestamp = maxTimestamp;
      }

      upserted += deduped.length;
      replayRecords += deduped.length;
      replayBatches++;
      page++;

      logger.trace('history replay batch complete', {
        resource,
        osn,
        page,
        recordCount: deduped.length,
      });

      logger.info('resource batch complete', {
        resource,
        osn,
        page,
        recordCount: deduped.length,
        quarantined,
        source: 'history-replay',
      });
    }

    logger.info('history replay phase complete', {
      resource,
      osn,
      replayBatches,
      replayRecords,
      scopeFilteredOut,
      ...(activeAfterTimestamp ? { afterTimestamp: activeAfterTimestamp.toISOString() } : {}),
    });

    const processPageBatch = async (pageBatch: ODataPageBatch<TPayload>): Promise<void> => {
      try {
        const pageStartedAt = Date.now();
        const memoryBefore = getMemorySnapshot();
        const pageSanitized = await quarantineInvalidTimestampRecords({
          resource,
          records: pageBatch.value,
          getTimestamp,
          context: {
            phase: 'seed-api',
            osn,
            page: page + 1,
            requestUrl: pageBatch.requestUrl,
          },
        });
        quarantined += pageSanitized.summary.quarantinedCount;

        const batch = pageSanitized.validRecords.filter((record) => {
          if (!filterRecord) {
            return true;
          }
          const keep = filterRecord(record);
          if (!keep) {
            scopeFilteredOut++;
          }
          return keep;
        });
        if (batch.length === 0) {
          logger.warn('seed page skipped after timestamp quarantine/scope filter', {
            resource,
            osn,
            page: page + 1,
            requestUrl: pageBatch.requestUrl,
            quarantinedInPage: pageSanitized.summary.quarantinedCount,
            scopeFilteredOut,
          });
          return;
        }

        await persistHistoryPage({
          resource,
          records: batch,
          getTimestamp,
        });

        maxTimestamp = await config.upsert(batch);
        page++;

        upserted += batch.length;
        const memoryAfter = getMemorySnapshot();

        logger.trace('seed page complete', {
          resource,
          osn,
          page,
          upserted,
          quarantined,
          pageDurationMs: Date.now() - pageStartedAt,
          memoryBefore,
          memoryAfter,
          requestUrl: pageBatch.requestUrl,
          nextUrl: pageBatch.nextUrl,
        });

        logger.info('resource batch complete', {
          resource,
          osn,
          page,
          recordCount: batch.length,
          quarantined,
          pageDurationMs: Date.now() - pageStartedAt,
        });
      } catch (err) {
        errors++;
        const formatted = formatErrorDetail(err);
        const detail: ErrorDetail = {
          message: formatted.message,
          stack: formatted.stack,
        };
        errorDetails.push(detail);
        logger.error('record error', {
          resource,
          osn,
          message: detail.message,
          ...(formatted.meta ?? {}),
        });
      }
    };

    const pageGenerator = config.fetchFn(osn, {
      afterTimestamp: activeAfterTimestamp,
      beforeTimestamp: activeBeforeTimestamp,
      startUrl: activeStartUrl,
    });

    if (!pipelinePrefetchEnabled) {
      for await (const pageBatch of pageGenerator) {
        await processPageBatch(pageBatch);
      }
    } else {
      logger.info('seed fetch/ingest overlap enabled', {
        resource,
        osn,
        queueDepth: pipelineQueueDepth,
      });

      const iterator = pageGenerator[Symbol.asyncIterator]();
      const pending: Array<Promise<IteratorResult<ODataPageBatch<TPayload>>>> = [];
      let exhausted = false;

      const enqueue = () => {
        while (!exhausted && pending.length < pipelineQueueDepth) {
          pending.push(iterator.next());
        }
      };

      enqueue();

      while (pending.length > 0) {
        const current = await pending.shift()!;
        if (current.done) {
          exhausted = true;
          continue;
        }

        enqueue();
        await processPageBatch(current.value);
      }
    }

    if (errors > 0) {
      const message = `sync finished with ${errors} record error${errors === 1 ? '' : 's'}`;
      logger.warn('seed finished with record errors', {
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
        error: `${message}; quarantined=${quarantined}; scopeFilteredOut=${scopeFilteredOut}`,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      };
    }

    logger.info('seed complete', { resource, osn });

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
