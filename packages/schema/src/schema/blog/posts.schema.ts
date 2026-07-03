import { defineRelationsPart, sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

import type { UUIDv7 } from '../types';

import { tsvector } from '../../plugins/tsvector';
import { organization, user } from '../auth';
import { idPrimaryKey, softDelete, timestamps } from '../common.schema';
import { media } from '../media';

// ============================================================================
// ENUMS
// ============================================================================

export const postStatusEnum = pgEnum('post_status', [
  'draft',
  'pending',
  'published',
  'scheduled',
  'private',
  'trash',
  'auto_draft',
]);

export type PostStatusType = (typeof postStatusEnum.enumValues)[number];

export const postVisibilityEnum = pgEnum('post_visibility', ['public', 'private', 'password']);

export type PostVisibilityType = (typeof postVisibilityEnum.enumValues)[number];

export const postTypeEnum = pgEnum('post_type', [
  'post',
  'page',
  'revision',
  'attachment',
  'custom',
]);

export type PostType = (typeof postTypeEnum.enumValues)[number];

export const postCommentStatusEnum = pgEnum('post_comment_status', [
  'open',
  'closed',
  'registered_only',
]);

export type PostCommentStatusType = (typeof postCommentStatusEnum.enumValues)[number];

// --- The Core: Posts ---
export const posts = pgTable(
  'post',
  {
    id: idPrimaryKey,
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .$type<UUIDv7>()
      .references(() => user.id, {
        onDelete: 'set null',
      }),

    // Content & Meta
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),

    // The JSON structure (TipTap/ProseMirror)
    contentJson: jsonb('content_json'),

    // The Raw Text (Stripped) - Used for search & simple reading time calc
    rawText: text('raw_text').default(''),

    // Status & Visibility
    type: postTypeEnum('type').notNull().default('post'),
    status: postStatusEnum('status').default('draft').notNull(),
    visibility: postVisibilityEnum('visibility').default('public').notNull(),
    passwordHash: text('password_hash'),

    // Publishing
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),

    // Parent relationship (for pages hierarchy and attachments)
    parentId: uuid('parent_id').$type<UUIDv7>(),

    // Menu order (for pages)
    menuOrder: integer('menu_order').notNull().default(0),

    // Comment settings
    commentStatus: postCommentStatusEnum('comment_status').notNull().default('open'),
    commentCount: integer('comment_count').notNull().default(0),

    // Ping/trackback (pingback URLs)
    pingStatus: boolean('ping_status').notNull().default(true),
    toPing: text('to_ping'),
    pinged: text('pinged'),

    // SEO and metadata
    metaTitle: varchar('meta_title', { length: 500 }),
    metaDescription: text('meta_description'),
    metaKeywords: varchar('meta_keywords', { length: 500 }),
    canonicalUrl: varchar('canonical_url', { length: 500 }),

    // Featured image
    featuredImageId: uuid('featured_image_id')
      .$type<UUIDv7>()
      .references(() => media.id, { onDelete: 'set null' }),
    featuredMediaId: uuid('featured_media_id')
      .$type<UUIDv7>()
      .references(() => media.id, { onDelete: 'set null' }),

    // View count and engagement
    viewCount: integer('view_count').notNull().default(0),

    // Revision tracking
    isRevision: boolean('is_revision').notNull().default(false),
    revisionOf: uuid('revision_of').$type<UUIDv7>(),

    // Sticky post (pin to top)
    isSticky: boolean('is_sticky').notNull().default(false),

    ...softDelete,
    ...timestamps,

    // Last modified by (for audit trail)
    lastModifiedBy: varchar('last_modified_by', { length: 255 }),

    // Denormalized Tags/Cats for Search Performance
    cachedSearchTerms: text('cached_search_terms').default(''),

    // Search Vector
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['title'])
      .weight('A')
      .cols(['raw_text', 'cached_search_terms'])
      .weight('D'),
  },
  (table) => [
    uniqueIndex('posts_slug_org_idx')
      .on(table.organizationId, table.slug)
      .where(sql`${table.deletedAt} IS NULL`),

    // Query optimization indexes
    index('posts_org_idx').on(table.organizationId),
    index('posts_author_idx').on(table.authorId),
    index('posts_status_idx').on(table.status),
    index('posts_type_idx').on(table.type),
    index('posts_published_idx').on(table.publishedAt),
    index('posts_scheduled_idx').on(table.scheduledFor),
    index('posts_parent_idx').on(table.parentId),
    index('posts_revision_idx').on(table.revisionOf),
    index('posts_deleted_idx').on(table.deletedAt),

    // Composite indexes for common queries
    index('posts_org_status_type_idx').on(table.organizationId, table.status, table.type),

    // Featured posts query
    index('posts_sticky_published_idx').on(table.isSticky, table.publishedAt),

    // Full-text search index
    index('posts_search_vector_idx').using('gin', table.searchVector),
  ],
);

