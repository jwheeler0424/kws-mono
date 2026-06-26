import { sql } from 'drizzle-orm';

/**
 * Shared excluded-column mapping for mls_media conflict updates.
 * Keeping this in one place avoids drift across property/member/office repositories.
 */
export function buildMlsMediaConflictSet(updatedAt: Date) {
  return {
    imageHeight: sql`excluded.image_height`,
    imageSizeDescription: sql`excluded.image_size_description`,
    imageWidth: sql`excluded.image_width`,
    longDescription: sql`excluded.long_description`,
    mediaModificationTimestamp: sql`excluded.media_modification_timestamp`,
    mediaObjectId: sql`excluded.media_object_id`,
    mediaURL: sql`excluded.media_url`,
    order: sql`excluded."order"`,
    permission: sql`excluded.permission`,
    preferredPhotoYN: sql`excluded.preferred_photo_yn`,
    resourceRecordKey: sql`excluded.resource_record_key`,
    deletedAt: sql`excluded.deleted_at`,
    updatedAt,
  };
}
