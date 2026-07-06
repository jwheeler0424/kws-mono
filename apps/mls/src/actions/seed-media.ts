import type { UUIDv7 } from '@kws/types';

import { env } from '@kws/config';
import { processImage } from '@kws/media';
import { media, mediaVariants, mlsMedia } from '@kws/schema';
import { and, eq } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { db } from '@/lib/database';
import { mlsLogger } from '@/lib/logger';

import {
  listMlsMediaSyncCandidates,
  type MlsMediaAssociationMode,
  type MlsMediaEntityType,
  type MlsMediaSyncCandidate,
} from '../repositories/media-sync.repository';

const syncLogger = mlsLogger.child('media-sync');
const MAX_STALLED_BATCHES_PER_PHASE = 3;
const SLOW_CANDIDATE_SELECTION_WARN_MS = 10_000;
const SLOW_REPAIR_HEALTH_CHECK_WARN_MS = 10_000;

export interface MlsMediaSyncOptions {
  batchSize?: number;
  maxBatches?: number;
  processConcurrency?: number;
  /**
   * Deprecated phase-era option. In single-phase sync this is now used only
   * as a lightweight ordering hint by candidate selection.
   */
  prioritizeMemberKeys?: string[];
  /**
   * Deprecated phase-era option. In single-phase sync this is now used only
   * as a lightweight ordering hint by candidate selection.
   */
  prioritizeOfficeKeys?: string[];
  /**
   * When true, only primary photos are processed for non-prioritized
   * properties while keeping full media for prioritized properties/entities.
   */
  primaryOnlyForNonPrioritizedProperties?: boolean;
  /**
   * When true, all property media processing is restricted to primary photos.
   */
  primaryOnlyForAllProperties?: boolean;
  /**
   * When set, only candidates whose resolved entity type is one of the
   * provided values are returned.  Use to run per-entity-type media phases.
   */
  filterEntityTypes?: MlsMediaEntityType[];
  /**
   * When set, property media is restricted to listings where the list agent
   * or co-list agent matches one of the provided member keys / MLS IDs.
   */
  restrictToMemberPropertyKeys?: string[];
  /**
   * When set, member media is restricted to rows whose resourceRecordKey /
   * member MLS ID matches one of these values.
   */
  restrictToMemberEntityKeys?: string[];
  /**
   * When set, office media is restricted to rows whose resourceRecordKey /
   * office MLS ID matches one of these values.
   */
  restrictToOfficeEntityKeys?: string[];
  /**
   * Candidate eligibility mode for media association checks.
   */
  associationMode?: MlsMediaAssociationMode;
  /**
   * When true, run a linked-media repair pass that only reprocesses rows
   * whose canonical local media variants are missing on disk.
   */
  includeMissingFilesRepair?: boolean;
  /**
   * Optional batch cap for the missing-files repair pass.
   */
  repairMaxBatches?: number;
}

export interface MlsMediaSyncSummary {
  scanned: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  localSourceUsed: number;
  remoteSourceUsed: number;
  repairScanned: number;
  repairProcessed: number;
  repairSkippedHealthy: number;
  repairFailed: number;
}

interface BatchOutcome {
  processed: number;
  skipped: number;
  failed: number;
}

function sanitizeBaseFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
  if (!value) {
    return null;
  }
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function inferOriginalFilename(urlOrPath: string, fallbackKey: string): string {
  const fallback = `${sanitizeBaseFilename(fallbackKey)}.source`;

  try {
    const parsed = new URL(urlOrPath);
    const name = parsed.pathname.split('/').pop();
    return name && name.length > 0 ? name : fallback;
  } catch {
    const basename = path.basename(urlOrPath);
    return basename && basename.length > 0 ? basename : fallback;
  }
}

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    if (existsSync(path.join(current, 'turbo.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

function resolveLocalMediaBasePath(): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());

  if (env.MLS_MEDIA_STORE_PATH) {
    return path.isAbsolute(env.MLS_MEDIA_STORE_PATH)
      ? env.MLS_MEDIA_STORE_PATH
      : path.resolve(workspaceRoot, env.MLS_MEDIA_STORE_PATH);
  }

  return path.join(workspaceRoot, 'store', 'media');
}

function localBasePath(entityType: MlsMediaEntityType): string {
  return path.join(resolveLocalMediaBasePath(), 'mls', entityType);
}

function localPublicBaseUrl(entityType: MlsMediaEntityType): string {
  return `/media/mls/${entityType}`;
}

/**
 * Computes the absolute filesystem path where the full-size variant would be
 * stored for a given candidate.  This mirrors the path-construction logic in
 * the media storage package so we can check for pre-existing files before
 * hitting the network.
 */
function resolveExpectedFullPath(candidate: MlsMediaSyncCandidate): string {
  const basePath = localBasePath(candidate.entityType);
  const ns = candidate.resourceRecordKey;
  const filename = `${sanitizeBaseFilename(candidate.mediaKey)}_full.webp`;
  return path.join(basePath, ns, filename);
}

type VariantName = 'thumbnail' | 'preview' | 'full';

function resolveExpectedVariantPath(
  candidate: MlsMediaSyncCandidate,
  variantName: VariantName,
): string {
  const basePath = localBasePath(candidate.entityType);
  const ns = candidate.resourceRecordKey;
  const filename = `${sanitizeBaseFilename(candidate.mediaKey)}_${variantName}.webp`;
  return path.join(basePath, ns, filename);
}

async function areAllCanonicalVariantsPresent(candidate: MlsMediaSyncCandidate): Promise<boolean> {
  const variants: VariantName[] = ['thumbnail', 'preview', 'full'];
  const checks = variants.map((variantName) =>
    Bun.file(resolveExpectedVariantPath(candidate, variantName)).exists(),
  );
  const results = await Promise.all(checks);
  return results.every(Boolean);
}

async function resolvePipelineSource(candidate: MlsMediaSyncCandidate): Promise<{
  source: string | Blob;
  sourceOrigin: 'local' | 'remote';
}> {
  const expectedFullPath = resolveExpectedFullPath(candidate);
  const localFileExists = await Bun.file(expectedFullPath).exists();

  if (localFileExists) {
    return {
      source: expectedFullPath,
      sourceOrigin: 'local',
    };
  }

  return {
    source: await fetchMlsMediaBlob(candidate.mediaURL),
    sourceOrigin: 'remote',
  };
}

function buildPhotoLabel(candidate: MlsMediaSyncCandidate): string | null {
  const order = candidate.photoOrder;
  return typeof order === 'number' && order > 0 ? `${order}` : null;
}

function buildMediaTitle(candidate: MlsMediaSyncCandidate): string {
  const base =
    candidate.unparsedAddress ??
    candidate.entityLabel ??
    candidate.resourceRecordKey ??
    candidate.mediaKey;
  const photoLabel = buildPhotoLabel(candidate);

  if (photoLabel) {
    return `${base} • ${photoLabel}`;
  }

  return base;
}

/**
 * Downloads a MLS MediaURL with the OAuth2 access token set as User-Agent.
 * MLS Grid requires this header for all media downloads (enforced June 1 2026).
 */
async function fetchMlsMediaBlob(mediaURL: string): Promise<Blob> {
  const response = await fetch(mediaURL, {
    headers: {
      'User-Agent': env.MLS_ACCESS_KEY,
    },
  });
  if (!response.ok) {
    throw new Error(
      `MLS media download failed: ${response.status} ${response.statusText} — ${mediaURL}`,
    );
  }
  return response.blob();
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isPermanentImageProcessingError(error: unknown): boolean {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('unrecognised format') ||
    message.includes('unrecognized format') ||
    message.includes('decode failed') ||
    message.includes('unsupported image format')
  );
}

async function markMlsMediaRowAsUnprocessable(candidate: MlsMediaSyncCandidate): Promise<boolean> {
  // Unit tests may mock only db.transaction. Guard so this helper becomes a
  // no-op when update is unavailable in that environment.
  if (typeof (db as unknown as { update?: unknown }).update !== 'function') {
    return false;
  }

  const now = new Date();
  await db
    .update(mlsMedia)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(mlsMedia.mediaKey, candidate.mediaKey),
        eq(mlsMedia.resourceRecordKey, candidate.resourceRecordKey),
      ),
    );

  return true;
}

