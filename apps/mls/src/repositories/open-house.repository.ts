import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { openHouses, properties } from '@kws/schema';

import { chunkArray, dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';
import type { MappedOpenHouse } from '../maps/open-house.mapper';

export async function upsertSingleOpenHouse(record: MappedOpenHouse): Promise<void> {
  const { openHouseKey, ...rest } = record;
  await db
    .insert(openHouses)
    .values({ openHouseKey, ...rest })
    .onConflictDoUpdate({
      target: openHouses.openHouseKey,
      set: { ...rest, updatedAt: new Date() },
    });
}

export async function deactivateOpenHouse(openHouseKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(openHouses)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(openHouses.openHouseKey, openHouseKey));
}

export async function upsertOpenHouses(
  data: (typeof openHouses.$inferInsert)[]
) {
  if (data.length === 0) return;

  const deduped = dedupeByKey(data, (row) => row.openHouseKey);
  const referencedListingKeys = [
    ...new Set(
      deduped
        .map((row) => row.listingKey)
        .filter((listingKey): listingKey is string => typeof listingKey === 'string' && listingKey.length > 0),
    ),
  ];

  const validListingKeys = new Set<string>();
  for (const listingKeyBatch of chunkArray(referencedListingKeys, 1000)) {
    const existingProperties = await db
      .select({ listingKey: properties.listingKey })
      .from(properties)
      .where(inArray(properties.listingKey, listingKeyBatch));

    for (const row of existingProperties) {
      validListingKeys.add(row.listingKey);
    }
  }

  const filtered = deduped.filter((row) => {
    if (!row.listingKey) {
      return true;
    }
    return validListingKeys.has(row.listingKey);
  });

  const skippedMissingProperty = deduped.length - filtered.length;
  if (skippedMissingProperty > 0) {
    logger.warn('skipping open houses with missing property parent', {
      total: deduped.length,
      skippedMissingProperty,
      kept: filtered.length,
    });
  }

  if (filtered.length === 0) return;

  const batches = chunkArray(filtered, 1000);
  const setFields = getUpsertSetFields(openHouses, ['openHouseKey', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(openHouses)
        .values(batch)
        .onConflictDoUpdate({
          target: openHouses.openHouseKey,
          set: setFields,
        });
    }
  });
}