import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { members } from '@kws/schema';

import { chunkArray, getUpsertSetFields } from '@/lib/utils/helpers';
import type { MappedMember } from '../maps/member.mapper';

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

export async function upsertMembers(
  data: (typeof members.$inferInsert)[]
) {
  if (data.length === 0) return;

  const batches = chunkArray(data, 1000);
  const setFields = getUpsertSetFields(members, ['memberMlsId', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(members)
        .values(batch)
        .onConflictDoUpdate({
          target: members.memberMlsId,
          set: setFields,
        });
    }
  });
}