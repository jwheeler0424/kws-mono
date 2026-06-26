import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { lookups } from '@kws/schema';

import { chunkArray, dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';
import type { MappedLookup } from '../maps/lookup.mapper';

export async function upsertSingleLookup(record: MappedLookup): Promise<void> {
  const { lookupKey, ...rest } = record;
  await db
    .insert(lookups)
    .values({ lookupKey, ...rest })
    .onConflictDoUpdate({
      target: lookups.lookupKey,
      set: { ...rest, updatedAt: new Date() },
    });
}

export async function deactivateLookup(lookupKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(lookups)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(lookups.lookupKey, lookupKey));
}


export async function upsertLookups(
  data: MappedLookup[]
) {
  if (data.length === 0) return;

  const deduped = dedupeByKey(data, (row) => row.lookupKey);
  const batches = chunkArray(deduped, 1000);
  const setFields = getUpsertSetFields(lookups, ['lookupKey', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(lookups)
        .values(batch)
        .onConflictDoUpdate({
          target: lookups.lookupKey,
          set: setFields,
        });
    }
  });
}