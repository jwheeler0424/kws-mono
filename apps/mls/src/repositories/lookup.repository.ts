import { eq } from 'drizzle-orm';

import { db } from '@/lib/database';
import { lookups } from '@kws/schema';

import type { MappedLookup } from '../maps/lookup.mapper';

export async function upsertLookup(record: MappedLookup): Promise<void> {
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
