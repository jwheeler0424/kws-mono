import { defineRelationsPart } from 'drizzle-orm';
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

import type { UUIDv7 } from '@kws/types';

import { tsvector } from '../../plugins/tsvector';

import { organization, user } from '../auth';
import { idPrimaryKey, softDelete, timestamps } from '../common.schema';
import { posts } from './posts.schema';

// ============================================================================
// ENUMS
// ============================================================================

export const commentStatusEnum = pgEnum('comment_status_enum', [
  'approved',
  'pending',
  'spam',
  'trash',
]);

export type CommentStatus = (typeof commentStatusEnum.enumValues)[number];

export const commentTypeEnum = pgEnum('comment_type', [
  'comment',
  'pingback',
  'trackback',
  'review',
]);

// ============================================================================
// COMMENTS TABLE
// ============================================================================

export const comments = pgTable(
  'comments',
  {
    id: idPrimaryKey,

    // Post relationship
    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    // Organization relationship
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, { onDelete: 'cascade' }),

    // Comment author (can be registered user or guest)
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .references(() => user.id, {
        onDelete: 'set null',
      }),
    authorName: varchar('author_name', { length: 255 }).notNull(),
    authorEmail: varchar('author_email', { length: 255 }).notNull(),
    authorUrl: varchar('author_url', { length: 500 }),
    authorIp: varchar('author_ip', { length: 45 }),
    authorUserAgent: varchar('author_user_agent', { length: 500 }),

    // Comment content
    content: text('content').notNull(),

    // Threading support (for nested comments)
    parentId: uuid('parent_id').$type<UUIDv7>(),

    // Comment metadata
    type: commentTypeEnum('type').notNull().default('comment'),
    status: commentStatusEnum('status').notNull().default('pending'),

    // Moderation
    isApproved: boolean('is_approved').notNull().default(false),
    moderatedBy: uuid('moderated_by')
      .$type<UUIDv7>()
      .references(() => user.id, { onDelete: 'set null' }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),

    // Spam detection
    spamScore: integer('spam_score').notNull().default(0),
    isSpam: boolean('is_spam').notNull().default(false),
    spamDetectionData: jsonb('spam_detection_data'),

    // Engagement
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),

    // Flagging
    flagCount: integer('flag_count').notNull().default(0),
    isFlagged: boolean('is_flagged').notNull().default(false),

    // Editing
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),

    ...softDelete,
    ...timestamps,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['content'])
      .weight('A')
      .cols(['author_name'])
      .weight('C'),
  },
  (table) => [
    index('comments_post_idx').on(table.postId),
    index('comments_org_idx').on(table.organizationId),
    index('comments_user_idx').on(table.userId),
    index('comments_status_idx').on(table.status),
    index('comments_parent_idx').on(table.parentId),
    index('comments_email_idx').on(table.authorEmail),
    index('comments_deleted_idx').on(table.deletedAt),
    index('comments_created_idx').on(table.createdAt),

    // Composite indexes for common queries
    index('comments_post_status_idx').on(table.postId, table.status),
    index('comments_post_created_idx').on(table.postId, table.createdAt),

    // Moderation queue
    index('comments_status_created_idx').on(table.status, table.createdAt),

    // Full-text search
    index('comments_search_vector_idx').using('gin', table.searchVector),
  ],
);

// ============================================================================
// COMMENT META TABLE
// ============================================================================

