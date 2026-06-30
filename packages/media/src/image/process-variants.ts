import type { RawVariantData, WebPOptions } from './types.js';

import { VARIANT_TARGET_WIDTHS } from './types.js';

/**
 * Computes the output dimensions for a resize operation that uses
 * `fit: "inside"` and `withoutEnlargement: true`.
 *
 * - If `targetWidth` is null (full variant), the original dimensions are kept.
 * - If the image is already narrower than (or equal to) `targetWidth`, the
 *   original dimensions are kept (`withoutEnlargement: true`).
 * - Otherwise the image is scaled down proportionally so width === targetWidth.
 */
function computeOutputDimensions(
  originalWidth: number,
  originalHeight: number,
  targetWidth: number | null,
): { width: number; height: number } {
  if (targetWidth === null || originalWidth <= targetWidth) {
    return { width: originalWidth, height: originalHeight };
  }
  const scale = targetWidth / originalWidth;
  return {
    width: targetWidth,
    height: Math.max(1, Math.round(originalHeight * scale)),
  };
}

/**
 * Processes three WebP variants (thumbnail, preview, full) from a single
 * `Bun.Image` source in parallel.
 *
 * All processing runs off the main thread (Bun.Image is SIMD-accelerated).
 * Using `Promise.all` here achieves genuine concurrency across the three
 * encode jobs.
 *
 * @param image    A freshly constructed `Bun.Image` instance (not yet transformed).
 * @param original Original image dimensions — used to pre-compute output sizes
 *                 without an extra metadata round-trip per variant.
 * @param webp     WebP encoding options forwarded to every variant.
 */
export async function processVariants(
  image: Bun.Image,
  original: { width: number; height: number },
  webp: WebPOptions,
): Promise<RawVariantData[]> {
  const webpOpts = {
    quality: webp.quality ?? 90,
    lossless: webp.lossless ?? false,
  };

  const [thumbnailBlob, previewBlob, fullBlob] = await Promise.all([
    image
      .resize(VARIANT_TARGET_WIDTHS.thumbnail, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp(webpOpts)
      .blob(),

    image
      .resize(VARIANT_TARGET_WIDTHS.preview, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp(webpOpts)
      .blob(),

    // Full variant: convert format only, no spatial resize
    image.webp(webpOpts).blob(),
  ]);

  const thumbnailDims = computeOutputDimensions(
    original.width,
    original.height,
    VARIANT_TARGET_WIDTHS.thumbnail,
  );
  const previewDims = computeOutputDimensions(
    original.width,
    original.height,
    VARIANT_TARGET_WIDTHS.preview,
  );

  return [
    {
      variantName: 'thumbnail',
      blob: thumbnailBlob,
      width: thumbnailDims.width,
      height: thumbnailDims.height,
    },
    {
      variantName: 'preview',
      blob: previewBlob,
      width: previewDims.width,
      height: previewDims.height,
    },
    {
      variantName: 'full',
      blob: fullBlob,
      width: original.width,
      height: original.height,
    },
  ];
}
