import type { lookups } from '@kws/schema';

import type { MlsLookupPayload } from '../types';

import { parseNullableString, parseStringArray, parseTimestamp } from '@/lib/utils';

type LookupInsert = typeof lookups.$inferInsert;

export type MappedLookup = Omit<LookupInsert, 'createdAt' | 'searchVector'>;

export function mapLookup(payload: MlsLookupPayload): MappedLookup {
  const canView = payload.MlgCanView !== false;
  const now = new Date();

  return {
    lookupKey: payload.LookupKey,
    lookupName: payload.LookupName,
    lookupValue: parseNullableString(payload.LookupValue),
    standardLookupValue: parseNullableString(payload.StandardLookupValue),
    mlgCanUse: parseStringArray(payload.MlgCanUse),
    originatingSystemName: parseNullableString(payload.OriginatingSystemName, 255),
    modificationTimestamp: parseTimestamp(payload.ModificationTimestamp),
    mlgCanView: canView,
    deletedAt: canView ? null : now,
    updatedAt: now,
  };
}
