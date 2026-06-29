import { writeFile } from 'node:fs/promises';

import { env } from '@kws/config';

import { runFullSeed } from '@/actions/orchestrator';
import { logger } from '@/lib/logger';


export async function initialSeed() {
  try {
    const summary = await runFullSeed(env.MLS_ORIGINATING_SYSTEM_NAME)

    logger.info('MLS full seed summary', {
      osn: summary.osn,
      mode: summary.mode,
      totalDurationMs: summary.totalDurationMs,
      startedAt: summary.startedAt.toISOString(),
      completedAt: summary.completedAt.toISOString(),
    })

    for (const r of summary.results) {
      logger.info('MLS full seed resource result', {
        resource: r.resource,
        upserted: r.upserted,
        errors: r.errors,
        durationMs: r.durationMs,
        error: r.error,
      })
    }

    const quotaErrors = summary.results.filter((r) =>
      (r.error ?? '').includes('MLS API quota exceeded'),
    )
    if (quotaErrors.length > 0) {
      logger.warn('MLS API quota exhausted during full seed', {
        resources: quotaErrors.map((r) => r.resource),
      })
      for (const r of quotaErrors) {
        logger.warn('MLS quota error detail', {
          resource: r.resource,
          error: r.error,
        })
      }
      logger.warn('wait for reset and rerun seed', {
        note: 'Quota usage is persisted across CLI runs.',
      })
    }

    // Print per-record error details for any resource that had failures
    for (const r of summary.results) {
      if (r.errorDetails && r.errorDetails.length > 0) {
        logger.error('MLS resource error details', {
          resource: r.resource,
          count: r.errorDetails.length,
        })
        for (const e of r.errorDetails) {
          logger.error('MLS record error detail', {
            resource: r.resource,
            key: e.key,
            message: e.message,
            stack: e.stack,
          })
        }
      }
    }

    // Write full error details to a file for post-run analysis
    const allErrors = summary.results.flatMap((r) =>
      (r.errorDetails ?? []).map((e) => Object.assign({ resource: r.resource }, e)),
    )
    if (allErrors.length > 0) {
      await writeFile('mls-seed-errors.json', JSON.stringify(allErrors, null, 2))
      logger.warn('MLS seed errors written to file', {
        count: allErrors.length,
        file: 'mls-seed-errors.json',
      })
    }

    const hasErrors = summary.results.some((r) => r.errors > 0 || r.error)
    return hasErrors ? false : true
  } catch (error) {
    logger.fatal('MLS full seed action crashed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false;
  }

}