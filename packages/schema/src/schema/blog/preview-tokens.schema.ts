import { defineRelationsPart } from 'drizzle-orm';
import { index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

import type { UUIDv7 } from '../types';

import { user } from '../auth';
import { idPrimaryKey } from '../common.schema';
import { posts } from './posts.schema';

// ============================================================================
// PREVIEW TOKENS TABLE
// ============================================================================

export const previewTokens = pgTable(
  'preview_tokens',
  {
    id: idPrimaryKey,
    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 64 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    maxViews: integer('max_views'),
    viewCount: integer('view_count').notNull().default(0),
    createdBy: uuid('created_by')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('preview_tokens_post_idx').on(table.postId),
    index('preview_tokens_token_idx').on(table.token),
    index('preview_tokens_expires_idx').on(table.expiresAt),
    index('preview_tokens_created_by_idx').on(table.createdBy),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const blogPreviewTokenRelations = defineRelationsPart(
  {
    posts,
    previewTokens,
    user,
  },
  (r) => ({
    previewTokens: {
      post: r.one.posts({ from: r.previewTokens.postId, to: r.posts.id, optional: false }),
      creator: r.one.user({ from: r.previewTokens.createdBy, to: r.user.id, optional: false }),
    },
    posts: {
      previewTokens: r.many.previewTokens({ from: r.posts.id, to: r.previewTokens.postId }),
    },
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const insertPreviewTokenSchema = createInsertSchema(previewTokens, {
  token: z.string().length(64, 'Token must be exactly 64 characters'),
  expiresAt: z.coerce.date(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectPreviewTokenSchema = createSelectSchema(previewTokens);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type PreviewToken = typeof previewTokens.$inferSelect;
export type NewPreviewToken = z.infer<typeof insertPreviewTokenSchema>;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate cryptographically secure preview token
 */
export function generatePreviewToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate token expiration date
 */
export function calculateTokenExpiration(hours: number = 48): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: PreviewToken): boolean {
  return new Date() > token.expiresAt;
}

/**
 * Get token lifetime in hours
 */
export function getTokenLifetimeHours(token: PreviewToken): number {
  const now = new Date();
  const expiresAt = new Date(token.expiresAt);
  const diff = expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.round(diff / (1000 * 60 * 60)));
}
