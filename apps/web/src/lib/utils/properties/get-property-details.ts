import type { TMlsMedia, TMlsMember, TMlsOffice } from '@kws/schema';
import type { NWM_Property, PropertyListing, TAddressData, TPropertyCard } from '@kws/types';

import type { TPropertyWithMedia } from '@/features/mls/queries';

type PropertyData = PropertyListing & {
  BuyerAgent: TMlsMember;
  BuyerOffice: TMlsOffice;
  CoBuyerAgent: TMlsMember;
  CoBuyerOffice: TMlsOffice;
  CoListingAgent: TMlsMember;
  CoListingOffice: TMlsOffice;
  ListAgent: TMlsMember;
  ListOffice: TMlsOffice;
  DataNWMLS: NWM_Property;
  Media: TMlsMedia[];
};
export const getBedrooms = (property: TPropertyCard | TPropertyWithMedia): string => {
  const bedroomCount = getBedroomCount(property);
  return bedroomCount === 1 ? `${bedroomCount} Bedroom` : `${bedroomCount} Bedrooms`;
};

export const getBedroomsAbbreviation = (property: TPropertyCard | TPropertyWithMedia): string => {
  const bedroomCount = getBedroomCount(property);
  return bedroomCount === 1 ? `${bedroomCount} BR` : `${bedroomCount} BRs`;
};

export const getBathrooms = (property: TPropertyCard | TPropertyWithMedia): string => {
  const bathroomCount = getBathroomCount(property);
  return bathroomCount === 1 ? `${bathroomCount} Bathroom` : `${bathroomCount} Bathrooms`;
};

export const getBathroomsAbbreviation = (property: TPropertyCard | TPropertyWithMedia): string => {
  const bathroomCount = getBathroomCount(property);
  return bathroomCount === 1 ? `${bathroomCount} BA` : `${bathroomCount} BAs`;
};

export const getBedroomCount = (
  property: TPropertyCard | PropertyData | TPropertyWithMedia,
): number => {
  return property.bedroomsTotal ?? 0;
};

export const getBathroomCount = (
  property: TPropertyCard | PropertyData | TPropertyWithMedia,
): number => {
  const fullBaths = property.bathroomsFull ?? 0;
  const halfBaths = property.bathroomsHalf ?? 0;
  const threeQuarterBaths = property.bathroomsThreeQuarter ?? 0;

  return fullBaths * 1 + halfBaths * 0.5 + threeQuarterBaths * 0.75;
};

export const getYearsOld = (yearBuilt?: number | null): string | null => {
  const currentYear = new Date().getFullYear();
  if (!yearBuilt) return null;

  const yearsOld = currentYear - yearBuilt;
  return yearsOld <= 0 ? `New Build` : `Built ${yearBuilt}`;
};

export const getPropertyLevels = (levels?: string[] | null): string | null => {
  if (!levels || levels.length <= 0) return null;
  const levelMap: Record<string, string> = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    'multi/split': '3+',
  };
  return levelMap[levels[0].toLowerCase()] ?? null;
};

export const getPropertyType = (styleCode?: string | null): string | null => {
  const codeMap: Record<string, string> = {
    '10 - 1 Story': 'Residential',
    '11 - 1 1/2 Story': 'Residential',
    '12 - 2 Story': 'Residential',
    '13 - Tri-Level': 'Residential',
    '14 - Split Entry': 'Residential',
    '15 - Multi Level': 'Residential',
    '16 - 1 Story w/Bsmnt.': 'Residential',
    '17 - 1 1/2 Stry w/Bsmt': 'Residential',
    '18 - 2 Stories w/Bsmnt': 'Residential',
    '20 - Manuf-Single Wide': 'Single Wide',
    '21 - Manuf-Double Wide': 'Double Wide',
    '22 - Manuf-Triple Wide': 'Triple Wide',
    '30 - Condo (1 Level)': 'Condominium',
    '31 - Condo (2 Levels)': 'Condominium',
    '32 - Townhouse': 'Townhouse',
    '33 - Co-op': 'Co-op',
    '34 - Condo (3 Levels)': 'Condominium',
    '35 - Garage Storage': 'Garage Storage',
    '45 - Moorage': 'Moorage',
  };
  return codeMap[styleCode ?? ''] ?? styleCode?.split(' - ')[1] ?? null;
};

export const getAddressStreet = (property: TAddressData): string => {
  const { streetNumber, streetDirPrefix, streetName, streetSuffix, streetDirSuffix, unitNumber } =
    property;
  let addressString = '';
  if (streetNumber) {
    addressString += `${streetNumber} `;
  }
  if (streetDirPrefix) {
    addressString += `${streetDirPrefix} `;
  }
  if (streetName) {
    addressString += `${streetName} `;
  }
  if (streetSuffix) {
    addressString += `${streetSuffix} `;
  }
  if (streetDirSuffix) {
    addressString += `${streetDirSuffix} `;
  }
  if (unitNumber) {
    addressString += `#${unitNumber}`;
  }
  return addressString.trim();
};

export const getAddressCityStateZip = (property: TAddressData): string => {
  const { city, stateOrProvince, postalCode } = property;
  let addressString = '';
  if (city) {
    addressString += `${city}, `;
  }
  if (stateOrProvince) {
    addressString += `${stateOrProvince} `;
  }
  if (postalCode) {
    addressString += postalCode;
  }
  return addressString.trim();
};

export const getAddressCityState = (property: TAddressData): string => {
  const { city, stateOrProvince } = property;
  let addressString = '';
  if (city) {
    addressString += `${city}, `;
  }
  if (stateOrProvince) {
    addressString += stateOrProvince;
  }
  return addressString.trim();
};

export const getPropertyStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    Active: 'Available',
    ActiveUnderContract: 'Available',
    'Active Under Contract': 'Available',
    Canceled: 'Canceled',
    ComingSoon: 'Coming Soon',
    Closed: 'Sold',
    'Coming Soon': 'Coming Soon',
    Hold: 'Hold',
    Pending: 'Pending',
    Sold: 'Sold',
    Withdrawn: 'Withdrawn',
  };
  return statusMap[status] ?? 'Unavailable';
};
