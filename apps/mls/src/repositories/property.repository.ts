import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { mlsMedia, properties, propertyRooms, propertyUnitTypes } from '@kws/schema';

import type { MappedMedia } from '../maps/media.mapper';
import type {
  MappedProperty,
  MappedPropertyRoom,
  MappedPropertyUnitType,
} from '../maps/property.mapper';

import { splitIntoChunks } from '@/lib/utils';
import { buildMlsMediaConflictSet } from './mls-media-conflict-set';

type PropertyInsert = typeof properties.$inferInsert;
const CHILD_UPSERT_CHUNK_SIZE = 250;
const PROPERTY_UPSERT_CHUNK_SIZE = 200;

function buildPropertyConflictSet(record: MappedProperty): Record<string, unknown> {
  const set: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    if (key === 'listingKey') {
      continue;
    }

    const column = (properties as unknown as Record<string, { name?: string }>)[key];
    const columnName = column?.name;
    if (!columnName) {
      continue;
    }

    set[key] = sql.raw(`excluded.${columnName}`);
  }

  set.updatedAt = new Date();
  return set;
}

export async function upsertProperties(records: MappedProperty[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  for (const chunk of splitIntoChunks(records, PROPERTY_UPSERT_CHUNK_SIZE)) {
    const sample = chunk[0];
    if (!sample) {
      continue;
    }

    await db
      .insert(properties)
      .values(chunk as PropertyInsert[])
      .onConflictDoUpdate({
        target: properties.listingKey,
        set: buildPropertyConflictSet(sample),
      });
  }
}

export async function upsertProperty(record: MappedProperty): Promise<void> {
  const { listingKey: _listingKey, ...rest } = record;
  const updateValues = {
    ...rest,
    updatedAt: new Date(),
  } as Partial<PropertyInsert>;
  await db
    .insert(properties)
    .values(record as PropertyInsert)
    .onConflictDoUpdate({
      target: properties.listingKey,
      set: updateValues,
    });
}

export interface PropertyChildren {
  media: MappedMedia[];
  rooms: MappedPropertyRoom[];
  unitTypes: MappedPropertyUnitType[];
}

interface PropertyChildrenBatchItem {
  listingKey: string;
  children: PropertyChildren;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string): T[] {
  const deduped = new Map<string, T>();

  for (const item of items) {
    deduped.set(getKey(item), item);
  }

  return [...deduped.values()];
}

async function reconcilePropertyChildrenWithinTransaction(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  listingKey: string,
  children: PropertyChildren,
): Promise<void> {
  const dedupedMedia = dedupeByKey(children.media, (item) => item.mediaKey);
  const dedupedRooms = dedupeByKey(children.rooms, (item) => item.roomKey);
  const dedupedUnitTypes = dedupeByKey(children.unitTypes, (item) => item.unitTypeKey);

  const incomingMediaKeys = dedupedMedia.map((item) => item.mediaKey);
  if (incomingMediaKeys.length > 0) {
    await tx
      .delete(mlsMedia)
      .where(
        and(
          eq(mlsMedia.resourceRecordKey, listingKey),
          notInArray(mlsMedia.mediaKey, incomingMediaKeys),
        ),
      );
  } else {
    await tx.delete(mlsMedia).where(eq(mlsMedia.resourceRecordKey, listingKey));
  }
  if (dedupedMedia.length > 0) {
    const now = new Date();
    for (const chunk of splitIntoChunks(dedupedMedia, CHILD_UPSERT_CHUNK_SIZE)) {
      await tx
        .insert(mlsMedia)
        .values(chunk)
        .onConflictDoUpdate({
          target: mlsMedia.mediaKey,
          set: buildMlsMediaConflictSet(now),
        });
    }
  }

  const incomingRoomKeys = dedupedRooms.map((item) => item.roomKey);
  if (incomingRoomKeys.length > 0) {
    await tx
      .delete(propertyRooms)
      .where(
        and(
          eq(propertyRooms.listingKey, listingKey),
          notInArray(propertyRooms.roomKey, incomingRoomKeys),
        ),
      );
  } else {
    await tx.delete(propertyRooms).where(eq(propertyRooms.listingKey, listingKey));
  }
  if (dedupedRooms.length > 0) {
    const now = new Date();
    for (const chunk of splitIntoChunks(dedupedRooms, CHILD_UPSERT_CHUNK_SIZE)) {
      await tx
        .insert(propertyRooms)
        .values(chunk)
        .onConflictDoUpdate({
          target: propertyRooms.roomKey,
          set: {
            listingKey: sql`excluded.listing_key`,
            roomDescription: sql`excluded.room_description`,
            roomDimensions: sql`excluded.room_dimensions`,
            roomLength: sql`excluded.room_length`,
            roomLengthWidthUnits: sql`excluded.room_length_width_units`,
            roomLevel: sql`excluded.room_level`,
            roomType: sql`excluded.room_type`,
            roomWidth: sql`excluded.room_width`,
            deletedAt: sql`excluded.deleted_at`,
            updatedAt: now,
          },
        });
    }
  }

  const incomingUnitTypeKeys = dedupedUnitTypes.map((item) => item.unitTypeKey);
  if (incomingUnitTypeKeys.length > 0) {
    await tx
      .delete(propertyUnitTypes)
      .where(
        and(
          eq(propertyUnitTypes.listingKey, listingKey),
          notInArray(propertyUnitTypes.unitTypeKey, incomingUnitTypeKeys),
        ),
      );
  } else {
    await tx.delete(propertyUnitTypes).where(eq(propertyUnitTypes.listingKey, listingKey));
  }
  if (dedupedUnitTypes.length > 0) {
    const now = new Date();
    for (const chunk of splitIntoChunks(dedupedUnitTypes, CHILD_UPSERT_CHUNK_SIZE)) {
      await tx
        .insert(propertyUnitTypes)
        .values(chunk)
        .onConflictDoUpdate({
          target: propertyUnitTypes.unitTypeKey,
          set: {
            listingKey: sql`excluded.listing_key`,
            unitTypeBedsTotal: sql`excluded.unit_type_beds_total`,
            unitTypeBathsTotal: sql`excluded.unit_type_baths_total`,
            unitTypeActualRent: sql`excluded.unit_type_actual_rent`,
            NWM: sql`excluded.nwm`,
            deletedAt: sql`excluded.deleted_at`,
            updatedAt: now,
          },
        });
    }
  }
}

/**
 * Full-replacement reconcile for all three property child collections.
 * Runs as a single transaction: delete existing rows then batch-upsert new ones.
 * Each collection is inserted in a single DB statement (one round-trip per
 * collection) instead of N individual inserts.
 * Passing empty arrays clears the collection.
 */
export async function reconcilePropertyChildren(
  listingKey: string,
  children: PropertyChildren,
): Promise<void> {
  await db.transaction(async (tx) => {
    await reconcilePropertyChildrenWithinTransaction(tx, listingKey, children);
  });
}

export async function reconcilePropertyChildrenBatch(
  items: PropertyChildrenBatchItem[],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  await db.transaction(async (tx) => {
    for (const item of items) {
      await reconcilePropertyChildrenWithinTransaction(tx, item.listingKey, item.children);
    }
  });
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

export async function getExistingPropertyListingKeys(listingKeys: string[]): Promise<string[]> {
  if (listingKeys.length === 0) {
    return [];
  }

  const rows = await db
    .select({ listingKey: properties.listingKey })
    .from(properties)
    .where(inArray(properties.listingKey, listingKeys));

  return rows.map((row) => row.listingKey);
}

export async function getExistingPropertyListingKeysByOsn(
  listingKeys: string[],
  osn?: string,
): Promise<string[]> {
  if (listingKeys.length === 0) {
    return [];
  }

  const rows = await db
    .select({ listingKey: properties.listingKey })
    .from(properties)
    .where(
      and(
        inArray(properties.listingKey, listingKeys),
        ...(osn ? [eq(properties.originatingSystemName, osn)] : []),
      ),
    );

  return rows.map((row) => row.listingKey);
}

export interface PropertyListingReference {
  listingKey: string;
  listingId: string | null;
}

export async function findPropertyReferenceByListingKey(
  listingKey: string,
  osn?: string,
): Promise<PropertyListingReference | null> {
  const row = await db.query.properties.findFirst({
    where: {
      listingKey,
      ...(osn ? { originatingSystemName: osn } : {}),
    },
    columns: {
      listingKey: true,
      listingId: true,
    },
  });

  return row ?? null;
}

export async function findPropertyReferenceByListingId(
  listingId: string,
  osn?: string,
): Promise<PropertyListingReference | null> {
  const row = await db.query.properties.findFirst({
    where: {
      listingId,
      ...(osn ? { originatingSystemName: osn } : {}),
    },
    columns: {
      listingKey: true,
      listingId: true,
    },
  });

  return row ?? null;
}
