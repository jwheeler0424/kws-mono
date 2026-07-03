import { defineRelationsPart } from 'drizzle-orm';
import { index, integer, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

import type { UUIDv7 } from '../types';

import { organization } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';
import { terms } from '../taxonomies.schema';
import { posts } from './posts.schema';

// ============================================================================
// POST TERM RELATIONSHIPS (Many-to-Many)
// ============================================================================

export const postTermRelationships = pgTable(
  'post_term_relationships',
  {
    id: idPrimaryKey,

    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    termId: uuid('term_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),

    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, { onDelete: 'cascade' }),

    // Order for display (if terms need specific ordering on a post)
    order: integer('order').notNull().default(0),

    ...timestamps,
  },
  (table) => [
    uniqueIndex('post_term_relationships_post_term_idx').on(table.postId, table.termId),

    index('post_term_relationships_post_idx').on(table.postId),
    index('post_term_relationships_term_idx').on(table.termId),
    index('post_term_relationships_org_idx').on(table.organizationId),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const blogTaxonomyRelations = defineRelationsPart(
  {
    postTermRelationships,
    posts,
    terms,
  },
  (r) => ({
    postTermRelationships: {
      post: r.one.posts({ from: r.postTermRelationships.postId, to: r.posts.id, optional: false }),
      term: r.one.terms({ from: r.postTermRelationships.termId, to: r.terms.id, optional: false }),
    },

    terms: {
      postRelationships: r.many.postTermRelationships({
        from: r.terms.id,
        to: r.postTermRelationships.termId,
      }),
    },

    posts: {
      termRelationships: r.many.postTermRelationships({
        from: r.posts.id,
        to: r.postTermRelationships.postId,
      }),
    },
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Post-Term relationship schema
export const insertPostTermRelationshipSchema = createInsertSchema(postTermRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select schemas
export const selectPostTermRelationshipSchema = createSelectSchema(postTermRelationships);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type PostTermRelationship = typeof postTermRelationships.$inferSelect;
export type NewPostTermRelationship = z.infer<typeof insertPostTermRelationshipSchema>;
