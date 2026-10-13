import { mlsMedia } from '@kws/schema';
import { sql } from 'drizzle-orm';

export function buildPrimaryMlsMediaClause() {
  return sql`(
    ${mlsMedia.preferredPhotoYN} = true
    or (
      not exists (
        select 1 from mls_media preferred
        where preferred.resource_record_key = ${mlsMedia.resourceRecordKey}
          and preferred.deleted_at is null
          and not (coalesce(preferred.permission, '{}'::varchar[]) && ARRAY['Private']::varchar[])
          and preferred.preferred_photo_yn = true
      )
      and ${mlsMedia.order} = (
        select min(first_photo."order") from mls_media first_photo
        where first_photo.resource_record_key = ${mlsMedia.resourceRecordKey}
          and first_photo.deleted_at is null
          and not (coalesce(first_photo.permission, '{}'::varchar[]) && ARRAY['Private']::varchar[])
      )
    )
  )`;
}