async function upsertProcessedMedia(
  candidate: MlsMediaSyncCandidate,
): Promise<{ mode: 'created' | 'updated'; sourceOrigin: 'local' | 'remote' }> {
  // ── Pre-download existence check ─────────────────────────────────────────
  // If the full-size WebP already exists on disk, use the local file as the
  // pipeline source instead of re-downloading from the MLS URL.  This keeps
  // the DB in sync without a network round-trip and is safe on repeated runs
  // (the variants are overwritten with identical content).
  const pipelineSource = await resolvePipelineSource(candidate);

  const result = await processImage({
    source: pipelineSource.source,
    filename: sanitizeBaseFilename(candidate.mediaKey),
    organizationId: candidate.resourceRecordKey,
    storage: {
      provider: 'local',
      basePath: localBasePath(candidate.entityType),
      publicBaseUrl: localPublicBaseUrl(candidate.entityType),
    },
  });

  const fullVariant = result.variants.full;
  const title = buildMediaTitle(candidate);
  const description = buildPhotoLabel(candidate) ?? candidate.imageSizeDescription ?? null;
  const originalFilename = inferOriginalFilename(candidate.mediaURL, candidate.mediaKey);

  return db.transaction(async (tx) => {
    const aspectRatioValue = Number.isFinite(result.source.aspectRatio)
      ? result.source.aspectRatio.toFixed(4)
      : null;

    const baseMediaValues = {
      filename:
        truncate(`${sanitizeBaseFilename(candidate.mediaKey)}_full.webp`, 255) ??
        `${sanitizeBaseFilename(candidate.mediaKey)}_full.webp`,
      originalFilename: truncate(originalFilename, 255) ?? originalFilename,
      mimeType: result.source.mimeType,
      fileSize: fullVariant.fileSize,
      fileExtension: result.source.fileExtension,
      storageProvider: 'local' as const,
      storagePath: fullVariant.storagePath,
      storageKey: fullVariant.storageKey,
      url: fullVariant.url,
      width: result.source.width,
      height: result.source.height,
      aspectRatio: aspectRatioValue,
      title: truncate(title, 500),
      description,
      exifData: result.source.exifData,
      deletedAt: null,
      updatedAt: new Date(),
    };

    const mediaId = candidate.mediaId && candidate.linkedMediaExists ? candidate.mediaId : null;

    let finalMediaId: UUIDv7;
    if (mediaId) {
      await tx.update(media).set(baseMediaValues).where(eq(media.id, mediaId));
      finalMediaId = mediaId;
      await tx.delete(mediaVariants).where(eq(mediaVariants.mediaId, finalMediaId));
    } else {
      const inserted = await tx.insert(media).values(baseMediaValues).returning({ id: media.id });
      finalMediaId = inserted[0]!.id;
    }

    await tx.insert(mediaVariants).values([
      {
        mediaId: finalMediaId,
        variantName: 'thumbnail',
        width: result.variants.thumbnail.width,
        height: result.variants.thumbnail.height,
        fileSize: result.variants.thumbnail.fileSize,
        url: result.variants.thumbnail.url,
        storagePath: result.variants.thumbnail.storagePath,
        storageKey: result.variants.thumbnail.storageKey,
      },
      {
        mediaId: finalMediaId,
        variantName: 'preview',
        width: result.variants.preview.width,
        height: result.variants.preview.height,
        fileSize: result.variants.preview.fileSize,
        url: result.variants.preview.url,
        storagePath: result.variants.preview.storagePath,
        storageKey: result.variants.preview.storageKey,
      },
      {
        mediaId: finalMediaId,
        variantName: 'full',
        width: result.variants.full.width,
        height: result.variants.full.height,
        fileSize: result.variants.full.fileSize,
        url: result.variants.full.url,
        storagePath: result.variants.full.storagePath,
        storageKey: result.variants.full.storageKey,
      },
    ]);

    await tx
      .update(mlsMedia)
      .set({ mediaId: finalMediaId })
      .where(
        and(
          eq(mlsMedia.mediaKey, candidate.mediaKey),
          eq(mlsMedia.resourceRecordKey, candidate.resourceRecordKey),
        ),
      );

    return {
      mode: mediaId ? 'updated' : 'created',
      sourceOrigin: pipelineSource.sourceOrigin,
    };
  });
}

