import { defineRelationsPart } from 'drizzle-orm';
import {
  decimal,
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

/**
 * Storage provider enum
 */
export const storageProviderEnum = pgEnum('storage_provider', ['s3', 'r2', 'local']);

/**
 * Media table - stores all uploaded files
 * WordPress Media Library equivalent
 */
export const media = pgTable(
  'media',
  {
    // Identity
    id: idPrimaryKey,
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, {
        onDelete: 'cascade',
      }),
    uploadedBy: uuid('uploaded_by')
      .$type<UUIDv7>()
      .references(() => user.id, {
        onDelete: 'set null',
      }),

    // File Information
    filename: varchar('filename', { length: 255 }).notNull(),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSize: integer('file_size').notNull(),
    fileExtension: varchar('file_extension', { length: 10 }).notNull(),

    // Storage Information
    storageProvider: storageProviderEnum('storage_provider').notNull().default('local'),
    storagePath: text('storage_path').notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    bucketName: varchar('bucket_name', { length: 100 }),
    url: text('url').notNull(),

    // Image-Specific Fields (nullable for non-images)
    width: integer('width'),
    height: integer('height'),
    aspectRatio: decimal('aspect_ratio', { precision: 10, scale: 4 }),
    focalPointX: integer('focal_point_x').default(50),
    focalPointY: integer('focal_point_y').default(50),

    // Metadata
    altText: text('alt_text'),
    caption: text('caption'),
    description: text('description'),
    title: varchar('title', { length: 500 }),

    // Organization
    folderId: uuid('folder_id').$type<UUIDv7>(),

    // EXIF Data (for images)
    exifData: jsonb('exif_data'),

    // Usage Tracking
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at'),

    // Audit
    ...timestamps,
    ...softDelete,

    // Denormalized Tags/Cats for Search Performance
    cachedSearchTerms: text('cached_search_terms').default(''),

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['title', 'alt_text', 'caption'])
      .weight('A')
      .cols([
        'description',
        'filename',
        'original_filename',
        'mime_type',
        'file_extension',
        'cached_search_terms',
      ])
      .weight('C'),
  },
  (table) => [
    index('media_organization_id_idx').on(table.organizationId),
    index('media_uploaded_by_idx').on(table.uploadedBy),
    index('media_mime_type_idx').on(table.mimeType),
    index('media_folder_id_idx').on(table.folderId),
    index('media_deleted_at_idx').on(table.deletedAt),
    index('media_created_at_idx').on(table.createdAt),
    index('media_storage_key_idx').on(table.storageKey),

    // Full-text search
    index('media_search_vector_idx').using('gin', table.searchVector),
  ],
);

/**
 * Media variants table - stores different sizes/versions of media
 * e.g., thumbnail, medium, large for images
 */
export const mediaVariants = pgTable(
  'media_variants',
  {
    id: idPrimaryKey,
    mediaId: uuid('media_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),

    variantName: varchar('variant_name', { length: 50 }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    fileSize: integer('file_size').notNull(),
    url: text('url').notNull(),
    storagePath: text('storage_path').notNull(),
    storageKey: varchar('storage_key', { length: 500 }).notNull(),

    ...timestamps,
  },
  (table) => [
    index('media_variants_media_id_idx').on(table.mediaId),
    index('media_variants_variant_name_idx').on(table.variantName),
    uniqueIndex('media_variants_unique_idx').on(table.mediaId, table.variantName),
  ],
);

/**
 * Media folders table - for organizing media into folders
 * Supports nested hierarchies
 */
export const mediaFolders = pgTable(
  'media_folders',
  {
    id: idPrimaryKey,
    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id, {
        onDelete: 'cascade',
      }),

    name: varchar('name', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 200 }).notNull(),
    parentId: uuid('parent_id').$type<UUIDv7>(),
    order: integer('order').notNull().default(0),

    createdBy: uuid('created_by')
      .$type<UUIDv7>()
      .notNull()
      .references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (table) => [
    index('media_folders_organization_id_idx').on(table.organizationId),
    index('media_folders_parent_id_idx').on(table.parentId),
    index('media_folders_slug_idx').on(table.slug),
    uniqueIndex('media_folders_unique_slug_idx').on(
      table.organizationId,
      table.parentId,
      table.slug,
    ),
  ],
);

/**
 * Relations
 */
export const mediaRelations = defineRelationsPart(
  {
    media,
    mediaVariants,
    mediaFolders,
  },
  (r) => ({
    media: {
      folder: r.one.mediaFolders({ from: r.media.folderId, to: r.mediaFolders.id }),
      variants: r.many.mediaVariants({ from: r.media.id, to: r.mediaVariants.mediaId }),
    },

    mediaVariants: {
      media: r.one.media({ from: r.mediaVariants.mediaId, to: r.media.id, optional: false }),
    },

    mediaFolders: {
      parent: r.one.mediaFolders({ from: r.mediaFolders.parentId, to: r.mediaFolders.id }),
      children: r.many.mediaFolders({ from: r.mediaFolders.id, to: r.mediaFolders.parentId }),
      media: r.many.media({ from: r.mediaFolders.id, to: r.media.folderId }),
    },
  }),
);

/**
 * Zod Schemas
 */

// Insert schemas
export const insertMediaSchema = createInsertSchema(media, {
  filename: z.string().min(1).max(255),
  originalFilename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
  fileExtension: z.string().min(1).max(10),
  url: z.string().url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  focalPointX: z.number().int().min(0).max(100).optional(),
  focalPointY: z.number().int().min(0).max(100).optional(),
  altText: z.string().max(1000).optional(),
  caption: z.string().max(2000).optional(),
  description: z.string().max(5000).optional(),
  title: z.string().max(500).optional(),
}).omit({
  searchVector: true,
});

export const insertMediaVariantSchema = createInsertSchema(mediaVariants, {
  variantName: z.string().min(1).max(50),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fileSize: z.number().int().positive(),
  url: z.string().url(),
});

export const insertMediaFolderSchema = createInsertSchema(mediaFolders, {
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  order: z.number().int().min(0).optional(),
});

// Select schemas
export const selectMediaSchema = createSelectSchema(media);
export const selectMediaVariantSchema = createSelectSchema(mediaVariants);
export const selectMediaFolderSchema = createSelectSchema(mediaFolders);

/**
 * TypeScript Types
 */
export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type MediaVariant = typeof mediaVariants.$inferSelect;
export type NewMediaVariant = typeof mediaVariants.$inferInsert;
export type MediaFolder = typeof mediaFolders.$inferSelect;
export type NewMediaFolder = typeof mediaFolders.$inferInsert;

/**
 * Helper type for media with variants
 */
export type MediaWithVariants = Media & {
  variants: MediaVariant[];
};

/**
 * Helper type for media with folder
 */
export type MediaWithFolder = Media & {
  folder: MediaFolder | null;
};

/**
 * Helper type for folder with children
 */
export type MediaFolderWithChildren = MediaFolder & {
  children: MediaFolder[];
};

/**
 * MIME type categories
 */
export const MIME_TYPE_CATEGORIES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  video: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
} as const;

/**
 * Default variant sizes
 */
export const DEFAULT_VARIANT_SIZES = {
  thumbnail: { width: 150, height: 150, crop: true },
  medium: { width: 800, height: 600, crop: false },
  large: { width: 1920, height: 1080, crop: false },
} as const;

export type VariantSize = keyof typeof DEFAULT_VARIANT_SIZES;
