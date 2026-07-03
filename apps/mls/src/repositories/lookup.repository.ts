import { lookups } from '@kws/schema';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
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

export async function upsertLookups(data: MappedLookup[]) {
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.lookupKey);
  const batches = chunkArray(deduped, 1000);
  const setFields = getUpsertSetFields(lookups, ['lookupKey', 'createdAt', 'searchVector']);
  const maxTimestamp = deduped.reduce((max, row) => {
    const rowTimestamp = row.modificationTimestamp
      ? new Date(row.modificationTimestamp)
      : new Date(0);
    return rowTimestamp > max ? rowTimestamp : max;
  }, new Date(0));

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx.insert(lookups).values(batch).onConflictDoUpdate({
        target: lookups.lookupKey,
        set: setFields,
      });
    }
  });

  return maxTimestamp;
}

export async function getLatestLookupTimestamp(): Promise<Date | string | null> {
  const result = await db.query.lookups.findFirst({
    columns: {
      modificationTimestamp: true,
    },
    orderBy: (table, { desc }) => desc(table.modificationTimestamp),
  });

  return result?.modificationTimestamp ?? null;
}
