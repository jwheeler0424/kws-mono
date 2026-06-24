import z from 'zod';

import type { PropertyListing } from '@kws/schema';

export type TAddressData = Pick<
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
>;

export type TPropertyCard = Pick<
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
    memberFullName: string;
    officeName: string;
    primaryPhotoUrl: string;
    primaryPhotoFullUrl: string;
    primaryPhotoPreviewUrl: string;
    primaryPhotoThumbnailUrl: string;
  };

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

export const NWM_MemberSchema = z.object({
  NWM_MainOfficeMlsId: z.string().optional(),
});
export type NWM_Member = z.infer<typeof NWM_MemberSchema>;

export const NWM_OpenHouseSchema = z.object({
  NWM_Deleted: z.string().optional(),
  NWM_TypeId: z.string().optional(),
  NWM_VirtualOpenHouseURL: z.string().optional(),
});
export type NWM_OpenHouse = z.infer<typeof NWM_OpenHouseSchema>;

export const NWM_PropertyUnitTypeSchema = z.object({
  NWM_UnitDishwasher: z.string().optional(),
  NWM_UnitEstimatedTripleNetMonthly: z.string().optional(),
  NWM_UnitFireplaces: z.string().optional(),
  NWM_UnitLeaseExpirationDate: z.string().optional(),
  NWM_UnitName: z.string().optional(),
  NWM_UnitRangeOven: z.string().optional(),
  NWM_UnitRefrigerator: z.string().optional(),
  NWM_UnitSquareFeet: z.string().optional(),
  NWM_UnitTenantDescription: z.string().optional(),
  NWM_UnitTypeOfUse: z.string().optional(),
  NWM_UnitWasherDryer: z.string().optional(),
});
export type NWM_PropertyUnitType = z.infer<typeof NWM_PropertyUnitTypeSchema>;

