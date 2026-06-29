import type { ErrorDetail, ODataPageBatch, SyncResult } from '@/types';
import { env } from '@kws/config';

import { logger } from '@/lib/logger';
import { advanceCursor, completeCursorRun, failCursorRun, getCursor, startCursorRun } from '@/repositories/cursor.repository';

function formatErrorDetail(err: unknown): {
  message: string
  stack?: string
  meta?: Record<string, unknown>
} {
  if (!(err instanceof Error)) {
    return { message: String(err) }
  }

  const cause = (err as Error & { cause?: unknown }).cause
  const causeObj =
    cause && typeof cause === 'object' ? (cause as Record<string, unknown>) : undefined

  // Drizzle wraps the underlying PG error on `cause`.
  const causeMessage =
    causeObj && typeof causeObj.message === 'string' ? causeObj.message : undefined

  const meta: Record<string, unknown> = {}
  if (causeObj && typeof causeObj.code === 'string') meta.code = causeObj.code
  if (causeObj && typeof causeObj.detail === 'string') {
    meta.detail = causeObj.detail
  }
  if (causeObj && typeof causeObj.constraint === 'string') {
    meta.constraint = causeObj.constraint
  }
  if (causeObj && typeof causeObj.column === 'string') {
    meta.column = causeObj.column
  }

  return {
    message: causeMessage ?? err.message,
    stack: err.stack,
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  }
}

// ---------------------------------------------------------------------------
// Configuration contract
// ---------------------------------------------------------------------------

export interface SeedResourceConfig<TPayload extends Record<string, unknown>> {
  /** MLS Grid resource name — must match mls_sync_cursors.resource */
  resource: string
  osn: string
  afterTimestamp?: Date
  beforeTimestamp?: Date
  startUrl?: string
  /** Async generator that pages through the resource */
  fetchFn: (
    osn: string,
    options?: {
      afterTimestamp?: Date
      beforeTimestamp?: Date
      startUrl?: string
    },
  ) => AsyncGenerator<ODataPageBatch<TPayload>>
  /** Upsert a visible record */
  upsert: (records: TPayload[]) => Promise<void>
}

function toMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100
}

function getMemorySnapshot() {
  const memory = process.memoryUsage()
  return {
    rssMb: toMb(memory.rss),
    heapUsedMb: toMb(memory.heapUsed),
    heapTotalMb: toMb(memory.heapTotal),
    externalMb: toMb(memory.external),
  }
}

// ---------------------------------------------------------------------------
// seedResource
// ---------------------------------------------------------------------------

