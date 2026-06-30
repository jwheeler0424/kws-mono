import type { ImagePipelineOptions, ImagePipelineResult, ImageVariantResult } from './types.js';

import { extractImageMetadata } from './extract-metadata.js';
import { processVariants } from './process-variants.js';
import { resolveImageSource } from './resolve-source.js';
import { writeVariants } from './storage.js';

/**
 * Downloads, processes, and stores an image through the full pipeline:
 *
 * 1. **Resolve** — converts any supported source (URL, S3 path, local file,
 *    Blob, ArrayBuffer) into an in-memory `Blob`.
 * 2. **Decode** — creates a `Bun.Image` instance (zero-copy; SIMD-accelerated).
 * 3. **Metadata + variants** — extracts rich metadata and produces three WebP
 *    variants (thumbnail ≥120 px wide, preview ≥600 px wide, full size) in
 *    parallel via `Promise.all`.  All image processing runs off the main thread.
 * 4. **Store** — writes the three blobs to the configured storage provider
 *    (local disk, S3, or R2) in parallel.
 * 5. **Return** — yields an `ImagePipelineResult` ready for direct insertion
 *    into the `media` and `mediaVariants` database tables.  No DB writes are
 *    performed here; that is the caller's responsibility.
 *
 * @example
 * ```ts
 * const result = await processImage({
 *   source: 'https://example.com/photo.jpg',
 *   filename: 'listing-hero',
 *   organizationId: orgId,
 *   webp: { quality: 90 },
 *   storage: { provider: 'local' },
 * });
 *
 * // Insert into DB:
 * await db.insert(media).values({
 *   ...result.source,
 *   filename: 'listing-hero_full.webp',
 *   originalFilename: 'photo.jpg',
 *   fileSize: result.variants.full.fileSize,
 *   storageProvider: 'local',
 *   storagePath: result.variants.full.storagePath,
 *   storageKey: result.variants.full.storageKey,
 *   url: result.variants.full.url,
 *   // ...other required fields
 * });
 * ```
 */
export async function processImage(options: ImagePipelineOptions): Promise<ImagePipelineResult> {
  const {
    source,
    filename,
    organizationId,
    webp: webpOptions = { quality: 90 },
    storage,
  } = options;

  // ── Step 1: Resolve the source to a Blob ──────────────────────────────────
  const blob = await resolveImageSource(source);

  // ── Step 2: Construct a Bun.Image pipeline handle ─────────────────────────
  // Bun.Image uses zero-copy ArrayBuffer borrowing; the same decoded image is
  // reused across all chained transforms without re-allocating pixel data.
  const image = new Bun.Image(blob);

  // ── Step 3a: Extract metadata ─────────────────────────────────────────────
  // metadata() runs on the main thread and is lightweight — it reads the image
  // header without fully decoding pixel data.  We need dimensions before we
  // can pre-compute output sizes for the resize variants.
  const metadata = await extractImageMetadata(image);

  // ── Step 3b: Produce all three variants concurrently ──────────────────────
  // processVariants() fans out three off-thread encode jobs via Promise.all.
  // Dimensions from metadata allow output sizes to be calculated without an
  // extra metadata() call per variant.
  const rawVariants = await processVariants(
    image,
    { width: metadata.width, height: metadata.height },
    webpOptions,
  );

  // ── Step 4: Write variants to storage ─────────────────────────────────────
  const storedVariants = await writeVariants(rawVariants, storage, filename, organizationId);

  // ── Step 5: Assemble result ────────────────────────────────────────────────
  const variantMap = storedVariants.reduce<Record<string, ImageVariantResult>>((acc, v) => {
    acc[v.variantName] = v;
    return acc;
  }, {});

  return {
    source: metadata,
    variants: {
      thumbnail: variantMap['thumbnail']!,
      preview: variantMap['preview']!,
      full: variantMap['full']!,
    },
  };
}
