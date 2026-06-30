import type { S3Client } from 'bun';

// ─────────────────────────────────────────────────────────────────────────────
// Variant identifiers
// ─────────────────────────────────────────────────────────────────────────────

export type ImageVariantName = 'thumbnail' | 'preview' | 'full';

/**
 * Target widths (px) for each variant.  `null` means no resize — only convert.
 * `withoutEnlargement` is always true, so images smaller than the target are
 * kept at their original size.
 */
export const VARIANT_TARGET_WIDTHS = {
  thumbnail: 120,
  preview: 600,
  full: null,
} as const satisfies Record<ImageVariantName, number | null>;

// ─────────────────────────────────────────────────────────────────────────────
// WebP encoding options
// ─────────────────────────────────────────────────────────────────────────────

export interface WebPOptions {
  /**
   * Encoding quality 1–100.  Higher = better quality, larger file.
   * Ignored when `lossless` is true.
   * @default 90
   */
  quality?: number;
  /**
   * Use lossless WebP encoding (bit-perfect reproduction, larger files).
   * @default false
   */
  lossless?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage options
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalStorageOptions {
  provider: 'local';
  /**
   * Absolute path to the root upload directory.
   * @default "{cwd}/public/media/uploads"
   */
  basePath?: string;
  /**
   * URL prefix used when constructing the public `url` field.
   * @default "/media/uploads"
   */
  publicBaseUrl?: string;
}

export interface CloudStorageOptions {
  provider: 's3' | 'r2';
  /**
   * Custom `S3Client` instance (e.g. configured for R2 or a specific bucket).
   * Defaults to `Bun.s3` — the default client driven by well-known env vars.
   */
  client?: S3Client;
  /**
   * Key prefix prepended to every stored file key.
   * @default "media/uploads"
   */
  keyPrefix?: string;
  /**
   * Public CDN or bucket base URL for constructing `url` fields.
   * If omitted, a presigned URL (7-day expiry) is generated per variant.
   */
  publicBaseUrl?: string;
}

export type StorageOptions = LocalStorageOptions | CloudStorageOptions;

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline I/O
// ─────────────────────────────────────────────────────────────────────────────

export interface ImagePipelineOptions {
  /**
   * Image source — one of:
   * - HTTP/HTTPS URL string or `URL` object (fetched via `fetch()`)
   * - `s3://bucket/key` or `r2://bucket/key` string (read via `Bun.file`)
   * - Local filesystem path string (read via `Bun.file`)
   * - `Blob`, `File`, or `BunFile` (used directly)
   * - `ArrayBuffer` or `TypedArray` (wrapped in a `Blob`)
   */
  source: string | URL | Blob | ArrayBuffer | ArrayBufferView;
  /**
   * Base filename (no extension) used to name the output files.
   * e.g. `"profile-photo"` → `"profile-photo_thumbnail.webp"`
   */
  filename: string;
  /** Organization ID used as a storage namespace. */
  organizationId?: string;
  /**
   * WebP encoding settings.
   * @default { quality: 90 }
   */
  webp?: WebPOptions;
  /** Where to write the processed variants. */
  storage: StorageOptions;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result types (shaped for media + mediaVariants DB insertion)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fields from `Bun.Image.metadata()` mapped to the `media` table columns.
 * The full raw metadata object is stored in `exifData`.
 */
export interface MappedImageMetadata {
  /** Original image width in pixels → `media.width` */
  width: number;
  /** Original image height in pixels → `media.height` */
  height: number;
  /** Original source format (e.g. "jpeg", "png") → `media.exifData.format` */
  format: string;
  /**
   * Aspect ratio as a decimal (width / height, precision 4)
   * → `media.aspect_ratio` (decimal column)
   */
  aspectRatio: number;
  /** Always `"image/webp"` → `media.mime_type` */
  mimeType: 'image/webp';
  /** Always `"webp"` → `media.file_extension` */
  fileExtension: 'webp';
  /** Full raw metadata object → `media.exif_data` (jsonb) */
  exifData: Record<string, unknown>;
}

/** A single processed + stored variant, shaped for `mediaVariants` insertion. */
export interface ImageVariantResult {
  /** → `media_variants.variant_name` */
  variantName: ImageVariantName;
  /** → `media_variants.width` */
  width: number;
  /** → `media_variants.height` */
  height: number;
  /** File size in bytes → `media_variants.file_size` */
  fileSize: number;
  /** Public-accessible URL → `media_variants.url` */
  url: string;
  /** Filesystem path (local) or object key (S3/R2) → `media_variants.storage_path` */
  storagePath: string;
  /** Object key → `media_variants.storage_key` */
  storageKey: string;
}

/** Complete result from `processImage()`, ready for DB insertion. */
export interface ImagePipelineResult {
  /**
   * Metadata about the source image (full-size properties).
   * Use to populate `media` table columns.
   */
  source: MappedImageMetadata;
  /**
   * Three variants keyed by name.
   * Use to populate three `mediaVariants` rows linked to the `media` record.
   */
  variants: Record<ImageVariantName, ImageVariantResult>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal — used across pipeline modules
// ─────────────────────────────────────────────────────────────────────────────

/** A processed variant's Blob + computed dimensions before storage writes. */
export interface RawVariantData {
  variantName: ImageVariantName;
  blob: Blob;
  width: number;
  height: number;
}
