import type { LocalBusinessAddress } from './local-business';

import { aggregateRatingSchema, type AggregateRatingSchemaInput } from './aggregate-rating';
import { jsonLd, type JsonLdBase, withoutContext } from './common';
import { openHouseSchema, type OpenHouseSchemaInput } from './open-house';
import { reviewSchema, type ReviewSchemaInput } from './review';

export type AreaUnitCode = 'MTK' | 'FTK' | 'YDK'; // square meter / square foot / square yard

export interface FloorSizeInput {
  value: number;
  unitCode?: AreaUnitCode;
}

/** Builds a `QuantitativeValue` for `floorSize`. Defaults to square feet. */
export function floorSizeValue(input: FloorSizeInput): Record<string, unknown> {
  return { '@type': 'QuantitativeValue', value: input.value, unitCode: input.unitCode ?? 'FTK' };
}

export interface OccupancyInput {
  value?: number;
  min?: number;
  max?: number;
}

/** Builds a `QuantitativeValue` for `occupancy` (allowed occupants). Unit is implicitly "person" (C62). */
export function occupancyValue(input: OccupancyInput): Record<string, unknown> {
  return {
    '@type': 'QuantitativeValue',
    unitCode: 'C62',
    ...(input.value !== undefined ? { value: input.value } : {}),
    ...(input.min !== undefined ? { minValue: input.min } : {}),
    ...(input.max !== undefined ? { maxValue: input.max } : {}),
  };
}

export interface LeaseLengthInput {
  value: number;
  unitText?: string; // e.g. 'months', 'years'
}

/** Builds a `QuantitativeValue` for `leaseLength`, used on both `Accommodation` and `RealEstateListing`. */
export function leaseLengthValue(input: LeaseLengthInput): Record<string, unknown> {
  return { '@type': 'QuantitativeValue', value: input.value, unitText: input.unitText ?? 'months' };
}

/** Builds a single boolean/string `LocationFeatureSpecification` for `amenityFeature` (pool, garage, in-unit laundry, etc). */
export function amenityFeature(
  name: string,
  value: boolean | string = true,
): Record<string, unknown> {
  return { '@type': 'LocationFeatureSpecification', name, value };
}

export function propertyValue(name: string, value: string | number): Record<string, unknown> {
  return { '@type': 'PropertyValue', name, value };
}

function postalAddress(address: LocalBusinessAddress) {
  return { '@type': 'PostalAddress', ...address };
}

function geoCoordinates(geo?: { latitude: number; longitude: number }) {
  return geo ? { geo: { '@type': 'GeoCoordinates', ...geo } } : {};
}

function withoutContextNode<T extends JsonLdBase>(node: T): Omit<T, '@context'> {
  return withoutContext(node);
}

function isJsonLdNode(value: unknown): value is JsonLdBase {
  return typeof value === 'object' && value !== null && '@type' in value;
}

export type ResidenceType =
  | 'House'
  | 'SingleFamilyResidence'
  | 'Apartment'
  | 'Room'
  | 'Suite'
  | 'Residence';
export type PropertyEntityType = ResidenceType | 'ApartmentComplex';

export type PropertyEntitySchema = JsonLdBase<PropertyEntityType>;

export interface ResidenceSchemaInput {
  type?: ResidenceType;
  name?: string;
  description?: string;
  image?: string | string[];
  url?: string;
  address: LocalBusinessAddress;
  geo?: { latitude: number; longitude: number };
  accommodationCategory?: string;
  floorSize?: FloorSizeInput;
  numberOfRooms?: number;
  numberOfBedrooms?: number;
  numberOfBathroomsTotal?: number;
  numberOfFullBathrooms?: number;
  numberOfPartialBathrooms?: number;
  yearBuilt?: number;
  occupancy?: OccupancyInput;
  petsAllowed?: boolean | string;
  permittedUsage?: string;
  leaseLength?: LeaseLengthInput;
  amenities?: string[];
  extraAmenityFeatures?: Array<Record<string, unknown>>;
  additionalProperty?: Array<Record<string, unknown>>;
  floorLevel?: string;
  tourBookingPage?: string;
  review?:
    | ReviewSchemaInput
    | JsonLdBase<'Review'>
    | Array<ReviewSchemaInput | JsonLdBase<'Review'>>;
  aggregateRating?: AggregateRatingSchemaInput | JsonLdBase<'AggregateRating'>;
}

