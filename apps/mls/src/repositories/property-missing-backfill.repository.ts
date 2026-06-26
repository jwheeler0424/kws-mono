import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { mlsPropertyMissingBackfill } from '@kws/schema';

interface MissingCandidate {
  osn: string;
  listingKey: string;
  discoveredModificationTimestamp: Date;
}

type MissingBackfillInsert = typeof mlsPropertyMissingBackfill.$inferInsert;

export async function upsertMissingPropertyCandidates(
  candidates: MissingCandidate[],
): Promise<void> {
  if (candidates.length === 0) {
    return;
  }

  const now = new Date();
  const rows = candidates.map((candidate) => ({
    originatingSystemName: candidate.osn,
    listingKey: candidate.listingKey,
    discoveredModificationTimestamp: candidate.discoveredModificationTimestamp,
    status: 'pending',
    firstSeenAt: now,
    lastSeenAt: now,
    updatedAt: now,
  }));

  await db
    .insert(mlsPropertyMissingBackfill)
    .values(rows satisfies MissingBackfillInsert[])
    .onConflictDoUpdate({
      target: [
        mlsPropertyMissingBackfill.originatingSystemName,
        mlsPropertyMissingBackfill.listingKey,
      ],
      set: {
        status: 'pending',
        lastSeenAt: now,
        discoveredModificationTimestamp: sql`LEAST(${mlsPropertyMissingBackfill.discoveredModificationTimestamp}, EXCLUDED.discovered_modification_timestamp)`,
        lastError: null,
        updatedAt: now,
      },
    });
}

export async function getOldestPendingMissingPropertyTimestamp(osn: string): Promise<Date | null> {
  const row = await db.query.mlsPropertyMissingBackfill.findFirst({
    where: {
      originatingSystemName: osn,
      status: 'pending',
    },
    orderBy: {
      discoveredModificationTimestamp: 'asc',
    },
  });

  return row?.discoveredModificationTimestamp ?? null;
}

export async function listPendingMissingPropertyKeys(
  osn: string,
  limit = 10_000,
): Promise<string[]> {
  const rows = await db.query.mlsPropertyMissingBackfill.findMany({
    where: {
      originatingSystemName: osn,
      status: 'pending',
    },
    columns: {
      listingKey: true,
    },
    limit,
  });

  return rows.map((row) => row.listingKey);
}

export async function countPendingMissingPropertyKeys(osn: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mlsPropertyMissingBackfill)
    .where(
      and(
        eq(mlsPropertyMissingBackfill.originatingSystemName, osn),
        eq(mlsPropertyMissingBackfill.status, 'pending'),
      ),
    );

  return row?.count ?? 0;
}

export async function markMissingPropertiesBackfilled(
  osn: string,
  listingKeys: string[],
): Promise<void> {
  if (listingKeys.length === 0) {
    return;
  }

  const now = new Date();
  await db
    .update(mlsPropertyMissingBackfill)
    .set({
      status: 'backfilled',
      backfilledAt: now,
      lastError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(mlsPropertyMissingBackfill.originatingSystemName, osn),
        inArray(mlsPropertyMissingBackfill.listingKey, listingKeys),
      ),
    );
}

export async function incrementPendingBackfillAttempt(osn: string): Promise<void> {
  const now = new Date();

  await db
    .update(mlsPropertyMissingBackfill)
    .set({
      backfillAttempts: sql`${mlsPropertyMissingBackfill.backfillAttempts} + 1`,
      updatedAt: now,
    })
    .where(
      and(
        eq(mlsPropertyMissingBackfill.originatingSystemName, osn),
        eq(mlsPropertyMissingBackfill.status, 'pending'),
      ),
    );
}

export async function markPendingMissingBackfillError(osn: string, message: string): Promise<void> {
  await db
    .update(mlsPropertyMissingBackfill)
    .set({
      lastError: message.slice(0, 5000),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(mlsPropertyMissingBackfill.originatingSystemName, osn),
        eq(mlsPropertyMissingBackfill.status, 'pending'),
      ),
    );
}
