import { integer, pgTable, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

import { timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// mls_sync_cursors — tracks replication state per resource
// ---------------------------------------------------------------------------

export const mlsSyncCursors = pgTable(
  'mls_sync_cursors',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    resource: varchar('resource', { length: 64 }).notNull(), // 'Property' | 'Member' | etc.
    originatingSystemName: varchar('originating_system_name', {
      length: 32,
    }).notNull(),
    lastModifiedTimestamp: timestamp('last_modified_timestamp', {
      withTimezone: true,
    }),
    lastRunAt: timestamp('last_run_at', { withTimezone: true }),
    lastRunStatus: varchar('last_run_status', { length: 32 }), // 'success' | 'error' | 'running'
    lastRunError: text('last_run_error'),
    checkpointRequestUrl: text('checkpoint_request_url'),
    checkpointNextUrl: text('checkpoint_next_url'),
    checkpointRecentRequestUrls: text('checkpoint_recent_request_urls'),
    checkpointedAt: timestamp('checkpointed_at', { withTimezone: true }),
    totalRecordsProcessed: integer('total_records_processed').default(0),
    lastRunRecordsProcessed: integer('last_run_records_processed').default(0),
    phase: varchar('phase', { length: 32 }).default('delta'), // 'initial' | 'delta'
    ...timestamps,
  },
  (t) => [
    uniqueIndex('idx_mls_sync_cursors_resource_unique').on(t.resource, t.originatingSystemName),
  ],
);