function buildReviewValue(
  review: ResidenceSchemaInput['review'],
): Array<Record<string, unknown>> | Record<string, unknown> | undefined {
  if (!review) return undefined;

  const items = Array.isArray(review) ? review : [review];
  const normalized = items.map((item) =>
    isJsonLdNode(item) ? withoutContextNode(item) : withoutContextNode(reviewSchema(item)),
  );
  return Array.isArray(review) ? normalized : normalized[0];
}

function buildAggregateRatingValue(
  aggregateRating: ResidenceSchemaInput['aggregateRating'],
): Record<string, unknown> | undefined {
  if (!aggregateRating) return undefined;

  return isJsonLdNode(aggregateRating)
    ? withoutContextNode(aggregateRating)
    : withoutContextNode(aggregateRatingSchema(aggregateRating));
}

export function residenceSchema(input: ResidenceSchemaInput): JsonLdBase<ResidenceType> {
  const amenityFeatures = [
    ...(input.amenities ?? []).map((name) => amenityFeature(name)),
    ...(input.extraAmenityFeatures ?? []),
  ];

  return jsonLd({
    '@type': input.type ?? 'House',
    ...(input.name ? { name: input.name } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    address: postalAddress(input.address),
    ...geoCoordinates(input.geo),
    ...(input.accommodationCategory ? { accommodationCategory: input.accommodationCategory } : {}),
    ...(input.floorSize ? { floorSize: floorSizeValue(input.floorSize) } : {}),
    ...(input.numberOfRooms !== undefined ? { numberOfRooms: input.numberOfRooms } : {}),
    ...(input.numberOfBedrooms !== undefined ? { numberOfBedrooms: input.numberOfBedrooms } : {}),
    ...(input.numberOfBathroomsTotal !== undefined
      ? { numberOfBathroomsTotal: input.numberOfBathroomsTotal }
      : {}),
    ...(input.numberOfFullBathrooms !== undefined
      ? { numberOfFullBathrooms: input.numberOfFullBathrooms }
      : {}),
    ...(input.numberOfPartialBathrooms !== undefined
      ? { numberOfPartialBathrooms: input.numberOfPartialBathrooms }
      : {}),
    ...(input.yearBuilt !== undefined ? { yearBuilt: input.yearBuilt } : {}),
    ...(input.occupancy ? { occupancy: occupancyValue(input.occupancy) } : {}),
    ...(input.petsAllowed !== undefined ? { petsAllowed: input.petsAllowed } : {}),
    ...(input.permittedUsage ? { permittedUsage: input.permittedUsage } : {}),
    ...(input.leaseLength ? { leaseLength: leaseLengthValue(input.leaseLength) } : {}),
    ...(amenityFeatures.length ? { amenityFeature: amenityFeatures } : {}),
    ...(input.additionalProperty?.length ? { additionalProperty: input.additionalProperty } : {}),
    ...(input.floorLevel ? { floorLevel: input.floorLevel } : {}),
    ...(input.tourBookingPage ? { tourBookingPage: input.tourBookingPage } : {}),
    ...(input.review ? { review: buildReviewValue(input.review) } : {}),
    ...(input.aggregateRating
      ? { aggregateRating: buildAggregateRatingValue(input.aggregateRating) }
      : {}),
  });
}

export interface ApartmentComplexSchemaInput {
  name: string;
  description?: string;
  image?: string | string[];
  url?: string;
  address: LocalBusinessAddress;
  geo?: { latitude: number; longitude: number };
  numberOfAccommodationUnits?: number;
  numberOfAvailableAccommodationUnits?: number;
  numberOfBedrooms?: number | { min: number; max: number };
  petsAllowed?: boolean | string;
  amenities?: string[];
  additionalProperty?: Array<Record<string, unknown>>;
  tourBookingPage?: string;
  review?:
    | ReviewSchemaInput
    | JsonLdBase<'Review'>
    | Array<ReviewSchemaInput | JsonLdBase<'Review'>>;
  aggregateRating?: AggregateRatingSchemaInput | JsonLdBase<'AggregateRating'>;
}

export function apartmentComplexSchema(
  input: ApartmentComplexSchemaInput,
): JsonLdBase<'ApartmentComplex'> {
  return jsonLd({
    '@type': 'ApartmentComplex',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.url ? { url: input.url } : {}),
    address: postalAddress(input.address),
    ...geoCoordinates(input.geo),
    ...(input.numberOfAccommodationUnits !== undefined
      ? {
          numberOfAccommodationUnits: {
            '@type': 'QuantitativeValue',
            value: input.numberOfAccommodationUnits,
          },
        }
      : {}),
    ...(input.numberOfAvailableAccommodationUnits !== undefined
      ? {
          numberOfAvailableAccommodationUnits: {
            '@type': 'QuantitativeValue',
            value: input.numberOfAvailableAccommodationUnits,
          },
        }
      : {}),
    ...(input.numberOfBedrooms !== undefined
      ? {
          numberOfBedrooms:
            typeof input.numberOfBedrooms === 'number'
              ? input.numberOfBedrooms
              : {
                  '@type': 'QuantitativeValue',
                  minValue: input.numberOfBedrooms.min,
                  maxValue: input.numberOfBedrooms.max,
                },
        }
      : {}),
    ...(input.petsAllowed !== undefined ? { petsAllowed: input.petsAllowed } : {}),
    ...(input.amenities?.length
      ? { amenityFeature: input.amenities.map((name) => amenityFeature(name)) }
      : {}),
    ...(input.additionalProperty?.length ? { additionalProperty: input.additionalProperty } : {}),
    ...(input.tourBookingPage ? { tourBookingPage: input.tourBookingPage } : {}),
    ...(input.review ? { review: buildReviewValue(input.review) } : {}),
    ...(input.aggregateRating
      ? { aggregateRating: buildAggregateRatingValue(input.aggregateRating) }
      : {}),
  });
}

