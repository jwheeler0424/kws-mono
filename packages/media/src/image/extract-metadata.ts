import type { MappedImageMetadata } from './types.js';

/**
 * Computes a decimal aspect ratio (width / height) rounded to 4 decimal places.
 * Matches the `decimal(10, 4)` precision of the `media.aspect_ratio` DB column.
 */
function computeAspectRatio(width: number, height: number): number {
  if (height === 0) return 0;
  return parseFloat((width / height).toFixed(4));
}

/**
 * Extracts and maps image metadata from a `Bun.Image` instance.
 *
 * Typed fields (`width`, `height`, `format`, `aspectRatio`) are returned as
 * first-class properties for direct mapping to `media` table columns.  The
 * full raw metadata object is included in `exifData` for the `exif_data` JSONB
 * column, capturing any additional fields (colour space, ICC profile, etc.)
 * that Bun exposes in the future.
 */
export async function extractImageMetadata(image: Bun.Image): Promise<MappedImageMetadata> {
  const raw = await image.metadata();

  const width = raw.width as number;
  const height = raw.height as number;
  const format = (raw.format as string | undefined) ?? 'unknown';

  return {
    width,
    height,
    format,
    aspectRatio: computeAspectRatio(width, height),
    mimeType: 'image/webp',
    fileExtension: 'webp',
    // Store the complete raw metadata object for the exif_data JSONB column.
    exifData: raw as unknown as Record<string, unknown>,
  };
}
