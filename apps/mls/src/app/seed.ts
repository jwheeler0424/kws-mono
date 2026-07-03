import { env } from '@kws/config';
import { writeFile } from 'node:fs/promises';

import { runInitialDataSeed, runInitialMediaSeed } from '@/actions/orchestrator';
import { logger } from '@/lib/logger';

function isQuarantineOnlyMessage(message?: string): boolean {
  return typeof message === 'string' && message.startsWith('quarantined=');
}

export async function initialDataSeed() {
  try {
    const summary = await runInitialDataSeed(env.MLS_ORIGINATING_SYSTEM_NAME);

    logger.info('MLS initial data seed summary', {
      runId: summary.runId,
      osn: summary.osn,
      mode: summary.mode,
      stageTimingsMs: summary.stageTimingsMs,
      totalDurationMs: summary.totalDurationMs,
      startedAt: summary.startedAt.toISOString(),
      completedAt: summary.completedAt.toISOString(),
    });

    for (const r of summary.results) {
      logger.info('MLS initial data seed resource result', {
        resource: r.resource,
        upserted: r.upserted,
        errors: r.errors,
        durationMs: r.durationMs,
        error: r.error,
      });
    }

    const quotaErrors = summary.results.filter((r) =>
      (r.error ?? '').includes('MLS API quota exceeded'),
    );
    if (quotaErrors.length > 0) {
      logger.warn('MLS API quota exhausted during initial data seed', {
        resources: quotaErrors.map((r) => r.resource),
      });
      for (const r of quotaErrors) {
        logger.warn('MLS quota error detail', {
          resource: r.resource,
          error: r.error,
        });
      }
      logger.warn('wait for reset and rerun initial data seed', {
        note: 'Quota usage is persisted across CLI runs.',
      });
    }

    // Print per-record error details for any resource that had failures
    for (const r of summary.results) {
      if (r.errorDetails && r.errorDetails.length > 0) {
        logger.error('MLS resource error details', {
          resource: r.resource,
          count: r.errorDetails.length,
        });
        for (const e of r.errorDetails) {
          logger.error('MLS record error detail', {
            resource: r.resource,
            key: e.key,
            message: e.message,
            stack: e.stack,
          });
        }
      }
    }

    // Write full error details to a file for post-run analysis
    const allErrors = summary.results.flatMap((r) =>
      (r.errorDetails ?? []).map((e) => Object.assign({ resource: r.resource }, e)),
    );
    if (allErrors.length > 0) {
      await writeFile('mls-seed-errors.json', JSON.stringify(allErrors, null, 2));
      logger.warn('MLS seed errors written to file', {
        count: allErrors.length,
        file: 'mls-seed-errors.json',
      });
    }

    const hasErrors = summary.results.some(
      (r) => r.errors > 0 || (r.error && !isQuarantineOnlyMessage(r.error)),
    );
    return hasErrors ? false : true;
  } catch (error) {
    logger.fatal('MLS initial data seed action crashed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function initialMediaSeed() {
  try {
    const summary = await runInitialMediaSeed();

    logger.info('MLS initial media seed summary', {
      runId: summary.runId,
      osn: summary.osn,
      mode: summary.mode,
      stageTimingsMs: summary.stageTimingsMs,
      totalDurationMs: summary.totalDurationMs,
      startedAt: summary.startedAt.toISOString(),
      completedAt: summary.completedAt.toISOString(),
    });

    for (const r of summary.results) {
      logger.info('MLS initial media seed phase result', {
        resource: r.resource,
        upserted: r.upserted,
        errors: r.errors,
        durationMs: r.durationMs,
        error: r.error,
      });
    }

    const quotaErrors = summary.results.filter((r) =>
      (r.error ?? '').includes('MLS API quota exceeded'),
    );
    if (quotaErrors.length > 0) {
      logger.warn('MLS API quota exhausted during initial media seed', {
        resources: quotaErrors.map((r) => r.resource),
      });
      for (const r of quotaErrors) {
        logger.warn('MLS quota error detail', {
          resource: r.resource,
          error: r.error,
        });
      }
      logger.warn('wait for reset and rerun initial media seed', {
        note: 'Quota usage is persisted across CLI runs.',
      });
    }

    // Print per-record error details for any phase that had failures
    for (const r of summary.results) {
      if (r.errorDetails && r.errorDetails.length > 0) {
        logger.error('MLS media phase error details', {
          resource: r.resource,
          count: r.errorDetails.length,
        });
        for (const e of r.errorDetails) {
          logger.error('MLS media record error detail', {
            resource: r.resource,
            key: e.key,
            message: e.message,
            stack: e.stack,
          });
        }
      }
    }

    // Write full error details to a file for post-run analysis
    const allErrors = summary.results.flatMap((r) =>
      (r.errorDetails ?? []).map((e) => Object.assign({ resource: r.resource }, e)),
    );
    if (allErrors.length > 0) {
      await writeFile('mls-media-seed-errors.json', JSON.stringify(allErrors, null, 2));
      logger.warn('MLS media seed errors written to file', {
        count: allErrors.length,
        file: 'mls-media-seed-errors.json',
      });
    }

    const hasErrors = summary.results.some(
      (r) => r.errors > 0 || (r.error && !isQuarantineOnlyMessage(r.error)),
    );
    return hasErrors ? false : true;
  } catch (error) {
    logger.fatal('MLS initial media seed action crashed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
