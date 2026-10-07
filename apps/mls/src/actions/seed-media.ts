import type { UUIDv7 } from '@kws/types';

import { env } from '@kws/config';
import { processImage } from '@kws/media';
import { media, mediaVariants, mlsMedia } from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import type { MlsMediaPayload } from '@/types';

import { MLS_MEDIA_BUDGET_DEFAULTS, MLS_QUOTA_DEFAULTS } from '@/lib/constants';
import { db } from '@/lib/database';
import { mlsLogger } from '@/lib/logger';
import { fetchFreshParentMedia } from '@/lib/utils/fetch';
import { downloadMlsMedia, MlsMediaDownloadError } from '@/lib/utils/media-download';
import { MlsQuotaExceededError, mlsQuotaTracker } from '@/lib/utils/quota';
import { throttle } from '@/lib/utils/rate-limit';
import { resolveMlsMediaKey } from '@/maps/media.mapper';

import {
  listMlsMediaSyncCandidates,
  claimParentMedia,
  releaseParentMedia,
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
   * When set, property media is restricted to listings where the list office
   * or co-list office matches one of the provided office keys / MLS IDs.
   */
  restrictToOfficePropertyKeys?: string[];
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
   * When true, property media candidates not associated to prioritized
   * configured keys are restricted to viewable active listings.
   */
  enforceEligibilityForNonAssociatedProperties?: boolean;
  /**
   * Active property statuses used when
   * `enforceEligibilityForNonAssociatedProperties` is true.
   */
  activePropertyStatuses?: string[];
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
  budgetExhausted: boolean;
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
  if (!/^[a-zA-Z0-9_-]+$/.test(ns)) throw new Error('Invalid MLS media namespace');
  const legacyPath = path.join(
    basePath,
    ns,
    `${sanitizeBaseFilename(candidate.mediaKey)}_full.webp`,
  );
  const sourceChanged = candidate.downloadedSourceTimestamp
    ? Date.parse(candidate.downloadedSourceTimestamp) !== Date.parse(candidate.mlsUpdatedAt ?? '')
    : Boolean(
        candidate.linkedUpdatedAt &&
        candidate.mlsUpdatedAt &&
        Date.parse(candidate.mlsUpdatedAt) > candidate.linkedUpdatedAt.getTime(),
      );
  if (
    !sourceChanged &&
    candidate.localFullPath &&
    path.resolve(candidate.localFullPath).startsWith(`${path.resolve(basePath)}${path.sep}`)
  ) {
    return candidate.localFullPath;
  }
  if (!sourceChanged && existsSync(legacyPath)) return legacyPath;
  const version = createHash('sha256')
    .update(`${candidate.mediaKey}:${candidate.mlsUpdatedAt ?? ''}`)
    .digest('hex')
    .slice(0, 16);
  return path.join(
    basePath,
    ns,
    `${sanitizeBaseFilename(candidate.mediaKey)}-${version}_full.webp`,
  );
}

type VariantName = 'thumbnail' | 'preview' | 'full';

function resolveExpectedVariantPath(
  candidate: MlsMediaSyncCandidate,
  variantName: VariantName,
): string {
  return resolveExpectedFullPath(candidate).replace(/_full\.webp$/, `_${variantName}.webp`);
}

async function areAllCanonicalVariantsPresent(candidate: MlsMediaSyncCandidate): Promise<boolean> {
  const variants: VariantName[] = ['thumbnail', 'preview', 'full'];
  const checks = variants.map((variantName) =>
    Bun.file(resolveExpectedVariantPath(candidate, variantName)).exists(),
  );
  const results = await Promise.all(checks);
  return results.every(Boolean);
}

