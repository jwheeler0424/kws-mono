import { main } from '@/app';
import { benchmarkDeltaSync } from '@/app/benchmark';
import { backfillContactsFromCli } from '@/app/contact-backfill';
import {
  historyCompactFromCli,
  historyQuarantineSummaryFromCli,
  historyRecoverFromCli,
  historyStorageReportFromCli,
  historyVerifyFromCli,
} from '@/app/history-maintenance';
import { logger } from '@/lib/logger';
import { mlsQuotaTracker } from '@/lib/utils/quota';

async function run() {
  const [, , command, ...args] = process.argv;
  if (command === 'contacts:backfill') {
    await backfillContactsFromCli(args);
    return;
  }

  if (command === 'history:verify') {
    await historyVerifyFromCli(args);
    return;
  }

  if (command === 'history:compact') {
    await historyCompactFromCli(args);
    return;
  }

  if (command === 'history:recover') {
    await historyRecoverFromCli(args);
    return;
  }

  if (command === 'history:quarantine-summary') {
    await historyQuarantineSummaryFromCli(args);
    return;
  }

  if (command === 'history:storage-report') {
    await historyStorageReportFromCli();
    return;
  }

  if (command === 'benchmark:delta') {
    await benchmarkDeltaSync();
    return;
  }

  await main();
}

run().catch((error) => {
  logger.error('An error occurred while running the MLS Grid Application:', error);
  process.exit(1);
});

let shutdownStarted = false;

async function shutdown(signal: 'SIGINT' | 'SIGTERM') {
  if (shutdownStarted) return;
  shutdownStarted = true;
  logger.info('MLS process shutting down', { signal });
  await mlsQuotaTracker.flush();
  process.exit(signal === 'SIGINT' ? 130 : 0);
}

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));
