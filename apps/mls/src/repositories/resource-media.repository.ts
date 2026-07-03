import { mlsMedia } from '@kws/schema';
import { and, eq, notInArray } from 'drizzle-orm';

import { db } from '@/lib/database';
import { chunkArray } from '@/lib/utils/helpers';

import type { MappedMedia } from '../maps/media.mapper';

import { buildMlsMediaConflictSet } from './mls-media-conflict-set';

const MEDIA_UPSERT_CHUNK_SIZE = 250;

export interface ResourceMediaBatchItem {
  resourceRecordKey: string;
  mediaRecords: MappedMedia[];
}

async function reconcileResourceMediaWithinTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  item: ResourceMediaBatchItem,
): Promise<void> {
  const incomingKeys = item.mediaRecords.map((record) => record.mediaKey);
  if (incomingKeys.length > 0) {
    await tx
      .delete(mlsMedia)
      .where(
        and(
          eq(mlsMedia.resourceRecordKey, item.resourceRecordKey),
          notInArray(mlsMedia.mediaKey, incomingKeys),
        ),
      );
  } else {
    await tx.delete(mlsMedia).where(eq(mlsMedia.resourceRecordKey, item.resourceRecordKey));
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
}
