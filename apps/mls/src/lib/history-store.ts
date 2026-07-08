import { env } from '@kws/config';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

import type { MlsResource } from '@/types';

import { MLS_HISTORY_DEFAULTS } from './constants';
import { logger } from './logger';

const HISTORY_ROOT = path.resolve(process.cwd(), MLS_HISTORY_DEFAULTS.storePath);
const HISTORY_LOCK_FILE = path.join(HISTORY_ROOT, '.history-writer.lock');
const HISTORY_QUARANTINE_ROOT = path.join(HISTORY_ROOT, '.quarantine');
const HISTORY_QUARANTINE_RECORDS_ROOT = path.join(HISTORY_QUARANTINE_ROOT, 'records');
const LOCK_RETRY_DELAY_MS = 200;
const HISTORY_MANIFEST_FILE = 'manifest.json';

interface HistoryChunkManifestEntry {
  file: string;
  checksumSha256: string;
  recordCount: number;
  firstTimestamp?: string;
  lastTimestamp?: string;
  createdAt: string;
}

interface HistoryPartitionManifest {
  version: 1;
  resource: MlsResource;
  year: string;
  month: string;
  updatedAt: string;
  chunks: HistoryChunkManifestEntry[];
}

function lockTimeoutMs(): number {
  return MLS_HISTORY_DEFAULTS.lockTimeoutMs;
}

function lockStaleMs(): number {
  return MLS_HISTORY_DEFAULTS.lockStaleMs;
}

function compactMaxBytes(): number {
  return MLS_HISTORY_DEFAULTS.compactMaxBytes;
}

function quarantineAlertThreshold(): number {
  return MLS_HISTORY_DEFAULTS.quarantineAlertThreshold;
}

function isChecksumVerificationEnabled(): boolean {
  return MLS_HISTORY_DEFAULTS.verifyChecksumEnabled;
}

function isQuarantineEnabled(): boolean {
  return MLS_HISTORY_DEFAULTS.quarantineEnabled;
}

function isHistoryEnabled(): boolean {
  return MLS_HISTORY_DEFAULTS.storeEnabled;
}

function normalizeTimestamp(input: Date | string | undefined | null): Date | undefined {
  if (!input) {
    return undefined;
  }

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? undefined : input;
  }

  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toUtcPartition(timestamp: Date): { year: string; month: string } {
  const year = String(timestamp.getUTCFullYear());
  const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
  return { year, month };
}

function buildChunkName(resource: MlsResource): string {
  const now = new Date();
  const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const rand = Math.random().toString(36).slice(2, 10);
  return `${resource.toLowerCase()}-${stamp}-${rand}.jsonl.gz`;
}

async function listFilesRecursive(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry): Promise<string[]> => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          return listFilesRecursive(fullPath);
        }

        if (entry.isFile()) {
          return [fullPath];
        }

        return [];
      }),
    );

    return nested.flat();
  } catch {
    return [];
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireHistoryWriterLock(): Promise<() => Promise<void>> {
  const timeoutAt = Date.now() + lockTimeoutMs();

  while (Date.now() <= timeoutAt) {
    try {
      await mkdir(HISTORY_ROOT, { recursive: true });
      const lockPayload = JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() });
      await writeFile(HISTORY_LOCK_FILE, lockPayload, { flag: 'wx' });

      return async () => {
        await rm(HISTORY_LOCK_FILE, { force: true });
      };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException | undefined)?.code;
      if (code !== 'EEXIST') {
        throw err;
      }

      try {
        const lockStat = await stat(HISTORY_LOCK_FILE);
        const lockAgeMs = Date.now() - lockStat.mtimeMs;
        if (lockAgeMs > lockStaleMs()) {
          await rm(HISTORY_LOCK_FILE, { force: true });
          continue;
        }
      } catch {
        continue;
      }

      await sleep(LOCK_RETRY_DELAY_MS);
    }
  }

  throw new Error('Timed out waiting for MLS history writer lock');
}

