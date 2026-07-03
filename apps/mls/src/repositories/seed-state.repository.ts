import { db } from '@/lib/database';

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
