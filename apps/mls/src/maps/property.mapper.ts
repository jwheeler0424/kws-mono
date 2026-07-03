import type { properties, propertyRooms, propertyUnitTypes } from '@kws/schema';
import type { PropertyType, StandardStatus } from '@kws/types';

import type { MlsPropertyPayload, MlsRoomPayload, MlsUnitTypePayload } from '@/types';
import type { NWM_Property, NWM_PropertyUnitType } from '@/types/property';

import { computePropertyCells } from '@/lib/h3';
import {
  parseBoolean,
  parseIntegerValue,
  parseLocalFields,
  parseNullableString,
  parseNumeric,
  parseRealNumber,
  parseStringArray,
  parseTimestamp,
} from '@/lib/utils';

import { mapMedia, type MappedMedia } from './media.mapper';
// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

type PropertyInsert = typeof properties.$inferInsert;
type PropertyRoomInsert = typeof propertyRooms.$inferInsert;
type PropertyUnitTypeInsert = typeof propertyUnitTypes.$inferInsert;

export type MappedProperty = Omit<
  PropertyInsert,
  'createdAt' | 'searchVector' | 'featuredListingYN'
> & {
  NWM: NWM_Property | null;
  media: MappedMedia[];
  rooms: MappedPropertyRoom[];
  unitTypes: MappedPropertyUnitType[];
};

export type MappedPropertyRoom = Omit<PropertyRoomInsert, 'createdAt' | 'searchVector'>;

export type MappedPropertyUnitType = Omit<PropertyUnitTypeInsert, 'createdAt' | 'searchVector'> & {
  NWM: NWM_PropertyUnitType | null;
};

const PROPERTY_TYPE_VALUES: readonly PropertyType[] = [
  'BusinessOpportunity',
  'CommercialLease',
  'CommercialSale',
  'Farm',
  'Land',
  'ManufacturedInPark',
  'Residential',
  'ResidentialIncome',
  'ResidentialLease',
] as const;

const STANDARD_STATUS_VALUES: readonly StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'Canceled',
  'Closed',
  'ComingSoon',
  'Delete',
  'Expired',
  'Hold',
  'Incomplete',
  'Pending',
  'Withdrawn',
] as const;

