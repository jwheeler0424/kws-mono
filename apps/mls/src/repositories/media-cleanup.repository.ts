import { and, inArray, isNotNull } from 'drizzle-orm';
import fs from 'node:fs/promises';

import type { UUIDv7 } from '@kws/types';

import { db } from '@/lib/database';
import { media, mediaVariants, mlsMedia } from '@kws/schema';

const FILE_DELETE_CHUNK_SIZE = 20;

async function deleteVariantFilesInChunks(storagePaths: string[]): Promise<number> {
  let deletedCount = 0;

  for (let start = 0; start < storagePaths.length; start += FILE_DELETE_CHUNK_SIZE) {
    const chunk = storagePaths.slice(start, start + FILE_DELETE_CHUNK_SIZE);
    const deleteResults = await Promise.allSettled(chunk.map(async (path) => fs.unlink(path)));
    deletedCount += deleteResults.filter((result) => result.status === 'fulfilled').length;
  }

  return deletedCount;
}

export interface EntityMediaPurgeSummary {
  mediaDeleted: number;
  variantFilesDeleted: number;
  mlsMediaRowsDeleted: number;
}

/**
 * Purge all media (files + DB records) associated with a set of MLS
 * resource_record_keys.  Called before hard-deleting properties/offices/members
 * during scheduled cleanup so files are not left orphaned on disk.
 */
export async function purgeEntityMedia(
  resourceRecordKeys: string[],
): Promise<EntityMediaPurgeSummary> {
  if (resourceRecordKeys.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0, mlsMediaRowsDeleted: 0 };
  }

  // 1. Find all mls_media rows for these resource keys that have a linked media ID.
  const linkedRows = await db
    .select({ mediaId: mlsMedia.mediaId })
    .from(mlsMedia)
    .where(
      and(inArray(mlsMedia.resourceRecordKey, resourceRecordKeys), isNotNull(mlsMedia.mediaId)),
    );

  const mediaIds = linkedRows.map((r) => r.mediaId).filter((id): id is UUIDv7 => id !== null);

  let variantFilesDeleted = 0;

  if (mediaIds.length > 0) {
    // 2. Collect all stored variant file paths.
    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, mediaIds));

    // 3. Delete physical variant files, ignoring already-missing files.
    variantFilesDeleted = await deleteVariantFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );

    // 4. Hard-delete media records.  mediaVariants rows are removed automatically
    //    via their ON DELETE CASCADE foreign key.  mls_media.media_id is set to
    //    NULL via its ON DELETE SET NULL foreign key.
    await db.delete(media).where(inArray(media.id, mediaIds));
  }

  // 5. Hard-delete all mls_media rows for these resource keys (including any
  //    rows that had no linked media record).
  const deletedMlsMedia = await db
    .delete(mlsMedia)
    .where(inArray(mlsMedia.resourceRecordKey, resourceRecordKeys))
    .returning({ mediaKey: mlsMedia.mediaKey });

  return {
    mediaDeleted: mediaIds.length,
    variantFilesDeleted,
    mlsMediaRowsDeleted: deletedMlsMedia.length,
  };
}