async function resolvePipelineSource(
  candidate: MlsMediaSyncCandidate,
  getMediaUrl: () => Promise<string>,
): Promise<{
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

  const mediaUrl = await getMediaUrl();
  const budgetedFetch = async (input: string, options: RequestInit): Promise<Response> => {
    // Only MLS Grid requests count toward its limits; the storage redirect target does not.
    if (new URL(input).hostname.endsWith('mlsgrid.com')) {
      await throttle();
      mlsQuotaTracker.prepareRequest();
    }
    return fetch(input, options);
  };
  const source = await downloadMlsMedia(mediaUrl, env.MLS_ACCESS_KEY, budgetedFetch, {
    demo: new URL(env.MLS_API_URL).hostname === 'api-demo.mlsgrid.com',
  });
  mlsQuotaTracker.recordResponseBytes(source.size);
  return {
    source,
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

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class MlsMediaUnavailableError extends Error {
  constructor() {
    super('Fresh MLS media is absent or private');
    this.name = 'MlsMediaUnavailableError';
  }
}

function isMediaBudgetExhausted(): boolean {
  const { hour, day } = mlsQuotaTracker.snapshot();
  const share = MLS_MEDIA_BUDGET_DEFAULTS.maxQuotaShare;
  return (
    hour.requests >= MLS_QUOTA_DEFAULTS.requestsPerHourLimit * share ||
    day.requests >= MLS_QUOTA_DEFAULTS.requestsPerDayLimit * share ||
    hour.bytes >= MLS_QUOTA_DEFAULTS.bytesPerHourLimit * share ||
    day.bytes >= MLS_QUOTA_DEFAULTS.bytesPerDayLimit * share
  );
}

function getRetryAfterMs(error: unknown): number {
  const retryAfterMs = (error as { retryAfterMs?: unknown } | null)?.retryAfterMs;
  return typeof retryAfterMs === 'number' && retryAfterMs > 0 ? retryAfterMs : 3_600_000;
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
  token: string,
  getMediaUrl: () => Promise<string>,
): Promise<{ mode: 'created' | 'updated'; sourceOrigin: 'local' | 'remote' }> {
  const pipelineSource = await resolvePipelineSource(candidate, getMediaUrl);
  const filename = path.basename(resolveExpectedFullPath(candidate)).replace(/_full\.webp$/, '');

  const result = await processImage({
    source: pipelineSource.source,
    filename,
    durableFull: true,
    preserveFullWebp: pipelineSource.sourceOrigin === 'local',
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
  const originalFilename = `${sanitizeBaseFilename(candidate.mediaKey)}.source`;

  return db.transaction(async (tx) => {
    const claimed = await tx
      .select({ key: mlsMedia.mediaKey })
      .from(mlsMedia)
      .where(
        and(
          eq(mlsMedia.mediaKey, candidate.mediaKey),
          eq(mlsMedia.acquisitionToken, token),
          sql`${mlsMedia.mediaModificationTimestamp} is not distinct from ${candidate.mlsUpdatedAt}::timestamptz`,
          sql`${mlsMedia.deletedAt} is null`,
          sql`not (coalesce(${mlsMedia.permission}, '{}'::varchar[]) && ARRAY['Private']::varchar[])`,
        ),
      )
      .for('update');
    if (claimed.length === 0) throw new Error('MLS media source changed during acquisition');
    const aspectRatioValue = Number.isFinite(result.source.aspectRatio)
      ? result.source.aspectRatio.toFixed(4)
      : null;

    const baseMediaValues = {
      filename: `${filename}_full.webp`,
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
      .set({
        mediaId: finalMediaId,
        downloadedSourceTimestamp: candidate.mlsUpdatedAt,
        mediaURL: null,
        lastAcquisitionError: null,
      })
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
  // Temporary throughput bump for recovery/backfill runs.
  const batchSize = options.batchSize ?? 150;
  const maxBatches = options.maxBatches ?? 200;
  const processConcurrency = Math.max(1, options.processConcurrency ?? 6);
  const prioritizeMemberKeys = options.prioritizeMemberKeys ?? [];
  const prioritizeOfficeKeys = options.prioritizeOfficeKeys ?? [];
  const primaryOnlyForNonPrioritizedProperties =
    options.primaryOnlyForNonPrioritizedProperties ?? false;
  const primaryOnlyForAllProperties = options.primaryOnlyForAllProperties ?? false;
  const associationMode = options.associationMode ?? 'stale-or-unprocessed';
  const filterEntityTypes = options.filterEntityTypes;
  const restrictToMemberPropertyKeys = options.restrictToMemberPropertyKeys;
  const restrictToOfficePropertyKeys = options.restrictToOfficePropertyKeys;
  const restrictToMemberEntityKeys = options.restrictToMemberEntityKeys;
  const restrictToOfficeEntityKeys = options.restrictToOfficeEntityKeys;
  const enforceEligibilityForNonAssociatedProperties =
    options.enforceEligibilityForNonAssociatedProperties;
  const activePropertyStatuses = options.activePropertyStatuses;
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
    budgetExhausted: false,
  };

  const processCandidate = async (
    candidate: MlsMediaSyncCandidate,
    token: string,
    getMediaUrl: () => Promise<string>,
    onFailure: (error: unknown) => void,
  ): Promise<'processed' | 'skipped' | 'failed'> => {
    if (!candidate.resourceRecordKey) {
      summary.skipped += 1;
      return 'skipped';
    }

    try {
      const outcome = await upsertProcessedMedia(candidate, token, getMediaUrl);
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
      if (error instanceof MlsQuotaExceededError) {
        summary.budgetExhausted = true;
        summary.skipped += 1;
        return 'skipped';
      }

      // The fresh snapshot is authoritative: retire this row without blocking the rest of the listing.
      if (error instanceof MlsMediaUnavailableError) {
        await markMlsMediaRowAsUnprocessable(candidate).catch(() => false);
        summary.skipped += 1;
        return 'skipped';
      }

      onFailure(error);
      const permanent = isPermanentImageProcessingError(error);
      const message = toErrorMessage(error);

      if (permanent) {
        const marked = await markMlsMediaRowAsUnprocessable(candidate).catch(() => false);
        summary.skipped += 1;
        syncLogger.warn('dropping unprocessable MLS media row from future retries', {
          mediaKey: candidate.mediaKey,
          resourceRecordKey: candidate.resourceRecordKey,
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

    const byParent = new Map<string, MlsMediaSyncCandidate[]>();
    for (const candidate of candidates) {
      const key = `${candidate.entityType}:${candidate.resourceRecordKey}`;
      const group = byParent.get(key) ?? [];
      group.push(candidate);
      byParent.set(key, group);
    }
    const groups = [...byParent.values()];
    let nextGroup = 0;
    await Promise.all(
      Array.from({ length: Math.min(processConcurrency, groups.length) }, async () => {
        while (nextGroup < groups.length) {
          const group = groups[nextGroup++]!;
          const first = group[0]!;
          if (summary.budgetExhausted || isMediaBudgetExhausted()) {
            summary.budgetExhausted = true;
            summary.skipped += group.length;
            outcome.skipped += group.length;
            continue;
          }
          const token = await claimParentMedia(first.resourceRecordKey);
          if (!token) {
            summary.skipped += group.length;
            outcome.skipped += group.length;
            continue;
          }
          let snapshot: Promise<MlsMediaPayload[]> | undefined;
          let failure: unknown;
          const started = Date.now();
          const onFailure = (error: unknown) => {
            failure = error;
          };
          try {
            for (const candidate of group) {
              if (summary.budgetExhausted) {
                summary.skipped += 1;
                outcome.skipped += 1;
                continue;
              }
              if (failure || Date.now() - started > 600_000) {
                failure ??= new MlsMediaDownloadError(410);
                summary.skipped += 1;
                outcome.skipped += 1;
                continue;
              }
              const getMediaUrl = async () => {
                snapshot ??= fetchFreshParentMedia(
                  candidate.entityType,
                  candidate.resourceRecordKey,
                  candidate.listingId,
                );
                const matches = (await snapshot).filter(
                  (item) =>
                    resolveMlsMediaKey(item, candidate.resourceRecordKey, candidate.entityType) ===
                    candidate.mediaKey,
                );
                const fresh = matches.length === 1 ? matches[0] : undefined;
                if (
                  !fresh?.MediaURL ||
                  fresh.MlgCanView === false ||
                  (Array.isArray(fresh.Permission) &&
                    fresh.Permission.some(
                      (permission: unknown) =>
                        typeof permission === 'string' && permission.toLowerCase() === 'private',
                    ))
                ) {
                  throw new MlsMediaUnavailableError();
                }
                if (
                  candidate.mlsUpdatedAt &&
                  (!fresh.MediaModificationTimestamp ||
                    Date.parse(fresh.MediaModificationTimestamp) !==
                      Date.parse(candidate.mlsUpdatedAt))
                ) {
                  throw new Error('MLS media source changed; waiting for replication');
                }
                await db
                  .update(mlsMedia)
                  .set({ lastAttemptAt: new Date() })
                  .where(
                    and(
                      eq(mlsMedia.mediaKey, candidate.mediaKey),
                      eq(mlsMedia.acquisitionToken, token),
                    ),
                  );
                return fresh.MediaURL;
              };
              const status = await processCandidate(candidate, token, getMediaUrl, onFailure);
              outcome[status] += 1;
            }
          } finally {
            await releaseParentMedia(
              token,
              failure ? toErrorMessage(failure) : undefined,
              getRetryAfterMs(failure),
            );
          }
        }
      }),
    );

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
      restrictToOfficePropertyKeys,
      restrictToMemberEntityKeys,
      restrictToOfficeEntityKeys,
      enforceEligibilityForNonAssociatedProperties,
      activePropertyStatuses,
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

    if (summary.budgetExhausted) {
      syncLogger.info('media sync paused to preserve the MLS request budget for replication', {
        quota: mlsQuotaTracker.snapshot(),
      });
      break;
    }

    if (candidates.length < batchSize) {
      break;
    }
  }

  if (includeMissingFilesRepair && !summary.budgetExhausted) {
    let repairStalledBatches = 0;

    for (let batch = 0; batch < repairMaxBatches; batch += 1) {
      const repairSelectionStartedAt = Date.now();

      const repairCandidates = await listMlsMediaSyncCandidates(batchSize, {
        offset: batch * batchSize,
        prioritizeMemberKeys,
        prioritizeOfficeKeys,
        primaryOnlyForNonPrioritizedProperties,
        primaryOnlyForAllProperties,
        associationMode: 'repair-missing-files',
        filterEntityTypes,
        restrictToMemberPropertyKeys,
        restrictToOfficePropertyKeys,
        restrictToMemberEntityKeys,
        restrictToOfficeEntityKeys,
        enforceEligibilityForNonAssociatedProperties,
        activePropertyStatuses,
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

      if (summary.budgetExhausted || repairCandidates.length < batchSize) {
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
    budgetExhausted: summary.budgetExhausted,
  });
  return summary;
}

export interface PrioritizedMlsMediaSyncResult {
  office?: MlsMediaSyncSummary;
  officeListings?: MlsMediaSyncSummary;
  member?: MlsMediaSyncSummary;
  memberListings?: MlsMediaSyncSummary;
  listings?: MlsMediaSyncSummary;
  budgetExhausted: boolean;
}

/**
 * Configured office media and its listing galleries first, then configured members and
 * their listing galleries, then complete galleries for all eligible listings newest first.
 */
export async function runPrioritizedMlsMediaSync(
  options: Pick<
    MlsMediaSyncOptions,
    | 'batchSize'
    | 'maxBatches'
    | 'processConcurrency'
    | 'associationMode'
    | 'includeMissingFilesRepair'
    | 'repairMaxBatches'
  > & { memberKeys: readonly string[]; officeKeys: readonly string[] },
): Promise<PrioritizedMlsMediaSyncResult> {
  const { memberKeys, officeKeys, ...shared } = options;
  const result: PrioritizedMlsMediaSyncResult = { budgetExhausted: false };
  const runPhase = async (phase: MlsMediaSyncOptions) => {
    if (result.budgetExhausted) return undefined;
    const summary = await runMlsMediaSync({ ...shared, ...phase });
    result.budgetExhausted = summary.budgetExhausted;
    return summary;
  };

  if (officeKeys.length > 0) {
    result.office = await runPhase({
      filterEntityTypes: ['offices'],
      restrictToOfficeEntityKeys: [...officeKeys],
    });
    result.officeListings = await runPhase({
      filterEntityTypes: ['properties'],
      restrictToOfficePropertyKeys: [...officeKeys],
    });
  }
  if (memberKeys.length > 0) {
    result.member = await runPhase({
      filterEntityTypes: ['members'],
      restrictToMemberEntityKeys: [...memberKeys],
    });
    result.memberListings = await runPhase({
      filterEntityTypes: ['properties'],
      restrictToMemberPropertyKeys: [...memberKeys],
    });
  }
  result.listings = await runPhase({
    filterEntityTypes: ['properties'],
    enforceEligibilityForNonAssociatedProperties: true,
  });

  return result;
}
