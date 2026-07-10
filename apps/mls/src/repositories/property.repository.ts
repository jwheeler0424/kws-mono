import { mlsMedia, properties, propertyRooms, propertyUnitTypes } from '@kws/schema';
import { eq, getColumns, sql } from 'drizzle-orm';

import { MLS_PROPERTY_DEFAULTS } from '@/lib/constants';
import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { dedupeByKey, getUpsertSetFields } from '@/lib/utils/helpers';

import type { MappedMedia } from '../maps/media.mapper';
import type {
  MappedProperty,
  MappedPropertyRoom,
  MappedPropertyUnitType,
} from '../maps/property.mapper';

import { upsertMlsMedia } from './media.repository';

const PROPERTY_BATCH_SIZE = MLS_PROPERTY_DEFAULTS.processBatchSize;
const PROPERTY_UPSERT_BATCH_SIZE = MLS_PROPERTY_DEFAULTS.upsertBatchSize;
const CHILD_UPSERT_BATCH_SIZE = MLS_PROPERTY_DEFAULTS.childUpsertBatchSize;
const CHILD_UPSERT_CONCURRENCY = MLS_PROPERTY_DEFAULTS.childUpsertConcurrency;

const STAGING_TABLE_NAME = 'mls_property_stage';

const PROPERTY_UPSERT_EXCLUDED_COLUMNS = new Set(['listingKey', 'createdAt', 'searchVector']);
const PROPERTY_NON_INSERTABLE_COLUMNS = new Set(['searchVector']);

async function applySeedStagingSettings(
  execute: (query: string) => Promise<unknown>,
): Promise<void> {
  if (MLS_PROPERTY_DEFAULTS.seedStagingSyncCommitOff) {
    await execute('SET LOCAL synchronous_commit TO OFF');
  }
  if (MLS_PROPERTY_DEFAULTS.seedStagingStatementTimeoutMs) {
    await execute(
      `SET LOCAL statement_timeout TO '${MLS_PROPERTY_DEFAULTS.seedStagingStatementTimeoutMs}ms'`,
    );
  }
  if (MLS_PROPERTY_DEFAULTS.seedStagingLockTimeoutMs) {
    await execute(
      `SET LOCAL lock_timeout TO '${MLS_PROPERTY_DEFAULTS.seedStagingLockTimeoutMs}ms'`,
    );
  }
  if (MLS_PROPERTY_DEFAULTS.seedStagingWorkMemMb) {
    await execute(`SET LOCAL work_mem TO '${MLS_PROPERTY_DEFAULTS.seedStagingWorkMemMb}MB'`);
  }
  if (MLS_PROPERTY_DEFAULTS.seedStagingJitOff) {
    await execute('SET LOCAL jit TO OFF');
  }
}

function getPropertyUpdateWhereSql(): string {
  return [
    'excluded.modification_timestamp is distinct from properties.modification_timestamp',
    'excluded.standard_status is distinct from properties.standard_status',
    'excluded.mls_status is distinct from properties.mls_status',
    'excluded.list_price is distinct from properties.list_price',
    'excluded.close_price is distinct from properties.close_price',
    'excluded.photos_change_timestamp is distinct from properties.photos_change_timestamp',
    'excluded.deleted_at is distinct from properties.deleted_at',
    'excluded.mlg_can_view is distinct from properties.mlg_can_view',
  ].join(' or ');
}

function getPropertyInsertColumnNames(): string[] {
  const columns = getColumns(properties);
  return Object.entries(columns)
    .filter(([key]) => !PROPERTY_NON_INSERTABLE_COLUMNS.has(key))
    .map(([, column]) => column.name);
}

function getPropertyInsertColumnsSql(): string {
  return getPropertyInsertColumnNames()
    .map((name) => `"${name}"`)
    .join(', ');
}

function getPropertyUpsertAssignmentsSql(): string {
  const columns = getColumns(properties);
  return Object.entries(columns)
    .filter(([key]) => !PROPERTY_UPSERT_EXCLUDED_COLUMNS.has(key))
    .map(([, column]) => `"${column.name}" = EXCLUDED."${column.name}"`)
    .join(', ');
}

