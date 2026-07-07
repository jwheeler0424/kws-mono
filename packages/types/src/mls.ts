import type { standardStatusEnum } from '@kws/schema';

import type { CursorDirection, CursorResult } from './cursor';
import type { NWM_Property, PropertyListing, TPropertyCard } from './property';
import type { TMapBounds, TQueryResourceLimit } from './search';

export type PropertyStatus = (typeof standardStatusEnum.enumValues)[number];

export type PropertySortBy = 'newest' | 'priceAsc' | 'priceDesc' | 'proximity';

export interface PropertyProximityFilter {
  lat: number;
  lng: number;
  radiusMiles: number;
}

export interface PropertySearchParams {
  query?: string | null;
  limit?: number | null;
  cursor?: string | null;
  price?: TQueryResourceLimit | null;
  sqFt?: TQueryResourceLimit | null;
  bedrooms?: TQueryResourceLimit | null;
  bathrooms?: TQueryResourceLimit | null;
  bounds?: TMapBounds | null;
  viewportBounds?: TMapBounds | null;
  sortBy?: PropertySortBy | null;
  statuses?: PropertyStatus[] | null;
  proximity?: PropertyProximityFilter | null;
}

export type TListingMarker = Pick<
  TPropertyCard,
  'listingKey' | 'latitude' | 'longitude' | 'listPrice' | 'standardStatus'
> & {
  id: string;
};
export type PropertySearchMarker = Pick<
  PropertyListing,
  | 'id'
  | 'listingKey'
  | 'listPrice'
  | 'bedroomsTotal'
  | 'bathroomsTotalInteger'
  | 'livingArea'
  | 'latitude'
  | 'longitude'
>;

export type PropertyMapMarker = TListingMarker;

export type PropertyMapMarkerPageResult = CursorResult<PropertyMapMarker>;

export type PropertyLookupInput = {
  listingKey: string;
};

export type PropertyParams = {
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
};

export type PropertyQueryParams = {
  /** Maximum records per page. Omit to fetch all matching records in a single call. */
  limit?: number;
  cursor?: string | null;
  direction?: CursorDirection;
  /** Office MLS IDs or keys to filter by. Falls back to env.MLS_OFFICE_ID when omitted. */
  officeIds?: string[];
  /** Member/agent MLS IDs or keys to filter by. Falls back to env.MLS_MEMBER_ID when omitted. */
  memberIds?: string[];
};

export type TPropertyNwmFlags = Pick<
  NWM_Property,
  | 'NWM_IDXMustRemovePrimaryPhotoYN'
  | 'NWM_IDXMustRemovePhotosYN'
  | 'NWM_ShowMapLink'
  | 'NWM_StyleCode'
>;
