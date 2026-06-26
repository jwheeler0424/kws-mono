import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { mlsMedia } from '@kws/schema';

import { chunkArray, getUpsertSetFields } from '@/lib/utils/helpers';
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


export async function upsertMlsMedia(
  data: (typeof mlsMedia.$inferInsert)[]
) {
  if (data.length === 0) return;

  const batches = chunkArray(data, 1000);
  const setFields = getUpsertSetFields(mlsMedia, ['mediaKey', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(mlsMedia)
        .values(batch)
        .onConflictDoUpdate({
          target: mlsMedia.mediaKey,
          set: setFields,
        });
    }
  });
}