export const NWM_PropertySchema = z.object({
  NWM_AcreageComments: z.string().optional(),
  NWM_AdditionalMonthlyIncome: z.string().optional(),
  NWM_ADU2Baths: z.string().optional(),
  NWM_ADU2Beds: z.string().optional(),
  NWM_ADU2Sqft: z.string().optional(),
  NWM_ADU2Type: z.string().optional(),
  NWM_ADU3Baths: z.string().optional(),
  NWM_ADU3Beds: z.string().optional(),
  NWM_ADU3Sqft: z.string().optional(),
  NWM_ADU3Type: z.string().optional(),
  NWM_ADUBaths: z.string().optional(),
  NWM_ADUBeds: z.string().optional(),
  NWM_ADUCount: z.string().optional(),
  NWM_ADUSqft: z.string().optional(),
  NWM_ADUType: z.string().optional(),
  NWM_Affiliations: z.string().optional(),
  NWM_Amenities: z.string().optional(),
  NWM_AnnualExpenses: z.string().optional(),
  NWM_AnnualGrossSales: z.string().optional(),
  NWM_AnnualRent: z.string().optional(),
  NWM_ApplianceHookups: z.string().optional(),
  NWM_AppliancesIncluded: z.string().optional(),
  NWM_AppliancesProvided: z.string().optional(),
  NWM_ApprovalRequired: z.string().optional(),
  NWM_ApproximateBuildingSquareFeet: z.string().optional(),
  NWM_ApproximateOfficeSquareFeet: z.string().optional(),
  NWM_ApproximateWarehouseManufacturingSquareFeet: z.string().optional(),
  NWM_AssessmentFees: z.string().optional(),
  NWM_AssociationContactName: z.string().optional(),
  NWM_AvailablePads: z.string().optional(),
  NWM_AvailableUntil: z.string().optional(),
  NWM_BarnFeatures: z.string().optional(),
  NWM_BarnOutBuildingComment: z.string().optional(),
  NWM_BarnSize: z.string().optional(),
  NWM_BarnType: z.string().optional(),
  NWM_Bathrooms: z.string().optional(),
  NWM_BathsFullGarage: z.string().optional(),
  NWM_BathsFullLower: z.string().optional(),
  NWM_BathsFullMain: z.string().optional(),
  NWM_BathsFullUpper: z.string().optional(),
  NWM_BathsHalfGarage: z.string().optional(),
  NWM_BathsHalfLower: z.string().optional(),
  NWM_BathsHalfMain: z.string().optional(),
  NWM_BathsHalfUpper: z.string().optional(),
  NWM_BathsThreeQuarterGarage: z.string().optional(),
  NWM_BathsThreeQuarterLower: z.string().optional(),
  NWM_BathsThreeQuarterMain: z.string().optional(),
  NWM_BathsThreeQuarterUpper: z.string().optional(),
  NWM_BedroomsLower: z.string().optional(),
  NWM_BedroomsUpper: z.string().optional(),
  NWM_Block: z.string().optional(),
  NWM_BoardingIncome: z.string().optional(),
  NWM_BoundarySurvey: z.string().optional(),
  NWM_BuildingInformation: z.string().optional(),
  NWM_BusinessTypeInfo: z.string().optional(),
  NWM_BusLineNearby: z.string().optional(),
  NWM_BusRouteNumber: z.string().optional(),
  NWM_CableConnected: z.string().optional(),
  NWM_CalculatedSquareFootage: z.string().optional(),
  NWM_CeilingHeight: z.string().optional(),
  NWM_ColumnSpacing: z.string().optional(),
  NWM_CommonInterestCommunityYN: z.string().optional(),
  NWM_CommonPropertyFeatures: z.string().optional(),
  NWM_ConstructionMethods: z.string().optional(),
  NWM_CoOp: z.string().optional(),
  NWM_CropIncome: z.string().optional(),
  NWM_CropSoilComments: z.string().optional(),
  NWM_CurrentlyListedForSale: z.string().optional(),
  NWM_DepthOfLot: z.string().optional(),
  NWM_DPRURL: z.string().optional(),
  NWM_DPRYN: z.string().optional(),
  NWM_DwellingType: z.string().optional(),
  NWM_Easements: z.string().optional(),
  NWM_EffectiveYearBuiltSource: z.string().optional(),
  NWM_ElectricityStatus: z.string().optional(),
  NWM_EnergySource: z.string().optional(),
  NWM_EnvironmentalCertification: z.string().optional(),
  NWM_EnvironmentalSurvey: z.string().optional(),
  NWM_Equipment: z.string().optional(),
  NWM_EquipmentDescription: z.string().optional(),
  NWM_EquipmentValue: z.string().optional(),
  NWM_EquitableInterestYN: z.string().optional(),
  NWM_Equity: z.string().optional(),
  NWM_EstimatedCompletionDate: z.string().optional(),
  NWM_ExcludedItemsYN: z.string().optional(),
  NWM_ExpansionArea: z.string().optional(),
  NWM_FarmType: z.string().optional(),
  NWM_FireplacesLower: z.string().optional(),
  NWM_FireplacesMain: z.string().optional(),
  NWM_FireplacesUpper: z.string().optional(),
  NWM_FIRPTAYN: z.string().optional(),
  NWM_FirstRightOfRefusal: z.string().optional(),
  NWM_FloorNumberOfUnit: z.string().optional(),
  NWM_FormsRequired: z.string().optional(),
  NWM_Franchise: z.string().optional(),
  NWM_FreeAndClear: z.string().optional(),
  NWM_GarageSquareFeet: z.string().optional(),
  NWM_GarbageServiceProvider: z.string().optional(),
  NWM_GasCompany: z.string().optional(),
  NWM_GasStatus: z.string().optional(),
  NWM_GoodwillValue: z.string().optional(),
  NWM_GreenVerificationBuiltGreenRating: z.string().optional(),
  NWM_GreenVerificationEPSEnergyMetric: z.string().optional(),
  NWM_GreenVerificationHERSMetric: z.string().optional(),
  NWM_GreenVerificationLEEDRating: z.string().optional(),
  NWM_GreenVerificationNWESHRating: z.string().optional(),
  NWM_GrossAdjustedIncome: z.string().optional(),
  NWM_GrossRentMultiplier: z.string().optional(),
  NWM_GuarantorsAcceptedYN: z.string().optional(),
  NWM_HoursOfOperation: z.string().optional(),
  NWM_IDXMustRemovePhotosYN: z.string().optional(),
  NWM_IDXMustRemovePrimaryPhotoYN: z.string().optional(),
  NWM_IDXRemoveVirtualTourYN: z.string().optional(),
  NWM_Improvements: z.string().optional(),
  NWM_ImprovementsAssessedValue: z.string().optional(),
  NWM_InactiveDate: z.string().optional(),
  NWM_InternetConnected: z.string().optional(),
  NWM_InventoryValue: z.string().optional(),
  NWM_IrrigationComments: z.string().optional(),
  NWM_IrrigationType: z.string().optional(),
  NWM_LaborAndIndustryInspected: z.string().optional(),
  NWM_LandAssessedValue: z.string().optional(),
  NWM_LeasedEquipment: z.string().optional(),
  NWM_LeasedItems: z.string().optional(),
  NWM_LeasedItemsFlag: z.string().optional(),
  NWM_LeaseDuration: z.string().optional(),
  NWM_LeaseIncome: z.string().optional(),
  NWM_LeaseTerms: z.string().optional(),
  NWM_LevelComment: z.string().optional(),
  NWM_LiensMortgages: z.string().optional(),
  NWM_ListingNumberForSale: z.string().optional(),
  NWM_LivestockComments: z.string().optional(),
  NWM_LivestockType: z.string().optional(),
  NWM_Loading: z.string().optional(),
  NWM_Location: z.string().optional(),
  NWM_LotNumber: z.string().optional(),
  NWM_ManufacturedAfter06151976: z.string().optional(),
  NWM_ManufacturedHomeFeatures: z.string().optional(),
  NWM_ManufacturedHomeParkAmenities: z.string().optional(),
  NWM_ManufacturedHomeParkApprovedForSale: z.string().optional(),
  NWM_MinimumRentalTerm: z.string().optional(),
  NWM_MLSLotSizeSource: z.string().optional(),
  NWM_MLSSquareFootageSource: z.string().optional(),
  NWM_MoveInFeePaidBy: z.string().optional(),
  NWM_MoveInFeesAmount: z.string().optional(),
  NWM_MoveInFeesYN: z.string().optional(),
  NWM_MoveInFundsRequired: z.string().optional(),
  NWM_NetProceeds: z.string().optional(),
  NWM_NewConstruction: z.string().optional(),
  NWM_NonNWMLSSaleType: z.string().optional(),
  NWM_NumberOfAccessStairs: z.string().optional(),
  NWM_NumberOfBathtubs: z.string().optional(),
  NWM_NumberOfEmployees: z.string().optional(),
  NWM_NumberOfHomesInPark: z.string().optional(),
  NWM_NumberOfShowers: z.string().optional(),
  NWM_Offers: z.string().optional(),
  NWM_OffersReviewDate: z.string().optional(),
  NWM_OtherDuesOrFeesYN: z.string().optional(),
  NWM_OtherRooms: z.string().optional(),
  NWM_OwnerOccupancy: z.string().optional(),
  NWM_PadReady: z.string().optional(),
  NWM_ParkingAssignedSpaces: z.string().optional(),
  NWM_ParkingSpaceNumbers: z.string().optional(),
  NWM_ParkingUncoveredSpaces: z.string().optional(),
  NWM_ParkingUncoveredTotal: z.string().optional(),
  NWM_ParlorSize: z.string().optional(),
  NWM_PoolType: z.string().optional(),
  NWM_PowerCompany: z.string().optional(),
  NWM_PowerServiceInAmps: z.string().optional(),
  NWM_PreliminaryTitleOrdered: z.string().optional(),
  NWM_PrimaryListingId: z.string().optional(),
  NWM_PrimaryListingKey: z.string().optional(),
  NWM_ProjectApprovedByFHA: z.string().optional(),
  NWM_PropertyFeatures: z.string().optional(),
  NWM_PublicLandSurvey: z.string().optional(),
  NWM_QualifyingIncome: z.string().optional(),
  NWM_RealEstateValue: z.string().optional(),
  NWM_RealProperty: z.string().optional(),
  NWM_RemodeledUpdated: z.string().optional(),
  NWM_RentalCap: z.string().optional(),
  NWM_ReportsDocsCompleted: z.string().optional(),
  NWM_Restrictions: z.string().optional(),
  NWM_RoadInformation: z.string().optional(),
  NWM_RoadOnWhichSide: z.string().optional(),
  NWM_SaleType: z.string().optional(),
  NWM_SellerDisclosure: z.string().optional(),
  NWM_SeniorExemption: z.string().optional(),
  NWM_SepticDesignApplied: z.string().optional(),
  NWM_SepticDesignApprovalDate: z.string().optional(),
  NWM_SepticDesignExpirationDate: z.string().optional(),
  NWM_SepticDesignInstalled: z.string().optional(),
  NWM_SepticSystemType: z.string().optional(),
  NWM_SewerCompany: z.string().optional(),
  NWM_ShortTermRentalYN: z.string().optional(),
  NWM_ShowMapLink: z.string().optional(),
  NWM_SignageStays: z.string().optional(),
  NWM_SiteFeatures: z.string().optional(),
  NWM_SiteFrontage: z.string().optional(),
  NWM_SketchSubmitted: z.string().optional(),
  NWM_SleepsNumberOfPeople: z.string().optional(),
  NWM_SlopeComment: z.string().optional(),
  NWM_SOCComments: z.string().optional(),
  NWM_SoilFeasibilityTest: z.string().optional(),
  NWM_SoilTestDate: z.string().optional(),
  NWM_SoilType: z.string().optional(),
  NWM_SpaceRentIncludes: z.string().optional(),
  NWM_SpecialAssessment: z.string().optional(),
  NWM_SpecialAssessmentAmount: z.string().optional(),
  NWM_SquareFootageFinished: z.string().optional(),
  NWM_SquareFootageUnfinished: z.string().optional(),
  NWM_Storage: z.string().optional(),
  NWM_StorageLocation: z.string().optional(),
  NWM_StorageNo: z.string().optional(),
  NWM_StorageSize: z.string().optional(),
  NWM_StyleCode: z.string().optional(),
  NWM_Survey: z.string().optional(),
  NWM_TermsAndConditions: z.string().optional(),
  NWM_TermsAndConditionsComments: z.string().optional(),
  NWM_ThirdPartyApproval: z.string().optional(),
  NWM_TillAcres: z.string().optional(),
  NWM_TitleCompany: z.string().optional(),
  NWM_TotalAssessedValue: z.string().optional(),
  NWM_TotalDwellingSqFt: z.string().optional(),
  NWM_TotalExpenses: z.string().optional(),
  NWM_TotalMonthlyIncome: z.string().optional(),
  NWM_TotalMonthlyTripleNet: z.string().optional(),
  NWM_TotalSqftRented: z.string().optional(),
  NWM_TurnOver: z.string().optional(),
  NWM_TypeOfProperty: z.string().optional(),
  NWM_UnitFeatures: z.string().optional(),
  NWM_UnitsBelowGrade: z.string().optional(),
  NWM_UnitsInBuildingTotal: z.string().optional(),
  NWM_VacancyRate: z.string().optional(),
  NWM_ViewComments: z.string().optional(),
  NWM_ViewFrom: z.string().optional(),
  NWM_VirtuallyStaged: z.string().optional(),
  NWM_VirtualTourURLDescription: z.string().optional(),
  NWM_VirtualTourURLDescription2: z.string().optional(),
  NWM_VirtualTourURLDescription3: z.string().optional(),
  NWM_VirtualTourURLUnbranded2: z.string().optional(),
  NWM_VirtualTourURLUnbranded3: z.string().optional(),
  NWM_WaterAccess: z.string().optional(),
  NWM_WaterCompany: z.string().optional(),
  NWM_WaterfrontFootage: z.string().optional(),
  NWM_WaterHeaterLocation: z.string().optional(),
  NWM_WaterHeaterType: z.string().optional(),
  NWM_WaterJurisdiction: z.string().optional(),
  NWM_WaterSewerGarbage: z.string().optional(),
  NWM_WeekAssignment: z.string().optional(),
  NWM_WindowCoverings: z.string().optional(),
  NWM_YearValueAssessed: z.string().optional(),
  NWM_ZoningJurisdiction: z.string().optional(),
});
export type NWM_Property = z.infer<typeof NWM_PropertySchema>;
