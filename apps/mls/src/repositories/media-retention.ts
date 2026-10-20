import { env } from '@kws/config';
import { sql, type SQL } from 'drizzle-orm';

export const MLS_PUBLIC_GALLERY_LIMIT = 5;

export function retainedPropertyMediaClause(
  row: { mediaKey: SQL; resourceRecordKey: SQL },
  options: { memberKeys?: readonly string[]; officeKeys?: readonly string[] } = {},
): SQL {
  const memberKeys = [...new Set(options.memberKeys ?? env.MLS_MEMBER_ID ?? [])].filter(Boolean);
  const officeKeys = [...new Set(options.officeKeys ?? env.MLS_OFFICE_ID ?? [])].filter(Boolean);
  const members = memberKeys.length
    ? sql.join(
        memberKeys.map((key) => sql`${key}`),
        sql`, `,
      )
    : sql`null`;
  const offices = officeKeys.length
    ? sql.join(
        officeKeys.map((key) => sql`${key}`),
        sql`, `,
      )
    : sql`null`;

  return sql`(
    exists (
      select 1 from mls_gallery_requests gallery
      where gallery.listing_key = ${row.resourceRecordKey} and gallery.status <> 'ineligible'
    )
    or
    exists (
      select 1 from properties retention_parent
      where retention_parent.listing_key = ${row.resourceRecordKey}
        and (
          retention_parent.list_agent_key in (${members})
          or retention_parent.list_agent_mls_id in (${members})
          or retention_parent.co_list_agent_key in (${members})
          or retention_parent.co_list_agent_mls_id in (${members})
          or retention_parent.list_office_key in (${offices})
          or retention_parent.list_office_mls_id in (${offices})
          or retention_parent.co_list_office_key in (${offices})
          or retention_parent.co_list_office_mls_id in (${offices})
        )
    )
    or ${row.mediaKey} in (
      select retained.media_key from mls_media retained
      where retained.resource_record_key = ${row.resourceRecordKey}
        and retained.deleted_at is null
        and not (coalesce(retained.permission, '{}'::varchar[]) && ARRAY['Private']::varchar[])
      order by coalesce(retained.preferred_photo_yn, false) desc,
        retained."order" asc nulls last, retained.media_key asc
      limit ${MLS_PUBLIC_GALLERY_LIMIT}
    )
  )`;
}
