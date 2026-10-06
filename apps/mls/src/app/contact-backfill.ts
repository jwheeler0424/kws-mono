import { env } from '@kws/config';
import { properties } from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';

import type { MlsPropertyPayload } from '@/types';

import { db } from '@/lib/database';
import { logger } from '@/lib/logger';
import { buildResourceUrl, paginate } from '@/lib/utils/fetch';
import { parseNullableString } from '@/lib/utils/normalize';
import {
  claimSyncCursor,
  checkpointSyncCursor,
  finishSyncCursor,
} from '@/repositories/sync-cursor.repository';

export async function backfillContactsFromCli(args: string[]): Promise<void> {
  const apply = args.includes('--apply');
  const afterArg = args.find((arg) => arg.startsWith('--after='))?.slice('--after='.length);
  const after = new Date(afterArg ?? '2026-09-17T00:00:00Z');
  const maxPages = Number(
    args.find((arg) => arg.startsWith('--max-pages='))?.slice('--max-pages='.length) ?? '100',
  );
  if (Number.isNaN(after.getTime()) || !Number.isInteger(maxPages) || maxPages < 1)
    throw new Error('Invalid contact backfill bounds');
  const osn = env.MLS_ORIGINATING_SYSTEM_NAME;
  const cursor = apply ? await claimSyncCursor('PropertyContacts', osn, after) : null;
  if (apply && !cursor) throw new Error('Contact backfill is already running');
  const watermark = cursor?.timestamp ? new Date(cursor.timestamp) : after;
  const url = new URL(
    buildResourceUrl({
      resource: 'Property',
      osn,
      afterTimestamp: new Date(watermark.getTime() - 2_000),
      top: 500,
      options: { includeExpand: false },
    }),
  );
  url.searchParams.set(
    '$select',
    'ListingKey,OriginatingSystemName,ModificationTimestamp,MlgCanView,MlgCanUse,ListAgentPreferredPhone,ListAgentEmail,ListOfficeEmail,CoListAgentPreferredPhone,CoListAgentEmail,CoListOfficeEmail',
  );
  let pages = 0;
  let scanned = 0;
  let updated = 0;
  let failure: string | undefined;
  try {
    for await (const batch of paginate<MlsPropertyPayload>(url.toString())) {
      let latest = watermark;
      await db.transaction(async (tx) => {
        for (const record of batch.value) {
          scanned += 1;
          const timestamp = new Date(record.ModificationTimestamp ?? '');
          if (Number.isNaN(timestamp.getTime()))
            throw new Error('Backfill record has an invalid modification timestamp');
          if (timestamp > latest) latest = timestamp;
          if (
            !apply ||
            record.MlgCanView !== true ||
            (record.MlgCanUse && !record.MlgCanUse.includes('IDX'))
          )
            continue;
          const rows = await tx
            .update(properties)
            .set({
              listAgentPreferredPhone: parseNullableString(record.ListAgentPreferredPhone, 32),
              listAgentEmail: parseNullableString(record.ListAgentEmail, 256),
              listOfficeEmail: parseNullableString(record.ListOfficeEmail, 256),
              coListAgentPreferredPhone: parseNullableString(record.CoListAgentPreferredPhone, 32),
              coListAgentEmail: parseNullableString(record.CoListAgentEmail, 256),
              coListOfficeEmail: parseNullableString(record.CoListOfficeEmail, 256),
            })
            .where(
              and(
                eq(properties.listingKey, record.ListingKey),
                eq(properties.originatingSystemName, osn),
                eq(properties.mlgCanView, true),
                sql`${properties.deletedAt} is null`,
                sql`${properties.modificationTimestamp} <= ${timestamp.toISOString()}::timestamptz`,
              ),
            )
            .returning({ key: properties.listingKey });
          updated += rows.length;
        }
      });
      if (cursor) await checkpointSyncCursor(cursor.token, latest);
      pages += 1;
      if (pages >= maxPages) break;
    }
    logger.info('NWMLS contact backfill complete', { apply, pages, scanned, updated, maxPages });
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (cursor) await finishSyncCursor(cursor.token, failure);
  }
}
