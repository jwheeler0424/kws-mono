import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { offices } from '@kws/schema';

import type { MappedMedia } from '../maps/media.mapper';
import type { MappedOffice } from '../maps/office.mapper';

import { splitIntoChunks } from '@/lib/utils';
import { reconcileResourceMediaBatch } from './resource-media.repository';

const OFFICE_UPSERT_CHUNK_SIZE = 250;

interface OfficeMediaBatchItem {
  officeKey: string;
  mediaRecords: MappedMedia[];
}

function buildOfficeConflictSet(record: MappedOffice): Record<string, unknown> {
  const set: Record<string, unknown> = {};

  for (const key of Object.keys(record)) {
    if (key === 'officeMlsId') {
      continue;
    }

    const column = (offices as unknown as Record<string, { name?: string }>)[key];
    const columnName = column?.name;
    if (!columnName) {
      continue;
    }

    set[key] = sql.raw(`excluded.${columnName}`);
  }

  set.updatedAt = new Date();
  return set;
}

function resolveOfficeTimestamp(record: MappedOffice): number {
  return record.modificationTimestamp?.getTime() ?? 0;
}

function dedupeOfficesByPrimaryKey(records: MappedOffice[]): MappedOffice[] {
  const deduped = new Map<string, MappedOffice>();

  for (const record of records) {
    const existing = deduped.get(record.officeMlsId);
    if (!existing || resolveOfficeTimestamp(record) >= resolveOfficeTimestamp(existing)) {
      deduped.set(record.officeMlsId, record);
    }
  }

  return [...deduped.values()];
}

export async function upsertOffices(records: MappedOffice[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  for (const chunk of splitIntoChunks(
    dedupeOfficesByPrimaryKey(records),
    OFFICE_UPSERT_CHUNK_SIZE,
  )) {
    const sample = chunk[0];
    if (!sample) {
      continue;
    }

    await db
      .insert(offices)
      .values(chunk)
      .onConflictDoUpdate({
        target: offices.officeMlsId,
        set: buildOfficeConflictSet(sample),
      });
  }
}

export async function upsertOffice(record: MappedOffice): Promise<void> {
  const { officeMlsId, ...rest } = record;
  await db
    .insert(offices)
    .values({ officeMlsId, ...rest })
    .onConflictDoUpdate({
      target: offices.officeMlsId,
      set: { ...rest, updatedAt: new Date() },
    });
}

/**
 * Full-replacement reconcile: delete all existing media for this office,
 * then insert the new set. Pass an empty array to clear media.
 */
export async function reconcileOfficeMedia(
  officeKey: string,
  mediaRecords: MappedMedia[],
): Promise<void> {
  await reconcileResourceMediaBatch([{ resourceRecordKey: officeKey, mediaRecords }]);
}

export async function reconcileOfficeMediaBatch(items: OfficeMediaBatchItem[]): Promise<void> {
  await reconcileResourceMediaBatch(
    items.map((item) => ({
      resourceRecordKey: item.officeKey,
      mediaRecords: item.mediaRecords,
    })),
  );
}

export async function deactivateOffice(officeKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(offices)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(offices.officeKey, officeKey));
}
