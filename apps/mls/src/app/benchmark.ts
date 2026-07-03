import { env } from '@kws/config';
import { writeFile } from 'node:fs/promises';

import { runDeltaSync } from '@/actions/orchestrator';
import { logger } from '@/lib/logger';

function toMb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function memorySnapshot() {
  const m = process.memoryUsage();
  return {
    rssMb: toMb(m.rss),
    heapUsedMb: toMb(m.heapUsed),
    heapTotalMb: toMb(m.heapTotal),
    externalMb: toMb(m.external),
  };
}

function cpuSnapshot() {
  return process.cpuUsage();
}

function cpuDiff(start: NodeJS.CpuUsage, end: NodeJS.CpuUsage) {
  return {
    userMs: Math.round((end.user - start.user) / 1000),
    systemMs: Math.round((end.system - start.system) / 1000),
  };
}

export async function benchmarkDeltaSync(): Promise<void> {
  const startedAt = new Date();
  const cpuBefore = cpuSnapshot();
  const memBefore = memorySnapshot();

  const summary = await runDeltaSync(env.MLS_ORIGINATING_SYSTEM_NAME);

  const memAfter = memorySnapshot();
  const cpuAfter = cpuSnapshot();
  const completedAt = new Date();

  const totalRecords = summary.results.reduce((acc, item) => acc + item.upserted, 0);
  const durationSeconds = Math.max(1, Math.round(summary.totalDurationMs / 1000));

  const report = {
    runId: summary.runId,
    mode: summary.mode,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: summary.totalDurationMs,
    throughputRecordsPerSecond: Math.round((totalRecords / durationSeconds) * 100) / 100,
    totalRecords,
    totalErrors: summary.results.reduce((acc, item) => acc + item.errors, 0),
    stageTimingsMs: summary.stageTimingsMs,
    cpuMs: cpuDiff(cpuBefore, cpuAfter),
    memoryBefore: memBefore,
    memoryAfter: memAfter,
    resources: summary.results.map((item) => ({
      resource: item.resource,
      upserted: item.upserted,
      errors: item.errors,
      durationMs: item.durationMs,
      error: item.error,
    })),
  };

  const file = `mls-benchmark-${summary.runId ?? Date.now()}.json`;
  await writeFile(file, JSON.stringify(report, null, 2));

  logger.info('MLS benchmark completed', {
    file,
    runId: summary.runId,
    durationMs: summary.totalDurationMs,
    totalRecords,
    throughputRecordsPerSecond: report.throughputRecordsPerSecond,
    cpuMs: report.cpuMs,
    memoryBefore: memBefore,
    memoryAfter: memAfter,
  });

  const hasErrors = summary.results.some((item) => item.errors > 0);
  process.exit(hasErrors ? 1 : 0);
}
