import type { StandardStatus } from '@kws/schema';

import { members, offices, properties } from '@kws/schema';
import { and, eq, gte, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm';

import { db } from '@/lib/database';
import { MLS_MEDIA_URL_REFRESH_REQUIRED } from '@/lib/utils/media-url';

const ACTIVE_PROPERTY_STATUSES: readonly StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];
const KEY_QUERY_CHUNK_SIZE = 500;

// Must stay aligned with isFreshCachedMlsMediaUrl so workers and refresh agree on staleness.
const freshUrlClause = sql`(
  queued.media_url is not null
  and coalesce(
    to_timestamp(substring(queued.media_url from '[?&]expires=([0-9]+)')::double precision),
    queued.updated_at + interval '5 minutes'
  ) > now() + interval '30 seconds'
)`;

const publicLiveRowClause = sql`(
  queued.deleted_at is null
  and not (coalesce(queued.permission, '{}'::varchar[]) && ARRAY['Private']::varchar[])
)`;

const rowNeedsDownloadClause = sql`(
  queued.media_id is null
  or not exists (
    select 1 from media stored
    where stored.id = queued.media_id
      and stored.deleted_at is null
      and not coalesce(
        case
          when queued.downloaded_source_timestamp is not null
            then queued.media_modification_timestamp is distinct from queued.downloaded_source_timestamp
          else queued.media_modification_timestamp > stored.updated_at
        end,
        false
      )
  )
)`;

const rowNeedsUrlRefreshClause = sql`(
  ${publicLiveRowClause}
  and (queued.next_attempt_at is null or queued.next_attempt_at <= now())
  and (${rowNeedsDownloadClause} or queued.last_acquisition_error = ${MLS_MEDIA_URL_REFRESH_REQUIRED})
  and not ${freshUrlClause}
)`;

function hasRowNeedingUrlRefresh(parentKey: SQL): SQL {
  return sql`exists (
    select 1 from mls_media queued
    where queued.resource_record_key = ${parentKey} and ${rowNeedsUrlRefreshClause}
  )`;
}

const listingGalleryIncompleteClause = sql`(
  ${hasRowNeedingUrlRefresh(sql`${properties.listingKey}`)}
  or (
    coalesce(${properties.photosCount}, 0) > 0
    and not exists (
      select 1 from mls_media queued where queued.resource_record_key = ${properties.listingKey}
    )
  )
)`;

const eligibleActiveListingClause = and(
  isNull(properties.deletedAt),
  eq(properties.mlgCanView, true),
  inArray(properties.standardStatus, [...ACTIVE_PROPERTY_STATUSES]),
);

export async function findOldestIncompleteActiveListingTimestamp(
  from: Date | null,
): Promise<Date | null> {
  const [row] = await db
    .select({ timestamp: sql<string | null>`min(${properties.modificationTimestamp})` })
    .from(properties)
    .where(
      and(
        eligibleActiveListingClause,
        isNotNull(properties.modificationTimestamp),
        from ? gte(properties.modificationTimestamp, from.toISOString()) : undefined,
        listingGalleryIncompleteClause,
      ),
    );
  return row?.timestamp ? new Date(row.timestamp) : null;
}

export async function listIncompleteActiveListingKeys(listingKeys: string[]): Promise<Set<string>> {
  const incomplete = new Set<string>();
  const uniqueKeys = [...new Set(listingKeys)];
  for (let start = 0; start < uniqueKeys.length; start += KEY_QUERY_CHUNK_SIZE) {
    const rows = await db
      .select({ key: properties.listingKey })
      .from(properties)
      .where(
        and(
          inArray(properties.listingKey, uniqueKeys.slice(start, start + KEY_QUERY_CHUNK_SIZE)),
          eligibleActiveListingClause,
          listingGalleryIncompleteClause,
        ),
      );
    for (const row of rows) incomplete.add(row.key);
  }
  return incomplete;
}

export async function listIncompleteEntityKeys(
  entityType: 'members' | 'offices',
  keys: readonly string[],
): Promise<string[]> {
  if (keys.length === 0) return [];
  if (entityType === 'members') {
    const rows = await db
      .select({ key: members.memberMlsId })
      .from(members)
      .where(
        and(
          inArray(members.memberMlsId, [...keys]),
          isNull(members.deletedAt),
          eq(members.mlgCanView, true),
          hasRowNeedingUrlRefresh(sql`${members.memberMlsId}`),
        ),
      );
    return rows.map((row) => row.key);
  }
  const rows = await db
    .select({ key: offices.officeMlsId })
    .from(offices)
    .where(
      and(
        inArray(offices.officeMlsId, [...keys]),
        isNull(offices.deletedAt),
        eq(offices.mlgCanView, true),
        hasRowNeedingUrlRefresh(sql`${offices.officeMlsId}`),
      ),
    );
  return rows.map((row) => row.key);
}

