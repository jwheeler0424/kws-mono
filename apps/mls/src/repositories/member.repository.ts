import { eq, sql } from 'drizzle-orm';

import { db } from '@/lib/database';
import { members } from '@kws/schema';

import type { MappedMedia } from '../maps/media.mapper';
import type { MappedMember } from '../maps/member.mapper';

import { splitIntoChunks } from '@/lib/utils';
import { reconcileResourceMediaBatch } from './resource-media.repository';

const MEMBER_UPSERT_CHUNK_SIZE = 250;

interface MemberMediaBatchItem {
  memberKey: string;
  mediaRecords: MappedMedia[];
}

function buildMemberConflictSet(): Record<string, unknown> {
  return {
    memberKey: sql`excluded.member_key`,
    memberAor: sql`excluded.member_aor`,
    memberFirstName: sql`excluded.member_first_name`,
    memberMiddleName: sql`excluded.member_middle_name`,
    memberLastName: sql`excluded.member_last_name`,
    memberFullName: sql`excluded.member_full_name`,
    memberNationalAssociationId: sql`excluded.member_national_association_id`,
    memberStateLicense: sql`excluded.member_state_license`,
    memberStatus: sql`excluded.member_status`,
    memberType: sql`excluded.member_type`,
    memberAddress1: sql`excluded.member_address1`,
    memberAddress2: sql`excluded.member_address2`,
    memberCity: sql`excluded.member_city`,
    memberStateOrProvince: sql`excluded.member_state_or_province`,
    memberPostalCode: sql`excluded.member_postal_code`,
    memberCountyOrParish: sql`excluded.member_county_or_parish`,
    memberCarrierRoute: sql`excluded.member_carrier_route`,
    memberOfficePhone: sql`excluded.member_office_phone`,
    memberOfficePhoneExt: sql`excluded.member_office_phone_ext`,
    memberFax: sql`excluded.member_fax`,
    memberPager: sql`excluded.member_pager`,
    memberVoiceMail: sql`excluded.member_voice_mail`,
    memberVoiceMailExt: sql`excluded.member_voice_mail_ext`,
    memberTollFreePhone: sql`excluded.member_toll_free_phone`,
    memberPhoneTTYTDD: sql`excluded.member_phone_tty_tdd`,
    memberOtherPhone: sql`excluded.member_other_phone`,
    memberOtherPhoneExt: sql`excluded.member_other_phone_ext`,
    memberEmail: sql`excluded.member_email`,
    officeKey: sql`excluded.office_key`,
    officeMlsId: sql`excluded.office_mls_id`,
    memberAorMlsId: sql`excluded.member_aor_mls_id`,
    socialMediaType: sql`excluded.social_media_type`,
    socialMediaUrlOrId: sql`excluded.social_media_url_or_id`,
    syndicateTo: sql`excluded.syndicate_to`,
    modificationTimestamp: sql`excluded.modification_timestamp`,
    mlgCanView: sql`excluded.mlg_can_view`,
    originTimestamp: sql`excluded.origin_timestamp`,
    originatingSystemId: sql`excluded.originating_system_id`,
    originatingSystemMemberKey: sql`excluded.originating_system_member_key`,
    originatingSystemName: sql`excluded.originating_system_name`,
    deletedAt: sql`excluded.deleted_at`,
    updatedAt: new Date(),
  };
}

export async function upsertMembers(records: MappedMember[]): Promise<void> {
  if (records.length === 0) {
    return;
  }

  for (const chunk of splitIntoChunks(records, MEMBER_UPSERT_CHUNK_SIZE)) {
    await db.insert(members).values(chunk).onConflictDoUpdate({
      target: members.memberMlsId,
      set: buildMemberConflictSet(),
    });
  }
}

export async function upsertMember(record: MappedMember): Promise<void> {
  const { memberMlsId, ...rest } = record;
  await db
    .insert(members)
    .values({ memberMlsId, ...rest })
    .onConflictDoUpdate({
      target: members.memberMlsId,
      set: { ...rest, updatedAt: new Date() },
    });
}

/**
 * Full-replacement reconcile: delete all existing media for this member,
 * then insert the new set. Pass an empty array to clear media.
 */
export async function reconcileMemberMedia(
  memberKey: string,
  mediaRecords: MappedMedia[],
): Promise<void> {
  await reconcileResourceMediaBatch([{ resourceRecordKey: memberKey, mediaRecords }]);
}

export async function reconcileMemberMediaBatch(items: MemberMediaBatchItem[]): Promise<void> {
  await reconcileResourceMediaBatch(
    items.map((item) => ({
      resourceRecordKey: item.memberKey,
      mediaRecords: item.mediaRecords,
    })),
  );
}

export async function deactivateMember(memberKey: string): Promise<void> {
  const now = new Date();
  await db
    .update(members)
    .set({ mlgCanView: false, deletedAt: now, updatedAt: now })
    .where(eq(members.memberKey, memberKey));
}
