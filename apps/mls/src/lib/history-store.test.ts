import { afterAll, beforeEach, describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const historyRoot = await mkdtemp(path.join(tmpdir(), 'mls-history-retention-'));

const historyStoreUrl = new URL('./history-store.ts?retention-test', import.meta.url);
const { compactHistoryStore, pruneExpiredHistory } = await import(historyStoreUrl.href);

async function writeChunk(
  directory: string,
  file: string,
  createdAt: Date,
  key: string,
  includeCreatedAt = true,
): Promise<void> {
  const content = `${JSON.stringify({ ListingKey: key, ModificationTimestamp: createdAt.toISOString() })}\n`;
  const fullPath = path.join(directory, file);
  await writeFile(fullPath, gzipSync(content));
  const manifestPath = path.join(directory, 'manifest.json');
  let chunks: Array<Record<string, unknown>> = [];
  try {
    chunks = (JSON.parse(await readFile(manifestPath, 'utf8')) as { chunks: typeof chunks }).chunks;
  } catch {
    // The first chunk creates the partition manifest.
  }
  chunks.push({
    file,
    checksumSha256: createHash('sha256').update(content).digest('hex'),
    recordCount: 1,
    firstTimestamp: createdAt.toISOString(),
    lastTimestamp: createdAt.toISOString(),
    ...(includeCreatedAt ? { createdAt: createdAt.toISOString() } : {}),
  });
  await writeFile(
    manifestPath,
    JSON.stringify({
      version: 1,
      resource: 'Property',
      year: '2024',
      month: '01',
      updatedAt: new Date().toISOString(),
      chunks,
    }),
  );
}

beforeEach(async () => {
  await rm(historyRoot, { recursive: true, force: true });
  await mkdir(historyRoot, { recursive: true });
});

afterAll(async () => {
  await rm(historyRoot, { recursive: true, force: true });
});

describe('pruneExpiredHistory', () => {
  it('expires old chunks and quarantine files while keeping newer files', async () => {
    const now = Date.now();
    const partition = path.join(historyRoot, 'Property', '2024', '01');
    const quarantine = path.join(historyRoot, '.quarantine');
    await mkdir(partition, { recursive: true });
    await mkdir(quarantine, { recursive: true });
    const oldChunk = 'old.jsonl.gz';
    const recentChunk = 'recent.jsonl.gz';
    const oldQuarantineFile = path.join(quarantine, 'old-corrupt.jsonl.gz');
    const recentQuarantineFile = path.join(quarantine, 'recent-corrupt.jsonl.gz');
    await writeChunk(partition, oldChunk, new Date(now - 366 * 24 * 60 * 60 * 1000), 'old');
    await writeChunk(partition, recentChunk, new Date(now - 100 * 24 * 60 * 60 * 1000), 'recent');
    await writeFile(oldQuarantineFile, 'old');
    await writeFile(recentQuarantineFile, 'recent');
    const oldMtime = new Date(now - 91 * 24 * 60 * 60 * 1000);
    await utimes(oldQuarantineFile, oldMtime, oldMtime);

    const summary = await pruneExpiredHistory(now, { historyRoot });

    expect(summary).toEqual({
      historyChunksDeleted: 1,
      quarantineFilesDeleted: 1,
      manifestsUpdated: 1,
    });
    expect(await Bun.file(path.join(partition, oldChunk)).exists()).toBe(false);
    expect(await Bun.file(path.join(partition, recentChunk)).exists()).toBe(true);
    expect(await Bun.file(oldQuarantineFile).exists()).toBe(false);
    expect(await Bun.file(recentQuarantineFile).exists()).toBe(true);
    const manifest = JSON.parse(await readFile(path.join(partition, 'manifest.json'), 'utf8')) as {
      chunks: Array<{ file: string }>;
    };
    expect(manifest.chunks.map((chunk) => chunk.file)).toEqual([recentChunk]);

    const compactionPartition = path.join(historyRoot, 'Member', '2024', '02');
    await mkdir(compactionPartition, { recursive: true });
    await writeChunk(
      compactionPartition,
      'old.jsonl.gz',
      new Date(now - 500 * 24 * 60 * 60 * 1000),
      'old',
    );
    await writeChunk(
      compactionPartition,
      'recent.jsonl.gz',
      new Date(now - 20 * 24 * 60 * 60 * 1000),
      'recent',
    );

    const legacyPartition = path.join(historyRoot, 'Member', '2023', '01');
    await mkdir(legacyPartition, { recursive: true });
    const legacyAge = new Date(now - 500 * 24 * 60 * 60 * 1000);
    const legacyChunkPath = path.join(legacyPartition, 'legacy.jsonl.gz');
    await writeChunk(legacyPartition, 'legacy.jsonl.gz', legacyAge, 'legacy', false);
    await writeChunk(
      legacyPartition,
      'legacy-second.jsonl.gz',
      new Date(now - 400 * 24 * 60 * 60 * 1000),
      'legacy-second',
    );
    await utimes(legacyChunkPath, legacyAge, legacyAge);

    const compaction = await compactHistoryStore('Member', { historyRoot });
    const prune = await pruneExpiredHistory(now, { historyRoot });
    const compactedManifest = JSON.parse(
      await readFile(path.join(compactionPartition, 'manifest.json'), 'utf8'),
    ) as {
      chunks: Array<{ file: string }>;
    };

    expect(compaction.compactedPartitions).toBe(2);
    expect(prune.historyChunksDeleted).toBe(1);
    expect(compactedManifest.chunks).toHaveLength(1);
    expect(
      await stat(path.join(compactionPartition, compactedManifest.chunks[0]!.file)),
    ).toBeDefined();
    expect(await Bun.file(path.join(legacyPartition, 'manifest.json')).exists()).toBe(false);
  });
});
