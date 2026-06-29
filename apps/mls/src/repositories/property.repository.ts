import { eq } from 'drizzle-orm';

import { env } from '@kws/config';
import { mlsMedia, properties, propertyRooms, propertyUnitTypes } from '@kws/schema';

import { db } from '@/lib/database';
import { dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';
import type { MappedMedia } from '../maps/media.mapper';
import type {
  MappedProperty,
  MappedPropertyRoom,
  MappedPropertyUnitType,
} from '../maps/property.mapper';
import { upsertMlsMedia } from './media.repository';

const PROPERTY_BATCH_SIZE = 100;
const PROPERTY_UPSERT_BATCH_SIZE = 150;
const CHILD_UPSERT_BATCH_SIZE = 750;
const CHILD_UPSERT_CONCURRENCY = 2;

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
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.listingKey);
  const setFields = getUpsertSetFields(properties, ['listingKey', 'createdAt', 'searchVector']);
  const maxTimestamp = deduped.reduce((max, row) => {
    const rowTimestamp = row.modificationTimestamp ? new Date(row.modificationTimestamp) : new Date(0);
    return rowTimestamp > max ? rowTimestamp : max;
  }, new Date(0));

  for (let i = 0; i < deduped.length; i += PROPERTY_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + PROPERTY_UPSERT_BATCH_SIZE);
    await db.transaction(async (tx) => {
      await tx
        .insert(properties)
        .values(batch)
        .onConflictDoUpdate({
          target: properties.listingKey,
          set: setFields,
        });
    });
  }

  return maxTimestamp;
}

async function runWithConcurrencyLimit(tasks: Array<() => Promise<Date | void>>, limit: number): Promise<void> {
  if (tasks.length === 0) return;

  const active = new Set<Promise<Date | void>>();

  for (const task of tasks) {
    const promise = task().finally(() => {
      active.delete(promise);
    });
    active.add(promise);

    if (active.size >= limit) {
      await Promise.race(active);
    }
  }

  await Promise.all(active);
}


export async function upsertPropertyRooms(data: (typeof propertyRooms.$inferInsert)[]) {
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.roomKey);
  const setFields = getUpsertSetFields(propertyRooms, ['roomKey', 'searchVector', 'createdAt']);

  for (let i = 0; i < deduped.length; i += CHILD_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + CHILD_UPSERT_BATCH_SIZE);
    await db.transaction(async (tx) => {
      await tx
        .insert(propertyRooms)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyRooms.roomKey,
          set: setFields,
        });
    });
  }
}

export async function upsertPropertyUnitTypes(data: (typeof propertyUnitTypes.$inferInsert)[]) {
  if (data.length === 0) return;

  const deduped = dedupeByKey(data, (row) => row.unitTypeKey);
  const setFields = getUpsertSetFields(propertyUnitTypes, ['unitTypeKey', 'searchVector', 'createdAt']);

  for (let i = 0; i < deduped.length; i += CHILD_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + CHILD_UPSERT_BATCH_SIZE);
    await db.transaction(async (tx) => {
      await tx
        .insert(propertyUnitTypes)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyUnitTypes.unitTypeKey,
          set: setFields,
        });
    });
  }
}

export async function processMlsPropertiesPayload(data: MappedProperty[]) {
  if (data.length === 0) return new Date(0);
  let maxTimestamp = new Date(0);

  for (let i = 0; i < data.length; i += PROPERTY_BATCH_SIZE) {
    const chunk = data.slice(i, i + PROPERTY_BATCH_SIZE);

    const chunkProperties: (typeof properties.$inferInsert)[] = [];
    const chunkMedia: (typeof mlsMedia.$inferInsert)[] = [];
    const chunkRooms: (typeof propertyRooms.$inferInsert)[] = [];
    const chunkUnitTypes: (typeof propertyUnitTypes.$inferInsert)[] = [];

    for (const item of chunk) {
      const { media, rooms, unitTypes, ...propertyData } = item;
      chunkProperties.push(propertyData);

      if (media.length > 0) {
        chunkMedia.push(...media);
      }
      if (rooms.length > 0) {
        chunkRooms.push(...rooms);
      }
      if (unitTypes.length > 0) {
        chunkUnitTypes.push(...unitTypes);
      }
    }

    const localMaxTimestamp = await upsertProperties(chunkProperties);

    const childTasks: Array<() => Promise<Date | void>> = [];
    if (chunkMedia.length > 0) {
      childTasks.push(() => upsertMlsMedia(chunkMedia));
    }
    if (chunkRooms.length > 0) {
      childTasks.push(() => upsertPropertyRooms(chunkRooms));
    }
    if (chunkUnitTypes.length > 0) {
      childTasks.push(() => upsertPropertyUnitTypes(chunkUnitTypes));
    }

    await runWithConcurrencyLimit(childTasks, CHILD_UPSERT_CONCURRENCY);

    maxTimestamp = localMaxTimestamp > maxTimestamp ? localMaxTimestamp : maxTimestamp;
  }
  return maxTimestamp;
}