export type RealEstateBusinessFunction = 'Sell' | 'LeaseOut';
export type RealEstateAvailability = 'InStock' | 'OutOfStock' | 'PreOrder' | 'SoldOut';

export interface RealEstateOfferInput {
  price: number | string;
  priceCurrency: string;
  businessFunction?: RealEstateBusinessFunction;
  availability?: RealEstateAvailability;
  validFrom?: string;
  url?: string;
}

export interface RealEstateListingSchemaInput {
  name: string;
  description?: string;
  url: string;
  image?: string | string[];
  datePosted?: string;
  dateModified?: string;
  leaseLength?: LeaseLengthInput;
  about: JsonLdBase;
  offers: RealEstateOfferInput;
  identifier?: string | { name: string; value: string };
  seller?: JsonLdBase<'RealEstateAgent'> | { name: string; url?: string };
  additionalProperty?: Array<Record<string, unknown>>;
  review?:
    | ReviewSchemaInput
    | JsonLdBase<'Review'>
    | Array<ReviewSchemaInput | JsonLdBase<'Review'>>;
  aggregateRating?: AggregateRatingSchemaInput | JsonLdBase<'AggregateRating'>;
  openHouse?:
    | OpenHouseSchemaInput
    | JsonLdBase<'Event'>
    | Array<OpenHouseSchemaInput | JsonLdBase<'Event'>>;
}

function buildSeller(
  seller: RealEstateListingSchemaInput['seller'],
): Record<string, unknown> | undefined {
  if (!seller) return undefined;

  if ('@type' in seller) {
    return withoutContextNode(seller);
  }

  return {
    '@type': 'RealEstateAgent',
    name: seller.name,
    ...(seller.url ? { url: seller.url } : {}),
  };
}

function buildIdentifier(
  identifier: RealEstateListingSchemaInput['identifier'],
): Record<string, unknown> | string | undefined {
  if (!identifier) return undefined;

  if (typeof identifier === 'string') return identifier;

  return {
    '@type': 'PropertyValue',
    name: identifier.name,
    value: identifier.value,
  };
}

function buildOpenHouseValue(
  openHouse: RealEstateListingSchemaInput['openHouse'],
): Array<Record<string, unknown>> | Record<string, unknown> | undefined {
  if (!openHouse) return undefined;

  const items = Array.isArray(openHouse) ? openHouse : [openHouse];
  const normalized = items.map((item) =>
    isJsonLdNode(item) ? withoutContextNode(item) : withoutContextNode(openHouseSchema(item)),
  );
  return Array.isArray(openHouse) ? normalized : normalized[0];
}

