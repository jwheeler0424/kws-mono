import { members, mlsMedia } from '@kws/schema';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { chunkArray, dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';

import type { MappedMember } from '../maps/member.mapper';

import { upsertMlsMedia } from './media.repository';

export async function upsertSingleMember(record: MappedMember): Promise<void> {
  const { memberMlsId, ...rest } = record;
  await db
    .insert(members)
    .values({ memberMlsId, ...rest })
    .onConflictDoUpdate({
      target: members.memberMlsId,
      set: { ...rest, updatedAt: new Date() },
    });
}

export async function deactivateMember(memberKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(members)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(members.memberKey, memberKey));
}

export async function upsertMembers(data: (typeof members.$inferInsert)[]) {
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.memberMlsId);
  const batches = chunkArray(deduped, 1000);
  const setFields = getUpsertSetFields(members, ['memberMlsId', 'createdAt', 'searchVector']);
  const maxTimestamp = deduped.reduce((max, row) => {
    const rowTimestamp = row.modificationTimestamp
      ? new Date(row.modificationTimestamp)
      : new Date(0);
    return rowTimestamp > max ? rowTimestamp : max;
  }, new Date(0));

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx.insert(members).values(batch).onConflictDoUpdate({
        target: members.memberMlsId,
        set: setFields,
      });
    }
  });

  return maxTimestamp;
}

export async function processMlsMembersPayload(data: MappedMember[]) {
  if (data.length === 0) return new Date(0);

  // 1. Initialize empty arrays to hold our flattened, normalized data
  const allMembers: (typeof members.$inferInsert)[] = [];
  const allMedia: (typeof mlsMedia.$inferInsert)[] = [];

  // 2. Extract and separate the data
  for (const item of data) {
    // Destructure out the relations.
    // 'memberData' now strictly contains ONLY valid columns for the members table.
    const { media, ...memberData } = item;

    allMembers.push(memberData);

    // 3. Extract, flatten, and strictly enforce Foreign Keys
    if (media && media.length > 0) {
      allMedia.push(...media);
    }
  }

  // MUST await the parent table first to satisfy foreign key constraints
  const maxTimestamp = await upsertMembers(allMembers);

  // Children can be upserted concurrently since they don't depend on each other
  await Promise.all([allMedia.length > 0 ? upsertMlsMedia(allMedia) : Promise.resolve()]);

  return maxTimestamp;
}

export async function getLatestMemberTimestamp(): Promise<Date | string | null> {
  const result = await db.query.members.findFirst({
    columns: {
      modificationTimestamp: true,
    },
    orderBy: (table, { desc }) => desc(table.modificationTimestamp),
  });

  return result?.modificationTimestamp ?? null;
}
