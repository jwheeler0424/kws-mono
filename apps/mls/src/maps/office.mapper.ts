import type { offices } from '@kws/schema';

import type { MlsOfficePayload } from '../types';

import { parseBoolean, parseNullableString, parseStringArray, parseTimestamp } from '@/lib/utils';

type OfficeInsert = typeof offices.$inferInsert;

export type MappedOffice = Omit<OfficeInsert, 'createdAt' | 'searchVector'>;

export function mapOffice(payload: MlsOfficePayload): MappedOffice {
  const canView = parseBoolean(payload.MlgCanView) === true;
  const now = new Date();
  const officeMlsId = payload.OfficeMlsId;

  return {
    officeMlsId,
    mainOfficeKey: parseNullableString(payload.MainOfficeKey, 255),
    mainOfficeMlsId: parseNullableString(payload['MainOfficeMlsId'], 25),
    mlgCanUse: parseStringArray(payload.MlgCanUse),
    mlgCanView: canView,
    modificationTimestamp: parseTimestamp(payload.ModificationTimestamp),
    officeAddress1: parseNullableString(payload.OfficeAddress1, 50),
    officeAddress2: parseNullableString(payload.OfficeAddress2, 50),
    officeBrokerKey: parseNullableString(payload['OfficeBrokerKey'], 255),
    officeBrokerMlsId: parseNullableString(payload['OfficeBrokerMlsId'], 25),
    officeCity: parseNullableString(payload.OfficeCity, 50),
    officeCountyOrParish: parseNullableString(payload['OfficeCountyOrParish'], 50),
    officeEmail: parseNullableString(payload.OfficeEmail, 80),
    officeFax: parseNullableString(payload.OfficeFax, 16),
    officeKey: parseNullableString(payload.OfficeKey, 255),
    officeName: parseNullableString(payload.OfficeName, 255),
    officePhone: parseNullableString(payload.OfficePhone, 16),
    officePostalCode: parseNullableString(payload.OfficePostalCode, 10),
    officePostalCodePlus4: parseNullableString(payload['OfficePostalCodePlus4'], 4),
    officeStateOrProvince: parseNullableString(payload.OfficeStateOrProvince, 2),
    officeStatus: parseNullableString(payload.OfficeStatus, 25),
    originatingSystemName: parseNullableString(payload.OriginatingSystemName, 255),
    photosChangeTimestamp: parseTimestamp(payload.PhotosChangeTimestamp),
    deletedAt: canView ? null : now,
    updatedAt: now,
  };
}
