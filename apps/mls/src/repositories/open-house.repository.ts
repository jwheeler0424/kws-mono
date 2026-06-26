import { and, eq, isNull, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { openHouses } from '@kws/schema';

import type { MappedOpenHouse } from '../maps/open-house.mapper';

export async function upsertOpenHouse(record: MappedOpenHouse): Promise<void> {
  const { openHouseKey, ...rest } = record;
  await db
    .insert(openHouses)
    .values({ openHouseKey, ...rest })
    .onConflictDoUpdate({
      target: openHouses.openHouseKey,
      set: { ...rest, updatedAt: new Date() },
    });
}

/**
 * Soft-deactivate all open houses for a listing.
 * Called when a property is soft-deactivated, since the FK cascade only fires
 * on hard delete — not on the soft active=false path.
 */
export async function pruneOpenHousesForListing(listingKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(openHouses)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(openHouses.listingKey, listingKey));
}

export async function deactivateOpenHouse(openHouseKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(openHouses)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(openHouses.openHouseKey, openHouseKey));
}

export interface OpenHouseMissingReference {
  openHouseKey: string;
  listingKey: string | null;
  listingId: string | null;
  originatingSystemName: string | null;
}

export async function listOpenHousesMissingListingReference(
  osn: string,
  limit = 500,
): Promise<OpenHouseMissingReference[]> {
  const rows = await db.query.openHouses.findMany({
    where: {
      originatingSystemName: osn,
      listingKey: { isNull: true },
      mlgCanView: true,
      deletedAt: { isNull: true },
    },
    columns: {
      openHouseKey: true,
      listingKey: true,
      listingId: true,
      originatingSystemName: true,
    },
    limit,
  });

  return rows;
}

export async function assignOpenHouseListingReference(
  openHouseKey: string,
  listingKey: string,
): Promise<void> {
  await db
    .update(openHouses)
    .set({ listingKey, updatedAt: new Date() })
    .where(eq(openHouses.openHouseKey, openHouseKey));
}

export async function countOpenHousesMissingListingReference(osn: string): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(openHouses)
    .where(
      and(
        eq(openHouses.originatingSystemName, osn),
        isNull(openHouses.listingKey),
        eq(openHouses.mlgCanView, true),
        isNull(openHouses.deletedAt),
      ),
    );
  return result?.count ?? 0;
}
