import path from 'node:path';

import type {
  CloudStorageOptions,
  ImageVariantResult,
  LocalStorageOptions,
  RawVariantData,
  StorageOptions,
} from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Builds the output filename for a single variant. */
function variantFilename(baseFilename: string, variantName: string): string {
  return `${baseFilename}_${variantName}.webp`;
}

/** Builds the directory segment used for namespacing stored files. */
function namespace(organizationId?: string): string {
  return organizationId ?? 'default';
}

// ─────────────────────────────────────────────────────────────────────────────
// Local storage
// ─────────────────────────────────────────────────────────────────────────────

async function writeLocalVariant(
  variant: RawVariantData,
  opts: LocalStorageOptions,
  baseFilename: string,
  organizationId?: string,
): Promise<ImageVariantResult> {
  const basePath = opts.basePath ?? path.join(process.cwd(), 'public', 'media', 'uploads');
  const publicBaseUrl = opts.publicBaseUrl ?? '/media/uploads';

  const ns = namespace(organizationId);
  const filename = variantFilename(baseFilename, variant.variantName);

  const storagePath = path.join(basePath, ns, filename);
  // Normalise to forward slashes for the URL
  const urlPath = [publicBaseUrl.replace(/\/$/, ''), ns, filename].join('/');

  await Bun.write(storagePath, variant.blob);

  return {
    variantName: variant.variantName,
    width: variant.width,
    height: variant.height,
    fileSize: variant.blob.size,
    url: urlPath,
    storagePath,
    storageKey: storagePath,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 / R2 storage
// ─────────────────────────────────────────────────────────────────────────────

async function writeCloudVariant(
  variant: RawVariantData,
  opts: CloudStorageOptions,
  baseFilename: string,
  organizationId?: string,
): Promise<ImageVariantResult> {
  const client = opts.client ?? Bun.s3;
  const keyPrefix = (opts.keyPrefix ?? 'media/uploads').replace(/\/$/, '');

  const ns = namespace(organizationId);
  const filename = variantFilename(baseFilename, variant.variantName);
  const storageKey = [keyPrefix, ns, filename].join('/');

  // Write to the cloud bucket
  await client.file(storageKey).write(variant.blob, {
    type: 'image/webp',
    acl: 'public-read',
  });

  // Derive public URL — use a static base URL when provided, otherwise presign
  let url: string;
  if (opts.publicBaseUrl) {
    url = [opts.publicBaseUrl.replace(/\/$/, ''), storageKey].join('/');
  } else {
    url = client.presign(storageKey, {
      // 7-day window; long-lived enough for a media library without being permanent
      expiresIn: 7 * 24 * 60 * 60,
    });
  }

  return {
    variantName: variant.variantName,
    width: variant.width,
    height: variant.height,
    fileSize: variant.blob.size,
    url,
    storagePath: storageKey,
    storageKey,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes all three variants to the configured storage provider in parallel and
 * returns an `ImageVariantResult` for each one.
 *
 * For `local` storage, directories are created automatically via `Bun.write`.
 * For `s3` / `r2` storage, the file is uploaded with `Content-Type: image/webp`
 * and `ACL: public-read`; a presigned URL is generated if no `publicBaseUrl`
 * is configured.
 */
export async function writeVariants(
  rawVariants: RawVariantData[],
  storage: StorageOptions,
  baseFilename: string,
  organizationId?: string,
): Promise<ImageVariantResult[]> {
  const writes = rawVariants.map((variant) => {
    if (storage.provider === 'local') {
      return writeLocalVariant(variant, storage, baseFilename, organizationId);
    }
    return writeCloudVariant(variant, storage, baseFilename, organizationId);
  });

  return Promise.all(writes);
}
