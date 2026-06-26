import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { offices } from '@kws/schema';

import type { MappedOffice } from '../maps/office.mapper';

import { chunkArray, getUpsertSetFields } from '@/lib/utils';

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

  const batches = chunkArray(data, 1000);
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