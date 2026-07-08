import type { CursorDirection, CursorResult, NWM_Property, TQueryResourceLimit } from '@kws/types';

import { properties, propertyTypeEnum, standardStatusEnum } from './properties.schema';

type Resolve<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type StandardStatus = (typeof standardStatusEnum.enumValues)[number];
export type PropertyType = (typeof propertyTypeEnum.enumValues)[number];

export type PropertyListing = typeof properties.$inferSelect;

export type TAddressData = Resolve<
  Pick<
    PropertyListing,
    | 'streetDirPrefix'
    | 'streetDirSuffix'
    | 'streetName'
    | 'streetNumber'
    | 'streetSuffix'
    | 'unitNumber'
    | 'city'
    | 'postalCode'
    | 'stateOrProvince'
    | 'unparsedAddress'
  >
>;

export type TPropertyCard = Resolve<
  Pick<
    PropertyListing,
    | 'listingId'
    | 'listingKey'
    | 'livingArea'
    | 'livingAreaUnits'
    | 'bathroomsFull'
    | 'bathroomsHalf'
    | 'bathroomsThreeQuarter'
    | 'bedroomsTotal'
    | 'buildingAreaTotal'
    | 'featuredListingYN'
    | 'internetAddressDisplayYN'
    | 'internetAutomatedValuationDisplayYN'
    | 'levels'
    | 'latitude'
    | 'longitude'
    | 'listPrice'
    | 'propertySubType'
    | 'propertyType'
    | 'standardStatus'
    | 'streetDirPrefix'
    | 'streetDirSuffix'
    | 'streetName'
    | 'streetNumber'
    | 'streetSuffix'
    | 'unitNumber'
    | 'city'
    | 'postalCode'
    | 'stateOrProvince'
    | 'unparsedAddress'
    | 'yearBuilt'
  > &
    Pick<
      NWM_Property,
      | 'NWM_IDXMustRemovePrimaryPhotoYN'
      | 'NWM_IDXMustRemovePhotosYN'
      | 'NWM_ShowMapLink'
      | 'NWM_StyleCode'
    > & {
      memberFullName: string | null;
      officeName: string | null;
      primaryPhotoUrl: string | null;
      primaryPhotoFullUrl: string | null;
      primaryPhotoPreviewUrl: string | null;
      primaryPhotoThumbnailUrl: string | null;
    }
>;

export type TPropertyMediaVariants = {
  fullUrl: string;
  previewUrl: string;
  thumbnailUrl: string;
};

export type TPropertyMediaItem = {
  mediaKey: string;
  order: number | null;
  preferredPhotoYN: boolean | null;
  variants: TPropertyMediaVariants;
};

export type TPropertyMediaCollection = {
  primary: TPropertyMediaVariants;
  all: TPropertyMediaItem[];
};

export type TPropertyDetail = TPropertyCard &
  Pick<PropertyListing, 'interiorFeatures'> & {
    media: TPropertyMediaCollection;
  };

export type TAvailablePropertyCard = TPropertyCard & {
  standardStatus: 'Active' | 'ComingSoon' | 'ActiveUnderContract';
};

export type TSoldPropertyCard = TPropertyCard & {
  standardStatus: 'Closed';
};

export type TPendingPropertyCard = TPropertyCard & {
  standardStatus: 'Pending';
};

export type TPropertyNwmFlags = Pick<
  NWM_Property,
  | 'NWM_IDXMustRemovePrimaryPhotoYN'
  | 'NWM_IDXMustRemovePhotosYN'
  | 'NWM_ShowMapLink'
  | 'NWM_StyleCode'
>;

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
  officeIds?: string[];
  memberIds?: string[];
};

export type PropertyQueryParams = {
  limit?: number;
  cursor?: string | null;
  direction?: CursorDirection;
  officeIds?: string[];
  memberIds?: string[];
};
