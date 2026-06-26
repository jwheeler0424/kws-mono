
import type { ErrorDetail, ODataPageBatch, SyncResult } from '@/types';

import { logger } from '@/lib/logger';

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

  let activeStartUrl = startUrl
  let activeBeforeTimestamp = beforeTimestamp
  let activeAfterTimestamp = afterTimestamp

  logger.info('seed started', { resource, osn })

  try {
    let page = 0

    while (true) {
      for await (const pageBatch of config.fetchFn(osn, {
        afterTimestamp: activeAfterTimestamp,
        beforeTimestamp: activeBeforeTimestamp,
        startUrl: activeStartUrl,
      })) {
        try {
          const batch = pageBatch.value
          await config.upsert(batch)
          page++

          upserted += batch.length

          logger.trace('seed page advanced', {
            resource,
            osn,
            page,
            upserted,
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