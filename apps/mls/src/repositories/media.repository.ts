import { mlsMedia } from '@kws/schema';
import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { chunkArray, dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';

import type { MappedMedia } from '../maps/media.mapper';

export async function upsertSingleMlsMedia(record: MappedMedia): Promise<void> {
  const { mediaKey, ...rest } = record;
  await db
    .insert(mlsMedia)
    .values({ mediaKey, ...rest })
    .onConflictDoUpdate({
      target: mlsMedia.mediaKey,
      set: { ...rest, updatedAt: new Date() },
    });
}

export async function deactivateMlsMedia(mediaKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(mlsMedia)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(mlsMedia.mediaKey, mediaKey));
}

export async function upsertMlsMedia(data: (typeof mlsMedia.$inferInsert)[]) {
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.mediaKey);
  const batches = chunkArray(deduped, 1000);
  const setFields = getUpsertSetFields(mlsMedia, ['mediaKey', 'createdAt', 'searchVector']);
  const updateWhere = sql`
    excluded.resource_record_key is distinct from ${mlsMedia.resourceRecordKey}
    or
    excluded.media_modification_timestamp is distinct from ${mlsMedia.mediaModificationTimestamp}
    or excluded.media_url is distinct from ${mlsMedia.mediaURL}
    or excluded.preferred_photo_yn is distinct from ${mlsMedia.preferredPhotoYN}
    or excluded."order" is distinct from ${mlsMedia.order}
    or excluded.deleted_at is distinct from ${mlsMedia.deletedAt}
  `;
  const maxTimestamp = deduped.reduce((max, row) => {
    const rowTimestamp = row.mediaModificationTimestamp
      ? new Date(row.mediaModificationTimestamp)
      : new Date(0);
    return rowTimestamp > max ? rowTimestamp : max;
  }, new Date(0));
  let attempted = 0;
  let applied = 0;

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      attempted += batch.length;
      const changedRows = await tx
        .insert(mlsMedia)
        .values(batch)
        .onConflictDoUpdate({
          target: mlsMedia.mediaKey,
          set: setFields,
          setWhere: updateWhere,
        })
        .returning({ mediaKey: mlsMedia.mediaKey });

      applied += changedRows.length;
    }
  });

  logger.trace('media upsert effectiveness', {
    attempted,
    applied,
    skippedNoop: Math.max(0, attempted - applied),
  });

  return maxTimestamp;
}
