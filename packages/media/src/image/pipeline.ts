import type {
  FullOnlyImagePipelineOptions,
  FullOnlyImagePipelineResult,
  ImagePipelineOptions,
  ImagePipelineResult,
  ImageVariantResult,
  MappedImageMetadata,
  RawVariantData,
  WebPOptions,
} from './types.js';

import { extractImageMetadata } from './extract-metadata.js';
import { computeOutputDimensions, processVariants } from './process-variants.js';
import { resolveImageSource } from './resolve-source.js';
import { writeVariants } from './storage.js';

async function encodeFullVariant(
  image: Bun.Image,
  metadata: MappedImageMetadata,
  webpOptions: WebPOptions,
  maxFullWidth: number | undefined,
): Promise<RawVariantData> {
  const dimensions = computeOutputDimensions(metadata.width, metadata.height, maxFullWidth ?? null);
  const pipeline =
    dimensions.width < metadata.width
      ? image.resize(dimensions.width, undefined, { fit: 'inside', withoutEnlargement: true })
      : image;
  return { variantName: 'full', blob: await pipeline.webp(webpOptions).blob(), ...dimensions };
}

/**
 * Downloads, processes, and stores an image through the full pipeline:
 *
 * 1. **Resolve** — converts any supported source (URL, S3 path, local file,
 *    Blob, ArrayBuffer) into an in-memory `Blob`.
 * 2. **Decode** — creates a `Bun.Image` instance (zero-copy; SIMD-accelerated).
 * 3. **Metadata + variants** — extracts rich metadata and produces all WebP
 *    variants by default, or only the full-size variant when requested.
 * 4. **Store** — writes the selected blobs to the configured storage provider.
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
export function processImage(
  options: FullOnlyImagePipelineOptions,
): Promise<FullOnlyImagePipelineResult>;
export function processImage(options: ImagePipelineOptions): Promise<ImagePipelineResult>;
export async function processImage(
  options: ImagePipelineOptions | FullOnlyImagePipelineOptions,
): Promise<ImagePipelineResult | FullOnlyImagePipelineResult> {
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
  const preservedFull: RawVariantData | undefined =
    options.preserveFullWebp && metadata.format === 'webp'
      ? { variantName: 'full', blob, width: metadata.width, height: metadata.height }
      : undefined;

  if (options.variantProfile === 'full-only') {
    const fullVariant =
      preservedFull ??
      (await encodeFullVariant(image, metadata, webpOptions, options.maxFullWidth));
    const [full] = await writeVariants([fullVariant], storage, filename, organizationId);

    return { source: metadata, variants: { full: full! } };
  }

  const fullVariant =
    preservedFull ??
    (options.durableFull || options.maxFullWidth
      ? await encodeFullVariant(image, metadata, webpOptions, options.maxFullWidth)
      : undefined);
  const durableFull =
    options.durableFull && fullVariant
      ? (await writeVariants([fullVariant], storage, filename, organizationId))[0]
      : undefined;

  // ── Step 3b: Produce all three variants concurrently ──────────────────────
  // processVariants() fans out three off-thread encode jobs via Promise.all.
  // Dimensions from metadata allow output sizes to be calculated without an
  // extra metadata() call per variant.
  const rawVariants = (
    await processVariants(
      image,
      { width: metadata.width, height: metadata.height },
      webpOptions,
      fullVariant?.blob,
    )
  ).map((variant) =>
    variant.variantName === 'full' && fullVariant
      ? { ...variant, width: fullVariant.width, height: fullVariant.height }
      : variant,
  );

  // ── Step 4: Write variants to storage ─────────────────────────────────────
  const storedVariants = await writeVariants(
    durableFull ? rawVariants.filter((variant) => variant.variantName !== 'full') : rawVariants,
    storage,
    filename,
    organizationId,
  );
  if (durableFull) storedVariants.push(durableFull);

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
