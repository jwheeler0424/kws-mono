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
      beforeTimestamp?: Date
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
  upsert: (records: TPayload[]) => Promise<Date>
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
}): string | undefined {
  const { checkpointNextUrl, checkpointRequestUrl, checkpointRequestUrlHistory } =
    params

  if (checkpointRequestUrlHistory.length > 0) {
    const rewindCount = Math.min(0, checkpointRequestUrlHistory.length)
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
      errors: 0,
      durationMs: Date.now() - startedAt,
    }
  }

  const cursor = await getCursor(resource, osn)

  logger.debug('sync cursor loaded', {
    resource,
    osn,
    phase: cursor?.phase ?? 'initial',
    lastModifiedTimestamp: cursor?.lastModifiedTimestamp,
    lastRunStatus: cursor?.lastRunStatus,
  })

  const checkpointRequestUrlHistory = parseCheckpointRequestUrlHistory(
    cursor?.checkpointRecentRequestUrls,
  )

  let resumeAfterTimestamp: Date | undefined
  const resumeStartUrl = resolveResumeStartUrl({
    checkpointNextUrl: cursor?.checkpointNextUrl,
    checkpointRequestUrl: cursor?.checkpointRequestUrl,
    checkpointRequestUrlHistory,
  })

  if (cursor?.lastModifiedTimestamp) {
    // Prefer cursor marker whenever present.
    resumeAfterTimestamp = new Date(cursor.lastModifiedTimestamp)
  } else if (env.MLS_START_DATE) {
    // Fallback floor for first sync when no marker exists yet.
    resumeAfterTimestamp = env.MLS_START_DATE
  }

  let activeStartUrl = resumeStartUrl
  let activeAfterTimestamp = activeStartUrl ? undefined : resumeAfterTimestamp

  logger.info('delta sync', {
    resource,
    osn,
    ...(activeStartUrl ? { resumeFromUrl: activeStartUrl } : {}),
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
          maxTimestamp = await config.upsert(batch)
          page++

          upserted += batch.length

          // Checkpoint page-level counts and pagination URLs for exact retry continuation.
          await advanceCursor(resource, osn, maxTimestamp?.toISOString() ?? null, batch.length, {
            requestUrl: pageBatch.requestUrl,
            nextUrl: pageBatch.nextUrl ?? null,
          })

          logger.trace('sync page checkpoint advanced', {
            resource,
            osn,
            page,
            upserted: batch.length,
            maxTimestamp: maxTimestamp,
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
        errors,
        durationMs: Date.now() - startedAt,
        error: message,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      }
    }

    await completeCursorRun(resource, osn, maxTimestamp?.toISOString() ?? null)
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
      errors: errors + 1,
      durationMs: Date.now() - startedAt,
      error: message,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
    }
  }
}

/* oxlint-enable no-await-in-loop */
