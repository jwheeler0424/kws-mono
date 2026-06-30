import type { mlsMedia } from '@kws/schema';

import type { MlsMediaPayload } from '../types';

import {
  parseBoolean,
  parseIntegerValue,
  parseNullableString,
  parseStringArray,
  parseTimestamp,
} from '@/lib/utils';

type MediaInsert = typeof mlsMedia.$inferInsert;

export type MappedMedia = Omit<MediaInsert, 'createdAt' | 'searchVector'>;

export function mapMedia(payload: MlsMediaPayload, resourceRecordKey: string): MappedMedia {
  // Media payloads often omit MlgCanView. Treat missing/indeterminate as visible
  // and only soft-delete when the feed explicitly sets MlgCanView = false.
  const canView = parseBoolean(payload.MlgCanView) !== false;

  return {
    mediaKey: payload.MediaKey,
    resourceRecordKey,
    imageHeight: parseIntegerValue(payload.ImageHeight),
    imageSizeDescription: parseNullableString(payload.ImageSizeDescription, 1024),
    imageWidth: parseIntegerValue(payload.ImageWidth),
    longDescription: parseNullableString(payload.LongDescription, 1024),
    mediaURL: parseNullableString(payload.MediaURL, 8000),
    mediaModificationTimestamp: parseTimestamp(payload.MediaModificationTimestamp),
    mediaObjectId: parseNullableString(payload.MediaObjectID, 255),
    order: parseIntegerValue(payload.Order),
    permission: parseStringArray(payload.Permission),
    preferredPhotoYN:
      typeof payload.PreferredPhotoYN === 'boolean' ? payload.PreferredPhotoYN : null,
    deletedAt: canView ? null : new Date(),
    updatedAt: new Date(),
  };
}