export async function runMlsMediaSync(
  options: MlsMediaSyncOptions = {},
): Promise<MlsMediaSyncSummary> {
  const runStartedAt = Date.now();
  const batchSize = options.batchSize ?? 50;
  const maxBatches = options.maxBatches ?? 200;
  const processConcurrency = Math.max(1, options.processConcurrency ?? 3);
  const prioritizeMemberKeys = options.prioritizeMemberKeys ?? [];
  const prioritizeOfficeKeys = options.prioritizeOfficeKeys ?? [];
  const primaryOnlyForNonPrioritizedProperties =
    options.primaryOnlyForNonPrioritizedProperties ?? false;
  const primaryOnlyForAllProperties = options.primaryOnlyForAllProperties ?? false;
  const associationMode = options.associationMode ?? 'stale-or-unprocessed';
  const filterEntityTypes = options.filterEntityTypes;
  const restrictToMemberPropertyKeys = options.restrictToMemberPropertyKeys;
  const restrictToMemberEntityKeys = options.restrictToMemberEntityKeys;
  const restrictToOfficeEntityKeys = options.restrictToOfficeEntityKeys;
  const includeMissingFilesRepair = options.includeMissingFilesRepair ?? false;
  const repairMaxBatches = Math.max(1, options.repairMaxBatches ?? maxBatches);

  const summary: MlsMediaSyncSummary = {
    scanned: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    localSourceUsed: 0,
    remoteSourceUsed: 0,
    repairScanned: 0,
    repairProcessed: 0,
    repairSkippedHealthy: 0,
    repairFailed: 0,
  };

  const processCandidate = async (
    candidate: MlsMediaSyncCandidate,
  ): Promise<'processed' | 'skipped' | 'failed'> => {
    if (!candidate.mediaURL || !candidate.resourceRecordKey) {
      summary.skipped += 1;
      return 'skipped';
    }

    try {
      const outcome = await upsertProcessedMedia(candidate);
      summary.processed += 1;
      if (outcome.sourceOrigin === 'local') {
        summary.localSourceUsed += 1;
      } else {
        summary.remoteSourceUsed += 1;
      }
      if (outcome.mode === 'created') {
        summary.created += 1;
      } else {
        summary.updated += 1;
      }
      return 'processed';
    } catch (error) {
      const permanent = isPermanentImageProcessingError(error);
      const message = toErrorMessage(error);

      if (permanent) {
        const marked = await markMlsMediaRowAsUnprocessable(candidate).catch(() => false);
        summary.skipped += 1;
        syncLogger.warn('dropping unprocessable MLS media row from future retries', {
          mediaKey: candidate.mediaKey,
          resourceRecordKey: candidate.resourceRecordKey,
          mediaURL: candidate.mediaURL,
          entityType: candidate.entityType,
          markedDeleted: marked,
          error: message,
        });
        return 'skipped';
      }

      summary.failed += 1;
      syncLogger.warn('failed to process MLS media row', {
        mediaKey: candidate.mediaKey,
        resourceRecordKey: candidate.resourceRecordKey,
        mediaURL: candidate.mediaURL,
        entityType: candidate.entityType,
        error: message,
      });
      return 'failed';
    }
  };

  const runBatch = async (candidates: MlsMediaSyncCandidate[]): Promise<BatchOutcome> => {
    summary.scanned += candidates.length;
    const outcome: BatchOutcome = {
      processed: 0,
      skipped: 0,
      failed: 0,
    };

    if (processConcurrency === 1 || candidates.length <= 1) {
      for (const candidate of candidates) {
        const status = await processCandidate(candidate);
        outcome[status] += 1;
      }
    } else {
      let nextIndex = 0;
      const workers = Array.from({ length: Math.min(processConcurrency, candidates.length) }, () =>
        (async () => {
          while (true) {
            const index = nextIndex;
            nextIndex += 1;
            if (index >= candidates.length) {
              break;
            }
            const status = await processCandidate(candidates[index]!);
            outcome[status] += 1;
          }
        })(),
      );

      await Promise.all(workers);
    }

    return outcome;
  };

  let stalledBatches = 0;

  for (let batch = 0; batch < maxBatches; batch += 1) {
    const selectionStartedAt = Date.now();

    const candidates = await listMlsMediaSyncCandidates(batchSize, {
      prioritizeMemberKeys,
      prioritizeOfficeKeys,
      primaryOnlyForNonPrioritizedProperties,
      primaryOnlyForAllProperties,
      associationMode,
      filterEntityTypes,
      restrictToMemberPropertyKeys,
      restrictToMemberEntityKeys,
      restrictToOfficeEntityKeys,
    });
    const elapsedMsSelection = Date.now() - selectionStartedAt;

    if (elapsedMsSelection >= SLOW_CANDIDATE_SELECTION_WARN_MS) {
      syncLogger.warn('media batch candidate selection slow', {
        phase: 'main',
        batchNumber: batch + 1,
        maxBatches,
        batchSize,
        candidateCount: candidates.length,
        elapsedMsSelection,
        associationMode,
        filterEntityTypes,
        restrictToMemberPropertyKeysCount: restrictToMemberPropertyKeys?.length ?? 0,
        processConcurrency,
      });
    }

    if (candidates.length === 0) {
      break;
    }

    const batchStartedAt = Date.now();
    const outcome = await runBatch(candidates);
    syncLogger.info('media batch complete', {
      phase: 'main',
      batchNumber: batch + 1,
      maxBatches,
      candidateCount: candidates.length,
      processedInBatch: outcome.processed,
      skippedInBatch: outcome.skipped,
      failedInBatch: outcome.failed,
      scannedTotal: summary.scanned,
      processedTotal: summary.processed,
      skippedTotal: summary.skipped,
      failedTotal: summary.failed,
      elapsedMsBatch: Date.now() - batchStartedAt,
      elapsedMsRun: Date.now() - runStartedAt,
    });

    if (outcome.processed === 0 && outcome.skipped === 0 && outcome.failed > 0) {
      stalledBatches += 1;
      syncLogger.warn('mls media sync stalled on repeatedly failing candidates', {
        batchNumber: batch + 1,
        failedInBatch: outcome.failed,
        stalledBatches,
        maxStalledBatches: MAX_STALLED_BATCHES_PER_PHASE,
      });

      if (stalledBatches >= MAX_STALLED_BATCHES_PER_PHASE) {
        syncLogger.error('aborting mls media sync to prevent cpu runaway', {
          failedInBatch: outcome.failed,
          maxStalledBatches: MAX_STALLED_BATCHES_PER_PHASE,
        });
        break;
      }
    } else {
      stalledBatches = 0;
    }

    if (candidates.length < batchSize) {
      break;
    }
  }

  if (includeMissingFilesRepair) {
    let repairStalledBatches = 0;

    for (let batch = 0; batch < repairMaxBatches; batch += 1) {
      const repairSelectionStartedAt = Date.now();

      const repairCandidates = await listMlsMediaSyncCandidates(batchSize, {
        prioritizeMemberKeys,
        prioritizeOfficeKeys,
        primaryOnlyForNonPrioritizedProperties,
        primaryOnlyForAllProperties,
        associationMode: 'repair-missing-files',
        filterEntityTypes,
        restrictToMemberPropertyKeys,
        restrictToMemberEntityKeys,
        restrictToOfficeEntityKeys,
      });
      const elapsedMsRepairSelection = Date.now() - repairSelectionStartedAt;

      if (elapsedMsRepairSelection >= SLOW_CANDIDATE_SELECTION_WARN_MS) {
        syncLogger.warn('media repair candidate selection slow', {
          phase: 'repair',
          batchNumber: batch + 1,
          maxBatches: repairMaxBatches,
          batchSize,
          candidateCount: repairCandidates.length,
          elapsedMsSelection: elapsedMsRepairSelection,
          filterEntityTypes,
          restrictToMemberPropertyKeysCount: restrictToMemberPropertyKeys?.length ?? 0,
          processConcurrency,
        });
      }

      if (repairCandidates.length === 0) {
        break;
      }

      summary.repairScanned += repairCandidates.length;

      const missingFilesOnlyCandidates: MlsMediaSyncCandidate[] = [];
      const repairHealthCheckStartedAt = Date.now();
      for (const candidate of repairCandidates) {
        const isHealthy = await areAllCanonicalVariantsPresent(candidate);
        if (isHealthy) {
          summary.repairSkippedHealthy += 1;
        } else {
          missingFilesOnlyCandidates.push(candidate);
        }
      }
      const elapsedMsHealthCheck = Date.now() - repairHealthCheckStartedAt;

      if (elapsedMsHealthCheck >= SLOW_REPAIR_HEALTH_CHECK_WARN_MS) {
        syncLogger.warn('media repair health-check slow', {
          phase: 'repair',
          batchNumber: batch + 1,
          repairCandidatesCount: repairCandidates.length,
          missingFilesCandidatesCount: missingFilesOnlyCandidates.length,
          repairSkippedHealthyTotal: summary.repairSkippedHealthy,
          elapsedMsHealthCheck,
        });
      }

      if (missingFilesOnlyCandidates.length === 0) {
        if (repairCandidates.length < batchSize) {
          break;
        }
        continue;
      }

      const repairBatchStartedAt = Date.now();
      const repairOutcome = await runBatch(missingFilesOnlyCandidates);
      summary.repairProcessed += repairOutcome.processed;
      summary.repairFailed += repairOutcome.failed;
      syncLogger.info('media repair batch complete', {
        phase: 'repair',
        batchNumber: batch + 1,
        maxBatches: repairMaxBatches,
        candidateCount: missingFilesOnlyCandidates.length,
        processedInBatch: repairOutcome.processed,
        skippedInBatch: repairOutcome.skipped,
        failedInBatch: repairOutcome.failed,
        repairScannedTotal: summary.repairScanned,
        repairProcessedTotal: summary.repairProcessed,
        repairSkippedHealthyTotal: summary.repairSkippedHealthy,
        repairFailedTotal: summary.repairFailed,
        scannedTotal: summary.scanned,
        processedTotal: summary.processed,
        skippedTotal: summary.skipped,
        failedTotal: summary.failed,
        elapsedMsBatch: Date.now() - repairBatchStartedAt,
        elapsedMsRun: Date.now() - runStartedAt,
      });

      if (
        repairOutcome.processed === 0 &&
        repairOutcome.skipped === 0 &&
        repairOutcome.failed > 0
      ) {
        repairStalledBatches += 1;
        syncLogger.warn('mls media repair pass stalled on repeatedly failing candidates', {
          batchNumber: batch + 1,
          failedInBatch: repairOutcome.failed,
          stalledBatches: repairStalledBatches,
          maxStalledBatches: MAX_STALLED_BATCHES_PER_PHASE,
        });

        if (repairStalledBatches >= MAX_STALLED_BATCHES_PER_PHASE) {
          syncLogger.error('aborting mls media repair pass to prevent cpu runaway', {
            failedInBatch: repairOutcome.failed,
            maxStalledBatches: MAX_STALLED_BATCHES_PER_PHASE,
          });
          break;
        }
      } else {
        repairStalledBatches = 0;
      }

      if (repairCandidates.length < batchSize) {
        break;
      }
    }
  }

  syncLogger.info('MLS media sync completed', {
    scanned: summary.scanned,
    processed: summary.processed,
    created: summary.created,
    updated: summary.updated,
    skipped: summary.skipped,
    failed: summary.failed,
    localSourceUsed: summary.localSourceUsed,
    remoteSourceUsed: summary.remoteSourceUsed,
    repairScanned: summary.repairScanned,
    repairProcessed: summary.repairProcessed,
    repairSkippedHealthy: summary.repairSkippedHealthy,
    repairFailed: summary.repairFailed,
  });
  return summary;
}

/**
 * Runs a comprehensive one-time media sync intended for the initial data load.
 *
 * Identical to `runMlsMediaSync` but defaults `maxBatches` to
 * `Number.MAX_SAFE_INTEGER` so the entire backlog is drained in a single run
 * rather than being throttled to the scheduled-job batch limit.
 *
 * The runner uses the same single-phase candidate stream as scheduled sync,
 * but defaults `maxBatches` to drain the entire backlog.
 */
export async function runInitialMlsMediaSync(
  options: MlsMediaSyncOptions = {},
): Promise<MlsMediaSyncSummary> {
  return runMlsMediaSync({
    ...options,
    maxBatches: options.maxBatches ?? Number.MAX_SAFE_INTEGER,
    primaryOnlyForNonPrioritizedProperties: options.primaryOnlyForNonPrioritizedProperties ?? true,
    primaryOnlyForAllProperties: options.primaryOnlyForAllProperties ?? true,
  });
}