async function withHistoryWriterLock<T>(fn: () => Promise<T>): Promise<T> {
  const release = await acquireHistoryWriterLock();
  try {
    return await fn();
  } finally {
    await release();
  }
}

function normalizeJsonlContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) {
    return '';
  }

  return `${trimmed}\n`;
}

function isReplayFile(filePath: string): boolean {
  return filePath.endsWith('.jsonl.gz');
}

function checksumSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function buildQuarantineChunkName(
  resource: MlsResource,
  prefix: string,
  extension: string,
): string {
  const now = new Date();
  const stamp = now.toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const rand = Math.random().toString(36).slice(2, 10);
  return `${resource.toLowerCase()}-${prefix}-${stamp}-${rand}.${extension}`;
}

async function sendHistoryAlert(event: string, payload: Record<string, unknown>): Promise<void> {
  if (!env.ALERT_WEBHOOK_URL) {
    return;
  }

  try {
    const response = await fetch(env.ALERT_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(env.ALERT_WEBHOOK_SECRET ? { 'x-alert-secret': env.ALERT_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify({
        service: env.ALERT_SERVICE_NAME ?? 'mls-grid',
        source: 'apps/mls/history-store',
        event,
        occurredAt: new Date().toISOString(),
        payload,
      }),
      signal: AbortSignal.timeout(env.ALERT_WEBHOOK_TIMEOUT_MS ?? 5000),
    });

    if (!response.ok) {
      logger.warn('history alert webhook failed', {
        event,
        status: response.status,
      });
    }
  } catch (err) {
    logger.warn('history alert webhook error', {
      event,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

function toIsoMaybe(date: Date | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}

function parsePartitionFromDirectory(partitionDir: string):
  | {
      resource: MlsResource;
      year: string;
      month: string;
    }
  | undefined {
  const relative = path.relative(HISTORY_ROOT, partitionDir);
  if (!relative || relative.startsWith('..')) {
    return undefined;
  }

  const parts = relative.split(path.sep).filter((item) => item.length > 0);
  if (parts.length < 3) {
    return undefined;
  }

  const [resource, year, month] = parts;
  if (!resource || resource.startsWith('.')) {
    return undefined;
  }

  return {
    resource: resource as MlsResource,
    year: year ?? 'unknown',
    month: month ?? '00',
  };
}

function manifestPath(partitionDir: string): string {
  return path.join(partitionDir, HISTORY_MANIFEST_FILE);
}

function compareManifestChunks(a: HistoryChunkManifestEntry, b: HistoryChunkManifestEntry): number {
  return a.file.localeCompare(b.file);
}

function mergeTimestampWindow(
  existingIso: string | undefined,
  incomingIso: string | undefined,
  mode: 'min' | 'max',
): string | undefined {
  if (!existingIso) {
    return incomingIso;
  }

  if (!incomingIso) {
    return existingIso;
  }

  if (mode === 'min') {
    return existingIso <= incomingIso ? existingIso : incomingIso;
  }

  return existingIso >= incomingIso ? existingIso : incomingIso;
}

function computeTimestampWindow<T extends Record<string, unknown>>(
  records: T[],
  getTimestamp: (record: T) => string | undefined,
): {
  firstTimestamp?: string;
  lastTimestamp?: string;
} {
  let first: Date | undefined;
  let last: Date | undefined;

  for (const record of records) {
    const parsed = normalizeTimestamp(getTimestamp(record));
    if (!parsed) {
      continue;
    }

    if (!first || parsed < first) {
      first = parsed;
    }
    if (!last || parsed > last) {
      last = parsed;
    }
  }

  return {
    firstTimestamp: toIsoMaybe(first),
    lastTimestamp: toIsoMaybe(last),
  };
}

async function readPartitionManifest(
  partitionDir: string,
): Promise<HistoryPartitionManifest | undefined> {
  const file = manifestPath(partitionDir);
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as HistoryPartitionManifest;
    if (!Array.isArray(parsed.chunks)) {
      return undefined;
    }

    return {
      ...parsed,
      chunks: parsed.chunks
        .filter(
          (chunk) => typeof chunk.file === 'string' && typeof chunk.checksumSha256 === 'string',
        )
        .sort(compareManifestChunks),
    };
  } catch {
    return undefined;
  }
}

async function writePartitionManifest(
  partitionDir: string,
  manifest: HistoryPartitionManifest,
): Promise<void> {
  const file = manifestPath(partitionDir);
  const tempFile = `${file}.tmp`;
  const payload = JSON.stringify(
    {
      ...manifest,
      chunks: [...manifest.chunks].sort(compareManifestChunks),
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );

  await writeFile(tempFile, payload, 'utf8');
  await rename(tempFile, file);
}

async function readChunkPayload<T extends Record<string, unknown>>(
  filePath: string,
): Promise<{
  records: T[];
  normalizedJsonl: string;
  checksum: string;
}> {
  const compressed = await readFile(filePath);
  const decoded = gunzipSync(compressed).toString('utf8');
  const normalizedJsonl = normalizeJsonlContent(decoded);
  if (!normalizedJsonl) {
    throw new Error('Chunk has no records');
  }

  const lines = normalizedJsonl.split('\n').filter((line) => line.trim().length > 0);
  const records = lines.map((line) => JSON.parse(line) as T);

  return {
    records,
    normalizedJsonl,
    checksum: checksumSha256(normalizedJsonl),
  };
}

async function quarantineHistoryFile(
  filePath: string,
  reason: string,
  message?: string,
): Promise<void> {
  if (!isQuarantineEnabled()) {
    await rm(filePath, { force: true });
    return;
  }

  const relative = path.relative(HISTORY_ROOT, filePath);
  const safeRelative = relative.startsWith('..') ? path.basename(filePath) : relative;
  const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
  const destination = path.join(HISTORY_QUARANTINE_ROOT, `${safeRelative}.${stamp}`);

  await mkdir(path.dirname(destination), { recursive: true });
  await rename(filePath, destination);
  await writeFile(
    `${destination}.meta.json`,
    JSON.stringify(
      {
        reason,
        message,
        quarantinedAt: new Date().toISOString(),
        originalPath: filePath,
      },
      null,
      2,
    ),
    'utf8',
  );

  logger.warn('history file quarantined', {
    reason,
    filePath,
    destination,
    message,
  });

  await sendHistoryAlert('history_file_quarantined', {
    reason,
    filePath,
    destination,
    message,
  });
}

interface TimestampQuarantineItem<T extends Record<string, unknown>> {
  record: T;
  reason: 'missing-modificationTimestamp' | 'invalid-modificationTimestamp';
  timestampRaw?: string;
}

export interface TimestampQuarantineSummary {
  checkedCount: number;
  quarantinedCount: number;
  validCount: number;
  quarantineFile?: string;
}

export async function quarantineInvalidTimestampRecords<T extends Record<string, unknown>>(params: {
  resource: MlsResource;
  records: T[];
  getTimestamp: (record: T) => string | undefined;
  context: {
    phase: string;
    osn?: string;
    page?: number;
    requestUrl?: string;
  };
}): Promise<{ validRecords: T[]; summary: TimestampQuarantineSummary }> {
  const { resource, records, getTimestamp, context } = params;
  const invalid: Array<TimestampQuarantineItem<T>> = [];
  const validRecords: T[] = [];

  for (const record of records) {
    const raw = getTimestamp(record);
    if (!raw) {
      invalid.push({
        record,
        reason: 'missing-modificationTimestamp',
      });
      continue;
    }

    const parsed = normalizeTimestamp(raw);
    if (!parsed) {
      invalid.push({
        record,
        reason: 'invalid-modificationTimestamp',
        timestampRaw: raw,
      });
      continue;
    }

    validRecords.push(record);
  }

  if (invalid.length === 0) {
    return {
      validRecords,
      summary: {
        checkedCount: records.length,
        validCount: validRecords.length,
        quarantinedCount: 0,
      },
    };
  }

  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dir = path.join(HISTORY_QUARANTINE_RECORDS_ROOT, resource, year, month);
  await mkdir(dir, { recursive: true });

  const fileName = buildQuarantineChunkName(resource, 'invalid-timestamps', 'jsonl');
  const finalPath = path.join(dir, fileName);
  const tempPath = `${finalPath}.tmp`;

  const payload = `${invalid
    .map((item) =>
      JSON.stringify({
        quarantinedAt: now.toISOString(),
        resource,
        ...context,
        reason: item.reason,
        modificationTimestamp: item.timestampRaw,
        record: item.record,
      }),
    )
    .join('\n')}\n`;

  await writeFile(tempPath, payload, 'utf8');
  await rename(tempPath, finalPath);

  logger.warn('records quarantined for invalid modificationTimestamp', {
    resource,
    quarantinedCount: invalid.length,
    validCount: validRecords.length,
    quarantineFile: finalPath,
    ...context,
  });

  if (invalid.length >= quarantineAlertThreshold()) {
    await sendHistoryAlert('invalid_modification_timestamp_records', {
      resource,
      quarantinedCount: invalid.length,
      validCount: validRecords.length,
      quarantineFile: finalPath,
      ...context,
    });
  }

  return {
    validRecords,
    summary: {
      checkedCount: records.length,
      quarantinedCount: invalid.length,
      validCount: validRecords.length,
      quarantineFile: finalPath,
    },
  };
}

async function upsertManifestChunk(
  partitionDir: string,
  partition: { resource: MlsResource; year: string; month: string },
  chunk: HistoryChunkManifestEntry,
): Promise<void> {
  const current = await readPartitionManifest(partitionDir);
  const chunks = (current?.chunks ?? []).filter((entry) => entry.file !== chunk.file);
  chunks.push(chunk);

  await writePartitionManifest(partitionDir, {
    version: 1,
    resource: partition.resource,
    year: partition.year,
    month: partition.month,
    updatedAt: new Date().toISOString(),
    chunks,
  });
}

async function removeManifestChunk(partitionDir: string, chunkFile: string): Promise<void> {
  const current = await readPartitionManifest(partitionDir);
  if (!current) {
    return;
  }

  const nextChunks = current.chunks.filter((entry) => entry.file !== chunkFile);
  if (nextChunks.length === current.chunks.length) {
    return;
  }

  await writePartitionManifest(partitionDir, {
    ...current,
    chunks: nextChunks,
  });
}

async function recoverPartitionManifest(partitionDir: string): Promise<{
  manifest: HistoryPartitionManifest | undefined;
  quarantinedFiles: number;
  recoveredTempFiles: number;
}> {
  const partition = parsePartitionFromDirectory(partitionDir);
  if (!partition) {
    return {
      manifest: undefined,
      quarantinedFiles: 0,
      recoveredTempFiles: 0,
    };
  }

  let quarantinedFiles = 0;
  let recoveredTempFiles = 0;

  const entries = await readdir(partitionDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.tmp')) {
      continue;
    }

    const tempPath = path.join(partitionDir, entry.name);
    await quarantineHistoryFile(tempPath, 'stale-temp-file', 'Recovered stale temporary file');
    recoveredTempFiles++;
  }

  const files = await readdir(partitionDir, { withFileTypes: true }).catch(() => []);
  const replayFiles = files
    .filter((entry) => entry.isFile() && isReplayFile(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const current = await readPartitionManifest(partitionDir);
  const manifestEntries = new Map((current?.chunks ?? []).map((entry) => [entry.file, entry]));
  const nextChunks: HistoryChunkManifestEntry[] = [];

  for (const fileName of replayFiles) {
    const existing = manifestEntries.get(fileName);
    if (existing) {
      nextChunks.push(existing);
      continue;
    }

    const fullPath = path.join(partitionDir, fileName);
    try {
      const payload = await readChunkPayload(fullPath);
      nextChunks.push({
        file: fileName,
        checksumSha256: payload.checksum,
        recordCount: payload.records.length,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      quarantinedFiles++;
      await quarantineHistoryFile(
        fullPath,
        'manifest-recovery-invalid-chunk',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  const changed =
    !current ||
    current.chunks.length !== nextChunks.length ||
    current.chunks.some((entry, index) => entry.file !== nextChunks[index]?.file);

  if (nextChunks.length === 0) {
    return {
      manifest: undefined,
      quarantinedFiles,
      recoveredTempFiles,
    };
  }

  const manifest: HistoryPartitionManifest = {
    version: 1,
    resource: partition.resource,
    year: partition.year,
    month: partition.month,
    updatedAt: new Date().toISOString(),
    chunks: nextChunks,
  };

  if (changed) {
    await writePartitionManifest(partitionDir, manifest);
  }

  return {
    manifest,
    quarantinedFiles,
    recoveredTempFiles,
  };
}

async function listPartitionDirectories(targetRoot: string): Promise<string[]> {
  const allFiles = await listFilesRecursive(targetRoot);
  const dirs = new Set<string>();
  for (const file of allFiles) {
    if (!isReplayFile(file) && !file.endsWith('.tmp')) {
      continue;
    }

    const dir = path.dirname(file);
    const partition = parsePartitionFromDirectory(dir);
    if (!partition) {
      continue;
    }

    dirs.add(dir);
  }

  return [...dirs].sort((a, b) => a.localeCompare(b));
}

export async function persistHistoryPage<T extends Record<string, unknown>>(params: {
  resource: MlsResource;
  records: T[];
  getTimestamp: (record: T) => string | undefined;
}): Promise<void> {
  if (!isHistoryEnabled()) {
    return;
  }

  const { resource, records, getTimestamp } = params;
  if (records.length === 0) {
    return;
  }

  const byPartition = new Map<string, T[]>();
  for (const record of records) {
    const timestamp = normalizeTimestamp(getTimestamp(record)) ?? new Date();
    const { year, month } = toUtcPartition(timestamp);
    const key = `${year}/${month}`;
    const existing = byPartition.get(key) ?? [];
    existing.push(record);
    byPartition.set(key, existing);
  }

  await withHistoryWriterLock(async () => {
    for (const [partition, partitionRecords] of byPartition.entries()) {
      const [year, month] = partition.split('/');
      const dir = path.join(HISTORY_ROOT, resource, year ?? 'unknown', month ?? '00');
      await mkdir(dir, { recursive: true });

      const chunkFile = buildChunkName(resource);
      const finalPath = path.join(dir, chunkFile);
      const tempPath = `${finalPath}.tmp`;

      const jsonl = `${partitionRecords.map((record) => JSON.stringify(record)).join('\n')}\n`;
      const checksum = checksumSha256(jsonl);
      const { firstTimestamp, lastTimestamp } = computeTimestampWindow(
        partitionRecords,
        getTimestamp,
      );
      const compressed = gzipSync(Buffer.from(jsonl, 'utf8'));

      await writeFile(tempPath, compressed);
      await rename(tempPath, finalPath);

      const partitionMeta = {
        resource,
        year: year ?? 'unknown',
        month: month ?? '00',
      };

      await upsertManifestChunk(dir, partitionMeta, {
        file: chunkFile,
        checksumSha256: checksum,
        recordCount: partitionRecords.length,
        firstTimestamp,
        lastTimestamp,
        createdAt: new Date().toISOString(),
      });

      logger.trace('history chunk written', {
        resource,
        year,
        month,
        file: finalPath,
        recordCount: partitionRecords.length,
      });
    }
  });
}

export async function* replayHistoryResource<T extends Record<string, unknown>>(params: {
  resource: MlsResource;
  batchSize?: number;
  afterTimestamp?: Date;
  getTimestamp?: (record: T) => string | undefined;
}): AsyncGenerator<T[]> {
  if (!isHistoryEnabled()) {
    return;
  }

  const { resource } = params;
  const batchSize = params.batchSize ?? MLS_HISTORY_DEFAULTS.replayBatchSize;
  const afterTimestamp = params.afterTimestamp;
  const getTimestamp = params.getTimestamp;
  const resourceDir = path.join(HISTORY_ROOT, resource);

  const partitionDirs = await listPartitionDirectories(resourceDir);

  let batch: T[] = [];

  for (const partitionDir of partitionDirs) {
    const recovered = await recoverPartitionManifest(partitionDir);
    const manifest = recovered.manifest;
    if (!manifest || manifest.chunks.length === 0) {
      continue;
    }

    for (const chunk of manifest.chunks) {
      const chunkLastTimestamp = normalizeTimestamp(chunk.lastTimestamp);
      if (afterTimestamp && chunkLastTimestamp && chunkLastTimestamp <= afterTimestamp) {
        continue;
      }

      const file = path.join(partitionDir, chunk.file);
      try {
        const payload = await readChunkPayload<T>(file);
        if (isChecksumVerificationEnabled() && payload.checksum !== chunk.checksumSha256) {
          throw new Error(
            `Checksum mismatch. expected=${chunk.checksumSha256} actual=${payload.checksum}`,
          );
        }

        const candidateRecords =
          afterTimestamp && getTimestamp
            ? payload.records.filter((record) => {
                const recordTimestamp = normalizeTimestamp(getTimestamp(record));
                return Boolean(recordTimestamp && recordTimestamp > afterTimestamp);
              })
            : payload.records;

        for (const record of candidateRecords) {
          batch.push(record);

          if (batch.length >= batchSize) {
            yield batch;
            batch = [];
          }
        }
      } catch (err) {
        logger.error('history chunk replay failed', {
          resource,
          file,
          message: err instanceof Error ? err.message : String(err),
        });

        await quarantineHistoryFile(
          file,
          'replay-invalid-chunk',
          err instanceof Error ? err.message : String(err),
        );
        await removeManifestChunk(partitionDir, chunk.file);
      }
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

export interface HistoryVerificationSummary {
  checkedFiles: number;
  corruptedFiles: string[];
  quarantinedFiles: number;
}

export async function verifyHistoryStore(
  resource?: MlsResource,
): Promise<HistoryVerificationSummary> {
  const targetRoot = resource ? path.join(HISTORY_ROOT, resource) : HISTORY_ROOT;
  const partitionDirs = await listPartitionDirectories(targetRoot);

  const corruptedFiles: string[] = [];
  let quarantinedFiles = 0;
  let checkedFiles = 0;

  for (const partitionDir of partitionDirs) {
    const recovered = await recoverPartitionManifest(partitionDir);
    quarantinedFiles += recovered.quarantinedFiles + recovered.recoveredTempFiles;
    if (!recovered.manifest) {
      continue;
    }

    for (const chunk of recovered.manifest.chunks) {
      const file = path.join(partitionDir, chunk.file);
      checkedFiles++;
      try {
        const payload = await readChunkPayload(file);
        if (isChecksumVerificationEnabled() && payload.checksum !== chunk.checksumSha256) {
          throw new Error(
            `Checksum mismatch. expected=${chunk.checksumSha256} actual=${payload.checksum}`,
          );
        }
      } catch (err) {
        corruptedFiles.push(file);
        await quarantineHistoryFile(
          file,
          'verify-invalid-chunk',
          err instanceof Error ? err.message : String(err),
        );
        await removeManifestChunk(partitionDir, chunk.file);
        quarantinedFiles++;
      }
    }
  }

  return {
    checkedFiles,
    corruptedFiles,
    quarantinedFiles,
  };
}

export interface HistoryCompactionSummary {
  compactedPartitions: number;
  compactedFiles: number;
  skippedPartitions: number;
}

export async function compactHistoryStore(
  resource?: MlsResource,
): Promise<HistoryCompactionSummary> {
  if (!isHistoryEnabled()) {
    return {
      compactedPartitions: 0,
      compactedFiles: 0,
      skippedPartitions: 0,
    };
  }

  return withHistoryWriterLock(async () => {
    const targetRoot = resource ? path.join(HISTORY_ROOT, resource) : HISTORY_ROOT;
    const partitionDirs = await listPartitionDirectories(targetRoot);

    let compactedPartitions = 0;
    let compactedFiles = 0;
    let skippedPartitions = 0;

    for (const partitionDir of partitionDirs) {
      const recovered = await recoverPartitionManifest(partitionDir);
      const manifest = recovered.manifest;
      if (!manifest || manifest.chunks.length <= 1) {
        continue;
      }

      const partitionFiles = manifest.chunks.map((chunk) => path.join(partitionDir, chunk.file));
      let totalBytes = 0;
      for (const file of partitionFiles) {
        const fileStat = await stat(file);
        totalBytes += fileStat.size;
      }

      if (totalBytes > compactMaxBytes()) {
        skippedPartitions++;
        continue;
      }

      const sortedChunks = [...manifest.chunks].sort((a, b) => a.file.localeCompare(b.file));
      const sortedFiles = sortedChunks.map((chunk) => path.join(partitionDir, chunk.file));
      const parts: string[] = [];
      for (const file of sortedFiles) {
        const payload = await readChunkPayload(file);
        const normalized = payload.normalizedJsonl;
        if (normalized.length > 0) {
          parts.push(normalized);
        }
      }

      if (parts.length === 0) {
        skippedPartitions++;
        continue;
      }

      const chunkFile = `compacted-${new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')}.jsonl.gz`;
      const finalPath = path.join(partitionDir, chunkFile);
      const tempPath = `${finalPath}.tmp`;
      const mergedJsonl = parts.join('');
      const compacted = gzipSync(Buffer.from(mergedJsonl, 'utf8'));

      await writeFile(tempPath, compacted);
      await rename(tempPath, finalPath);

      for (const file of sortedFiles) {
        await rm(file, { force: true });
      }

      const metadata = parsePartitionFromDirectory(partitionDir);
      if (metadata) {
        const firstTimestamp = sortedChunks.reduce<string | undefined>(
          (acc, chunk) => mergeTimestampWindow(acc, chunk.firstTimestamp, 'min'),
          undefined,
        );
        const lastTimestamp = sortedChunks.reduce<string | undefined>(
          (acc, chunk) => mergeTimestampWindow(acc, chunk.lastTimestamp, 'max'),
          undefined,
        );

        await writePartitionManifest(partitionDir, {
          version: 1,
          resource: metadata.resource,
          year: metadata.year,
          month: metadata.month,
          updatedAt: new Date().toISOString(),
          chunks: [
            {
              file: chunkFile,
              checksumSha256: checksumSha256(mergedJsonl),
              recordCount: sortedChunks.reduce((total, chunk) => total + chunk.recordCount, 0),
              firstTimestamp,
              lastTimestamp,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      compactedPartitions++;
      compactedFiles += sortedFiles.length;

      logger.info('history partition compacted', {
        partitionDir,
        compactedInto: finalPath,
        sourceFiles: sortedFiles.length,
      });
    }

    return {
      compactedPartitions,
      compactedFiles,
      skippedPartitions,
    };
  });
}

export interface HistoryRecoverySummary {
  recoveredPartitions: number;
  quarantinedFiles: number;
  recoveredTempFiles: number;
}

export interface HistoryQuarantineSummary {
  totalFiles: number;
  chunkFiles: number;
  recordFiles: number;
  metadataFiles: number;
  quarantinedRecords: number;
}

export interface HistoryStorageReport {
  chunkFiles: number;
  manifestFiles: number;
  quarantineChunkFiles: number;
  quarantineRecordFiles: number;
  totalBytes: number;
  resourceBreakdown: Array<{
    resource: string;
    files: number;
    bytes: number;
  }>;
}

export async function getHistoryStorageReport(): Promise<HistoryStorageReport> {
  const files = await listFilesRecursive(HISTORY_ROOT);
  const chunkFiles = files.filter((file) => file.endsWith('.jsonl.gz'));
  const manifestFiles = files.filter((file) => path.basename(file) === HISTORY_MANIFEST_FILE);
  const quarantineChunkFiles = chunkFiles.filter((file) =>
    file.includes(`${path.sep}.quarantine${path.sep}`),
  );
  const quarantineRecordFiles = files.filter(
    (file) =>
      file.includes(`${path.sep}.quarantine${path.sep}records${path.sep}`) &&
      file.endsWith('.jsonl'),
  );

  let totalBytes = 0;
  const resourceMap = new Map<string, { files: number; bytes: number }>();

  for (const file of files) {
    const fileStat = await stat(file).catch(() => undefined);
    if (!fileStat) {
      continue;
    }

    totalBytes += fileStat.size;

    const relative = path.relative(HISTORY_ROOT, file);
    const parts = relative.split(path.sep).filter((item) => item.length > 0);
    const resource = parts[0] ?? 'unknown';
    const existing = resourceMap.get(resource) ?? { files: 0, bytes: 0 };
    existing.files += 1;
    existing.bytes += fileStat.size;
    resourceMap.set(resource, existing);
  }

  return {
    chunkFiles: chunkFiles.length,
    manifestFiles: manifestFiles.length,
    quarantineChunkFiles: quarantineChunkFiles.length,
    quarantineRecordFiles: quarantineRecordFiles.length,
    totalBytes,
    resourceBreakdown: [...resourceMap.entries()]
      .map(([resource, stats]) => ({
        resource,
        files: stats.files,
        bytes: stats.bytes,
      }))
      .sort((a, b) => a.resource.localeCompare(b.resource)),
  };
}

export async function getHistoryQuarantineSummary(
  resource?: MlsResource,
): Promise<HistoryQuarantineSummary> {
  const files = await listFilesRecursive(HISTORY_QUARANTINE_ROOT);

  const scoped = files.filter((file) => {
    if (!resource) {
      return true;
    }

    const marker = `${path.sep}${resource}${path.sep}`;
    return file.includes(marker) || file.endsWith(`${path.sep}${resource}`);
  });

  let chunkFiles = 0;
  let recordFiles = 0;
  let metadataFiles = 0;
  let quarantinedRecords = 0;

  for (const file of scoped) {
    if (file.endsWith('.meta.json')) {
      metadataFiles++;
      continue;
    }

    if (file.endsWith('.jsonl')) {
      recordFiles++;
      const raw = await readFile(file, 'utf8').catch(() => '');
      if (raw) {
        quarantinedRecords += raw.split('\n').filter((line) => line.trim().length > 0).length;
      }
      continue;
    }

    if (file.endsWith('.jsonl.gz') || file.endsWith('.tmp')) {
      chunkFiles++;
    }
  }

  return {
    totalFiles: scoped.length,
    chunkFiles,
    recordFiles,
    metadataFiles,
    quarantinedRecords,
  };
}

export async function recoverHistoryStore(resource?: MlsResource): Promise<HistoryRecoverySummary> {
  if (!isHistoryEnabled()) {
    return {
      recoveredPartitions: 0,
      quarantinedFiles: 0,
      recoveredTempFiles: 0,
    };
  }

  return withHistoryWriterLock(async () => {
    const targetRoot = resource ? path.join(HISTORY_ROOT, resource) : HISTORY_ROOT;
    const partitionDirs = await listPartitionDirectories(targetRoot);

    let recoveredPartitions = 0;
    let quarantinedFiles = 0;
    let recoveredTempFiles = 0;

    for (const partitionDir of partitionDirs) {
      const result = await recoverPartitionManifest(partitionDir);
      recoveredPartitions++;
      quarantinedFiles += result.quarantinedFiles;
      recoveredTempFiles += result.recoveredTempFiles;
    }

    return {
      recoveredPartitions,
      quarantinedFiles,
      recoveredTempFiles,
    };
  });
}
