import {
  compactHistoryStore,
  getHistoryQuarantineSummary,
  getHistoryStorageReport,
  recoverHistoryStore,
  verifyHistoryStore,
} from '@/lib/history-store';
import { logger } from '@/lib/logger';
import type { MlsResource } from '@/types';

function parseResourceArg(raw?: string): MlsResource | undefined {
  if (!raw) {
    return undefined;
  }

  const normalized = raw.trim();
  if (
    normalized === 'Lookup' ||
    normalized === 'Member' ||
    normalized === 'Office' ||
    normalized === 'Property' ||
    normalized === 'OpenHouse'
  ) {
    return normalized;
  }

  throw new Error(`Invalid resource "${raw}". Expected one of Lookup|Member|Office|Property|OpenHouse.`);
}

function parseResourceFromArgs(args: string[]): MlsResource | undefined {
  const resourceArg = args.find((arg) => arg.startsWith('--resource='));
  if (!resourceArg) {
    return undefined;
  }

  const [, value] = resourceArg.split('=', 2);
  return parseResourceArg(value);
}

export async function historyVerifyFromCli(args: string[]): Promise<void> {
  const resource = parseResourceFromArgs(args);

  const summary = await verifyHistoryStore(resource);

  logger.info('history store verification complete', {
    resource,
    checkedFiles: summary.checkedFiles,
    corruptedFileCount: summary.corruptedFiles.length,
    quarantinedFiles: summary.quarantinedFiles,
  });

  if (summary.corruptedFiles.length > 0) {
    logger.warn('history store corrupted files found', {
      files: summary.corruptedFiles,
    });
    process.exit(1);
  }

  process.exit(0);
}

export async function historyRecoverFromCli(args: string[]): Promise<void> {
  const resource = parseResourceFromArgs(args);

  const summary = await recoverHistoryStore(resource);

  logger.info('history store recovery complete', {
    resource,
    recoveredPartitions: summary.recoveredPartitions,
    quarantinedFiles: summary.quarantinedFiles,
    recoveredTempFiles: summary.recoveredTempFiles,
  });

  process.exit(0);
}

export async function historyCompactFromCli(args: string[]): Promise<void> {
  const resource = parseResourceFromArgs(args);

  const summary = await compactHistoryStore(resource);

  logger.info('history store compaction complete', {
    resource,
    compactedPartitions: summary.compactedPartitions,
    compactedFiles: summary.compactedFiles,
    skippedPartitions: summary.skippedPartitions,
  });

  process.exit(0);
}

export async function historyQuarantineSummaryFromCli(args: string[]): Promise<void> {
  const resource = parseResourceFromArgs(args);
  const summary = await getHistoryQuarantineSummary(resource);

  logger.info('history quarantine summary', {
    resource,
    totalFiles: summary.totalFiles,
    chunkFiles: summary.chunkFiles,
    recordFiles: summary.recordFiles,
    metadataFiles: summary.metadataFiles,
    quarantinedRecords: summary.quarantinedRecords,
  });

  process.exit(0);
}

export async function historyStorageReportFromCli(): Promise<void> {
  const summary = await getHistoryStorageReport();

  logger.info('history storage report', {
    chunkFiles: summary.chunkFiles,
    manifestFiles: summary.manifestFiles,
    quarantineChunkFiles: summary.quarantineChunkFiles,
    quarantineRecordFiles: summary.quarantineRecordFiles,
    totalBytes: summary.totalBytes,
    resourceBreakdown: summary.resourceBreakdown,
  });

  process.exit(0);
}
