import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { openHouses } from '@kws/schema';

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
  const batches = chunkArray(deduped, 1000);
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