function toDbNamedPropertyRow(row: typeof properties.$inferInsert): Record<string, unknown> {
  const columns = getColumns(properties);
  const payload: Record<string, unknown> = {};

  for (const [key, column] of Object.entries(columns)) {
    if (PROPERTY_NON_INSERTABLE_COLUMNS.has(key)) {
      continue;
    }

    const value = row[key as keyof typeof row];
    if (value !== undefined) {
      payload[column.name] = value;
    }
  }

  return payload;
}

function getAppliedRowCount(result: unknown): number {
  const rows = (result as { rows?: unknown[] } | null | undefined)?.rows;
  return Array.isArray(rows) ? rows.length : 0;
}

export interface PropertyChildren {
  media: MappedMedia[];
  rooms: MappedPropertyRoom[];
  unitTypes: MappedPropertyUnitType[];
}

export const getLatestPropertyTimestamp = async () => {
  const result = await db.query.properties.findFirst({
    columns: {
      modificationTimestamp: true,
    },
    orderBy: (properties, { desc }) => desc(properties.modificationTimestamp),
  });
  return result?.modificationTimestamp ?? null;
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
  ]);
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
  data: (typeof properties.$inferInsert)[],
  options?: {
    useSeedStaging?: boolean;
  },
) {
  if (data.length === 0) return new Date(0);

  const deduped = dedupeByKey(data, (row) => row.listingKey);
  const setFields = getUpsertSetFields(properties, ['listingKey', 'createdAt', 'searchVector']);
  // const insertColumnNames = getPropertyInsertColumnNames();
  const insertColumnsSql = getPropertyInsertColumnsSql();
  const updateWhereSql = getPropertyUpdateWhereSql();
  const updateWhere = sql`
    ${sql.raw(updateWhereSql)}
  `;
  const maxTimestamp = deduped.reduce((max, row) => {
    const rowTimestamp = row.modificationTimestamp
      ? new Date(row.modificationTimestamp)
      : new Date(0);
    return rowTimestamp > max ? rowTimestamp : max;
  }, new Date(0));
  const useSeedStaging = options?.useSeedStaging ?? false;
  let attempted = 0;
  let applied = 0;

  if (useSeedStaging) {
    await db.transaction(async (tx) => {
      await applySeedStagingSettings((query) => tx.execute(sql.raw(query)));

      await tx.execute(
        sql.raw(
          `CREATE TEMP TABLE IF NOT EXISTS ${STAGING_TABLE_NAME} (LIKE properties INCLUDING DEFAULTS) ON COMMIT DROP`,
        ),
      );

      for (let i = 0; i < deduped.length; i += PROPERTY_UPSERT_BATCH_SIZE) {
        const batch = deduped.slice(i, i + PROPERTY_UPSERT_BATCH_SIZE);
        attempted += batch.length;

        await tx.execute(sql.raw(`TRUNCATE TABLE ${STAGING_TABLE_NAME}`));

        const jsonPayload = JSON.stringify(batch.map(toDbNamedPropertyRow));
        await tx.execute(sql`
          INSERT INTO ${sql.raw(STAGING_TABLE_NAME)} (${sql.raw(insertColumnsSql)})
          SELECT ${sql.raw(insertColumnsSql)}
          FROM json_populate_recordset(NULL::properties, ${jsonPayload}::json)
        `);

        const mergeResult = await tx.execute(sql`
          INSERT INTO properties (${sql.raw(insertColumnsSql)})
          SELECT ${sql.raw(insertColumnsSql)} FROM ${sql.raw(STAGING_TABLE_NAME)}
          ON CONFLICT (listing_key) DO UPDATE
          SET ${sql.raw(getPropertyUpsertAssignmentsSql())}
          WHERE ${updateWhere}
          RETURNING listing_key
        `);

        applied += getAppliedRowCount(mergeResult);
      }
    });

    logger.trace('property upsert effectiveness', {
      path: 'seed-staging',
      attempted,
      applied,
      skippedNoop: Math.max(0, attempted - applied),
    });

    return maxTimestamp;
  }

  for (let i = 0; i < deduped.length; i += PROPERTY_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + PROPERTY_UPSERT_BATCH_SIZE);
    attempted += batch.length;
    await db.transaction(async (tx) => {
      const changedRows = await tx
        .insert(properties)
        .values(batch)
        .onConflictDoUpdate({
          target: properties.listingKey,
          set: setFields,
          setWhere: updateWhere,
        })
        .returning({ listingKey: properties.listingKey });

      applied += changedRows.length;
    });
  }

  logger.trace('property upsert effectiveness', {
    path: useSeedStaging ? 'seed-staging' : 'direct-upsert',
    attempted,
    applied,
    skippedNoop: Math.max(0, attempted - applied),
  });

  return maxTimestamp;
}

