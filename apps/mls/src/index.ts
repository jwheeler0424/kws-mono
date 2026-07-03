import { main } from '@/app';
import { benchmarkDeltaSync } from '@/app/benchmark';
import {
  historyCompactFromCli,
  historyQuarantineSummaryFromCli,
  historyRecoverFromCli,
  historyStorageReportFromCli,
  historyVerifyFromCli,
} from '@/app/history-maintenance';
import { logger } from '@/lib/logger';

async function run() {
  const [, , command, ...args] = process.argv;

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

process.on('SIGINT', () => {
  logger.info('Ctrl-C was pressed');
  process.exit();
});
