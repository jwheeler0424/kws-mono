import { env } from '@kws/config';
import { writeFile } from 'node:fs/promises';

import type { SyncSummary } from '@/types';

import { registerMlsSyncJobTypes } from '@/actions/integration';
import { runDeltaSync, runInitialDataSeed, runInitialMediaSeed } from '@/actions/orchestrator';
import { logger } from '@/lib/logger';
import { hasAnyMlsRecords } from '@/repositories/seed-state.repository';

function isQuarantineOnlyMessage(message?: string): boolean {
  return typeof message === 'string' && message.startsWith('quarantined=');
}

async function reportSyncSummary(
  summary: SyncSummary,
  phaseLabel: string,
  errorFile: string,
): Promise<boolean> {
  logger.info(`MLS ${phaseLabel} summary`, {
    runId: summary.runId,
    osn: summary.osn,
    mode: summary.mode,
    stageTimingsMs: summary.stageTimingsMs,
    totalDurationMs: summary.totalDurationMs,
    startedAt: summary.startedAt.toISOString(),
    completedAt: summary.completedAt.toISOString(),
  });

  const quotaErrors = summary.results.filter((result) =>
    (result.error ?? '').includes('MLS API quota exceeded'),
  );
  if (quotaErrors.length > 0) {
    logger.warn(`MLS API quota exhausted during ${phaseLabel}`, {
      resources: quotaErrors.map((result) => result.resource),
    });
    logger.warn(`wait for reset and rerun ${phaseLabel}`, {
      note: 'Quota usage is persisted across CLI runs.',
    });
  }

  const allErrors = summary.results.flatMap((result) =>
    (result.errorDetails ?? []).map((detail) => ({ resource: result.resource, ...detail })),
  );
  if (allErrors.length > 0) {
    await writeFile(errorFile, JSON.stringify(allErrors, null, 2));
    logger.warn('MLS sync errors written to file', {
      count: allErrors.length,
      file: errorFile,
    });
  }

  return summary.results.some(
    (result) => result.errors > 0 || (result.error && !isQuarantineOnlyMessage(result.error)),
  );
}

async function runSeedStep(input: {
  run: () => Promise<SyncSummary>;
  phaseLabel: string;
  errorFile: string;
}): Promise<boolean> {
  const { run, phaseLabel, errorFile } = input;
  try {
    const summary = await run();
    const hasErrors = await reportSyncSummary(summary, phaseLabel, errorFile);
    return !hasErrors;
  } catch (error) {
    logger.fatal(`MLS ${phaseLabel} action crashed`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function main() {
  try {
    const enableInitialDataSeed = true;
    const enableInitialMediaSeed = true;
    const enableSyncJobRegistration = true;
    const hasExistingMlsRecords = await hasAnyMlsRecords();

    if (hasExistingMlsRecords) {
      logger.info(
        'MLS existing records found; startup will run delta sync from per-resource watermarks',
        {
          enableInitialDataSeed,
          enableInitialMediaSeed,
        },
      );
    }

    if (enableInitialDataSeed) {
      const dataSeedSuccess = await runSeedStep({
        run: () =>
          hasExistingMlsRecords
            ? runDeltaSync(env.MLS_ORIGINATING_SYSTEM_NAME)
            : runInitialDataSeed(env.MLS_ORIGINATING_SYSTEM_NAME),
        phaseLabel: hasExistingMlsRecords ? 'delta sync' : 'initial data seed',
        errorFile: 'mls-seed-errors.json',
      });
      if (!dataSeedSuccess) {
        logger.error('MLS data sync completed with errors. Please check the logs for details.');
        process.exit(1);
      }
    } else {
      logger.warn('MLS initial data seed skipped by rollout flag');
    }

    if (enableInitialMediaSeed) {
      const mediaSeedSuccess = await runSeedStep({
        run: runInitialMediaSeed,
        phaseLabel: 'initial media seed',
        errorFile: 'mls-media-seed-errors.json',
      });
      if (!mediaSeedSuccess) {
        logger.error(
          'MLS initial media seed completed with errors. Please check the logs for details.',
        );
        process.exit(1);
      }
    } else {
      logger.warn('MLS initial media seed skipped by rollout flag');
    }

    if (enableSyncJobRegistration) {
      registerMlsSyncJobTypes();
    } else {
      logger.warn('MLS sync job registration skipped by rollout flag');
    }
  } catch (error) {
    logger.fatal('MLS Grid sync application crashed', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}
