import { registerMlsSyncJobTypes } from '@/actions/integration';
import { logger } from '@/lib/logger';
import { initialDataSeed, initialMediaSeed } from './seed';


export async function main() {
  try {
    const dataSeedSuccess = await initialDataSeed();
    if (!dataSeedSuccess) {
      logger.error('MLS full seed completed with errors. Please check the logs for details.');
      process.exit(1);
    }

    const mediaSeedSuccess = await initialMediaSeed();
    if (!mediaSeedSuccess) {
      logger.error('MLS initial media seed completed with errors. Please check the logs for details.');
      process.exit(1);
    }

    registerMlsSyncJobTypes();

  } catch (error) {
    logger.fatal('MLS Grid sync application crashed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }

}