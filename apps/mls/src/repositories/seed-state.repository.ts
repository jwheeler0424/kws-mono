import { mlsSyncCursors } from '@kws/schema';
import { and, eq, inArray } from 'drizzle-orm';

import { MLS_RESOURCE_NAMES } from '@/lib/constants';
import { db } from '@/lib/database';

const INITIAL_SEED_RESOURCE = 'InitialSeed';

export async function markInitialSeedComplete(originatingSystemName: string): Promise<void> {
  const values = { lastRunStatus: 'success', lastRunAt: new Date(), updatedAt: new Date() };
  await db
    .insert(mlsSyncCursors)
    .values({ resource: INITIAL_SEED_RESOURCE, originatingSystemName, ...values })
    .onConflictDoUpdate({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
      set: values,
    });
}

/**
 * True once a full seed finished, or every core resource has completed a successful delta run
 * (which covers databases seeded before this marker existed and seeds resumed after a crash).
 */
export async function isInitialSeedComplete(originatingSystemName: string): Promise<boolean> {
  const rows = await db
    .select({ resource: mlsSyncCursors.resource, status: mlsSyncCursors.lastRunStatus })
    .from(mlsSyncCursors)
    .where(
      and(
        eq(mlsSyncCursors.originatingSystemName, originatingSystemName),
        inArray(mlsSyncCursors.resource, [INITIAL_SEED_RESOURCE, ...MLS_RESOURCE_NAMES]),
      ),
    );
  if (rows.some((row) => row.resource === INITIAL_SEED_RESOURCE && row.status === 'success')) {
    return true;
  }
  const succeeded = new Set(
    rows.filter((row) => row.status === 'success').map((row) => row.resource),
  );
  if (!MLS_RESOURCE_NAMES.every((resource) => succeeded.has(resource))) return false;
  await markInitialSeedComplete(originatingSystemName);
  return true;
}

/**
 * Treat any existing MLS core record as already-seeded state.
 */
export async function hasAnyMlsRecords(): Promise<boolean> {
  const [lookup, office, member, property, openHouse] = await Promise.all([
    db.query.lookups.findFirst({
      columns: { lookupKey: true },
    }),
    db.query.offices.findFirst({
      columns: { officeMlsId: true },
    }),
    db.query.members.findFirst({
      columns: { memberMlsId: true },
    }),
    db.query.properties.findFirst({
      columns: { listingKey: true },
    }),
    db.query.openHouses.findFirst({
      columns: { openHouseKey: true },
    }),
  ]);

  return Boolean(lookup || office || member || property || openHouse);
}