export const commentMeta = pgTable(
  'comment_meta',
  {
    id: idPrimaryKey,

    commentId: uuid('comment_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),

    // Meta key-value
    metaKey: varchar('meta_key', { length: 255 }).notNull(),
    metaValue: text('meta_value'),

    // JSONB for structured data
    metaValueJson: jsonb('meta_value_json'),

    // Audit
    ...timestamps,
  },
  (table) => [
    index('comment_meta_comment_idx').on(table.commentId),
    index('comment_meta_key_idx').on(table.metaKey),
    index('comment_meta_comment_key_idx').on(table.commentId, table.metaKey),
  ],
);

// ============================================================================
// COMMENT VOTES (User upvote/downvote tracking)
// ============================================================================

export const commentVotes = pgTable(
  'comment_votes',
  {
    id: idPrimaryKey,

    commentId: uuid('comment_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Vote type: 1 for upvote, -1 for downvote
    voteType: integer('vote_type').notNull(),

    // Audit
    ...timestamps,
  },
  (table) => [
    index('comment_votes_comment_idx').on(table.commentId),
    index('comment_votes_user_idx').on(table.userId),

    uniqueIndex('comment_votes_comment_user_idx').on(table.commentId, table.userId),
  ],
);

// ============================================================================
// COMMENT FLAGS (User reporting)
// ============================================================================

export const commentFlags = pgTable(
  'comment_flags',
  {
    id: idPrimaryKey,

    commentId: uuid('comment_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),

    userId: uuid('user_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Flag reason
    reason: varchar('reason', { length: 100 }).notNull(),
    description: text('description'),

    // Resolution
    isResolved: boolean('is_resolved').notNull().default(false),
    resolvedBy: uuid('resolved_by')
      .$type<UUIDv7>()
      .references(() => user.id, { onDelete: 'set null' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolution: text('resolution'),

    // Audit
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow(),
  },
  (table) => [
    index('comment_flags_comment_idx').on(table.commentId),
    index('comment_flags_user_idx').on(table.userId),
    index('comment_flags_resolved_idx').on(table.isResolved),
    index('comment_flags_created_idx').on(table.createdAt),
  ],
);

// ============================================================================
// COMMENT SUBSCRIPTIONS (Email notifications)
// ============================================================================

export const commentSubscriptions = pgTable(
  'comment_subscriptions',
  {
    id: idPrimaryKey,

    postId: uuid('post_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),

    // Subscriber info
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .references(() => user.id, { onDelete: 'set null' }),
    email: varchar('email', { length: 255 }).notNull(),

    // Subscription settings
    notifyOnNewComment: boolean('notify_on_new_comment').notNull().default(true),
    notifyOnReply: boolean('notify_on_reply').notNull().default(true),

    // Unsubscribe
    isActive: boolean('is_active').notNull().default(true),
    unsubscribeToken: varchar('unsubscribe_token', { length: 255 }),

    // Audit
    ...timestamps,
  },
  (table) => [
    index('comment_subscriptions_post_idx').on(table.postId),
    index('comment_subscriptions_user_idx').on(table.userId),
    index('comment_subscriptions_email_idx').on(table.email),
    index('comment_subscriptions_active_idx').on(table.isActive),
    index('comment_subscriptions_token_idx').on(table.unsubscribeToken),
    uniqueIndex('comment_subscriptions_post_email_idx').on(table.postId, table.email),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const blogCommentRelations = defineRelationsPart(
  {
    commentFlags,
    commentMeta,
    commentSubscriptions,
    comments,
    commentVotes,
    organization,
    posts,
    user,
  },
  (r) => ({
    comments: {
      post: r.one.posts({ from: r.comments.postId, to: r.posts.id, optional: false }),
      organization: r.one.organization({ from: r.comments.organizationId, to: r.organization.id }),
      user: r.one.user({ from: r.comments.userId, to: r.user.id }),
      parent: r.one.comments({ from: r.comments.parentId, to: r.comments.id }),
      replies: r.many.comments({ from: r.comments.id, to: r.comments.parentId }),
      moderatedByUser: r.one.user({ from: r.comments.moderatedBy, to: r.user.id }),
      meta: r.many.commentMeta({ from: r.comments.id, to: r.commentMeta.commentId }),
      votes: r.many.commentVotes({ from: r.comments.id, to: r.commentVotes.commentId }),
      flags: r.many.commentFlags({ from: r.comments.id, to: r.commentFlags.commentId }),
    },

    commentMeta: {
      comment: r.one.comments({ from: r.commentMeta.commentId, to: r.comments.id, optional: false }),
    },

    commentVotes: {
      comment: r.one.comments({ from: r.commentVotes.commentId, to: r.comments.id, optional: false }),
      user: r.one.user({ from: r.commentVotes.userId, to: r.user.id, optional: false }),
    },

    commentFlags: {
      comment: r.one.comments({ from: r.commentFlags.commentId, to: r.comments.id, optional: false }),
      user: r.one.user({ from: r.commentFlags.userId, to: r.user.id, optional: false }),
      resolvedByUser: r.one.user({ from: r.commentFlags.resolvedBy, to: r.user.id }),
    },

    commentSubscriptions: {
      post: r.one.posts({ from: r.commentSubscriptions.postId, to: r.posts.id, optional: false }),
      user: r.one.user({ from: r.commentSubscriptions.userId, to: r.user.id }),
    },
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const insertCommentSchema = createInsertSchema(comments, {
  authorName: z.string().min(1, 'Name is required').max(255),
  authorEmail: z.string().email('Invalid email').max(255),
  authorUrl: z.string().url('Invalid URL').max(500).optional().or(z.literal('')),
  content: z.string().min(1, 'Comment content is required').max(10000),
  authorIp: z.ipv4().or(z.ipv6()).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  upvotes: true,
  downvotes: true,
  flagCount: true,
  spamScore: true,
  searchVector: true,
});

export const updateCommentSchema = insertCommentSchema.partial();

export const insertCommentMetaSchema = createInsertSchema(commentMeta, {
  metaKey: z.string().min(1).max(255),
  metaValue: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentVoteSchema = createInsertSchema(commentVotes, {
  voteType: z.number().int().min(-1).max(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommentFlagSchema = createInsertSchema(commentFlags, {
  reason: z.enum(['spam', 'inappropriate', 'abuse', 'off_topic', 'other']),
  description: z.string().max(1000).optional(),
}).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSubscriptionSchema = createInsertSchema(commentSubscriptions, {
  email: z.string().email("Invalid email").max(255),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCommentSchema = createSelectSchema(comments);
export const selectCommentMetaSchema = createSelectSchema(commentMeta);
export const selectCommentVoteSchema = createSelectSchema(commentVotes);
export const selectCommentFlagSchema = createSelectSchema(commentFlags);
export const selectCommentSubscriptionSchema = createSelectSchema(commentSubscriptions);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Comment = typeof comments.$inferSelect;
export type NewComment = z.infer<typeof insertCommentSchema>;
export type UpdateComment = z.infer<typeof updateCommentSchema>;

export type CommentMeta = typeof commentMeta.$inferSelect;
export type NewCommentMeta = z.infer<typeof insertCommentMetaSchema>;

export type CommentVote = typeof commentVotes.$inferSelect;
export type NewCommentVote = z.infer<typeof insertCommentVoteSchema>;

export type CommentFlag = typeof commentFlags.$inferSelect;
export type NewCommentFlag = z.infer<typeof insertCommentFlagSchema>;

export type CommentSubscription = typeof commentSubscriptions.$inferSelect;
export type NewCommentSubscription = z.infer<typeof insertCommentSubscriptionSchema>;

export type CommentWithRelations = Comment & {
  post?: typeof posts.$inferSelect;
  parent?: Comment | null;
  replies?: CommentWithRelations[];
  meta?: CommentMeta[];
  votes?: CommentVote[];
  flags?: CommentFlag[];
  userVote?: CommentVote | null;
};

export type CommentTree = CommentWithRelations & {
  replies: CommentTree[];
  depth: number;
};
