import { mlsMedia } from '@kws/schema';
import { and, eq, notInArray } from 'drizzle-orm';

import { db } from '@/lib/database';
import { chunkArray } from '@/lib/utils/helpers';

import type { MappedMedia } from '../maps/media.mapper';

import { purgeUnavailableMlsMedia } from './media-cleanup.repository';
import { buildMlsMediaConflictSet } from './mls-media-conflict-set';

const MEDIA_UPSERT_CHUNK_SIZE = 250;
export type MlsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ResourceMediaBatchItem {
  resourceRecordKey: string;
  mediaRecords: MappedMedia[];
}

export async function reconcileResourceMediaWithinTransaction(
  tx: MlsTransaction,
  item: ResourceMediaBatchItem,
): Promise<void> {
  const incomingKeys = item.mediaRecords.map((record) => record.mediaKey);
  if (incomingKeys.length > 0) {
    await tx
      .update(mlsMedia)
      .set({ deletedAt: new Date(), updatedAt: new Date(), mediaURL: null })
      .where(
        and(
          eq(mlsMedia.resourceRecordKey, item.resourceRecordKey),
          notInArray(mlsMedia.mediaKey, incomingKeys),
        ),
      );
  } else {
    await tx
      .update(mlsMedia)
      .set({ deletedAt: new Date(), updatedAt: new Date(), mediaURL: null })
      .where(eq(mlsMedia.resourceRecordKey, item.resourceRecordKey));
  }

  if (item.mediaRecords.length === 0) {
    return;
  }

  const now = new Date();
  for (const chunk of chunkArray(item.mediaRecords, MEDIA_UPSERT_CHUNK_SIZE)) {
    await tx
      .insert(mlsMedia)
      .values(chunk)
      .onConflictDoUpdate({
        target: mlsMedia.mediaKey,
        set: buildMlsMediaConflictSet(now),
      });
  }
}

export async function reconcileResourceMediaBatch(items: ResourceMediaBatchItem[]): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await reconcileResourceMediaWithinTransaction(tx, item);
    }
  });
  await purgeUnavailableMlsMedia(items.map((item) => item.resourceRecordKey));
}
