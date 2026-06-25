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

import type { UUIDv7 } from './types';

import { organization } from './auth';
import { idPrimaryKey, timestamps } from './common.schema';

// ============================================================================
// ENUMS
// ============================================================================

export const taxonomyTypeEnum = pgEnum('taxonomy_type', [
  'blog_category', // Hierarchical taxonomy
  'blog_tag', // Flat taxonomy
  'asset_format', // Asset formats (document, pdf, csv, etc.)
  'media_format', // Media formats (image, video, audio, etc.)
  'contact_tag', // Tags for contacts
  'album', // For media albums (hierarchical)
  'custom', // Custom taxonomy
]);

export type TaxonomyType = (typeof taxonomyTypeEnum.enumValues)[number];

// ============================================================================
// TAXONOMIES TABLE (Define taxonomy types)
// ============================================================================

export const taxonomies = pgTable(
  'taxonomies',
  {
    id: idPrimaryKey,

    // Organization relationship
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, {
        onDelete: 'cascade',
      }),

    // Taxonomy identification
    name: varchar('name', { length: 100 }).notNull(), // Internal name (e.g., 'category', 'post_tag', 'media_format', 'media_tag)
    slug: varchar('slug', { length: 100 }).notNull(), // URL-friendly slug
    label: varchar('label', { length: 100 }).notNull(), // Display name (e.g., 'Categories')
    labelSingular: varchar('label_singular', { length: 100 }).notNull(), // Singular form

    // Taxonomy type
    type: taxonomyTypeEnum('type').notNull().default('custom'),

    // Taxonomy settings
    description: text('description'),
    isHierarchical: boolean('is_hierarchical').notNull().default(false),
    isPublic: boolean('is_public').notNull().default(true),

    // Which post types can use this taxonomy
    applicableEntityTypes: jsonb('applicable_entity_types').notNull().default(['post']), // ['post', 'media', 'page', 'custom']

    // UI settings
    showInMenu: boolean('show_in_menu').notNull().default(true),
    showInRest: boolean('show_in_rest').notNull().default(true),

    // Capabilities (who can manage this taxonomy)
    capabilities: jsonb('capabilities'),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('taxonomies_org_slug_idx').on(table.organizationId, table.slug),
    index('taxonomies_org_idx').on(table.organizationId),
    index('taxonomies_type_idx').on(table.type),
  ],
);

// ============================================================================
// TERMS TABLE (Actual category/tag entries)
// ============================================================================

export const terms = pgTable(
  'terms',
  {
    id: idPrimaryKey,

    // Taxonomy relationship
    taxonomyId: uuid('taxonomy_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => taxonomies.id, { onDelete: 'cascade' }),

    // Organization relationship
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, {
        onDelete: 'cascade',
      }),

    // Term identification
    name: varchar('name', { length: 200 }).notNull(), // Display name
    slug: varchar('slug', { length: 200 }).notNull(), // URL-friendly slug

    // Hierarchical support (for categories)
    parentId: uuid('parent_id').$type<UUIDv7>(), // Self-referencing for hierarchy

    // Term details
    description: text('description'),

    // Count of entities using this term
    count: integer('count').notNull().default(0),

    // Order for display (manual sorting)
    order: integer('order').notNull().default(0),

    // SEO
    metaTitle: varchar('meta_title', { length: 500 }),
    metaDescription: text('meta_description'),

    // Featured image for term (category/tag images)
    featuredImageUrl: varchar('featured_image_url', { length: 500 }),

    // Color coding (useful for UI)
    color: varchar('color', { length: 7 }), // Hex color code

    // Audit
    ...timestamps,
  },
  (table) => [
    // Unique slug per taxonomy per organization
    uniqueIndex('terms_taxonomy_org_slug_idx').on(
      table.taxonomyId,
      table.organizationId,
      table.slug,
    ),

    index('terms_taxonomy_idx').on(table.taxonomyId),
    index('terms_org_idx').on(table.organizationId),
    index('terms_parent_idx').on(table.parentId),
    index('terms_slug_idx').on(table.slug),
  ],
);

// ============================================================================
// TERM META TABLE (Additional term metadata)
// ============================================================================

export const termMeta = pgTable(
  'term_meta',
  {
    id: idPrimaryKey,

    termId: uuid('term_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => terms.id, { onDelete: 'cascade' }),

    // Meta key-value
    metaKey: varchar('meta_key', { length: 255 }).notNull(),
    metaValue: text('meta_value'),

    // JSONB for structured data
    metaValueJson: jsonb('meta_value_json'),

    // Audit
    ...timestamps,
  },
  (table) => [
    index('term_meta_term_idx').on(table.termId),
    index('term_meta_key_idx').on(table.metaKey),
    index('term_meta_term_key_idx').on(table.termId, table.metaKey),
  ],
);

// ============================================================================
// RELATIONS
// ============================================================================

export const taxonomiesRelations = defineRelationsPart(
  {
    taxonomies,
    terms,
  },
  (r) => ({
    taxonomies: {
      terms: r.many.terms({ from: r.taxonomies.id, to: r.terms.taxonomyId }),
    },
  }),
);

export const termMetaRelations = defineRelationsPart(
  {
    termMeta,
    terms,
  },
  (r) => ({
    termMeta: {
      term: r.one.terms({ from: r.termMeta.termId, to: r.terms.id, optional: false }),
    },
  }),
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Taxonomy schemas
export const insertTaxonomySchema = createInsertSchema(taxonomies, {
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Invalid slug format'),
  label: z.string().min(1).max(100),
  labelSingular: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaxonomySchema = insertTaxonomySchema.partial();

// Term schemas
export const insertTermSchema = createInsertSchema(terms, {
  name: z.string().min(1, 'Name is required').max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  description: z.string().max(1000).optional(),
  metaTitle: z.string().max(500).optional(),
  metaDescription: z.string().max(1000).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  count: true,
});

export const updateTermSchema = insertTermSchema.partial();

// Term meta schemas
export const insertTermMetaSchema = createInsertSchema(termMeta, {
  metaKey: z.string().min(1).max(255),
  metaValue: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Select schemas
export const selectTaxonomySchema = createSelectSchema(taxonomies);
export const selectTermSchema = createSelectSchema(terms);
export const selectTermMetaSchema = createSelectSchema(termMeta);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type Taxonomy = typeof taxonomies.$inferSelect;
export type NewTaxonomy = z.infer<typeof insertTaxonomySchema>;
export type UpdateTaxonomy = z.infer<typeof updateTaxonomySchema>;

export type Term = typeof terms.$inferSelect;
export type NewTerm = z.infer<typeof insertTermSchema>;
export type UpdateTerm = z.infer<typeof updateTermSchema>;

export type TermMeta = typeof termMeta.$inferSelect;
export type NewTermMeta = z.infer<typeof insertTermMetaSchema>;

// Extended types with relations
export type TaxonomyWithTerms = Taxonomy & {
  terms?: Term[];
};

export type TermWithRelations = Term & {
  taxonomy?: Taxonomy;
  parent?: Term | null;
  children?: Term[];
  meta?: TermMeta[];
  count?: number;
};

export type TermHierarchy = Term & {
  children: TermHierarchy[];
};
