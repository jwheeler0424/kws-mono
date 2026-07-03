import { env } from '@kws/config';

import { registerMlsSyncJobTypes } from '@/actions/integration';
import { logger } from '@/lib/logger';
import { hasAnyMlsRecords } from '@/repositories/seed-state.repository';

import { initialDataSeed, initialMediaSeed } from './seed';

export async function main() {
  try {
    const enableInitialDataSeed = env.MLS_ROLLOUT_ENABLE_INITIAL_DATA_SEED ?? true;
    const enableInitialMediaSeed = env.MLS_ROLLOUT_ENABLE_INITIAL_MEDIA_SEED ?? true;
    const enableSyncJobRegistration = env.MLS_ROLLOUT_ENABLE_SYNC_JOB_REGISTRATION ?? true;
    const shouldRunInitialSeed = !(await hasAnyMlsRecords());

    if (!shouldRunInitialSeed) {
      logger.info(
        'MLS initial seed skipped because existing records were found; resuming with sync',
        {
          enableInitialDataSeed,
          enableInitialMediaSeed,
        },
      );
    }

    if (shouldRunInitialSeed && enableInitialDataSeed) {
      const dataSeedSuccess = await initialDataSeed();
      if (!dataSeedSuccess) {
        logger.error('MLS full seed completed with errors. Please check the logs for details.');
        process.exit(1);
      }
    } else if (!enableInitialDataSeed) {
      logger.warn('MLS initial data seed skipped by rollout flag');
    }

    if (shouldRunInitialSeed && enableInitialMediaSeed) {
      const mediaSeedSuccess = await initialMediaSeed();
      if (!mediaSeedSuccess) {
        logger.error(
          'MLS initial media seed completed with errors. Please check the logs for details.',
        );
        process.exit(1);
      }
    } else if (!enableInitialMediaSeed) {
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
