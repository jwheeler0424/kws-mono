export type { UUID, UUIDv7 } from '@kws/types';

// NWMLS payload metadata stored in JSONB columns.
// Schema only needs structural typing at the boundary; detailed parsing lives in @kws/types.
export type NWM_Property = Record<string, unknown>;
export type NWM_Member = Record<string, unknown>;
export type NWM_OpenHouse = Record<string, unknown>;
export type NWM_PropertyUnitType = Record<string, unknown>;
