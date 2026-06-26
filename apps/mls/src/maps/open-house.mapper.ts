import type { NWM_OpenHouse } from '@/types/property';
import type { openHouses } from '@kws/schema';

import { NWM_OpenHouseSchema } from '@/types/property';

import type { MlsOpenHousePayload } from '../types';

import { parseNullableString, parseStringArray, parseTimestamp } from '@/lib/utils';
import { extractSchemaMetadata } from './nwm';

type OpenHouseInsert = typeof openHouses.$inferInsert;

export type MappedOpenHouse = Omit<OpenHouseInsert, 'createdAt' | 'searchVector'> & {
  NWM: NWM_OpenHouse | null;
};

export function mapOpenHouse(payload: MlsOpenHousePayload): MappedOpenHouse {
  const canView = payload.MlgCanView !== false;
  const now = new Date();

  return {
    openHouseKey: payload.OpenHouseKey,
    listingKey: parseNullableString(payload.ListingKey, 64),
    listingId: parseNullableString(payload.ListingId, 255),
    mlgCanUse: parseStringArray(payload.MlgCanUse),
    originatingSystemName: parseNullableString(payload.OriginatingSystemName, 255),
    openHouseDate: parseTimestamp(payload.OpenHouseDate),
    openHouseStartTime: parseTimestamp(payload.OpenHouseStartTime),
    openHouseEndTime: parseTimestamp(payload.OpenHouseEndTime),
    openHouseRemarks: parseNullableString(payload.OpenHouseRemarks, 500),
    openHouseType: parseNullableString(payload.OpenHouseType, 25),
    refreshments: parseNullableString(payload.Refreshments, 255),
    modificationTimestamp: parseTimestamp(payload.ModificationTimestamp),
    mlgCanView: canView,
    NWM: extractSchemaMetadata(payload, NWM_OpenHouseSchema),
    deletedAt: canView ? null : now,
    updatedAt: now,
  };
}