async function runWithConcurrencyLimit(
  tasks: Array<() => Promise<Date | void>>,
  limit: number,
): Promise<void> {
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
  const updateWhere = sql`
    excluded.room_type is distinct from ${propertyRooms.roomType}
    or excluded.room_dimensions is distinct from ${propertyRooms.roomDimensions}
    or excluded.room_description is distinct from ${propertyRooms.roomDescription}
    or excluded.room_level is distinct from ${propertyRooms.roomLevel}
    or excluded.deleted_at is distinct from ${propertyRooms.deletedAt}
  `;
  let attempted = 0;
  let applied = 0;

  for (let i = 0; i < deduped.length; i += CHILD_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + CHILD_UPSERT_BATCH_SIZE);
    attempted += batch.length;
    await db.transaction(async (tx) => {
      const changedRows = await tx
        .insert(propertyRooms)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyRooms.roomKey,
          set: setFields,
          setWhere: updateWhere,
        })
        .returning({ roomKey: propertyRooms.roomKey });

      applied += changedRows.length;
    });
  }

  logger.trace('property rooms upsert effectiveness', {
    attempted,
    applied,
    skippedNoop: Math.max(0, attempted - applied),
  });
}

export async function upsertPropertyUnitTypes(data: (typeof propertyUnitTypes.$inferInsert)[]) {
  if (data.length === 0) return;

  const deduped = dedupeByKey(data, (row) => row.unitTypeKey);
  const setFields = getUpsertSetFields(propertyUnitTypes, [
    'unitTypeKey',
    'searchVector',
    'createdAt',
  ]);
  const updateWhere = sql`
    excluded.unit_type_beds_total is distinct from ${propertyUnitTypes.unitTypeBedsTotal}
    or excluded.unit_type_baths_total is distinct from ${propertyUnitTypes.unitTypeBathsTotal}
    or excluded.unit_type_actual_rent is distinct from ${propertyUnitTypes.unitTypeActualRent}
    or excluded.nwm is distinct from ${propertyUnitTypes.NWM}
    or excluded.deleted_at is distinct from ${propertyUnitTypes.deletedAt}
  `;
  let attempted = 0;
  let applied = 0;

  for (let i = 0; i < deduped.length; i += CHILD_UPSERT_BATCH_SIZE) {
    const batch = deduped.slice(i, i + CHILD_UPSERT_BATCH_SIZE);
    attempted += batch.length;
    await db.transaction(async (tx) => {
      const changedRows = await tx
        .insert(propertyUnitTypes)
        .values(batch)
        .onConflictDoUpdate({
          target: propertyUnitTypes.unitTypeKey,
          set: setFields,
          setWhere: updateWhere,
        })
        .returning({ unitTypeKey: propertyUnitTypes.unitTypeKey });

      applied += changedRows.length;
    });
  }

  logger.trace('property unit types upsert effectiveness', {
    attempted,
    applied,
    skippedNoop: Math.max(0, attempted - applied),
  });
}

export async function processMlsPropertiesPayload(
  data: MappedProperty[],
  options?: {
    useSeedStaging?: boolean;
  },
) {
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

    const localMaxTimestamp = await upsertProperties(chunkProperties, options);

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
