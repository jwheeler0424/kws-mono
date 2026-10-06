import type { mlsMedia } from '@kws/schema';

import {
  parseBoolean,
  parseIntegerValue,
  parseNullableString,
  parseStringArray,
  parseTimestamp,
} from '@/lib/utils';

import type { MlsMediaPayload } from '../types';

type MediaInsert = typeof mlsMedia.$inferInsert;

export type MappedMedia = Omit<MediaInsert, 'createdAt' | 'searchVector'>;

function mapMediaBase(
  payload: MlsMediaPayload,
  resourceRecordKey: string,
  mediaKey: string,
): MappedMedia {
  // Media payloads often omit MlgCanView. Treat missing/indeterminate as visible
  // and only soft-delete when the feed explicitly sets MlgCanView = false.
  const permissions = parseStringArray(payload.Permission);
  const canView =
    parseBoolean(payload.MlgCanView) !== false &&
    !permissions?.some((permission) => permission.toLowerCase() === 'private');

  return {
    mediaKey,
    resourceRecordKey,
    imageHeight: parseIntegerValue(payload.ImageHeight),
    imageSizeDescription: parseNullableString(payload.ImageSizeDescription, 1024),
    imageWidth: parseIntegerValue(payload.ImageWidth),
    longDescription: parseNullableString(payload.LongDescription, 1024),
    mediaURL: null,
    mediaModificationTimestamp: parseTimestamp(payload.MediaModificationTimestamp),
    mediaObjectId: parseNullableString(payload.MediaObjectID, 255),
    order: parseIntegerValue(payload.Order),
    permission: permissions,
    preferredPhotoYN:
      typeof payload.PreferredPhotoYN === 'boolean' ? payload.PreferredPhotoYN : null,
    deletedAt: canView ? null : new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Property media should keep MLS-provided MediaKey semantics.
 * If MediaKey is absent, skip the row instead of inventing a key.
 */
export function mapPropertyMedia(
  payload: MlsMediaPayload,
  resourceRecordKey: string,
): MappedMedia | null {
  const mediaKey = payload.MediaKey?.trim();
  if (!mediaKey) {
    throw new Error('MLS media snapshot contains a record without MediaKey');
  }

  return mapMediaBase(payload, resourceRecordKey, mediaKey);
}

/**
 * Member media payloads can omit MediaKey. Fall back to the member identifier
 * so each member retains a stable, upsertable media row key.
 */
export function mapMemberMedia(
  payload: MlsMediaPayload,
  resourceRecordKey: string,
): MappedMedia | null {
  const mediaKey = payload.MediaKey?.trim();
  if (!mediaKey) {
    throw new Error('MLS member media snapshot contains a record without MediaKey');
  }

  return mapMediaBase(payload, resourceRecordKey, mediaKey);
}

/**
 * Office media payloads can omit MediaKey. Fall back to the office identifier
 * so each office retains a stable, upsertable media row key.
 */
export function mapOfficeMedia(
  payload: MlsMediaPayload,
  resourceRecordKey: string,
): MappedMedia | null {
  const mediaKey = payload.MediaKey?.trim();
  if (!mediaKey) {
    throw new Error('MLS office media snapshot contains a record without MediaKey');
  }

  return mapMediaBase(payload, resourceRecordKey, mediaKey);
}
