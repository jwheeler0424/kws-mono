import { eq } from 'drizzle-orm';

import { env } from '@kws/config';
import { mlsMedia, properties, propertyRooms, propertyUnitTypes } from '@kws/schema';

import { db } from '@/lib/database';
import { chunkArray, getUpsertSetFields } from '@/lib/utils/helpers';
import type { MappedMedia } from '../maps/media.mapper';
import type {
  MappedProperty,
  MappedPropertyRoom,
  MappedPropertyUnitType,
} from '../maps/property.mapper';
import { upsertMlsMedia } from './media.repository';

export interface PropertyChildren {
  media: MappedMedia[];
  rooms: MappedPropertyRoom[];
  unitTypes: MappedPropertyUnitType[];
}

export const getLatestPropertyTimestamp = async () => {
  const result = await db.query.properties.findFirst({
    columns: {
      modificationTimestamp: true
    },
    orderBy: (properties, { desc }) => desc(properties.modificationTimestamp),
  });
  return result?.modificationTimestamp ?? env.MLS_START_DATE;
};

export async function upsertSingleProperty(record: MappedProperty): Promise<void> {
  const { listingKey, media, rooms, unitTypes, ...rest } = record;
  await db
    .insert(properties)
    .values({ listingKey, ...rest })
    .onConflictDoUpdate({
      target: properties.listingKey,
      set: { ...rest, updatedAt: new Date() },
    });

  await Promise.all([
    media.length > 0 ? upsertMlsMedia(media) : Promise.resolve(),
    rooms.length > 0 ? upsertPropertyRooms(rooms) : Promise.resolve(),
    unitTypes.length > 0 ? upsertPropertyUnitTypes(unitTypes) : Promise.resolve(),
  ])
}


/**
 * Soft-deactivate a property. Sets mlgCanView=false, deletedAt=now.
 * Child rows (media, rooms, unitTypes) remain and are filtered by parent visibility/status.
 */
export async function deactivateProperty(listingKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(properties)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(properties.listingKey, listingKey));
}

export async function upsertProperties(
  data: (typeof properties.$inferInsert)[]
) {
  if (data.length === 0) return;

  const batches = chunkArray(data, 250);
  const setFields = getUpsertSetFields(properties, ['listingKey', 'createdAt', 'searchVector']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(properties)
        .values(batch)
        .onConflictDoUpdate({
          target: properties.listingKey,
          set: setFields,
        });
    }
  });
}


export async function upsertPropertyRooms(data: (typeof propertyRooms.$inferInsert)[]) {
  if (data.length === 0) return;

  const batches = chunkArray(data, 2000);
  const setFields = getUpsertSetFields(propertyRooms, ['roomKey', 'searchVector', 'createdAt']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(propertyRooms)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyRooms.roomKey,
          set: setFields,
        });
    }
  });
}

export async function upsertPropertyUnitTypes(data: (typeof propertyUnitTypes.$inferInsert)[]) {
  if (data.length === 0) return;

  const batches = chunkArray(data, 2000);
  const setFields = getUpsertSetFields(propertyUnitTypes, ['unitTypeKey', 'searchVector', 'createdAt']);

  await db.transaction(async (tx) => {
    for (const batch of batches) {
      await tx
        .insert(propertyUnitTypes)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyUnitTypes.unitTypeKey,
          set: setFields,
        });
    }
  });
}

export async function processMlsPropertiesPayload(data: MappedProperty[]) {
  if (data.length === 0) return;

  // 1. Initialize empty arrays to hold our flattened, normalized data
  const allProperties: (typeof properties.$inferInsert)[] = [];
  const allMedia: (typeof mlsMedia.$inferInsert)[] = [];
  const allRooms: (typeof propertyRooms.$inferInsert)[] = [];
  const allUnitTypes: (typeof propertyUnitTypes.$inferInsert)[] = [];

  // 2. Extract and separate the data
  for (const item of data) {
    // Destructure out the relations. 
    // 'propertyData' now strictly contains ONLY valid columns for the properties table.
    const { media, rooms, unitTypes, ...propertyData } = item;

    allProperties.push(propertyData);

    // 3. Extract, flatten, and strictly enforce Foreign Keys
    if (media && media.length > 0) {
      allMedia.push(...media);
    }

    if (rooms && rooms.length > 0) {
      allRooms.push(...rooms);
    }

    if (unitTypes && unitTypes.length > 0) {
      allUnitTypes.push(...unitTypes);
    }
  }

  // 4. Execute the Upserts in relational order
  console.log(`Upserting ${allProperties.length} properties...`);

  // MUST await the parent table first to satisfy foreign key constraints
  await upsertProperties(allProperties);

  console.log(`Properties complete. Upserting nested relational data...`);

  // Children can be upserted concurrently since they don't depend on each other
  await Promise.all([
    allMedia.length > 0 ? upsertMlsMedia(allMedia) : Promise.resolve(),
    allRooms.length > 0 ? upsertPropertyRooms(allRooms) : Promise.resolve(),
    allUnitTypes.length > 0 ? upsertPropertyUnitTypes(allUnitTypes) : Promise.resolve(),
  ]);

  console.log('✅ Mass upsert pipeline complete!');
}