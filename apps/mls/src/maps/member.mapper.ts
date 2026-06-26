import type { NWM_Member } from '@/types/property';
import type { members } from '@kws/schema';

import { NWM_MemberSchema } from '@/types/property';

import type { MlsMemberPayload } from '../types';

import { parseNullableString, parseStringArray, parseTimestamp } from '@/lib/utils';
import { extractSchemaMetadata } from './nwm';

type MemberInsert = typeof members.$inferInsert;

export type MappedMember = Omit<MemberInsert, 'createdAt' | 'searchVector'> & {
  NWM: NWM_Member | null;
};

export function mapMember(payload: MlsMemberPayload): MappedMember {
  const canView = payload.MlgCanView !== false;
  const now = new Date();
  const memberMlsId =
    parseNullableString(payload.MemberMlsId, 25) ?? payload.MemberKey.slice(0, 25);

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
    NWM: extractSchemaMetadata(payload, NWM_MemberSchema),
    deletedAt: canView ? null : now,
    updatedAt: now,
  };
}
