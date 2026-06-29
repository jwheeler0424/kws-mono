// ---------------------------------------------------------------------------
// Generic sync resource loop
// ---------------------------------------------------------------------------
// Drives one full pass over a single MLS Grid resource:
//   1. Read cursor → determine initial vs. delta mode
//   2. Page through results via the async generator
//   3. For each record: upsert (active) or deactivate (MlgCanView=false)
//   4. Checkpoint per-page counters + pagination URLs + max processed timestamp
//   5. On full success: mark phase='delta', commit final marker, clear URL checkpoints
//      On any record/run error: mark error and keep checkpoint for resume
// ---------------------------------------------------------------------------

import { env } from '@kws/config'

import type { ErrorDetail, ODataPageBatch, SyncResult } from '../types'

import { logger } from '@/lib/logger'
import {
  advanceCursor,
  completeCursorRun,
  failCursorRun,
  getCursor,
  startCursorRun,
} from '../repositories/cursor.repository'

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

export interface SyncResourceConfig<TPayload extends Record<string, unknown>> {
  /** MLS Grid resource name — must match mls_sync_cursors.resource */
  resource: string
  osn: string
  /** Async generator that pages through the resource */
  fetchFn: (
    osn: string,
    options?: {
      afterTimestamp?: Date
      startUrl?: string
    },
  ) => AsyncGenerator<ODataPageBatch<TPayload>>
  /** Extract the record's primary key (for logging) */
  getKey: (record: TPayload) => string
  /** Extract MlgCanView — default true when absent */
  canView: (record: TPayload) => boolean
  /** Extract the modification timestamp string for cursor advancement */
  getTimestamp: (record: TPayload) => string | undefined
  /** Upsert a visible record */
  upsert: (record: TPayload) => Promise<void>
  /** Deactivate a hidden record */
  deactivate: (key: string) => Promise<void>
}

function parseCheckpointRequestUrlHistory(raw: string | null | undefined): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
  } catch {
    return []
  }
}

function resolveResumeStartUrl(params: {
  checkpointNextUrl?: string | null
  checkpointRequestUrl?: string | null
  checkpointRequestUrlHistory: string[]
  overlapPages: number
}): string | undefined {
  const { checkpointNextUrl, checkpointRequestUrl, checkpointRequestUrlHistory, overlapPages } =
    params

  if (overlapPages <= 0) {
    return checkpointNextUrl ?? undefined
  }

  if (checkpointRequestUrlHistory.length > 0) {
    const rewindCount = Math.min(overlapPages, checkpointRequestUrlHistory.length)
    return checkpointRequestUrlHistory[checkpointRequestUrlHistory.length - rewindCount]
  }

  return checkpointRequestUrl ?? checkpointNextUrl ?? undefined
}

function isResumeUrlOutOfRangeError(err: unknown): boolean {
  const status =
    typeof (err as { status?: unknown })?.status === 'number'
      ? ((err as { status: number }).status ?? null)
      : null

  const message = err instanceof Error ? err.message : String(err)
  const body =
    typeof (err as { body?: unknown })?.body === 'string' ? (err as { body: string }).body : ''
  const haystack = `${message} ${body}`.toLowerCase()

  if (status !== null && status !== 400) {
    return false
  }

  return (
    haystack.includes('value out of range') &&
    haystack.includes('$skip') &&
    haystack.includes('replication request')
  )
}

// ---------------------------------------------------------------------------
// syncResource
// ---------------------------------------------------------------------------

export async function syncResource<TPayload extends Record<string, unknown>>(
  config: SyncResourceConfig<TPayload>,
): Promise<SyncResult> {
  const { resource, osn } = config
  const startedAt = Date.now()

  let upserted = 0
  let deactivated = 0
  let errors = 0
  let maxTimestamp: Date | null = null
  const errorDetails: ErrorDetail[] = []

  logger.info('sync started', { resource, osn })

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

  logger.debug('sync cursor loaded', {
    resource,
    osn,
    phase: cursor?.phase ?? 'initial',
    lastModifiedTimestamp: cursor?.lastModifiedTimestamp,
    lastRunStatus: cursor?.lastRunStatus,
  })

  const overlapPages = isInitial && resource === 'Property' ? 0 : 0
  const checkpointRequestUrlHistory = parseCheckpointRequestUrlHistory(
    cursor?.checkpointRecentRequestUrls,
  )

  let resumeAfterTimestamp: Date | undefined
  const resumeStartUrl = resolveResumeStartUrl({
    checkpointNextUrl: cursor?.checkpointNextUrl,
    checkpointRequestUrl: cursor?.checkpointRequestUrl,
    checkpointRequestUrlHistory,
    overlapPages,
  })

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
  let activeAfterTimestamp = activeStartUrl ? undefined : resumeAfterTimestamp

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
      try {
        for await (const pageBatch of config.fetchFn(osn, {
          afterTimestamp: activeAfterTimestamp,
          startUrl: activeStartUrl,
        })) {
          const batch = pageBatch.value
          page++
          let batchUpserted = 0
          let batchDeactivated = 0

          for (const record of batch) {
            try {
              const ts = config.getTimestamp(record)
              if (config.canView(record)) {
                await config.upsert(record)
                batchUpserted++
              } else {
                await config.deactivate(config.getKey(record))
                batchDeactivated++
              }

              // Only advance cursor timestamps from records that were processed
              // successfully to avoid skipping failed records on the next delta run.
              if (ts) {
                const d = new Date(ts)
                if (!maxTimestamp || d > maxTimestamp) maxTimestamp = d
              }
            } catch (err) {
              errors++
              let key = 'unknown'
              try {
                key = config.getKey(record)
              } catch {
                /* ignore secondary error */
              }
              const formatted = formatErrorDetail(err)
              const detail: ErrorDetail = {
                key,
                message: formatted.message,
                stack: formatted.stack,
              }
              errorDetails.push(detail)
              logger.error('record error', {
                resource,
                osn,
                key,
                message: detail.message,
                ...(formatted.meta ?? {}),
              })
            }
          }

          upserted += batchUpserted
          deactivated += batchDeactivated

          // Checkpoint page-level counts and pagination URLs for exact retry continuation.
          await advanceCursor(resource, osn, maxTimestamp?.toISOString() ?? null, batchUpserted + batchDeactivated, {
            requestUrl: pageBatch.requestUrl,
            nextUrl: pageBatch.nextUrl ?? null,
          })

          logger.trace('sync page checkpoint advanced', {
            resource,
            osn,
            page,
            upserted: batchUpserted,
            deactivated: batchDeactivated,
            maxTimestamp: maxTimestamp?.toISOString(),
            checkpointRequestUrl: pageBatch.requestUrl,
            checkpointNextUrl: pageBatch.nextUrl,
          })

          logger.info('page complete', {
            resource,
            osn,
            page,
            recordCount: batch.length,
          })
        }

        break
      } catch (err) {
        if (activeStartUrl && isResumeUrlOutOfRangeError(err)) {
          logger.warn('resume URL rejected by MLS; retrying from timestamp marker', {
            resource,
            osn,
            resumeFromUrl: activeStartUrl,
            ...(resumeAfterTimestamp ? { afterTimestamp: resumeAfterTimestamp.toISOString() } : {}),
          })
          activeStartUrl = undefined
          activeAfterTimestamp = resumeAfterTimestamp
          continue
        }

        throw err
      }
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
    logger.info('sync complete', { resource, osn })

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
    await failCursorRun(resource, osn, message)
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

/* oxlint-enable no-await-in-loop */
