import type { UUIDv7 } from '@kws/types';

import { env } from '@kws/config';
import { media, mediaVariants, mlsSyncCursors } from '@kws/schema';
import { and, asc, eq, gt, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { rename, unlink } from 'node:fs/promises';

import { MLS_MEDIA_IMAGE_DEFAULTS, MLS_MEDIA_RECOMPRESS_DEFAULTS } from '@/lib/constants';
import { db } from '@/lib/database';
import { mlsLogger } from '@/lib/logger';

const recompressLogger = mlsLogger.child('media-recompress');
const RECOMPRESS_RESOURCE = 'MlsMediaRecompress';

let resumeAfterMediaId: UUIDv7 | null = null;

export interface MlsMediaRecompressSummary {
  scanned: number;
  recompressed: number;
  resized: number;
  skippedNoGain: number;
  missing: number;
  conflicts: number;
  failed: number;
  bytesBefore: number;
  bytesAfter: number;
  remaining: number;
  durationMs: number;
}

type RecompressCandidate = {
  variantId: UUIDv7;
  mediaId: UUIDv7;
  storagePath: string;
  fileSize: number;
  width: number;
  height: number;
};

/** Media stored before the first run used the old full-resolution, quality-90 encoding. */
export async function resolveMlsMediaRecompressCutoff(): Promise<string> {
  const osn = env.MLS_ORIGINATING_SYSTEM_NAME;
  await db
    .insert(mlsSyncCursors)
    .values({
      resource: RECOMPRESS_RESOURCE,
      originatingSystemName: osn,
      lastModifiedTimestamp: sql`now()`,
    })
    .onConflictDoNothing();
  const [row] = await db
    .select({ cutoff: mlsSyncCursors.lastModifiedTimestamp })
    .from(mlsSyncCursors)
    .where(
      and(
        eq(mlsSyncCursors.resource, RECOMPRESS_RESOURCE),
        eq(mlsSyncCursors.originatingSystemName, osn),
      ),
    );
  if (!row?.cutoff) throw new Error('MLS media recompress cutoff is missing');
  return row.cutoff;
}

function legacyMediaClause(cutoff: string) {
  return and(
    isNull(media.deletedAt),
    eq(media.storageProvider, 'local'),
    sql`${media.updatedAt} < ${cutoff}::timestamptz`,
    sql`exists (select 1 from mls_media linked where linked.media_id = ${media.id})`,
  );
}

async function listCandidates(cutoff: string, limit: number): Promise<RecompressCandidate[]> {
  return db
    .select({
      variantId: mediaVariants.id,
      mediaId: media.id,
      storagePath: mediaVariants.storagePath,
      fileSize: mediaVariants.fileSize,
      width: mediaVariants.width,
      height: mediaVariants.height,
    })
    .from(media)
    .innerJoin(
      mediaVariants,
      and(eq(mediaVariants.mediaId, media.id), eq(mediaVariants.variantName, 'full')),
    )
    .where(
      and(
        resumeAfterMediaId ? gt(media.id, resumeAfterMediaId) : undefined,
        legacyMediaClause(cutoff),
      ),
    )
    .orderBy(asc(media.id))
    .limit(limit);
}

async function countRemaining(cutoff: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(media)
    .where(legacyMediaClause(cutoff));
  return Number(row?.count ?? 0);
}

// Bumping updated_at past the cutoff is what removes a row from the legacy set.
async function markReviewed(mediaId: UUIDv7): Promise<void> {
  await db.update(media).set({ updatedAt: new Date() }).where(eq(media.id, mediaId));
}

async function recompressCandidate(
  candidate: RecompressCandidate,
  summary: MlsMediaRecompressSummary,
): Promise<void> {
  const file = Bun.file(candidate.storagePath);
  if (!(await file.exists())) {
    summary.missing += 1;
    await markReviewed(candidate.mediaId);
    return;
  }

  const targetWidth = Math.min(candidate.width, MLS_MEDIA_IMAGE_DEFAULTS.maxFullWidth);
  const resized = targetWidth < candidate.width;
  const image = new Bun.Image(await file.arrayBuffer());
  const blob = await (
    resized
      ? image.resize(targetWidth, undefined, { fit: 'inside', withoutEnlargement: true })
      : image
  )
    .webp({ quality: MLS_MEDIA_IMAGE_DEFAULTS.webpQuality })
    .blob();

  if (
    !resized &&
    blob.size > candidate.fileSize * (1 - MLS_MEDIA_RECOMPRESS_DEFAULTS.minSavingsRatio)
  ) {
    summary.skippedNoGain += 1;
    await markReviewed(candidate.mediaId);
    return;
  }

  const height = resized
    ? Math.max(1, Math.round((candidate.height * targetWidth) / candidate.width))
    : candidate.height;
  const temporaryPath = `${candidate.storagePath}.${randomUUID()}.tmp`;
  await Bun.write(temporaryPath, blob);

  try {
    const applied = await db.transaction(async (tx) => {
      // The media sync may have replaced this file since it was listed.
      const [current] = await tx
        .select({ id: mediaVariants.id })
        .from(mediaVariants)
        .innerJoin(media, eq(media.id, mediaVariants.mediaId))
        .where(
          and(
            eq(mediaVariants.id, candidate.variantId),
            eq(mediaVariants.storagePath, candidate.storagePath),
            eq(mediaVariants.fileSize, candidate.fileSize),
            isNull(media.deletedAt),
          ),
        )
        .for('update');
      if (!current) return false;

      await rename(temporaryPath, candidate.storagePath);
      const now = new Date();
      await tx
        .update(mediaVariants)
        .set({ width: targetWidth, height, fileSize: blob.size, updatedAt: now })
        .where(eq(mediaVariants.id, candidate.variantId));
      await tx
        .update(media)
        .set({ fileSize: blob.size, updatedAt: now })
        .where(eq(media.id, candidate.mediaId));
      return true;
    });

    if (!applied) {
      summary.conflicts += 1;
      await markReviewed(candidate.mediaId);
      return;
    }
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }

  summary.recompressed += 1;
  if (resized) summary.resized += 1;
  summary.bytesBefore += candidate.fileSize;
  summary.bytesAfter += blob.size;
}

/**
 * Re-encodes MLS photos stored before the quality/size change, within a time budget per call.
 */
export async function recompressLegacyMlsMedia(
  maxDurationMs: number = MLS_MEDIA_RECOMPRESS_DEFAULTS.maxDurationMs,
): Promise<MlsMediaRecompressSummary> {
  const startedAt = Date.now();
  const summary: MlsMediaRecompressSummary = {
    scanned: 0,
    recompressed: 0,
    resized: 0,
    skippedNoGain: 0,
    missing: 0,
    conflicts: 0,
    failed: 0,
    bytesBefore: 0,
    bytesAfter: 0,
    remaining: 0,
    durationMs: 0,
  };
  const cutoff = await resolveMlsMediaRecompressCutoff();
  const { batchSize, concurrency } = MLS_MEDIA_RECOMPRESS_DEFAULTS;

  while (Date.now() - startedAt < maxDurationMs) {
    const candidates = await listCandidates(cutoff, batchSize);
    if (candidates.length === 0) {
      resumeAfterMediaId = null;
      break;
    }
    resumeAfterMediaId = candidates.at(-1)!.mediaId;
    summary.scanned += candidates.length;

    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(concurrency, candidates.length) }, async () => {
        while (next < candidates.length) {
          const candidate = candidates[next++]!;
          try {
            await recompressCandidate(candidate, summary);
          } catch (error) {
            summary.failed += 1;
            recompressLogger.warn('failed to recompress MLS media', {
              mediaId: candidate.mediaId,
              storagePath: candidate.storagePath,
              error: error instanceof Error ? error.message : String(error),
            });
            await markReviewed(candidate.mediaId).catch(() => {});
          }
        }
      }),
    );

    if (candidates.length < batchSize) {
      resumeAfterMediaId = null;
      break;
    }
  }

  summary.remaining = await countRemaining(cutoff);
  summary.durationMs = Date.now() - startedAt;
  recompressLogger.info('MLS media recompress pass completed', { ...summary });
  return summary;
}
