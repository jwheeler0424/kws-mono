// ---------------------------------------------------------------------------
// MLS Grid API payload types — OData PascalCase as returned by the API.
// These are shallow interfaces; translation to local DB types is the
// mapper layer's responsibility.
// ---------------------------------------------------------------------------

import type { MLS_RESOURCE_NAMES } from "@/lib/constants";

export type MlsResource = typeof MLS_RESOURCE_NAMES[number];

// ---------------------------------------------------------------------------
// OData envelope
// ---------------------------------------------------------------------------

export interface ODataPage<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}

export interface ODataPageBatch<T> {
  value: T[];
  requestUrl: string;
  nextUrl?: string;
}

// ---------------------------------------------------------------------------
// Shared child payload types
// ---------------------------------------------------------------------------

/** Media record — used under Property, Member, and Office expansions */
export interface MlsMediaPayload {
  MediaKey: string;
  ListingKey?: string;
  MemberKey?: string;
  OfficeKey?: string;
  OriginatingSystemName?: string;
  MediaURL?: string;
  MediaModificationTimestamp?: string;
  ModificationTimestamp?: string;
  MediaType?: string;
  MimeType?: string;
  MediaCategory?: string;
  ImageWidth?: number;
  ImageHeight?: number;
  ImageSizeDescription?: string;
  MediaObjectID?: string;
  Order?: number;
  PreferredPhotoYN?: boolean;
  ShortDescription?: string;
  LongDescription?: string;
  MlgCanView?: boolean;
  [key: string]: unknown;
}

/** Room record — expanded under Property */
export interface MlsRoomPayload {
  RoomKey: string;
  ListingKey: string;
  RoomType?: string;
  RoomDimensions?: string;
  RoomFeatures?: string;
  RoomArea?: number;
  RoomAreaUnits?: string;
  RoomLength?: number;
  RoomWidth?: number;
  RoomLevel?: string;
  [key: string]: unknown;
}

