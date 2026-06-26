const CODE_LIST = [
  '10 - 1 Story',
  '11 - 1 1/2 Story',
  '12 - 2 Story',
  '13 - Tri-Level',
  '14 - Split Entry',
  '15 - Multi Level',
  '16 - 1 Story w/Bsmnt.',
  '17 - 1 1/2 Stry w/Bsmt',
  '18 - 2 Stories w/Bsmnt',
  '20 - Manuf-Single Wide',
  '21 - Manuf-Double Wide',
  '22 - Manuf-Triple Wide',
  '30 - Condo (1 Level)',
  '31 - Condo (2 Levels)',
  '32 - Townhouse',
  '33 - Co-op',
  '34 - Condo (3 Levels)',
  '35 - Garage Storage',
  '45 - Moorage',
  '53 - Tri-plex',
] as const;

const CODE_MAP: Record<(typeof CODE_LIST)[number], string> = {
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
  '53 - Tri-plex': 'Tri-Plex',
};

const DEFAULT_POSITION = {
  lat: 47.60621,
  lng: -122.33207,
  zoom: 12,
} as const;

const FILTER_LIMITS = {
  minPrice: 10_000,
  maxPrice: 20_000_000,
  minSqFt: 50,
  maxSqFt: 10000,
  minBedroom: -1,
  maxBedroom: 11,
  minBathroom: -1,
  maxBathroom: 11,
} as const;

const PROPERTY_IMAGE_PLACEHOLDER_URL = '/assets/images/default_image.png';

export { CODE_LIST, CODE_MAP, DEFAULT_POSITION, FILTER_LIMITS, PROPERTY_IMAGE_PLACEHOLDER_URL };
