import { createServerFn } from '@tanstack/react-start';
import { and, asc, eq, isNotNull, isNull, or } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { env } from '@kws/config';
import { processImage } from '@kws/media';
import { media, mediaVariants, mlsMedia } from '@kws/schema';
import type { UUIDv7 } from '@kws/types';

import { db } from '@/lib/database';
import { getListingDetailByKey, getListingMarkers } from '../queries';

const listingDetailsParamsSchema = z.object({
  listingKey: z.string().min(1),
});

interface ListingMediaSyncRow {
  mediaKey: string;
  mediaURL: string;
  resourceRecordKey: string;
  mediaId: UUIDv7 | null;
  mlsUpdatedAt: string | null;
  linkedMediaId: UUIDv7 | null;
  linkedMediaUpdatedAt: Date | null;
  linkedMediaDeletedAt: Date | null;
  photoOrder: number | null;
  imageSizeDescription: string | null;
  unparsedAddress: string | null;
}

interface EnsureListingMediaSummary {
  deduped: boolean;
  scanned: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

const inFlightListingEnsures = new Map<string, number>();
const ENSURE_LISTING_DEDUPE_WINDOW_MS = 30_000;

function cleanupStaleEnsureEntries(now: number): void {
  for (const [key, expiresAt] of inFlightListingEnsures) {
    if (expiresAt <= now) {
      inFlightListingEnsures.delete(key);
    }
  }
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

function localBasePath(): string {
  return path.join(resolveLocalMediaBasePath(), 'mls', 'properties');
}

function localPublicBaseUrl(): string {
  return '/media/mls/properties';
}

type VariantName = 'thumbnail' | 'preview' | 'full';

function resolveExpectedVariantPath(
  resourceRecordKey: string,
  mediaKey: string,
  variantName: VariantName,
): string {
  const filename = `${sanitizeBaseFilename(mediaKey)}_${variantName}.webp`;
  return path.join(localBasePath(), resourceRecordKey, filename);
}

async function areAllCanonicalVariantsPresent(row: ListingMediaSyncRow): Promise<boolean> {
  const variants: VariantName[] = ['thumbnail', 'preview', 'full'];
  const checks = variants.map((variantName) =>
    Bun.file(resolveExpectedVariantPath(row.resourceRecordKey, row.mediaKey, variantName)).exists(),
  );
  const results = await Promise.all(checks);
  return results.every(Boolean);
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

function isMlsNewerThanLinkedMedia(mlsUpdatedAt: string | null, linkedUpdatedAt: Date | null): boolean {
  if (!mlsUpdatedAt || !linkedUpdatedAt) {
    return false;
  }

  const mlsUpdatedMs = Date.parse(mlsUpdatedAt);
  if (Number.isNaN(mlsUpdatedMs)) {
    return false;
  }

  return mlsUpdatedMs > linkedUpdatedAt.getTime();
}

async function fetchMlsMediaBlob(mediaURL: string): Promise<Blob> {
  const response = await fetch(mediaURL, {
    headers: {
      'User-Agent': env.MLS_ACCESS_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(
      `MLS media download failed: ${response.status} ${response.statusText} - ${mediaURL}`,
    );
  }

  return response.blob();
}

function buildMediaTitle(row: ListingMediaSyncRow): string {
  const base = row.unparsedAddress ?? row.resourceRecordKey;
  if (typeof row.photoOrder === 'number' && row.photoOrder > 0) {
    return `${base} • ${row.photoOrder}`;
  }
  return base;
}

async function markMlsMediaRowAsUnprocessable(row: ListingMediaSyncRow): Promise<void> {
  const now = new Date();
  await db
    .update(mlsMedia)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(mlsMedia.mediaKey, row.mediaKey),
        eq(mlsMedia.resourceRecordKey, row.resourceRecordKey),
      ),
    );
}

async function upsertProcessedMedia(row: ListingMediaSyncRow): Promise<'created' | 'updated'> {
  const result = await processImage({
    source: await fetchMlsMediaBlob(row.mediaURL),
    filename: sanitizeBaseFilename(row.mediaKey),
    organizationId: row.resourceRecordKey,
    storage: {
      provider: 'local',
      basePath: localBasePath(),
      publicBaseUrl: localPublicBaseUrl(),
    },
  });

  const fullVariant = result.variants.full;
  const title = buildMediaTitle(row);
  const description =
    typeof row.photoOrder === 'number' && row.photoOrder > 0
      ? `${row.photoOrder}`
      : row.imageSizeDescription;
  const originalFilename = inferOriginalFilename(row.mediaURL, row.mediaKey);

  return db.transaction(async (tx) => {
    const aspectRatioValue = Number.isFinite(result.source.aspectRatio)
      ? result.source.aspectRatio.toFixed(4)
      : null;

    const baseMediaValues = {
      filename:
        truncate(`${sanitizeBaseFilename(row.mediaKey)}_full.webp`, 255) ??
        `${sanitizeBaseFilename(row.mediaKey)}_full.webp`,
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

    const linkedMediaId =
      row.mediaId && row.linkedMediaId && row.linkedMediaDeletedAt === null ? row.mediaId : null;

    let finalMediaId: UUIDv7;
    if (linkedMediaId) {
      await tx.update(media).set(baseMediaValues).where(eq(media.id, linkedMediaId));
      finalMediaId = linkedMediaId;
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
          eq(mlsMedia.mediaKey, row.mediaKey),
          eq(mlsMedia.resourceRecordKey, row.resourceRecordKey),
        ),
      );

    return linkedMediaId ? 'updated' : 'created';
  });
}

async function listListingMediaRows(listingKey: string): Promise<ListingMediaSyncRow[]> {
  const rows = await db
    .select({
      mediaKey: mlsMedia.mediaKey,
      mediaURL: mlsMedia.mediaURL,
      resourceRecordKey: mlsMedia.resourceRecordKey,
      mediaId: mlsMedia.mediaId,
      mlsUpdatedAt: mlsMedia.mediaModificationTimestamp,
      linkedMediaId: media.id,
      linkedMediaUpdatedAt: media.updatedAt,
      linkedMediaDeletedAt: media.deletedAt,
      photoOrder: mlsMedia.order,
      imageSizeDescription: mlsMedia.imageSizeDescription,
      unparsedAddress: mlsMedia.resourceRecordKey,
    })
    .from(mlsMedia)
    .leftJoin(media, eq(mlsMedia.mediaId, media.id))
    .where(
      and(
        eq(mlsMedia.resourceRecordKey, listingKey),
        or(
          isNull(mlsMedia.deletedAt),
          and(isNotNull(mlsMedia.deletedAt), isNull(mlsMedia.mediaId)),
        ),
        isNotNull(mlsMedia.mediaURL),
        isNotNull(mlsMedia.resourceRecordKey),
      ),
    )
    .orderBy(asc(mlsMedia.order), asc(mlsMedia.mediaKey));

  return rows.map((row) => ({
    mediaKey: row.mediaKey,
    mediaURL: row.mediaURL!,
    resourceRecordKey: row.resourceRecordKey!,
    mediaId: row.mediaId,
    mlsUpdatedAt: row.mlsUpdatedAt,
    linkedMediaId: row.linkedMediaId,
    linkedMediaUpdatedAt: row.linkedMediaUpdatedAt,
    linkedMediaDeletedAt: row.linkedMediaDeletedAt,
    photoOrder: row.photoOrder,
    imageSizeDescription: row.imageSizeDescription,
    unparsedAddress: row.unparsedAddress,
  }));
}

async function ensureListingMedia(listingKey: string): Promise<EnsureListingMediaSummary> {
  const summary: EnsureListingMediaSummary = {
    deduped: false,
    scanned: 0,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  };

  const rows = await listListingMediaRows(listingKey);
  summary.scanned = rows.length;

  for (const row of rows) {
    const hasActiveLinkedMedia = row.linkedMediaId !== null && row.linkedMediaDeletedAt === null;
    const missingAssociation = row.mediaId === null || row.linkedMediaId === null;
    const staleLinkedMedia =
      row.linkedMediaUpdatedAt === null ||
      row.linkedMediaDeletedAt !== null ||
      isMlsNewerThanLinkedMedia(row.mlsUpdatedAt, row.linkedMediaUpdatedAt);

    const missingFiles = hasActiveLinkedMedia
      ? !(await areAllCanonicalVariantsPresent(row))
      : false;

    const shouldProcess = missingAssociation || staleLinkedMedia || missingFiles;
    if (!shouldProcess) {
      summary.skipped += 1;
      continue;
    }

    try {
      const mode = await upsertProcessedMedia(row);
      summary.processed += 1;
      if (mode === 'created') {
        summary.created += 1;
      } else {
        summary.updated += 1;
      }
    } catch (error) {
      if (isPermanentImageProcessingError(error)) {
        await markMlsMediaRowAsUnprocessable(row).catch(() => undefined);
        summary.skipped += 1;
        continue;
      }

      summary.failed += 1;
    }
  }

  return summary;
}

export const getListingDetailsServerFn = createServerFn({ method: 'GET' })
  .validator(listingDetailsParamsSchema)
  .handler(({ data }) => getListingDetailByKey(data));

export const getListingMarkersServerFn = createServerFn({ method: 'GET' })
  .handler(() => getListingMarkers());

export const ensureListingMediaServerFn = createServerFn({ method: 'POST' })
  .validator(listingDetailsParamsSchema)
  .handler(async ({ data }) => {
    const now = Date.now();
    cleanupStaleEnsureEntries(now);

    const currentExpiry = inFlightListingEnsures.get(data.listingKey);
    if (currentExpiry && currentExpiry > now) {
      return {
        deduped: true,
        scanned: 0,
        processed: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
      } satisfies EnsureListingMediaSummary;
    }

    inFlightListingEnsures.set(data.listingKey, now + ENSURE_LISTING_DEDUPE_WINDOW_MS);

    try {
      return await ensureListingMedia(data.listingKey);
    } finally {
      inFlightListingEnsures.set(data.listingKey, Date.now() + ENSURE_LISTING_DEDUPE_WINDOW_MS);
    }
  });