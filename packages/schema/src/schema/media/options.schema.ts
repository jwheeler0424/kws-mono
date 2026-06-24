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

import type { UUIDv7 } from '@/types';

import { organization, user } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';

// ============================================================================
// ENUMS
// ============================================================================

export const mediaOptionTypeEnum = pgEnum('media_option_type', [
  'string',
  'number',
  'boolean',
  'json',
  'array',
]);

export const mediaOptionScopeEnum = pgEnum('media_option_scope', [
  'global', // System-wide settings
  'organization', // Organization-specific settings
  'user', // User-specific preferences
]);

// ============================================================================
// MEDIA OPTIONS TABLE
// ============================================================================

export const mediaOptions = pgTable(
  'media_options',
  {
    id: idPrimaryKey,

    // Scope
    scope: mediaOptionScopeEnum('scope').notNull().default('organization'),

    organizationId: uuid('organization_id')
      .$type<UUIDv7>()
      .references(() => organization.id),
    userId: uuid('user_id')
      .$type<UUIDv7>()
      .references(() => user.id, {
        onDelete: 'cascade',
      }),

    // Option identification
    optionName: varchar('option_name', { length: 255 }).notNull(),

    // Option value (multiple storage types for flexibility)
    optionValue: text('option_value'),
    optionValueJson: jsonb('option_value_json'),

    // Type hint for proper parsing
    optionType: mediaOptionTypeEnum('option_type').notNull().default('string'),

    // Auto-loading (frequently accessed options)
    autoload: boolean('autoload').notNull().default(false),

    // Description for documentation
    description: text('description'),

    // Category for organization
    category: varchar('category', { length: 100 }),

    // Audit
    ...timestamps,
  },
  (table) => [
    // Unique constraint based on scope
    uniqueIndex('media_options_global_name_idx')
      .on(table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'global'")}`),

    uniqueIndex('media_options_org_name_idx')
      .on(table.organizationId, table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'organization'")}`),

    uniqueIndex('media_options_user_name_idx')
      .on(table.userId, table.optionName)
      .where(sql`${table.scope} = ${sql.raw("'user'")}`),

    // Query indexes
    index('media_options_scope_idx').on(table.scope),
    index('media_options_org_idx').on(table.organizationId),
    index('media_options_user_idx').on(table.userId),
    index('media_options_autoload_idx').on(table.autoload),
    index('media_options_category_idx').on(table.category),
  ],
);

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

// Insert schema
export const insertMediaOptionSchema = createInsertSchema(mediaOptions, {
  optionName: z.string().min(1).max(255),
  optionValue: z.string().optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMediaOptionSchema = insertMediaOptionSchema.partial();

// Select schema
export const selectMediaOptionSchema = createSelectSchema(mediaOptions);

// ============================================================================
// TYPESCRIPT TYPES
// ============================================================================

export type MediaOption = typeof mediaOptions.$inferSelect;
export type NewMediaOption = z.infer<typeof insertMediaOptionSchema>;
export type UpdateMediaOption = z.infer<typeof updateMediaOptionSchema>;

// ============================================================================
// MEDIA OPTION CATEGORIES
// ============================================================================

export const MEDIA_OPTION_CATEGORIES = {
  UPLOAD: 'upload',
  PROCESSING: 'processing',
  STORAGE: 'storage',
  ORGANIZATION: 'organization',
  SECURITY: 'security',
  OPTIMIZATION: 'optimization',
  ADVANCED: 'advanced',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document',
  PERMISSIONS: 'permissions',
} as const;

// ============================================================================
// DEFAULT MEDIA OPTIONS
// ============================================================================

export type DefaultMediaOption = {
  name: string;
  value: string | number | boolean | object | Array<unknown> | null;
  type: 'string' | 'number' | 'boolean' | 'json' | 'array';
  scope: 'global' | 'organization' | 'user';
  category: string;
  description: string;
  autoload: boolean;
};

export const MEDIA_DEFAULT_OPTIONS: DefaultMediaOption[] = [
  // ========================================
  // UPLOAD SETTINGS
  // ========================================
  {
    name: 'media_max_file_size',
    value: 10485760, // 10MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum file size for uploads in bytes',
    autoload: true,
  },
  {
    name: 'media_max_image_size',
    value: 5242880, // 5MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum image file size in bytes',
    autoload: true,
  },
  {
    name: 'media_max_video_size',
    value: 104857600, // 100MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum video file size in bytes',
    autoload: true,
  },
  {
    name: 'media_max_audio_size',
    value: 52428800, // 50MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum audio file size in bytes',
    autoload: true,
  },
  {
    name: 'media_max_document_size',
    value: 20971520, // 20MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum document file size in bytes',
    autoload: true,
  },
  {
    name: 'media_allowed_image_types',
    value: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    type: 'array',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Allowed image MIME types',
    autoload: true,
  },
  {
    name: 'media_allowed_video_types',
    value: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'],
    type: 'array',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Allowed video MIME types',
    autoload: true,
  },
  {
    name: 'media_allowed_audio_types',
    value: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'],
    type: 'array',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Allowed audio MIME types',
    autoload: true,
  },
  {
    name: 'media_allowed_document_types',
    value: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/json',
    ],
    type: 'array',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Allowed document MIME types',
    autoload: true,
  },
  {
    name: 'media_require_login_upload',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Require users to be logged in to upload',
    autoload: true,
  },
  {
    name: 'media_enable_drag_drop',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Enable drag and drop uploads',
    autoload: true,
  },
  {
    name: 'media_enable_bulk_upload',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Allow multiple file uploads at once',
    autoload: true,
  },
  {
    name: 'media_max_bulk_upload_count',
    value: 50,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.UPLOAD,
    description: 'Maximum number of files in bulk upload',
    autoload: true,
  },

  // ========================================
  // ROLE-BASED UPLOAD LIMITS
  // ========================================
  {
    name: 'media_upload_limit_viewer',
    value: 0,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for media_viewer role (bytes)',
    autoload: true,
  },
  {
    name: 'media_upload_limit_uploader',
    value: 10485760, // 10MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for media_uploader role (bytes)',
    autoload: true,
  },
  {
    name: 'media_upload_limit_creator',
    value: 20971520, // 20MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for media_creator role (bytes)',
    autoload: true,
  },
  {
    name: 'media_upload_limit_manager',
    value: 52428800, // 50MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for media_manager role (bytes)',
    autoload: true,
  },
  {
    name: 'media_upload_limit_admin',
    value: 104857600, // 100MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for admin role (bytes)',
    autoload: true,
  },
  {
    name: 'media_upload_limit_superadmin',
    value: 209715200, // 200MB
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.PERMISSIONS,
    description: 'Upload size limit for superadmin role (bytes)',
    autoload: true,
  },

  // ========================================
  // IMAGE PROCESSING
  // ========================================
  {
    name: 'media_generate_variants_on_upload',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Automatically generate image variants on upload',
    autoload: true,
  },
  {
    name: 'media_image_quality',
    value: 85,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Image compression quality (1-100)',
    autoload: true,
  },
  {
    name: 'media_optimize_images',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Optimize images on upload',
    autoload: true,
  },
  {
    name: 'media_extract_exif',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Extract EXIF metadata from images',
    autoload: true,
  },
  {
    name: 'media_strip_exif_on_upload',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Remove EXIF data from images (privacy)',
    autoload: true,
  },
  {
    name: 'media_auto_orient_images',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Auto-rotate images based on EXIF orientation',
    autoload: true,
  },
  {
    name: 'media_preserve_original',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Keep original uploaded file',
    autoload: true,
  },
  {
    name: 'media_convert_to_webp',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'Auto-convert images to WebP format',
    autoload: true,
  },
  {
    name: 'media_webp_quality',
    value: 80,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.IMAGE,
    description: 'WebP conversion quality (1-100)',
    autoload: true,
  },

  // ========================================
  // VIDEO PROCESSING
  // ========================================
  {
    name: 'media_generate_video_thumbnail',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Generate video thumbnails on upload',
    autoload: true,
  },
  {
    name: 'media_video_thumbnail_time',
    value: 5,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Time in seconds to capture video thumbnail',
    autoload: true,
  },
  {
    name: 'media_generate_video_preview_gif',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Generate preview GIF for videos',
    autoload: true,
  },
  {
    name: 'media_video_preview_duration',
    value: 3,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Duration of video preview GIF in seconds',
    autoload: true,
  },
  {
    name: 'media_extract_video_metadata',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Extract video metadata (duration, codec, dimensions)',
    autoload: true,
  },
  {
    name: 'media_generate_video_timeline',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.VIDEO,
    description: 'Generate timeline sprite sheet for videos',
    autoload: true,
  },

  // ========================================
  // AUDIO PROCESSING
  // ========================================
  {
    name: 'media_generate_audio_waveform',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.AUDIO,
    description: 'Generate waveform visualization for audio',
    autoload: true,
  },
  {
    name: 'media_extract_audio_metadata',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.AUDIO,
    description: 'Extract audio metadata (ID3 tags, duration)',
    autoload: true,
  },
  {
    name: 'media_generate_audio_spectrogram',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.AUDIO,
    description: 'Generate spectrogram for audio files',
    autoload: true,
  },

  // ========================================
  // DOCUMENT PROCESSING
  // ========================================
  {
    name: 'media_generate_pdf_thumbnail',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.DOCUMENT,
    description: 'Generate thumbnail for PDF documents',
    autoload: true,
  },
  {
    name: 'media_pdf_thumbnail_page',
    value: 1,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.DOCUMENT,
    description: 'Page number to use for PDF thumbnail',
    autoload: true,
  },
  {
    name: 'media_extract_pdf_text',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.DOCUMENT,
    description: 'Extract text content from PDFs',
    autoload: true,
  },
  {
    name: 'media_extract_document_metadata',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.DOCUMENT,
    description: 'Extract metadata from documents',
    autoload: true,
  },

  // ========================================
  // STORAGE SETTINGS
  // ========================================
  {
    name: 'media_storage_provider',
    value: 'local',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Storage provider: local, s3, or r2',
    autoload: true,
  },
  {
    name: 'media_local_storage_path',
    value: './uploads',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Local storage path for media files',
    autoload: true,
  },
  {
    name: 'media_use_cdn',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Use CDN for serving media files',
    autoload: true,
  },
  {
    name: 'media_cdn_url',
    value: '',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'CDN base URL',
    autoload: true,
  },
  {
    name: 'media_s3_bucket',
    value: '',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'AWS S3 bucket name',
    autoload: false,
  },
  {
    name: 'media_s3_region',
    value: 'us-east-1',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'AWS S3 region',
    autoload: false,
  },
  {
    name: 'media_s3_public_access',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Make S3 objects publicly accessible',
    autoload: false,
  },
  {
    name: 'media_r2_bucket',
    value: '',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Cloudflare R2 bucket name',
    autoload: false,
  },
  {
    name: 'media_r2_account_id',
    value: '',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Cloudflare R2 account ID',
    autoload: false,
  },
  {
    name: 'media_r2_public_access',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.STORAGE,
    description: 'Make R2 objects publicly accessible',
    autoload: false,
  },

  // ========================================
  // ORGANIZATION SETTINGS
  // ========================================
  {
    name: 'media_organize_by_date',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Organize uploads into year/month folders',
    autoload: true,
  },
  {
    name: 'media_date_folder_format',
    value: 'YYYY/MM',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Date folder format',
    autoload: true,
  },
  {
    name: 'media_enable_folders',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Enable folder organization in media library',
    autoload: true,
  },
  {
    name: 'media_default_folder',
    value: null,
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Default folder ID for new uploads',
    autoload: true,
  },
  {
    name: 'media_trash_retention_days',
    value: 30,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Days to keep deleted media in trash',
    autoload: true,
  },
  {
    name: 'media_auto_cleanup_trash',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Automatically clean up trash after retention period',
    autoload: true,
  },

  // ========================================
  // SECURITY SETTINGS
  // ========================================
  {
    name: 'media_validate_mime_type',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Validate MIME type from file buffer',
    autoload: true,
  },
  {
    name: 'media_scan_malicious_content',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Scan files for malicious content',
    autoload: true,
  },
  {
    name: 'media_sanitize_svg',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Sanitize SVG files to remove scripts',
    autoload: true,
  },
  {
    name: 'media_block_dangerous_extensions',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Block dangerous file extensions',
    autoload: true,
  },
  {
    name: 'media_require_permission_check',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Require permission check before operations',
    autoload: true,
  },
  {
    name: 'media_enable_private_urls',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Use signed/private URLs for media access',
    autoload: true,
  },
  {
    name: 'media_signed_url_expiry',
    value: 3600,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Signed URL expiry time in seconds',
    autoload: true,
  },
  {
    name: 'media_enable_watermark',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Add watermark to images',
    autoload: true,
  },
  {
    name: 'media_watermark_text',
    value: '',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Watermark text',
    autoload: false,
  },
  {
    name: 'media_watermark_position',
    value: 'bottom-right',
    type: 'string',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.SECURITY,
    description: 'Watermark position',
    autoload: false,
  },

  // ========================================
  // OPTIMIZATION SETTINGS
  // ========================================
  {
    name: 'media_enable_lazy_loading',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.OPTIMIZATION,
    description: 'Enable lazy loading for images',
    autoload: true,
  },
  {
    name: 'media_enable_responsive_images',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.OPTIMIZATION,
    description: 'Generate responsive image srcsets',
    autoload: true,
  },
  {
    name: 'media_cache_enabled',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.OPTIMIZATION,
    description: 'Enable Redis caching for media queries',
    autoload: true,
  },
  {
    name: 'media_cache_ttl',
    value: 3600,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.OPTIMIZATION,
    description: 'Cache TTL in seconds',
    autoload: true,
  },
  {
    name: 'media_browser_cache_max_age',
    value: 31536000, // 1 year
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.OPTIMIZATION,
    description: 'Browser cache max-age in seconds',
    autoload: true,
  },

  // ========================================
  // ADVANCED SETTINGS
  // ========================================
  {
    name: 'media_queue_processing',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Use background queue for heavy processing',
    autoload: true,
  },
  {
    name: 'media_queue_concurrency',
    value: 5,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Number of concurrent queue workers',
    autoload: true,
  },
  {
    name: 'media_enable_analytics',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Track media usage analytics',
    autoload: true,
  },
  {
    name: 'media_enable_search',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Enable full-text search in media library',
    autoload: true,
  },
  {
    name: 'media_search_index_content',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Index file content for search',
    autoload: true,
  },
  {
    name: 'media_enable_versioning',
    value: false,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Keep version history of replaced files',
    autoload: true,
  },
  {
    name: 'media_max_versions',
    value: 5,
    type: 'number',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Maximum number of versions to keep',
    autoload: true,
  },
  {
    name: 'media_enable_duplicate_detection',
    value: true,
    type: 'boolean',
    scope: 'organization',
    category: MEDIA_OPTION_CATEGORIES.ADVANCED,
    description: 'Detect and warn about duplicate uploads',
    autoload: true,
  },

  // ========================================
  // USER PREFERENCES (USER SCOPE)
  // ========================================
  {
    name: 'media_library_view_mode',
    value: 'grid',
    type: 'string',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Default view mode: grid or list',
    autoload: true,
  },
  {
    name: 'media_library_sort_by',
    value: 'date',
    type: 'string',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Default sort field: date, name, size, or type',
    autoload: true,
  },
  {
    name: 'media_library_sort_order',
    value: 'desc',
    type: 'string',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Default sort order: asc or desc',
    autoload: true,
  },
  {
    name: 'media_library_items_per_page',
    value: 20,
    type: 'number',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Items to show per page in media library',
    autoload: true,
  },
  {
    name: 'media_show_deleted_files',
    value: false,
    type: 'boolean',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Show deleted files in trash view',
    autoload: true,
  },
  {
    name: 'media_thumbnail_size',
    value: 'medium',
    type: 'string',
    scope: 'user',
    category: MEDIA_OPTION_CATEGORIES.ORGANIZATION,
    description: 'Thumbnail size in grid view: small, medium, large',
    autoload: true,
  },
];

// ============================================
// OPTION VALIDATION SCHEMAS
// ============================================

export const MEDIA_OPTION_VALIDATORS = {
  media_max_file_size: (value: number) => value > 0 && value <= 1073741824, // Max 1GB
  media_image_quality: (value: number) => value >= 1 && value <= 100,
  media_webp_quality: (value: number) => value >= 1 && value <= 100,
  media_trash_retention_days: (value: number) => value >= 0 && value <= 365,
  media_queue_concurrency: (value: number) => value >= 1 && value <= 20,
  media_max_versions: (value: number) => value >= 1 && value <= 100,
  media_storage_provider: (value: string) => ['local', 's3', 'r2'].includes(value),
  media_library_view_mode: (value: string) => ['grid', 'list'].includes(value),
  media_library_sort_by: (value: string) => ['date', 'name', 'size', 'type'].includes(value),
  media_library_sort_order: (value: string) => ['asc', 'desc'].includes(value),
  media_thumbnail_size: (value: string) => ['small', 'medium', 'large'].includes(value),
  media_watermark_position: (value: string) =>
    ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(value),
} as const;