export async function countPendingFreshMediaUrls(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sql`mls_media queued`)
    .where(
      sql`${publicLiveRowClause} and ${rowNeedsDownloadClause} and ${freshUrlClause}
        and (
          exists (
            select 1 from properties parent
            where parent.listing_key = queued.resource_record_key
              and parent.deleted_at is null
              and parent.mlg_can_view = true
              and parent.standard_status in ('Active', 'ActiveUnderContract', 'ComingSoon')
          )
          or exists (
            select 1 from members parent
            where parent.member_mls_id = queued.resource_record_key
              and parent.deleted_at is null and parent.mlg_can_view = true
          )
          or exists (
            select 1 from offices parent
            where parent.office_mls_id = queued.resource_record_key
              and parent.deleted_at is null and parent.mlg_can_view = true
          )
        )`,
    );
  return Number(row?.count ?? 0);
}

export interface DeadMlsMediaQueueSummary {
  expiredUrlsCleared: number;
  urlLessRowsMarked: number;
  deadRefreshMarkersCleared: number;
}

const DEAD_QUEUE_BATCH_SIZE = 5_000;
const DEAD_QUEUE_MAX_BATCHES_PER_PASS = 20;

// Small committed batches keep WAL growth and lock time bounded on million-row backlogs.
async function updateQueueInBatches(setClause: SQL, whereClause: SQL): Promise<number> {
  let total = 0;
  for (let batch = 0; batch < DEAD_QUEUE_MAX_BATCHES_PER_PASS; batch += 1) {
    const result = await db.execute(sql`
      update mls_media as queued
      set ${setClause}
      where queued.media_key in (
        select queued.media_key from mls_media as queued
        where ${whereClause}
        limit ${DEAD_QUEUE_BATCH_SIZE}
        for update skip locked
      )
    `);
    const updated = result.rowCount ?? 0;
    total += updated;
    if (updated < DEAD_QUEUE_BATCH_SIZE) break;
  }
  return total;
}

/** Drops expired links and refresh markers on retired rows so neither lingers in the queue. */
export async function clearDeadMlsMediaQueueEntries(): Promise<DeadMlsMediaQueueSummary> {
  const expiredUrlsCleared = await updateQueueInBatches(
    sql`
      media_url = null,
      last_acquisition_error = case
        when ${publicLiveRowClause} and ${rowNeedsDownloadClause}
          then ${MLS_MEDIA_URL_REFRESH_REQUIRED}
        else queued.last_acquisition_error
      end`,
    sql`queued.media_url is not null and not ${freshUrlClause}`,
  );
  // Legacy rows never held a URL; marking them in bulk spares workers a claim per row.
  const urlLessRowsMarked = await updateQueueInBatches(
    sql`last_acquisition_error = ${MLS_MEDIA_URL_REFRESH_REQUIRED}`,
    sql`queued.media_url is null
      and queued.last_acquisition_error is distinct from ${MLS_MEDIA_URL_REFRESH_REQUIRED}
      and (queued.next_attempt_at is null or queued.next_attempt_at <= now())
      and (queued.acquisition_lease_until is null or queued.acquisition_lease_until <= now())
      and ${publicLiveRowClause}
      and ${rowNeedsDownloadClause}`,
  );
  const deadRefreshMarkersCleared = await updateQueueInBatches(
    sql`last_acquisition_error = null`,
    sql`queued.last_acquisition_error = ${MLS_MEDIA_URL_REFRESH_REQUIRED}
      and not ${publicLiveRowClause}`,
  );
  return { expiredUrlsCleared, urlLessRowsMarked, deadRefreshMarkersCleared };
}

export async function purgeRetiredMlsMediaRows(cutoff: Date): Promise<number> {
  const deleted = await db.execute(sql`
    delete from mls_media
    where deleted_at is not null and deleted_at <= ${cutoff.toISOString()}::timestamp and media_id is null
  `);
  return deleted.rowCount ?? 0;
}