// ============================================================================
// POST META TABLE (Flexible key-value storage)
// ============================================================================

export const postMeta = pgTable(
  'post_meta',
  {
    id: idPrimaryKey,
    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    metaKey: varchar('meta_key', { length: 255 }).notNull(),
    metaValue: text('meta_value'),
    metaValueJson: jsonb('meta_value_json'),

    ...timestamps,
  },
  (table) => [
    index('post_meta_post_idx').on(table.postId),
    index('post_meta_key_idx').on(table.metaKey),
    index('post_meta_post_key_idx').on(table.postId, table.metaKey),
  ],
);

// ============================================================================
// POST REVISIONS TABLE (Version control)
// ============================================================================

export const postRevisions = pgTable(
  'post_revisions',
  {
    id: idPrimaryKey,

    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    revisionNumber: integer('revision_number').notNull(),

    title: text('title').notNull(),
    slug: text('slug').notNull(),
    excerpt: text('excerpt'),
    contentJson: jsonb('content_json'),
    rawText: text('raw_text').default(''),

    authorId: uuid('author_id')
      .$type<UUIDv7>()
      .references(() => user.id, { onDelete: 'set null' }),
    changesSummary: text('changes_summary'),
    isAutosave: boolean('is_autosave').notNull().default(false),
    snapshot: jsonb('snapshot').notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('post_revisions_post_idx').on(table.postId),
    uniqueIndex('post_revisions_post_rev_num_idx').on(table.postId, table.revisionNumber),
    index('post_revisions_author_idx').on(table.authorId),
    index('post_revisions_created_idx').on(table.createdAt),
  ],
);

// ============================================================================
// POST RELATIONSHIPS (Many-to-Many for related posts)
// ============================================================================

