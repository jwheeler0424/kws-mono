import { and, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';

import { properties } from './properties.schema';

export function galleryListingEligibility(
  memberKeys: readonly string[],
  officeKeys: readonly string[],
) {
  return and(
    isNull(properties.deletedAt),
    eq(properties.mlgCanView, true),
    sql`${properties.internetEntireListingDisplayYN} is distinct from false`,
    sql`lower(coalesce(${properties.NWM}->>'NWM_IDXMustRemovePhotosYN', 'false')) not in ('true','1','yes','y')`,
    sql`lower(coalesce(${properties.NWM}->>'NWM_IDXMustRemovePrimaryPhotoYN', 'false')) not in ('true','1','yes','y')`,
    or(
      inArray(properties.standardStatus, ['Active', 'ActiveUnderContract', 'ComingSoon']),
      memberKeys.length
        ? or(
            inArray(properties.listAgentKey, [...memberKeys]),
            inArray(properties.listAgentMlsId, [...memberKeys]),
            inArray(properties.coListAgentKey, [...memberKeys]),
            inArray(properties.coListAgentMlsId, [...memberKeys]),
          )
        : undefined,
      officeKeys.length
        ? or(
            inArray(properties.listOfficeKey, [...officeKeys]),
            inArray(properties.listOfficeMlsId, [...officeKeys]),
            inArray(properties.coListOfficeKey, [...officeKeys]),
            inArray(properties.coListOfficeMlsId, [...officeKeys]),
          )
        : undefined,
    ),
  );
}

export function galleryMissingMedia(listingKey: SQL): SQL<boolean> {
  return sql<boolean>`exists (
    select 1 from mls_media photo
    where photo.resource_record_key = ${listingKey} and photo.deleted_at is null
      and not (coalesce(photo.permission, '{}'::varchar[]) && ARRAY['Private']::varchar[])
      and not exists (
        select 1 from media stored join media_variants full_image
          on full_image.media_id = stored.id and full_image.variant_name = 'full'
        where stored.id = photo.media_id and stored.deleted_at is null
          and full_image.url is not null
          and not coalesce(
            case when photo.downloaded_source_timestamp is not null
              then photo.media_modification_timestamp is distinct from photo.downloaded_source_timestamp
              else photo.media_modification_timestamp > stored.updated_at
            end, false)
      )
  )`;
}

export function galleryMetadataIncomplete(listingKey: SQL): SQL<boolean> {
  return sql<boolean>`coalesce(${properties.photosCount}, 0) > (
    select count(*) from mls_media photo where photo.resource_record_key = ${listingKey}
      and photo.deleted_at is null
  )`;
}
