import { and, eq } from 'drizzle-orm';
import path from 'node:path';

import type { UUIDv7 } from '@kws/types';

import { db } from '@/lib/database';
import { env } from '@kws/config';
import { processImage } from '@kws/media';
import { media, mediaVariants, mlsMedia } from '@kws/schema';

import { mlsLogger } from '@/lib/logger';
import {
  listMlsMediaSyncCandidates,
  listUnsyncedMediaForListing,
  type MlsMediaEntityType,
  type MlsMediaSyncCandidate,
} from '../repositories/media-sync.repository';

const syncLogger = mlsLogger.child('media-sync');
const MAX_STALLED_BATCHES_PER_PHASE = 3;

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
   * When set, only candidates whose resolved entity type is one of the
   * provided values are returned.  Use to run per-entity-type media phases.
   */
  filterEntityTypes?: MlsMediaEntityType[];
  /**
   * When set, property media is restricted to listings where the list agent
   * or co-list agent matches one of the provided member keys / MLS IDs.
   */
  restrictToMemberPropertyKeys?: string[];
}

export interface MlsMediaSyncSummary {
  scanned: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
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

function resolveLocalMediaBasePath(): string {
  return env.MLS_MEDIA_STORE_PATH ?? path.join(process.cwd(), 'store', 'media');
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
): Promise<'created' | 'updated'> {
  // ── Pre-download existence check ─────────────────────────────────────────
  // If the full-size WebP already exists on disk, use the local file as the
  // pipeline source instead of re-downloading from the MLS URL.  This keeps
  // the DB in sync without a network round-trip and is safe on repeated runs
  // (the variants are overwritten with identical content).
  const expectedFullPath = resolveExpectedFullPath(candidate);
  const localFileExists = await Bun.file(expectedFullPath).exists();
  // When no local copy exists, download with the required User-Agent header
  // (MLS Grid requires the OAuth2 access token; plain URLs are blocked).
  const pipelineSource = localFileExists
    ? expectedFullPath
    : await fetchMlsMediaBlob(candidate.mediaURL);

  const result = await processImage({
    source: pipelineSource,
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

    return mediaId ? 'updated' : 'created';
  });
}

export async function syncListingMedia(listingKey: string): Promise<void> {
  const candidates = await listUnsyncedMediaForListing(listingKey);

  if (candidates.length === 0) {
    return;
  }

  for (const candidate of candidates) {
    if (!candidate.mediaURL || !candidate.resourceRecordKey) {
      continue;
    }

    try {
      await upsertProcessedMedia(candidate);
    } catch (error) {
      const permanent = isPermanentImageProcessingError(error);
      const message = toErrorMessage(error);

      if (permanent) {
        const marked = await markMlsMediaRowAsUnprocessable(candidate).catch(() => false);
        syncLogger.warn('dropping unprocessable listing media row from future retries', {
          listingKey,
          mediaKey: candidate.mediaKey,
          resourceRecordKey: candidate.resourceRecordKey,
          mediaURL: candidate.mediaURL,
          markedDeleted: marked,
          error: message,
        });
        continue;
      }

      syncLogger.warn('failed to process listing media row during prefetch sync', {
        listingKey,
        mediaKey: candidate.mediaKey,
        resourceRecordKey: candidate.resourceRecordKey,
        mediaURL: candidate.mediaURL,
        error: message,
      });
    }
  }
}

export async function runMlsMediaSync(
  options: MlsMediaSyncOptions = {},
): Promise<MlsMediaSyncSummary> {
  const batchSize = options.batchSize ?? 50;
  const maxBatches = options.maxBatches ?? 200;
  const processConcurrency = Math.max(1, options.processConcurrency ?? 3);
  const prioritizeMemberKeys = options.prioritizeMemberKeys ?? [];
  const prioritizeOfficeKeys = options.prioritizeOfficeKeys ?? [];
  const primaryOnlyForNonPrioritizedProperties =
    options.primaryOnlyForNonPrioritizedProperties ?? false;
  const filterEntityTypes = options.filterEntityTypes;
  const restrictToMemberPropertyKeys = options.restrictToMemberPropertyKeys;

  const summary: MlsMediaSyncSummary = {
    scanned: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const processCandidate = async (
    candidate: MlsMediaSyncCandidate,
  ): Promise<'processed' | 'skipped' | 'failed'> => {
    if (!candidate.mediaURL || !candidate.resourceRecordKey) {
      summary.skipped += 1;
      return 'skipped';
    }

    try {
      const mode = await upsertProcessedMedia(candidate);
      summary.processed += 1;
      if (mode === 'created') {
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
    const candidates = await listMlsMediaSyncCandidates(batchSize, {
      prioritizeMemberKeys,
      prioritizeOfficeKeys,
      primaryOnlyForNonPrioritizedProperties,
      filterEntityTypes,
      restrictToMemberPropertyKeys,
    });

    if (candidates.length === 0) {
      break;
    }

    const outcome = await runBatch(candidates);

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

  syncLogger.info('MLS media sync completed', {
    scanned: summary.scanned,
    processed: summary.processed,
    created: summary.created,
    updated: summary.updated,
    skipped: summary.skipped,
    failed: summary.failed,
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
  });
}