/** UnitType record — expanded under Property */
export interface MlsUnitTypePayload {
  UnitTypeKey: string;
  ListingKey: string;
  UnitTypeType?: string;
  UnitTypeBedsTotal?: number;
  UnitTypeBathsTotal?: number;
  UnitTypeActualRent?: number;
  UnitTypeProFormaRent?: number;
  UnitTypeTotalArea?: number;
  UnitTypeCount?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Resource payload types
// ---------------------------------------------------------------------------

export interface MlsLookupPayload {
  LookupKey: string;
  LookupName: string;
  LookupValue?: string;
  StandardLookupValue?: string;
  OriginatingSystemName?: string;
  ModificationTimestamp?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  [key: string]: unknown;
}

export interface MlsMemberPayload {
  MemberMlsId: string;
  MemberKey?: string;
  OriginatingSystemName?: string;
  MemberFullName?: string;
  MemberFirstName?: string;
  MemberLastName?: string;
  MemberEmail?: string;
  MemberDirectPhone?: string;
  MemberOfficePhone?: string;
  MemberMobilePhone?: string;
  MemberType?: string;
  MemberStatus?: string;
  MemberDesignation?: string[];
  OfficeKey?: string;
  OfficeMlsId?: string;
  OfficeName?: string;
  StateOrProvince?: string;
  StateLicense?: string;
  NrdsId?: string;
  PhotosChangeTimestamp?: string;
  ModificationTimestamp?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  Media?: MlsMediaPayload[];
  [key: string]: unknown;
}

export interface MlsOfficePayload {
  OfficeMlsId: string;
  OfficeKey?: string;
  OriginatingSystemName?: string;
  OfficeName?: string;
  OfficePhone?: string;
  OfficeFax?: string;
  OfficeEmail?: string;
  OfficeAddress1?: string;
  OfficeAddress2?: string;
  OfficeCity?: string;
  OfficeStateOrProvince?: string;
  OfficePostalCode?: string;
  OfficeStatus?: string;
  OfficeType?: string;
  MainOfficeKey?: string;
  PhotosChangeTimestamp?: string;
  ModificationTimestamp?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  Media?: MlsMediaPayload[];
  [key: string]: unknown;
}

export interface MlsOpenHousePayload {
  OpenHouseKey: string;
  ListingKey?: string;
  ListingId?: string;
  OriginatingSystemName?: string;
  OpenHouseDate?: string;
  OpenHouseStartTime?: string;
  OpenHouseEndTime?: string;
  OpenHouseRemarks?: string;
  OpenHouseStatus?: string;
  OpenHouseType?: string;
  Refreshments?: string;
  AttendedBy?: string;
  ModificationTimestamp?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  [key: string]: unknown;
}

export interface MlsPropertyPayload {
  ListingKey: string;
  ListingId?: string;
  OriginatingSystemName?: string;
  StandardStatus?: string;
  MlsStatus?: string;
  PropertyType?: string;
  PropertySubType?: string;
  StructureType?: string;
  BodyType?: string;
  MlgCanView?: boolean;
  MlgCanUse?: string[];
  ModificationTimestamp?: string;
  OriginalEntryTimestamp?: string;
  MajorChangeTimestamp?: string;
  MajorChangeType?: string;
  PhotosChangeTimestamp?: string;
  StatusChangeTimestamp?: string;
  PriceChangeTimestamp?: string;
  ContractStatusChangeDate?: string;
  PurchaseContractDate?: string;
  OffMarketDate?: string;
  CloseDate?: string;
  AvailabilityDate?: string;
  ContingentDate?: string;
  OnMarketDate?: string;
  CumulativeDaysOnMarket?: number;
  OriginatingSystemModificationTimestamp?: string;
  SourceSystemName?: string;
  InternetAddressDisplayYN?: boolean;
  InternetAutomatedValuationDisplayYN?: boolean;
  InternetConsumerCommentYN?: boolean;
  InternetEntireListingDisplayYN?: boolean;
  UnparsedAddress?: string;
  StreetNumber?: string;
  StreetNumberNumeric?: number;
  StreetDirPrefix?: string;
  StreetName?: string;
  StreetSuffix?: string;
  StreetDirSuffix?: string;
  UnitNumber?: string;
  City?: string;
  StateOrProvince?: string;
  PostalCode?: string;
  PostalCodePlus4?: string;
  Country?: string;
  CountyOrParish?: string;
  SubdivisionName?: string;
  MlsAreaMajor?: string;
  MlsAreaMinor?: string;
  Directions?: string;
  Latitude?: number;
  Longitude?: number;
  ListPrice?: number;
  ListPriceLow?: number;
  OriginalListPrice?: number;
  PreviousListPrice?: number;
  ClosePrice?: number;
  TaxAssessedValue?: number;
  BedroomsTotal?: number;
  BathroomsFull?: number;
  BathroomsHalf?: number;
  BathroomsThreeQuarter?: number;
  BathroomsOneQuarter?: number;
  BathroomsTotalInteger?: number;
  RoomsTotal?: number;
  StoriesTotal?: number;
  Levels?: string[];
  GarageSpaces?: number;
  ParkingTotal?: number;
  AdditionalParcelsDescription?: string;
  BedroomsPossible?: number;
  CarportSpaces?: number;
  CarportYN?: boolean;
  CoveredSpaces?: number;
  OpenParkingSpaces?: number;
  MainLevelBathrooms?: number;
  MainLevelBedrooms?: number;
  LivingArea?: number;
  LivingAreaUnits?: string;
  LotSizeAcres?: number;
  LotSizeSquareFeet?: number;
  BuildingAreaTotal?: number;
  AboveGradeFinishedArea?: number;
  BelowGradeFinishedArea?: number;
  LotSizeDimensions?: string;
  LotSizeUnits?: string;
  LeasableArea?: number;
  LeasableAreaUnits?: string;
  NumberOfUnitsInCommunity?: number;
  NumberOfUnitsTotal?: number;
  YearBuilt?: number;
  YearBuiltSource?: string;
  BuilderName?: string;
  BuildingAreaUnits?: string;
  BuildingFeatures?: string[];
  BuildingName?: string;
  YearBuiltEffective?: number;
  YearEstablished?: number;
  YearsCurrentOwner?: number;
  Make?: string;
  Model?: string;
  MobileHomeRemainsYN?: boolean;
  NewConstructionYN?: boolean;
  PropertyCondition?: string[];
  ArchitecturalStyle?: string[];
  ConstructionMaterials?: string[];
  FoundationDetails?: string[];
  Roof?: string[];
  CommonWalls?: string[];
  Heating?: string[];
  Cooling?: string[];
  Electric?: string[];
  WaterSource?: string[];
  Sewer?: string[];
  Utilities?: string[];
  CoolingYN?: boolean;
  ElectricOnPropertyYN?: boolean;
  HeatingYN?: boolean;
  IrrigationSource?: string[];
  IrrigationWaterRightsYN?: boolean;
  LeaseAssignableYN?: boolean;
  OperatingExpenseIncludes?: string[];
  PowerProductionType?: string[];
  InteriorFeatures?: string[];
  Flooring?: string[];
  Appliances?: string[];
  FireplaceFeatures?: string[];
  FireplaceYN?: boolean;
  FireplacesTotal?: number;
  LaundryFeatures?: string[];
  WindowFeatures?: string[];
  AccessibilityFeatures?: string[];
  EntryLocation?: string;
  Furnished?: string;
  Inclusions?: string;
  OtherEquipment?: string[];
  PetsAllowed?: string[];
  Possession?: string[];
  SecurityFeatures?: string[];
  Skirt?: string[];
  SpecialLicenses?: string[];
  ExteriorFeatures?: string[];
  PatioAndPorchFeatures?: string[];
  Fencing?: string[];
  OtherStructures?: string[];
  LotFeatures?: string[];
  FrontageType?: string[];
  View?: string[];
  WaterfrontYN?: boolean;
  WaterfrontFeatures?: string[];
  PoolPrivateYN?: boolean;
  PoolFeatures?: string[];
  SpaFeatures?: string[];
  HorseYN?: boolean;
  DirectionFaces?: string;
  Elevation?: number;
  ElevationUnits?: string;
  PossibleUse?: string[];
  RoadResponsibility?: string[];
  RoadSurfaceType?: string[];
  SignOnPropertyYN?: boolean;
  SpaYN?: boolean;
  Topography?: string;
  Vegetation?: string[];
  ViewYN?: boolean;
  Zoning?: string;
  ZoningDescription?: string;
  CommunityFeatures?: string[];
  SeniorCommunityYN?: boolean;
  AssociationYN?: boolean;
  AssociationName?: string;
  AssociationFee?: number;
  AssociationFeeFrequency?: string;
  AssociationFeeIncludes?: string[];
  AssociationAmenities?: string[];
  AssociationPhone?: string;
  AssociationEmail?: string;
  ElementarySchool?: string;
  MiddleOrJuniorSchool?: string;
  HighSchool?: string;
  ElementarySchoolDistrict?: string;
  MiddleOrJuniorSchoolDistrict?: string;
  HighSchoolDistrict?: string;
  TaxYear?: number;
  TaxLegalDescription?: string;
  ParcelNumber?: string;
  TaxMapNumber?: string;
  ListingTerms?: string[];
  BuyerFinancing?: string[];
  CurrentFinancing?: string[];
  SpecialListingConditions?: string[];
  ListingContractDate?: string;
  ExpirationDate?: string;
  LeaseExpiration?: string;
  RentIncludes?: string[];
  CapRate?: number;
  ElectricExpense?: number;
  FuelExpense?: number;
  GrossScheduledIncome?: number;
  InsuranceExpense?: number;
  LandLeaseAmount?: number;
  LandLeaseAmountFrequency?: string;
  LandLeaseYN?: boolean;
  NetOperatingIncome?: number;
  OtherExpense?: number;
  Ownership?: string;
  TaxAnnualAmount?: number;
  TotalActualRent?: number;
  ListAgentKey?: string;
  ListAgentMlsId?: string;
  ListAgentFullName?: string;
  ListAgentEmail?: string;
  ListAgentDirectPhone?: string;
  ListOfficeKey?: string;
  ListOfficeMlsId?: string;
  ListOfficeName?: string;
  ListOfficePhone?: string;
  CoListAgentKey?: string;
  CoListAgentMlsId?: string;
  CoListAgentFullName?: string;
  BuyerAgentKey?: string;
  BuyerAgentMlsId?: string;
  BuyerAgentFullName?: string;
  BuyerAgentOfficePhone?: string;
  BuyerAgentOfficePhoneExt?: string;
  BuyerOfficeKey?: string;
  BuyerOfficeMlsId?: string;
  BuyerOfficeName?: string;
  BuyerOfficePhone?: string;
  BuyerOfficePhoneExt?: string;
  CoBuyerAgentFullName?: string;
  CoBuyerAgentKey?: string;
  CoBuyerAgentMlsId?: string;
  CoBuyerOfficeKey?: string;
  CoBuyerOfficeMlsId?: string;
  CoBuyerOfficeName?: string;
  CoBuyerOfficePhone?: string;
  CoBuyerOfficePhoneExt?: string;
  CoListOfficeKey?: string;
  CoListOfficeMlsId?: string;
  CoListOfficeName?: string;
  CoListOfficePhone?: string;
  CoListOfficePhoneExt?: string;
  ListOfficePhoneExt?: string;
  BusinessName?: string;
  BusinessType?: string[];
  ParkManagerName?: string;
  ParkManagerPhone?: string;
  ParkName?: string;
  SerialU?: string;
  BuyerAgencyCompensation?: string;
  BuyerAgencyCompensationType?: string;
  BuyerBrokerageCompensation?: string;
  BuyerBrokerageCompensationType?: string;
  PublicRemarks?: string;
  PrivateRemarks?: string;
  SyndicationRemarks?: string;
  SyndicateTo?: string[];
  PhotosCount?: number;
  VideosCount?: number;
  VirtualTourURLUnbranded?: string;
  VirtualTourURLBranded?: string;
  ParkingFeatures?: string[];
  GarageYN?: boolean;
  AttachedGarageYN?: boolean;
  OpenParkingYN?: boolean;
  Basement?: string[];
  BasementYN?: boolean;
  GreenBuildingVerificationType?: string[];
  GreenEnergyEfficient?: string[];
  GreenEnergyGeneration?: string[];

  /** Expanded child collections */
  Media?: MlsMediaPayload[];
  Rooms?: MlsRoomPayload[];
  UnitTypes?: MlsUnitTypePayload[];
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Sync result types
// ---------------------------------------------------------------------------

export interface ErrorDetail {
  key?: string;
  message: string;
  stack?: string;
}

export interface SyncResult {
  resource: string;
  osn: string;
  upserted: number;
  deactivated: number;
  errors: number;
  durationMs: number;
  error?: string;
  errorDetails?: ErrorDetail[];
}

export interface SyncSummary {
  osn: string;
  mode: 'initial' | 'delta';
  results: SyncResult[];
  totalDurationMs: number;
  startedAt: Date;
  completedAt: Date;
}
