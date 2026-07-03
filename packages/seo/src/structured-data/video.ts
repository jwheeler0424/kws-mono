import { jsonLd, type JsonLdBase } from './common';

export type VideoObjectSchemaInput = {
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  /** ISO 8601 duration, e.g. `'PT1M33S'`. */
  duration?: string;
  contentUrl?: string;
  embedUrl?: string;
};

export function videoObjectSchema(input: VideoObjectSchemaInput): JsonLdBase<'VideoObject'> {
  return jsonLd({
    '@type': 'VideoObject',
    name: input.name,
    description: input.description,
    thumbnailUrl: input.thumbnailUrl,
    uploadDate: input.uploadDate,
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.contentUrl ? { contentUrl: input.contentUrl } : {}),
    ...(input.embedUrl ? { embedUrl: input.embedUrl } : {}),
  });
}
