import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// mls_property_missing_backfill
// ---------------------------------------------------------------------------
// Tracks Property listing keys discovered in MLS but missing locally.
// Rows remain pending until backfill sync sees and processes the listing.
// ---------------------------------------------------------------------------

export const mlsPropertyMissingBackfill = pgTable(
  'mls_property_missing_backfill',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    originatingSystemName: varchar('originating_system_name', { length: 32 })
      .notNull()
      .default('nwmls'),
    listingKey: varchar('listing_key', { length: 64 }).notNull(),
    discoveredModificationTimestamp: timestamp('discovered_modification_timestamp', {
      withTimezone: true,
    }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    backfilledAt: timestamp('backfilled_at', { withTimezone: true }),
    backfillAttempts: integer('backfill_attempts').notNull().default(0),
    lastError: text('last_error'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_mls_property_missing_backfill_unique').on(
      t.originatingSystemName,
      t.listingKey,
    ),
    index('idx_mls_property_missing_backfill_status').on(t.originatingSystemName, t.status),
    index('idx_mls_property_missing_backfill_discovered').on(
      t.originatingSystemName,
      t.discoveredModificationTimestamp,
    ),
  ],
);
