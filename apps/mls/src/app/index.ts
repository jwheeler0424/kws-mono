import { registerMlsSyncQueueJobTypes } from '@/actions/integration';
import { logger } from '@/lib/logger';
import { initialSeed } from './seed';


export async function main() {
  try {
    const seedSuccess = await initialSeed();
    if (!seedSuccess) {
      logger.error('MLS full seed completed with errors. Please check the logs for details.');
      process.exit(1);
    }

    registerMlsSyncQueueJobTypes();

  } catch (error) {
    logger.fatal('MLS Grid sync application crashed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }

}