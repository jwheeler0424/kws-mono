import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { properties } from './properties.schema';

export const mlsGalleryRequests = pgTable(
  'mls_gallery_requests',
  {
    listingKey: varchar('listing_key', { length: 255 })
      .primaryKey()
      .references(() => properties.listingKey, { onDelete: 'cascade' }),
    status: varchar('status', { length: 24 }).notNull().default('queued'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    leaseUntil: timestamp('lease_until', { withTimezone: true }),
    runToken: uuid('run_token'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
  },
  (table) => [index('idx_mls_gallery_requests_queue').on(table.status, table.nextAttemptAt)],
);
