import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { mlsMedia, offices } from '@kws/schema';

import type { MappedOffice } from '../maps/office.mapper';

import { chunkArray, dedupeByKey, getUpsertSetFields } from '@/lib/utils';
import { upsertMlsMedia } from './media.repository';

export async function upsertSingleOffice(record: MappedOffice): Promise<void> {
  const { officeMlsId, ...rest } = record;
  await db
    .insert(offices)
    .values({ officeMlsId, ...rest })
    .onConflictDoUpdate({
      target: offices.officeMlsId,
      set: { ...rest, updatedAt: new Date() },
    });
}


export async function deactivateOffice(officeKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(offices)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(offices.officeKey, officeKey));
}

export async function upsertOffices(
  data: (typeof offices.$inferInsert)[]
) {
  if (data.length === 0) return;

  const deduped = dedupeByKey(data, (row) => row.officeMlsId);
  const batches = chunkArray(deduped, 1000);
  const setFields = getUpsertSetFields(offices, ['officeMlsId', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(offices)
        .values(batch)
        .onConflictDoUpdate({
          target: offices.officeMlsId,
          set: setFields,
        });
    }
  });
}

export async function processMlsOfficesPayload(data: MappedOffice[]) {
  if (data.length === 0) return;

  // 1. Initialize empty arrays to hold our flattened, normalized data
  const allOffices: (typeof offices.$inferInsert)[] = [];
  const allMedia: (typeof mlsMedia.$inferInsert)[] = [];

  // 2. Extract and separate the data
  for (const item of data) {
    // Destructure out the relations. 
    // 'officeData' now strictly contains ONLY valid columns for the offices table.
    const { media, ...officeData } = item;

    allOffices.push(officeData);

    // 3. Extract, flatten, and strictly enforce Foreign Keys
    if (media && media.length > 0) {
      allMedia.push(...media);
    }
  }

  // 4. Execute the Upserts in relational order
  console.log(`Upserting ${allOffices.length} offices...`);

  // MUST await the parent table first to satisfy foreign key constraints
  await upsertOffices(allOffices);

  console.log(`Offices complete. Upserting nested relational data...`);

  // Children can be upserted concurrently since they don't depend on each other
  await Promise.all([
    allMedia.length > 0 ? upsertMlsMedia(allMedia) : Promise.resolve(),
  ]);

  console.log('✅ Mass upsert pipeline complete!');
}