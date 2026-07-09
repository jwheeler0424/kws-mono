import type { members } from '@kws/schema';

import type { NWM_Member } from '@/types/property';

import {
  parseBoolean,
  parseLocalFields,
  parseNullableString,
  parseStringArray,
  parseTimestamp,
} from '@/lib/utils';

import type { MlsMemberPayload } from '../types';

import { mapMemberMedia, type MappedMedia } from './media.mapper';

type MemberInsert = typeof members.$inferInsert;

export type MappedMember = Omit<MemberInsert, 'createdAt' | 'searchVector'> & {
  NWM: NWM_Member | null;
  media: MappedMedia[];
};

export function mapMember(payload: MlsMemberPayload): MappedMember {
  const canView = parseBoolean(payload.MlgCanView) === true;
  const nwm = parseLocalFields(payload, 'NWM_');
  const now = new Date();
  const memberMlsId = payload.MemberMlsId;
  const media =
    payload.Media
      ?.map((mediaPayload) => mapMemberMedia(mediaPayload, payload.MemberMlsId))
      .filter((item): item is MappedMedia => item !== null) ?? [];

  return {
    memberMlsId,
    memberKey: parseNullableString(payload.MemberKey, 255),
    originatingSystemName: parseNullableString(payload.OriginatingSystemName, 255),
    memberFirstName: parseNullableString(payload.MemberFirstName, 50),
    memberFullName: parseNullableString(payload.MemberFullName, 150),
    memberLastName: parseNullableString(payload.MemberLastName, 50),
    memberMiddleName: parseNullableString(payload['MemberMiddleName'], 50),
    memberNickname: parseNullableString(payload['MemberNickname'], 50),
    memberOfficePhone: parseNullableString(payload.MemberOfficePhone, 16),
    memberOfficePhoneExt: parseNullableString(payload['MemberOfficePhoneExt'], 10),
    memberStateLicense: parseNullableString(
      payload.StateLicense ?? payload['MemberStateLicense'],
      50,
    ),
    memberType: parseNullableString(payload.MemberType, 50),
    memberStatus: parseNullableString(payload.MemberStatus, 25),
    officeKey: parseNullableString(payload.OfficeKey, 255),
    officeMlsId: parseNullableString(payload.OfficeMlsId, 25),
    mlgCanUse: parseStringArray(payload.MlgCanUse),
    modificationTimestamp: parseTimestamp(payload.ModificationTimestamp),
    mlgCanView: canView,
    deletedAt: canView ? null : now,
    updatedAt: now,
    /* extensions */
    NWM: nwm,
    media,
  };
}