export async function seedResource<TPayload extends Record<string, unknown>>(
  config: SeedResourceConfig<TPayload>,
): Promise<SyncResult> {
  const { resource, osn, afterTimestamp, beforeTimestamp, startUrl } = config
  const startedAt = Date.now()

  let upserted = 0
  let deactivated = 0
  let errors = 0
  let maxTimestamp: Date | null = null
  const errorDetails: ErrorDetail[] = [];

  logger.info('seed started', { resource, osn })

  const runLeaseAcquired = await startCursorRun(resource, osn)
  if (!runLeaseAcquired) {
    logger.warn('sync skipped because another run is already active', {
      resource,
      osn,
    })

    return {
      resource,
      osn,
      upserted: 0,
      deactivated: 0,
      errors: 0,
      durationMs: Date.now() - startedAt,
    }
  }

  const cursor = await getCursor(resource, osn)
  const isInitial = !cursor?.lastModifiedTimestamp || cursor.phase === 'initial'

  if (!isInitial) {
    logger.info('seed complete', { resource, osn });
    return {
      resource,
      osn,
      upserted: 0,
      deactivated: 0,
      errors: 0,
      durationMs: Date.now() - startedAt,
    }
  }

  logger.debug('sync cursor loaded', {
    resource,
    osn,
    phase: cursor?.phase ?? 'initial',
    lastModifiedTimestamp: cursor?.lastModifiedTimestamp,
    lastRunStatus: cursor?.lastRunStatus,
  })

  const overlapPages = isInitial && resource === 'Property' ? 0 : 0


  let resumeAfterTimestamp: Date | undefined
  const resumeStartUrl = cursor?.checkpointNextUrl ?? startUrl

  if (cursor?.lastModifiedTimestamp) {
    // Prefer cursor marker whenever present.
    resumeAfterTimestamp = new Date(cursor.lastModifiedTimestamp)
    if (!isInitial && env.MLS_DELTA_OVERLAP_MS > 0) {
      // Delta replays a small overlap window to reduce boundary misses.
      resumeAfterTimestamp = new Date(resumeAfterTimestamp.getTime() - env.MLS_DELTA_OVERLAP_MS)
    }
  } else if (env.MLS_START_DATE) {
    // Fallback floor for first sync when no marker exists yet.
    resumeAfterTimestamp = env.MLS_START_DATE
  }

  let activeStartUrl = resumeStartUrl
  let activeBeforeTimestamp = beforeTimestamp
  let activeAfterTimestamp = afterTimestamp ?? activeStartUrl ? undefined : resumeAfterTimestamp

  logger.info(isInitial ? 'initial sync' : 'delta sync', {
    resource,
    osn,
    ...(activeStartUrl ? { resumeFromUrl: activeStartUrl } : {}),
    ...(overlapPages > 0 ? { resumeOverlapPages: overlapPages } : {}),
    ...(activeAfterTimestamp ? { afterTimestamp: activeAfterTimestamp.toISOString() } : {}),
  })

  try {
    let page = 0

    while (true) {
      for await (const pageBatch of config.fetchFn(osn, {
        afterTimestamp: activeAfterTimestamp,
        beforeTimestamp: activeBeforeTimestamp,
        startUrl: activeStartUrl,
      })) {
        try {
          const pageStartedAt = Date.now()
          const memoryBefore = getMemorySnapshot()
          const batch = pageBatch.value
          await config.upsert(batch)
          page++

          upserted += batch.length
          const memoryAfter = getMemorySnapshot()

          // Checkpoint page-level counts and pagination URLs for exact retry continuation.
          await advanceCursor(resource, osn, maxTimestamp, upserted, {
            requestUrl: pageBatch.requestUrl,
            nextUrl: pageBatch.nextUrl ?? null,
          })

          logger.trace('seed page advanced', {
            resource,
            osn,
            page,
            upserted,
            pageDurationMs: Date.now() - pageStartedAt,
            memoryBefore,
            memoryAfter,
            checkpointRequestUrl: pageBatch.requestUrl,
            checkpointNextUrl: pageBatch.nextUrl,
          })

          logger.info('page complete', {
            resource,
            osn,
            page,
            recordCount: batch.length,
          })
        } catch (err) {
          errors++
          const formatted = formatErrorDetail(err)
          const detail: ErrorDetail = {
            message: formatted.message,
            stack: formatted.stack,
          }
          errorDetails.push(detail)
          logger.error('record error', {
            resource,
            osn,
            message: detail.message,
            ...(formatted.meta ?? {}),
          })
        }
      }

      break
    }

    if (errors > 0) {
      const message = `sync finished with ${errors} record error${errors === 1 ? '' : 's'}`
      await failCursorRun(resource, osn, message)
      logger.warn('sync finished with record errors; marker not advanced', {
        resource,
        osn,
        errors,
      })

      return {
        resource,
        osn,
        upserted,
        deactivated,
        errors,
        durationMs: Date.now() - startedAt,
        error: message,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      }
    }

    await completeCursorRun(resource, osn, maxTimestamp)
    const finalTimestampIso = maxTimestamp ? (maxTimestamp as Date).toISOString() : undefined
    logger.debug('sync cursor marked complete', {
      resource,
      osn,
      finalTimestamp: finalTimestampIso,
      durationMs: Date.now() - startedAt,
    })
    logger.info('seed complete', { resource, osn })

    return {
      resource,
      osn,
      upserted,
      deactivated,
      errors,
      durationMs: Date.now() - startedAt,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('sync failed', { resource, osn, message })

    return {
      resource,
      osn,
      upserted,
      deactivated,
      errors: errors + 1,
      durationMs: Date.now() - startedAt,
      error: message,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    }
  }
}