export const postRelationships = pgTable(
  'post_relationships',
  {
    id: idPrimaryKey,

    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    relatedPostId: uuid('related_post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    relationshipType: varchar('relationship_type', { length: 100 }).notNull().default('related'),

    order: integer('order').notNull().default(0),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('post_relationships_post_idx').on(table.postId),
    index('post_relationships_related_idx').on(table.relatedPostId),
    index('post_relationships_type_idx').on(table.relationshipType),
    uniqueIndex('post_relationships_unique').on(
      table.postId,
      table.relatedPostId,
      table.relationshipType,
    ),
  ],
);

// ============================================================================
// POST MEDIA ATTACHMENTS (Direct media-library attachments)
// ============================================================================

export const postMediaAttachments = pgTable(
  'post_media_attachments',
  {
    id: idPrimaryKey,

    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    mediaId: uuid('media_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),

    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, { onDelete: 'cascade' }),

    order: integer('order').notNull().default(0),
    captionOverride: text('caption_override'),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    uniqueIndex('post_media_attachments_post_media_idx').on(table.postId, table.mediaId),
    index('post_media_attachments_post_idx').on(table.postId),
    index('post_media_attachments_media_idx').on(table.mediaId),
    index('post_media_attachments_org_idx').on(table.organizationId),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const blogPostRelations = defineRelationsPart(
  {
    media,
    organization,
    postMediaAttachments,
    postMeta,
    postRelationships,
    postRevisions,
    posts,
    user,
  },
  (r) => ({
    posts: {
      organization: r.one.organization({ from: r.posts.organizationId, to: r.organization.id }),
      author: r.one.user({ from: r.posts.authorId, to: r.user.id }),
      parent: r.one.posts({ from: r.posts.parentId, to: r.posts.id }),
      children: r.many.posts({ from: r.posts.id, to: r.posts.parentId }),
      featuredImage: r.one.media({ from: r.posts.featuredImageId, to: r.media.id }),
      featuredMedia: r.one.media({ from: r.posts.featuredMediaId, to: r.media.id }),
      originalPost: r.one.posts({ from: r.posts.revisionOf, to: r.posts.id }),
      revisions: r.many.posts({ from: r.posts.id, to: r.posts.revisionOf }),
      meta: r.many.postMeta({ from: r.posts.id, to: r.postMeta.postId }),
      attachments: r.many.postMediaAttachments({
        from: r.posts.id,
        to: r.postMediaAttachments.postId,
      }),
      revisionHistory: r.many.postRevisions({ from: r.posts.id, to: r.postRevisions.postId }),
      relatedPosts: r.many.postRelationships({ from: r.posts.id, to: r.postRelationships.postId }),
      relatedToPosts: r.many.postRelationships({
        from: r.posts.id,
        to: r.postRelationships.relatedPostId,
      }),
    },

    postMeta: {
      post: r.one.posts({ from: r.postMeta.postId, to: r.posts.id, optional: false }),
    },

    postRevisions: {
      post: r.one.posts({ from: r.postRevisions.postId, to: r.posts.id, optional: false }),
      author: r.one.user({ from: r.postRevisions.authorId, to: r.user.id }),
    },

    postRelationships: {
      post: r.one.posts({ from: r.postRelationships.postId, to: r.posts.id, optional: false }),
      relatedPost: r.one.posts({
        from: r.postRelationships.relatedPostId,
        to: r.posts.id,
        optional: false,
      }),
    },

    postMediaAttachments: {
      post: r.one.posts({ from: r.postMediaAttachments.postId, to: r.posts.id, optional: false }),
      media: r.one.media({ from: r.postMediaAttachments.mediaId, to: r.media.id, optional: false }),
      organization: r.one.organization({
        from: r.postMediaAttachments.organizationId,
        to: r.organization.id,
      }),
    },
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const insertPostSchema = createInsertSchema(posts, {
  title: z.string().min(1, 'Title is required').max(500),
  slug: z
    .string()
    .min(1)
    .max(500)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format'),
  contentJson: z.json().optional(),
  rawText: z.string().optional(),
  excerpt: z.string().max(5000).nullable(),
  passwordHash: z.string().max(255).optional(),
  metaTitle: z.string().max(500).optional(),
  metaDescription: z.string().max(1000).optional(),
  publishedAt: z.coerce.date().nullable(),
  scheduledFor: z.coerce.date().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  commentCount: true,
  viewCount: true,
  searchVector: true,
});

export const insertPostMetaSchema = createInsertSchema(postMeta, {
  metaKey: z.string().min(1).max(255),
  metaValue: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPostRevisionSchema = createInsertSchema(postRevisions, {
  title: z.string().min(1).max(500),
  contentJson: z.json().optional(),
  rawText: z.string().optional(),
  revisionNumber: z.number().int().positive(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertPostMediaAttachmentSchema = createInsertSchema(postMediaAttachments, {
  order: z.number().int().min(0).optional(),
  captionOverride: z.string().max(2000).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const selectPostSchema = createSelectSchema(posts);
export const selectPostMetaSchema = createSelectSchema(postMeta);
export const selectPostRevisionSchema = createSelectSchema(postRevisions);
export const selectPostMediaAttachmentSchema = createSelectSchema(postMediaAttachments);

export const updatePostSchema = insertPostSchema.partial();
export const updatePostMetaSchema = insertPostMetaSchema.partial().required({ postId: true });

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Post = typeof posts.$inferSelect;
export type NewPost = z.infer<typeof insertPostSchema>;
export type UpdatePost = z.infer<typeof updatePostSchema>;

export type PostMeta = typeof postMeta.$inferSelect;
export type NewPostMeta = z.infer<typeof insertPostMetaSchema>;
export type UpdatePostMeta = z.infer<typeof updatePostMetaSchema>;

export type PostRevision = typeof postRevisions.$inferSelect;
export type NewPostRevision = z.infer<typeof insertPostRevisionSchema>;

export type PostRelationship = typeof postRelationships.$inferSelect;
export type PostMediaAttachment = typeof postMediaAttachments.$inferSelect;
export type NewPostMediaAttachment = z.infer<typeof insertPostMediaAttachmentSchema>;

export type PostWithRelations = Post & {
  meta?: PostMeta[];
  parent?: Post | null;
  children?: Post[];
  featuredImage?: typeof media.$inferSelect | null;
  featuredMedia?: typeof media.$inferSelect | null;
  attachments?: PostMediaAttachment[];
  revisions?: Post[];
  revisionHistory?: PostRevision[];
  relatedPosts?: (PostRelationship & { relatedPost: Post })[];
};
