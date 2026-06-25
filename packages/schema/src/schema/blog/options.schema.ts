import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod';
import { z } from 'zod';

import type { UUIDv7 } from '../types';
import { organization, user } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';

// ============================================================================
// ENUMS
// ============================================================================

export const optionTypeEnum = pgEnum("option_type", [
  "string",
  "number",
  "boolean",
  "json",
  "array",
]);

export const optionScopeEnum = pgEnum("option_scope", [
  "global", // System-wide settings
  "organization", // Organization-specific settings
  "user", // User-specific preferences
]);

// ============================================================================
// OPTIONS TABLE (WordPress-like options system)
// ============================================================================

export const blogOptions = pgTable(
  "blog_options",
  {
    id: idPrimaryKey,

    // Scope
    scope: optionScopeEnum("scope").notNull().default("organization"),

    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),

    // Option identification
    optionName: varchar("option_name", { length: 255 }).notNull(),

    // Option value (multiple storage types for flexibility)
    optionValue: text("option_value"),
    optionValueJson: jsonb("option_value_json"),

    // Type hint for proper parsing
    optionType: optionTypeEnum("option_type").notNull().default("string"),

    // Auto-loading (frequently accessed options)
    autoload: boolean("autoload").notNull().default(false),

    // Description for documentation
    description: text("description"),

    // Category for organization
    category: varchar("category", { length: 100 }), // 'general', 'reading', 'writing', 'discussion', etc.

    // Audit
    ...timestamps,
  },
  (table) => [
    // Unique constraint based on scope
    uniqueIndex("options_global_name_idx")
      .on(table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'global'")}`),

    uniqueIndex("options_org_name_idx")
      .on(table.organizationId, table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'organization'")}`),

    uniqueIndex("options_user_name_idx")
      .on(table.userId, table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'user'")}`),

    // Query indexes
    index("options_scope_idx").on(table.scope),
    index("options_org_idx").on(table.organizationId),
    index("options_user_idx").on(table.userId),
    index("options_autoload_idx").on(table.autoload),
    index("options_category_idx").on(table.category),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

// Options don't have direct relations since they can be scoped to different entities

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Insert schema
export const insertBlogOptionSchema = createInsertSchema(blogOptions, {
  optionName: z.string().min(1).max(255),
  optionValue: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBlogOptionSchema = insertBlogOptionSchema.partial();

// Select schema
export const selectBlogOptionSchema = createSelectSchema(blogOptions);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Option = typeof blogOptions.$inferSelect;
export type NewOption = z.infer<typeof insertBlogOptionSchema>;
export type UpdateOption = z.infer<typeof updateBlogOptionSchema>;

// ============================================================================
// PREDEFINED OPTION CATEGORIES
// ============================================================================

export const OPTION_CATEGORIES = {
  READING: "reading",
  WRITING: "writing",
  DISCUSSION: "discussion",
  PERMALINKS: "permalinks",
  PRIVACY: "privacy",
  SEO: "seo",
  ANALYTICS: "analytics",
  SOCIAL: "social",
  INTEGRATIONS: "integrations",
  ADVANCED: "advanced",
} as const;

// ============================================================================
// DEFAULT OPTIONS (WordPress-inspired)
// ============================================================================

export type DefaultOption = {
  name: string;
  value: string | number | boolean | object | Array<unknown> | null;
  type: "string" | "number" | "boolean" | "json" | "array";
  scope: "global" | "organization" | "user";
  category: string;
  description: string;
  autoload: boolean;
};

export const DEFAULT_BLOG_OPTIONS: DefaultOption[] = [
  // Reading Settings
  {
    name: "posts_per_page",
    value: 10,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "Number of posts to show per page",
    autoload: true,
  },
  {
    name: "posts_per_rss",
    value: 10,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "Number of posts to show in RSS feed",
    autoload: true,
  },
  {
    name: "rss_use_excerpt",
    value: false,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "Use excerpt in RSS feed instead of full text",
    autoload: true,
  },
  {
    name: "show_on_front",
    value: "posts",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "What to show on front page: posts or page",
    autoload: true,
  },
  {
    name: "page_on_front",
    value: null,
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "Page ID to show on front page",
    autoload: true,
  },
  {
    name: "page_for_posts",
    value: null,
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.READING,
    description: "Page ID for blog posts",
    autoload: true,
  },

  // Writing Settings
  {
    name: "default_category",
    value: null,
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.WRITING,
    description: "Default post category ID",
    autoload: true,
  },
  {
    name: "default_post_format",
    value: "standard",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.WRITING,
    description: "Default post format",
    autoload: true,
  },
  {
    name: "use_smilies",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.WRITING,
    description: "Convert emoticons to graphics",
    autoload: true,
  },
  {
    name: "enable_autosave",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.WRITING,
    description: "Enable autosave for posts",
    autoload: true,
  },
  {
    name: "autosave_interval",
    value: 60,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.WRITING,
    description: "Autosave interval in seconds",
    autoload: true,
  },

  // Discussion Settings
  {
    name: "default_comment_status",
    value: "open",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Default comment status for new posts",
    autoload: true,
  },
  {
    name: "default_ping_status",
    value: "open",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Default ping status for new posts",
    autoload: true,
  },
  {
    name: "require_name_email",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Require name and email for comments",
    autoload: true,
  },
  {
    name: "comment_registration",
    value: false,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Users must be registered to comment",
    autoload: true,
  },
  {
    name: "close_comments_for_old_posts",
    value: false,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Automatically close comments on old posts",
    autoload: true,
  },
  {
    name: "close_comments_days_old",
    value: 14,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Days before closing comments",
    autoload: true,
  },
  {
    name: "thread_comments",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Enable threaded comments",
    autoload: true,
  },
  {
    name: "thread_comments_depth",
    value: 5,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Maximum comment nesting depth",
    autoload: true,
  },
  {
    name: "page_comments",
    value: false,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Paginate comments",
    autoload: true,
  },
  {
    name: "comments_per_page",
    value: 50,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Comments per page",
    autoload: true,
  },
  {
    name: "default_comments_page",
    value: "newest",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Default comments page to display: newest or oldest",
    autoload: true,
  },
  {
    name: "comment_order",
    value: "asc",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Comment order: asc or desc",
    autoload: true,
  },
  {
    name: "comments_notify",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Email notification on new comment",
    autoload: true,
  },
  {
    name: "moderation_notify",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Email notification when comment held for moderation",
    autoload: true,
  },
  {
    name: "comment_moderation",
    value: false,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Comments must be manually approved",
    autoload: true,
  },
  {
    name: "comment_previously_approved",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Auto-approve comments from previously approved authors",
    autoload: true,
  },
  {
    name: "comment_max_links",
    value: 2,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.DISCUSSION,
    description: "Hold comment if it contains X or more links",
    autoload: true,
  },

  // Permalinks
  {
    name: "permalink_structure",
    value: "/%postname%/",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.PERMALINKS,
    description: "Permalink structure",
    autoload: true,
  },
  {
    name: "category_base",
    value: "category",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.PERMALINKS,
    description: "Category base slug",
    autoload: true,
  },
  {
    name: "tag_base",
    value: "tag",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.PERMALINKS,
    description: "Tag base slug",
    autoload: true,
  },

  // Privacy
  {
    name: "blog_public",
    value: true,
    type: "boolean",
    scope: "organization",
    category: OPTION_CATEGORIES.PRIVACY,
    description: "Allow search engines to index the site",
    autoload: true,
  },

  // SEO
  {
    name: "seo_meta_title_separator",
    value: "|",
    type: "string",
    scope: "organization",
    category: OPTION_CATEGORIES.SEO,
    description: "Separator for meta title",
    autoload: true,
  },
  {
    name: "seo_meta_description_length",
    value: 160,
    type: "number",
    scope: "organization",
    category: OPTION_CATEGORIES.SEO,
    description: "Maximum meta description length",
    autoload: true,
  },
];