export function realEstateListingSchema(
  input: RealEstateListingSchemaInput,
): JsonLdBase<'RealEstateListing'> {
  return jsonLd({
    '@type': 'RealEstateListing',
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.datePosted ? { datePosted: input.datePosted } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.leaseLength ? { leaseLength: leaseLengthValue(input.leaseLength) } : {}),
    ...(input.identifier ? { identifier: buildIdentifier(input.identifier) } : {}),
    ...(input.seller ? { seller: buildSeller(input.seller) } : {}),
    ...(input.additionalProperty?.length ? { additionalProperty: input.additionalProperty } : {}),
    about: withoutContextNode(input.about),
    offers: {
      '@type': 'Offer',
      price: input.offers.price,
      priceCurrency: input.offers.priceCurrency,
      ...(input.offers.businessFunction
        ? { businessFunction: `https://schema.org/${input.offers.businessFunction}` }
        : {}),
      availability: `https://schema.org/${input.offers.availability ?? 'InStock'}`,
      ...(input.offers.validFrom ? { validFrom: input.offers.validFrom } : {}),
      url: input.offers.url ?? input.url,
    },
    ...(input.openHouse ? { subjectOf: buildOpenHouseValue(input.openHouse) } : {}),
  });
}

export interface RealEstateAgentSchemaInput {
  name: string;
  image?: string;
  description?: string;
  url?: string;
  telephone?: string;
  email?: string;
  priceRange?: string;
  address: LocalBusinessAddress;
  geo?: { latitude: number; longitude: number };
  areaServed?: string[];
  sameAs?: string[];
  review?:
    | ReviewSchemaInput
    | JsonLdBase<'Review'>
    | Array<ReviewSchemaInput | JsonLdBase<'Review'>>;
  aggregateRating?: AggregateRatingSchemaInput | JsonLdBase<'AggregateRating'>;
}

function postalAddressAgent(address: LocalBusinessAddress) {
  return { '@type': 'PostalAddress', ...address };
}

function geoCoordinatesAgent(geo?: { latitude: number; longitude: number }) {
  return geo ? { geo: { '@type': 'GeoCoordinates', ...geo } } : {};
}

export function realEstateAgentSchema(
  input: RealEstateAgentSchemaInput,
): JsonLdBase<'RealEstateAgent'> {
  return jsonLd({
    '@type': 'RealEstateAgent',
    name: input.name,
    ...(input.image ? { image: input.image } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.url ? { url: input.url } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.priceRange ? { priceRange: input.priceRange } : {}),
    address: postalAddressAgent(input.address),
    ...geoCoordinatesAgent(input.geo),
    ...(input.areaServed?.length ? { areaServed: input.areaServed } : {}),
    ...(input.sameAs?.length ? { sameAs: input.sameAs } : {}),
    ...(input.review ? { review: buildReviewValue(input.review) } : {}),
    ...(input.aggregateRating
      ? { aggregateRating: buildAggregateRatingValue(input.aggregateRating) }
      : {}),
  });
}

export interface PropertyBreadcrumbItem {
  name: string;
  url: string;
}

export interface PropertyDetailPageSchemaInput {
  url: string;
  name: string;
  description?: string;
  image?: string | string[];
  datePublished?: string;
  dateModified?: string;
  property: PropertyEntitySchema;
  breadcrumb?: PropertyBreadcrumbItem[];
  openHouse?:
    | OpenHouseSchemaInput
    | JsonLdBase<'Event'>
    | Array<OpenHouseSchemaInput | JsonLdBase<'Event'>>;
}

export function propertyDetailPageSchema(
  input: PropertyDetailPageSchemaInput,
): JsonLdBase<'ItemPage'> {
  return jsonLd({
    '@type': 'ItemPage',
    url: input.url,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { primaryImageOfPage: input.image } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    mainEntity: withoutContextNode(input.property),
    ...(input.breadcrumb?.length
      ? {
          breadcrumb: {
            '@type': 'BreadcrumbList',
            itemListElement: input.breadcrumb.map((item, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: item.name,
              item: item.url,
            })),
          },
        }
      : {}),
    ...(input.openHouse ? { subjectOf: buildOpenHouseValue(input.openHouse) } : {}),
  });
}

export type ResidenceSchema = JsonLdBase<ResidenceType>;
export type ApartmentComplexSchema = JsonLdBase<'ApartmentComplex'>;
export type RealEstateListingSchema = JsonLdBase<'RealEstateListing'>;
export type RealEstateAgentSchema = JsonLdBase<'RealEstateAgent'>;
export type OpenHouseSchema = JsonLdBase<'Event'>;
export type PropertyDetailPageSchema = JsonLdBase<'ItemPage'>;
