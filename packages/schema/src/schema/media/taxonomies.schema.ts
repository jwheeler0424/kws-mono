import { index, integer, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

import type { UUIDv7 } from '../types';

import { organization } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';
import { terms } from '../taxonomies.schema';
import { media } from './media.schema';

// ============================================================================
// MEDIA TERM RELATIONSHIPS (Many-to-Many)
// ============================================================================

export const mediaTermRelationships = pgTable(
  'media_term_relationships',
  {
    id: idPrimaryKey,

    mediaId: uuid('media_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),

    termId: uuid('term_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),

    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, {
        onDelete: 'cascade',
      }),

    // Order for display (if terms need specific ordering on a post)
    order: integer('order').notNull().default(0),

    // Audit
    ...timestamps,
  },
  (table) => [
    // Unique constraint to prevent duplicate relationships
    uniqueIndex('media_term_relationships_media_term_idx').on(table.mediaId, table.termId),

    index('media_term_relationships_media_idx').on(table.mediaId),
    index('media_term_relationships_term_idx').on(table.termId),
  ],
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Media-Term relationship schema
export const insertMediaTermRelationshipSchema = createInsertSchema(mediaTermRelationships).omit({
  id: true,
  createdAt: true,
});

// Select schemas
export const selectMediaTermRelationshipSchema = createSelectSchema(mediaTermRelationships);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type MediaTermRelationship = typeof mediaTermRelationships.$inferSelect;
export type NewMediaTermRelationship = z.infer<typeof insertMediaTermRelationshipSchema>;