function normalizeEnumToken(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function normalizePropertyType(value: string | null | undefined): PropertyType | null {
  if (!value) return null;
  const normalized = normalizeEnumToken(value);
  return (
    PROPERTY_TYPE_VALUES.find((candidate) => normalizeEnumToken(candidate) === normalized) ?? null
  );
}

function normalizeStandardStatus(value: string | null | undefined): StandardStatus | null {
  if (!value) return null;
  const normalized = normalizeEnumToken(value);
  return (
    STANDARD_STATUS_VALUES.find((candidate) => normalizeEnumToken(candidate) === normalized) ?? null
  );
}

// ---------------------------------------------------------------------------
// Main property mapper
// ---------------------------------------------------------------------------

export function mapProperty(payload: MlsPropertyPayload): MappedProperty {
  const canView = parseBoolean(payload.MlgCanView) === true;
  const nwm = parseLocalFields(payload, 'NWM_');
  const now = new Date();

  const media =
    payload.Media?.map((mediaPayload) => mapMedia(mediaPayload, payload.ListingKey)) ?? [];
  const rooms =
    payload.Rooms?.map((roomPayload) => mapPropertyRoom(roomPayload, payload.ListingKey)) ?? [];
  const unitTypes =
    payload.UnitTypes?.map((unitTypePayload) =>
      mapPropertyUnitType(unitTypePayload, payload.ListingKey),
    ) ?? [];

  const lat = parseRealNumber(payload.Latitude);
  const lng = parseRealNumber(payload.Longitude);
  const h3Cells = computePropertyCells(lat, lng);

  return {
    listingKey: payload.ListingKey,
    listingId: parseNullableString(payload.ListingId, 64),
    originatingSystemName: parseNullableString(payload.OriginatingSystemName, 32) ?? 'nwmls',
    standardStatus: normalizeStandardStatus(payload.StandardStatus),
    mlsStatus: parseNullableString(payload.MlsStatus, 64),
    propertyType: normalizePropertyType(payload.PropertyType),
    propertySubType: parseNullableString(payload.PropertySubType, 128),
    mlgCanView: canView,
    modificationTimestamp: parseTimestamp(payload.ModificationTimestamp),
    originalEntryTimestamp: parseTimestamp(payload.OriginalEntryTimestamp),
    majorChangeTimestamp: parseTimestamp(payload.MajorChangeTimestamp),
    majorChangeType: parseNullableString(payload.MajorChangeType, 128),
    photosChangeTimestamp: parseTimestamp(payload.PhotosChangeTimestamp),
    statusChangeTimestamp: parseTimestamp(payload.StatusChangeTimestamp),
    priceChangeTimestamp: parseTimestamp(payload.PriceChangeTimestamp),
    contractStatusChangeDate: parseTimestamp(payload.ContractStatusChangeDate),
    purchaseContractDate: parseTimestamp(payload.PurchaseContractDate),
    offMarketDate: parseTimestamp(payload.OffMarketDate),
    availabilityDate: parseTimestamp(payload.AvailabilityDate),
    contingentDate: parseTimestamp(payload.ContingentDate),
    onMarketDate: parseTimestamp(payload.OnMarketDate),
    cumulativeDaysOnMarket: parseIntegerValue(payload.CumulativeDaysOnMarket),
    originatingSystemModificationTimestamp: parseTimestamp(
      payload.OriginatingSystemModificationTimestamp,
    ),
    closeDate: parseTimestamp(payload.CloseDate),
    closingDate: parseTimestamp(payload.CloseDate),
    internetAddressDisplayYN: parseBoolean(payload.InternetAddressDisplayYN),
    internetAutomatedValuationDisplayYN: parseBoolean(payload.InternetAutomatedValuationDisplayYN),
    internetConsumerCommentYN: parseBoolean(payload.InternetConsumerCommentYN),
    internetEntireListingDisplayYN: parseBoolean(payload.InternetEntireListingDisplayYN),
    mlgCanUse: parseStringArray(payload.MlgCanUse),
    sourceSystemName: parseNullableString(payload.SourceSystemName, 255),
    unparsedAddress: parseNullableString(payload.UnparsedAddress),
    streetNumber: parseNullableString(payload.StreetNumber, 32),
    streetNumberNumeric: parseIntegerValue(payload.StreetNumberNumeric),
    streetDirPrefix: parseNullableString(payload.StreetDirPrefix, 16),
    streetName: parseNullableString(payload.StreetName, 128),
    streetSuffix: parseNullableString(payload.StreetSuffix, 32),
    streetDirSuffix: parseNullableString(payload.StreetDirSuffix, 16),
    unitNumber: parseNullableString(payload.UnitNumber, 32),
    city: parseNullableString(payload.City, 128),
    stateOrProvince: parseNullableString(payload.StateOrProvince, 32),
    postalCode: parseNullableString(payload.PostalCode, 16),
    postalCodePlus4: parseNullableString(payload.PostalCodePlus4, 4),
    country: parseNullableString(payload.Country, 8),
    countyOrParish: parseNullableString(payload.CountyOrParish, 128),
    subdivisionName: parseNullableString(payload.SubdivisionName, 256),
    mlsAreaMajor: parseNullableString(payload.MlsAreaMajor, 64),
    mlsAreaMinor: parseNullableString(payload.MlsAreaMinor, 64),
    directions: parseNullableString(payload.Directions),
    latitude: lat,
    longitude: lng,
    h3R6: h3Cells?.r6 ?? null,
    h3R7: h3Cells?.r7 ?? null,
    h3R8: h3Cells?.r8 ?? null,
    listPrice: parseNumeric(payload.ListPrice),
    listPriceLow: parseNumeric(payload.ListPriceLow),
    originalListPrice: parseNumeric(payload.OriginalListPrice),
    previousListPrice: parseNumeric(payload.PreviousListPrice),
    closePrice: parseNumeric(payload.ClosePrice),
    taxAssessedValue: parseNumeric(payload.TaxAssessedValue),
    bedroomsTotal: parseIntegerValue(payload.BedroomsTotal),
    bathroomsFull: parseIntegerValue(payload.BathroomsFull),
    bathroomsHalf: parseIntegerValue(payload.BathroomsHalf),
    bathroomsThreeQuarter: parseIntegerValue(payload.BathroomsThreeQuarter),
    bathroomsOneQuarter: parseIntegerValue(payload.BathroomsOneQuarter),
    bathroomsTotalInteger: parseIntegerValue(payload.BathroomsTotalInteger),
    roomsTotal: parseIntegerValue(payload.RoomsTotal),
    storiesTotal: parseIntegerValue(payload.StoriesTotal),
    levels: parseStringArray(payload.Levels),
    garageSpaces: parseIntegerValue(payload.GarageSpaces),
    parkingTotal: parseIntegerValue(payload.ParkingTotal),
    additionalParcelsDescription: parseNullableString(payload.AdditionalParcelsDescription, 255),
    bedroomsPossible: parseIntegerValue(payload.BedroomsPossible),
    bodyType: parseStringArray(payload.BodyType),
    carportSpaces: parseNumeric(payload.CarportSpaces),
    carportYN: parseBoolean(payload.CarportYN),
    coveredSpaces: parseNumeric(payload.CoveredSpaces),
    openParkingSpaces: parseNumeric(payload.OpenParkingSpaces),
    mainLevelBathrooms: parseIntegerValue(payload.MainLevelBathrooms),
    mainLevelBedrooms: parseIntegerValue(payload.MainLevelBedrooms),
    livingArea: parseNumeric(payload.LivingArea),
    livingAreaUnits: parseNullableString(payload.LivingAreaUnits, 32),
    lotSizeAcres: parseNumeric(payload.LotSizeAcres),
    lotSizeSquareFeet: parseNumeric(payload.LotSizeSquareFeet),
    buildingAreaTotal: parseNumeric(payload.BuildingAreaTotal),
    aboveGradeFinishedArea: parseNumeric(payload.AboveGradeFinishedArea),
    belowGradeFinishedArea: parseNumeric(payload.BelowGradeFinishedArea),
    lotSizeDimensions: parseNullableString(payload.LotSizeDimensions, 150),
    lotSizeUnits: parseNullableString(payload.LotSizeUnits, 25),
    leasableArea: parseNumeric(payload.LeasableArea),
    leasableAreaUnits: parseNullableString(payload.LeasableAreaUnits, 25),
    numberOfUnitsInCommunity: parseIntegerValue(payload.NumberOfUnitsInCommunity),
    numberOfUnitsTotal: parseIntegerValue(payload.NumberOfUnitsTotal),
    yearBuilt: parseIntegerValue(payload.YearBuilt),
    yearBuiltSource: parseNullableString(payload.YearBuiltSource, 64),
    builderName: parseNullableString(payload.BuilderName, 50),
    buildingAreaUnits: parseNullableString(payload.BuildingAreaUnits, 25),
    buildingFeatures: parseStringArray(payload.BuildingFeatures),
    buildingName: parseNullableString(payload.BuildingName, 50),
    yearBuiltEffective: parseIntegerValue(payload.YearBuiltEffective),
    yearEstablished: parseIntegerValue(payload.YearEstablished),
    yearsCurrentOwner: parseIntegerValue(payload.YearsCurrentOwner),
    make: parseNullableString(payload.Make, 50),
    model: parseNullableString(payload.Model, 50),
    mobileHomeRemainsYN: parseBoolean(payload.MobileHomeRemainsYN),
    newConstructionYN: parseBoolean(payload.NewConstructionYN),
    propertyCondition: parseStringArray(payload.PropertyCondition),
    architecturalStyle: parseStringArray(payload.ArchitecturalStyle),
    constructionMaterials: parseStringArray(payload.ConstructionMaterials),
    foundationDetails: parseStringArray(payload.FoundationDetails),
    roof: parseStringArray(payload.Roof),
    commonWalls: parseStringArray(payload.CommonWalls),
    heating: parseStringArray(payload.Heating),
    cooling: parseStringArray(payload.Cooling),
    electric: parseStringArray(payload.Electric),
    waterSource: parseStringArray(payload.WaterSource),
    sewer: parseStringArray(payload.Sewer),
    utilities: parseStringArray(payload.Utilities),
    coolingYN: parseBoolean(payload.CoolingYN),
    electricOnPropertyYN: parseBoolean(payload.ElectricOnPropertyYN),
    heatingYN: parseBoolean(payload.HeatingYN),
    irrigationSource: parseStringArray(payload.IrrigationSource),
    irrigationWaterRightsYN: parseBoolean(payload.IrrigationWaterRightsYN),
    leaseAssignableYN: parseBoolean(payload.LeaseAssignableYN),
    operatingExpenseIncludes: parseStringArray(payload.OperatingExpenseIncludes),
    powerProductionType: parseStringArray(payload.PowerProductionType),
    interiorFeatures: parseStringArray(payload.InteriorFeatures),
    flooring: parseStringArray(payload.Flooring),
    appliances: parseStringArray(payload.Appliances),
    fireplaceFeatures: parseStringArray(payload.FireplaceFeatures),
    fireplaceYN: parseBoolean(payload.FireplaceYN),
    fireplacesTotal: parseIntegerValue(payload.FireplacesTotal),
    laundryFeatures: parseStringArray(payload.LaundryFeatures),
    windowFeatures: parseStringArray(payload.WindowFeatures),
    accessibilityFeatures: parseStringArray(payload.AccessibilityFeatures),
    entryLocation: parseNullableString(payload.EntryLocation, 50),
    furnished: parseNullableString(payload.Furnished, 50),
    inclusions: parseNullableString(payload.Inclusions),
    otherEquipment: parseStringArray(payload.OtherEquipment),
    petsAllowed: parseStringArray(payload.PetsAllowed),
    possession: parseStringArray(payload.Possession),
    securityFeatures: parseStringArray(payload.SecurityFeatures),
    skirt: parseStringArray(payload.Skirt),
    specialLicenses: parseStringArray(payload.SpecialLicenses),
    exteriorFeatures: parseStringArray(payload.ExteriorFeatures),
    patioAndPorchFeatures: parseStringArray(payload.PatioAndPorchFeatures),
    fencing: parseStringArray(payload.Fencing),
    otherStructures: parseStringArray(payload.OtherStructures),
    lotFeatures: parseStringArray(payload.LotFeatures),
    frontageType: parseStringArray(payload.FrontageType),
    view: parseStringArray(payload.View),
    waterfrontYN: parseBoolean(payload.WaterfrontYN),
    waterfrontFeatures: parseStringArray(payload.WaterfrontFeatures),
    poolPrivateYN: parseBoolean(payload.PoolPrivateYN),
    poolFeatures: parseStringArray(payload.PoolFeatures),
    spaFeatures: parseStringArray(payload.SpaFeatures),
    horseYN: parseBoolean(payload.HorseYN),
    directionFaces: parseNullableString(payload.DirectionFaces, 25),
    elevation: parseIntegerValue(payload.Elevation),
    elevationUnits: parseNullableString(payload.ElevationUnits, 10),
    possibleUse: parseStringArray(payload.PossibleUse),
    roadResponsibility: parseStringArray(payload.RoadResponsibility),
    roadSurfaceType: parseStringArray(payload.RoadSurfaceType),
    signOnPropertyYN: parseBoolean(payload.SignOnPropertyYN),
    spaYN: parseBoolean(payload.SpaYN),
    structureType: parseStringArray(payload.StructureType),
    topography: parseNullableString(payload.Topography, 255),
    vegetation: parseStringArray(payload.Vegetation),
    viewYN: parseBoolean(payload.ViewYN),
    zoning: parseNullableString(payload.Zoning, 25),
    zoningDescription: parseNullableString(payload.ZoningDescription, 255),
    communityFeatures: parseStringArray(payload.CommunityFeatures),
    seniorCommunityYN: parseBoolean(payload.SeniorCommunityYN),
    associationYN: parseBoolean(payload.AssociationYN),
    associationName: parseNullableString(payload.AssociationName, 256),
    associationFee: parseNumeric(payload.AssociationFee),
    associationFeeFrequency: parseNullableString(payload.AssociationFeeFrequency, 64),
    associationFeeIncludes: parseStringArray(payload.AssociationFeeIncludes),
    associationAmenities: parseStringArray(payload.AssociationAmenities),
    associationPhone: parseNullableString(payload.AssociationPhone, 32),
    associationEmail: parseNullableString(payload.AssociationEmail, 256),
    elementarySchool: parseNullableString(payload.ElementarySchool, 128),
    middleOrJuniorSchool: parseNullableString(payload.MiddleOrJuniorSchool, 128),
    highSchool: parseNullableString(payload.HighSchool, 128),
    elementarySchoolDistrict: parseNullableString(payload.ElementarySchoolDistrict, 128),
    middleOrJuniorSchoolDistrict: parseNullableString(payload.MiddleOrJuniorSchoolDistrict, 128),
    highSchoolDistrict: parseNullableString(payload.HighSchoolDistrict, 128),
    taxYear: parseIntegerValue(payload.TaxYear),
    taxLegalDescription: parseNullableString(payload.TaxLegalDescription),
    parcelNumber: parseNullableString(payload.ParcelNumber, 128),
    taxMapNumber: parseNullableString(payload.TaxMapNumber, 64),
    listingTerms: parseStringArray(payload.ListingTerms),
    buyerFinancing: parseStringArray(payload.BuyerFinancing),
    currentFinancing: parseStringArray(payload.CurrentFinancing),
    specialListingConditions: parseStringArray(payload.SpecialListingConditions),
    listingContractDate: parseTimestamp(payload.ListingContractDate),
    expirationDate: parseTimestamp(payload.ExpirationDate),
    leaseExpiration: parseTimestamp(payload.LeaseExpiration),
    rentIncludes: parseStringArray(payload.RentIncludes),
    capRate: parseNumeric(payload.CapRate),
    electricExpense: parseNumeric(payload.ElectricExpense),
    fuelExpense: parseNumeric(payload.FuelExpense),
    grossScheduledIncome: parseNumeric(payload.GrossScheduledIncome),
    insuranceExpense: parseNumeric(payload.InsuranceExpense),
    landLeaseAmount: parseNumeric(payload.LandLeaseAmount),
    landLeaseAmountFrequency: parseNullableString(payload.LandLeaseAmountFrequency, 25),
    landLeaseYN: parseBoolean(payload.LandLeaseYN),
    netOperatingIncome: parseNumeric(payload.NetOperatingIncome),
    otherExpense: parseNumeric(payload.OtherExpense),
    ownership: parseNullableString(payload.Ownership),
    taxAnnualAmount: parseNumeric(payload.TaxAnnualAmount),
    totalActualRent: parseNumeric(payload.TotalActualRent),
    listAgentKey: parseNullableString(payload.ListAgentKey, 64),
    listAgentMlsId: parseNullableString(payload.ListAgentMlsId, 64),
    listAgentFullName: parseNullableString(payload.ListAgentFullName, 256),
    listAgentEmail: parseNullableString(payload.ListAgentEmail, 256),
    listAgentDirectPhone: parseNullableString(payload.ListAgentDirectPhone, 32),
    listOfficeKey: parseNullableString(payload.ListOfficeKey, 64),
    listOfficeMlsId: parseNullableString(payload.ListOfficeMlsId, 64),
    listOfficeName: parseNullableString(payload.ListOfficeName, 256),
    listOfficePhone: parseNullableString(payload.ListOfficePhone, 32),
    coListAgentKey: parseNullableString(payload.CoListAgentKey, 64),
    coListAgentMlsId: parseNullableString(payload.CoListAgentMlsId, 64),
    coListAgentFullName: parseNullableString(payload.CoListAgentFullName, 256),
    buyerAgentKey: parseNullableString(payload.BuyerAgentKey, 64),
    buyerAgentMlsId: parseNullableString(payload.BuyerAgentMlsId, 64),
    buyerAgentFullName: parseNullableString(payload.BuyerAgentFullName, 256),
    buyerAgentOfficePhone: parseNullableString(payload.BuyerAgentOfficePhone, 16),
    buyerAgentOfficePhoneExt: parseNullableString(payload.BuyerAgentOfficePhoneExt, 10),
    buyerOfficeKey: parseNullableString(payload.BuyerOfficeKey, 64),
    buyerOfficeMlsId: parseNullableString(payload.BuyerOfficeMlsId, 64),
    buyerOfficeName: parseNullableString(payload.BuyerOfficeName, 256),
    buyerOfficePhone: parseNullableString(payload.BuyerOfficePhone, 16),
    buyerOfficePhoneExt: parseNullableString(payload.BuyerOfficePhoneExt, 10),
    coBuyerAgentFullName: parseNullableString(payload.CoBuyerAgentFullName, 150),
    coBuyerAgentKey: parseNullableString(payload.CoBuyerAgentKey, 255),
    coBuyerAgentMlsId: parseNullableString(payload.CoBuyerAgentMlsId, 25),
    coBuyerOfficeKey: parseNullableString(payload.CoBuyerOfficeKey, 255),
    coBuyerOfficeMlsId: parseNullableString(payload.CoBuyerOfficeMlsId, 25),
    coBuyerOfficeName: parseNullableString(payload.CoBuyerOfficeName, 255),
    coBuyerOfficePhone: parseNullableString(payload.CoBuyerOfficePhone, 16),
    coBuyerOfficePhoneExt: parseNullableString(payload.CoBuyerOfficePhoneExt, 10),
    coListOfficeKey: parseNullableString(payload.CoListOfficeKey, 255),
    coListOfficeMlsId: parseNullableString(payload.CoListOfficeMlsId, 25),
    coListOfficeName: parseNullableString(payload.CoListOfficeName, 255),
    coListOfficePhone: parseNullableString(payload.CoListOfficePhone, 16),
    coListOfficePhoneExt: parseNullableString(payload.CoListOfficePhoneExt, 10),
    listOfficePhoneExt: parseNullableString(payload.ListOfficePhoneExt, 10),
    businessName: parseNullableString(payload.BusinessName, 255),
    businessType: parseStringArray(payload.BusinessType),
    parkManagerName: parseNullableString(payload.ParkManagerName, 50),
    parkManagerPhone: parseNullableString(payload.ParkManagerPhone, 16),
    parkName: parseNullableString(payload.ParkName, 50),
    serialU: parseNullableString(payload.SerialU, 25),
    buyerAgencyCompensation: parseNullableString(payload.BuyerAgencyCompensation, 32),
    buyerAgencyCompensationType: parseNullableString(payload.BuyerAgencyCompensationType, 32),
    buyerBrokerageCompensation: parseNullableString(payload.BuyerBrokerageCompensation, 25),
    buyerBrokerageCompensationType: parseNullableString(payload.BuyerBrokerageCompensationType, 25),
    publicRemarks: parseNullableString(payload.PublicRemarks),
    privateRemarks: parseNullableString(payload.PrivateRemarks),
    syndicationRemarks: parseNullableString(payload.SyndicationRemarks),
    syndicateTo: parseStringArray(payload.SyndicateTo),
    photosCount: parseIntegerValue(payload.PhotosCount),
    videosCount: parseIntegerValue(payload.VideosCount),
    virtualTourURLUnbranded: parseNullableString(payload.VirtualTourURLUnbranded),
    virtualTourURLBranded: parseNullableString(payload.VirtualTourURLBranded),
    parkingFeatures: parseStringArray(payload.ParkingFeatures),
    garageYN: parseBoolean(payload.GarageYN),
    attachedGarageYN: parseBoolean(payload.AttachedGarageYN),
    openParkingYN: parseBoolean(payload.OpenParkingYN),
    basement: parseStringArray(payload.Basement),
    basementYN: parseBoolean(payload.BasementYN),
    greenBuildingVerificationType: parseStringArray(payload.GreenBuildingVerificationType),
    greenEnergyEfficient: parseStringArray(payload.GreenEnergyEfficient),
    greenEnergyGeneration: parseStringArray(payload.GreenEnergyGeneration),
    deletedAt: canView ? null : now,
    updatedAt: now,
    /* extensions */
    NWM: nwm,
    media,
    rooms,
    unitTypes,
  };
}

// ---------------------------------------------------------------------------
// Child collection mappers
// ---------------------------------------------------------------------------

export function mapPropertyRoom(payload: MlsRoomPayload, listingKey: string): MappedPropertyRoom {
  return {
    roomKey: payload.RoomKey,
    listingKey,
    roomDescription:
      parseNullableString(payload['RoomDescription'], 1024) ??
      parseNullableString(payload.RoomFeatures, 1024),
    roomType: parseNullableString(payload.RoomType, 1024),
    roomDimensions: parseNullableString(payload.RoomDimensions, 50),
    roomLength: parseNumeric(payload.RoomLength),
    roomWidth: parseNumeric(payload.RoomWidth),
    roomLengthWidthUnits:
      parseNullableString(payload['RoomLengthWidthUnits'], 25) ??
      parseNullableString(payload.RoomAreaUnits, 25),
    roomLevel: parseNullableString(payload.RoomLevel, 25),
    updatedAt: new Date(),
  };
}

export function mapPropertyUnitType(
  payload: MlsUnitTypePayload,
  listingKey: string,
): MappedPropertyUnitType {
  const nwm = parseLocalFields(payload, 'NWM_');
  return {
    unitTypeKey: payload.UnitTypeKey,
    listingKey,
    unitTypeBedsTotal: parseIntegerValue(payload.UnitTypeBedsTotal),
    unitTypeBathsTotal: parseIntegerValue(payload.UnitTypeBathsTotal),
    unitTypeActualRent: parseNumeric(payload.UnitTypeActualRent),
    NWM: nwm,
    updatedAt: new Date(),
  };
}
