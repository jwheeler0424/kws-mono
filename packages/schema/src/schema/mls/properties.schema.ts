import { sql } from 'drizzle-orm';
import {
    boolean,
    index,
    integer,
    jsonb,
    numeric,
    pgEnum,
    pgTable,
    real,
    text,
    timestamp,
    varchar,
} from 'drizzle-orm/pg-core';

import type { NWM_Property } from '../types';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const standardStatusEnum = pgEnum('standard_status', [
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
]);

export const propertyTypeEnum = pgEnum('property_type', [
    'BusinessOpportunity',
    'CommercialLease',
    'CommercialSale',
    'Farm',
    'Land',
    'ManufacturedInPark',
    'Residential',
    'ResidentialIncome',
    'ResidentialLease',
]);

// ---------------------------------------------------------------------------
// properties
// ---------------------------------------------------------------------------
// Core RESO 1.7 Property resource. Array fields stored as text[].
// NWMLS-specific (NWM_ prefixed) fields stored in properties_metadata table.
// Unknown / future RESO fields stored in extended_fields JSONB.
// ---------------------------------------------------------------------------

export const properties = pgTable(
    'properties',
    {
        // ---- MLS Grid identifiers ----
        listingKey: varchar('listing_key', { length: 64 }).primaryKey(),
        listingId: varchar('listing_id', { length: 64 }),
        originatingSystemName: varchar('originating_system_name', { length: 32 })
            .notNull()
            .default('nwmls'),

        // ---- Status & classification ----
        standardStatus: standardStatusEnum('standard_status'),
        mlsStatus: varchar('mls_status', { length: 64 }),
        propertyType: propertyTypeEnum('property_type'),
        propertySubType: varchar('property_sub_type', { length: 128 }),

        // ---- Sync / visibility ----
        mlgCanView: boolean('mlg_can_view').notNull().default(true),
        modificationTimestamp: timestamp('modification_timestamp', {
            withTimezone: true,
        }),
        originalEntryTimestamp: timestamp('original_entry_timestamp', {
            withTimezone: true,
        }),
        majorChangeTimestamp: timestamp('major_change_timestamp', {
            withTimezone: true,
        }),
        majorChangeType: varchar('major_change_type', { length: 128 }),
        photosChangeTimestamp: timestamp('photos_change_timestamp', {
            withTimezone: true,
        }),
        statusChangeTimestamp: timestamp('status_change_timestamp', {
            withTimezone: true,
        }),
        priceChangeTimestamp: timestamp('price_change_timestamp', {
            withTimezone: true,
        }),
        contractStatusChangeDate: timestamp('contract_status_change_date', {
            withTimezone: true,
        }),
        purchaseContractDate: timestamp('purchase_contract_date', {
            withTimezone: true,
        }),
        offMarketDate: timestamp('off_market_date', { withTimezone: true }),
        closingDate: timestamp('closing_date', { withTimezone: true }),
        internetAddressDisplayYN: boolean('internet_address_display_yn').default(true),
        internetAutomatedValuationDisplayYN: boolean('internet_automated_valuation_display_yn').default(
            true,
        ),
        availabilityDate: timestamp('availability_date', { withTimezone: true }),
        contingentDate: timestamp('contingent_date', { withTimezone: true }),
        closeDate: timestamp('close_date', { withTimezone: true }),
        onMarketDate: timestamp('on_market_date', { withTimezone: true }),
        cumulativeDaysOnMarket: integer('cumulative_days_on_market'),
        originatingSystemModificationTimestamp: timestamp('originating_system_modification_timestamp', {
            withTimezone: true,
        }),
        internetConsumerCommentYN: boolean('internet_consumer_comment_yn'),
        internetEntireListingDisplayYN: boolean('internet_entire_listing_display_yn'),
        mlgCanUse: text('mlg_can_use').array(),
        sourceSystemName: varchar('source_system_name', { length: 255 }),

        // ---- Address ----
        unparsedAddress: text('unparsed_address'),
        streetNumber: varchar('street_number', { length: 32 }),
        streetNumberNumeric: integer('street_number_numeric'),
        streetDirPrefix: varchar('street_dir_prefix', { length: 16 }),
        streetName: varchar('street_name', { length: 128 }),
        streetSuffix: varchar('street_suffix', { length: 32 }),
        streetDirSuffix: varchar('street_dir_suffix', { length: 16 }),
        unitNumber: varchar('unit_number', { length: 32 }),
        city: varchar('city', { length: 128 }),
        stateOrProvince: varchar('state_or_province', { length: 32 }),
        postalCode: varchar('postal_code', { length: 16 }),
        postalCodePlus4: varchar('postal_code_plus4', { length: 4 }),
        country: varchar('country', { length: 8 }).default('US'),
        countyOrParish: varchar('county_or_parish', { length: 128 }),
        subdivisionName: varchar('subdivision_name', { length: 256 }),
        mlsAreaMajor: varchar('mls_area_major', { length: 64 }),
        mlsAreaMinor: varchar('mls_area_minor', { length: 64 }),
        directions: text('directions'),

        // ---- Geo ----
        latitude: real('latitude'),
        longitude: real('longitude'),

        // ---- H3 spatial index ----
        // Computed from lat/lng at import + sync time. Never null when lat/lng is set.
        // h3R6: district level  (~36 km²  — city/large neighborhood)
        // h3R7: neighborhood    (~5.2 km² — walkable neighborhood)
        // h3R8: block level     (~0.74 km² — block/micro-neighborhood)
        h3R6: varchar('h3_r6', { length: 20 }),
        h3R7: varchar('h3_r7', { length: 20 }),
        h3R8: varchar('h3_r8', { length: 20 }),

        // ---- Pricing ----
        listPrice: numeric('list_price', { precision: 14, scale: 2 }),
        listPriceLow: numeric('list_price_low', { precision: 14, scale: 2 }),
        originalListPrice: numeric('original_list_price', {
            precision: 14,
            scale: 2,
        }),
        previousListPrice: numeric('previous_list_price', {
            precision: 14,
            scale: 2,
        }),
        closePrice: numeric('close_price', { precision: 14, scale: 2 }),
        taxAssessedValue: numeric('tax_assessed_value', {
            precision: 14,
            scale: 2,
        }),

        // ---- Property characteristics ----
        bedroomsTotal: integer('bedrooms_total'),
        bathroomsFull: integer('bathrooms_full'),
        bathroomsHalf: integer('bathrooms_half'),
        bathroomsThreeQuarter: integer('bathrooms_three_quarter'),
        bathroomsOneQuarter: integer('bathrooms_one_quarter'),
        bathroomsTotalInteger: integer('bathrooms_total_integer'),
        roomsTotal: integer('rooms_total'),
        storiesTotal: integer('stories_total'),
        levels: text('levels').array(), // multi-value
        garageSpaces: integer('garage_spaces'),
        parkingTotal: integer('parking_total'),
        additionalParcelsDescription: varchar('additional_parcels_description', { length: 255 }),
        bedroomsPossible: integer('bedrooms_possible'),
        bodyType: text('body_type').array(),
        carportSpaces: numeric('carport_spaces', { precision: 13, scale: 2 }),
        carportYN: boolean('carport_yn'),
        coveredSpaces: numeric('covered_spaces', { precision: 13, scale: 2 }),
        openParkingSpaces: numeric('open_parking_spaces', { precision: 13, scale: 2 }),
        mainLevelBathrooms: integer('main_level_bathrooms'),
        mainLevelBedrooms: integer('main_level_bedrooms'),

        // ---- Size ----
        livingArea: numeric('living_area', { precision: 14, scale: 2 }),
        livingAreaUnits: varchar('living_area_units', { length: 32 }),
        lotSizeAcres: numeric('lot_size_acres', { precision: 10, scale: 4 }),
        lotSizeSquareFeet: numeric('lot_size_square_feet', {
            precision: 12,
            scale: 2,
        }),
        buildingAreaTotal: numeric('building_area_total', {
            precision: 14,
            scale: 2,
        }),
        aboveGradeFinishedArea: numeric('above_grade_finished_area', {
            precision: 14,
            scale: 2,
        }),
        belowGradeFinishedArea: numeric('below_grade_finished_area', {
            precision: 14,
            scale: 2,
        }),
        lotSizeDimensions: varchar('lot_size_dimensions', { length: 150 }),
        lotSizeUnits: varchar('lot_size_units', { length: 25 }),
        leasableArea: numeric('leasable_area', { precision: 13, scale: 2 }),
        leasableAreaUnits: varchar('leasable_area_units', { length: 25 }),
        numberOfUnitsInCommunity: integer('number_of_units_in_community'),
        numberOfUnitsTotal: integer('number_of_units_total'),

        // ---- Building details ----
        yearBuilt: integer('year_built'),
        yearBuiltSource: varchar('year_built_source', { length: 64 }),
        newConstructionYN: boolean('new_construction_yn'),
        propertyCondition: text('property_condition').array(),
        architecturalStyle: text('architectural_style').array(),
        constructionMaterials: text('construction_materials').array(),
        foundationDetails: text('foundation_details').array(),
        roof: text('roof').array(),
        commonWalls: text('common_walls').array(),
        builderName: varchar('builder_name', { length: 50 }),
        buildingAreaUnits: varchar('building_area_units', { length: 25 }),
        buildingFeatures: text('building_features').array(),
        buildingName: varchar('building_name', { length: 50 }),
        yearBuiltEffective: integer('year_built_effective'),
        yearEstablished: integer('year_established'),
        yearsCurrentOwner: integer('years_current_owner'),
        make: varchar('make', { length: 50 }),
        model: varchar('model', { length: 50 }),
        mobileHomeRemainsYN: boolean('mobile_home_remains_yn'),

        // ---- Systems ----
        heating: text('heating').array(),
        cooling: text('cooling').array(),
        electric: text('electric').array(),
        waterSource: text('water_source').array(),
        sewer: text('sewer').array(),
        utilities: text('utilities').array(),
        coolingYN: boolean('cooling_yn'),
        electricOnPropertyYN: boolean('electric_on_property_yn'),
        heatingYN: boolean('heating_yn'),
        irrigationSource: text('irrigation_source').array(),
        irrigationWaterRightsYN: boolean('irrigation_water_rights_yn'),
        leaseAssignableYN: boolean('lease_assignable_yn'),
        operatingExpenseIncludes: text('operating_expense_includes').array(),
        powerProductionType: text('power_production_type').array(),

        // ---- Interior ----
        interiorFeatures: text('interior_features').array(),
        flooring: text('flooring').array(),
        appliances: text('appliances').array(),
        fireplaceFeatures: text('fireplace_features').array(),
        fireplaceYN: boolean('fireplace_yn'),
        fireplacesTotal: integer('fireplaces_total'),
        laundryFeatures: text('laundry_features').array(),
        windowFeatures: text('window_features').array(),
        accessibilityFeatures: text('accessibility_features').array(),
        entryLocation: varchar('entry_location', { length: 50 }),
        furnished: varchar('furnished', { length: 50 }),
        inclusions: text('inclusions'),
        otherEquipment: text('other_equipment').array(),
        petsAllowed: text('pets_allowed').array(),
        possession: text('possession').array(),
        securityFeatures: text('security_features').array(),
        skirt: text('skirt').array(),
        specialLicenses: text('special_licenses').array(),

        // ---- Exterior ----
        exteriorFeatures: text('exterior_features').array(),
        patioAndPorchFeatures: text('patio_and_porch_features').array(),
        fencing: text('fencing').array(),
        otherStructures: text('other_structures').array(),
        lotFeatures: text('lot_features').array(),
        frontageType: text('frontage_type').array(),
        view: text('view').array(),
        waterfrontYN: boolean('waterfront_yn'),
        waterfrontFeatures: text('waterfront_features').array(),
        poolPrivateYN: boolean('pool_private_yn'),
        poolFeatures: text('pool_features').array(),
        spaFeatures: text('spa_features').array(),
        horseYN: boolean('horse_yn'),
        directionFaces: varchar('direction_faces', { length: 25 }),
        elevation: integer('elevation'),
        elevationUnits: varchar('elevation_units', { length: 10 }),
        possibleUse: text('possible_use').array(),
        roadResponsibility: text('road_responsibility').array(),
        roadSurfaceType: text('road_surface_type').array(),
        signOnPropertyYN: boolean('sign_on_property_yn'),
        spaYN: boolean('spa_yn'),
        structureType: text('structure_type').array(),
        topography: varchar('topography', { length: 255 }),
        vegetation: text('vegetation').array(),
        viewYN: boolean('view_yn'),
        zoning: varchar('zoning', { length: 25 }),
        zoningDescription: varchar('zoning_description', { length: 255 }),

        // ---- Community / HOA ----
        communityFeatures: text('community_features').array(),
        seniorCommunityYN: boolean('senior_community_yn'),
        associationYN: boolean('association_yn'),
        associationName: varchar('association_name', { length: 256 }),
        associationFee: numeric('association_fee', { precision: 14, scale: 2 }),
        associationFeeFrequency: varchar('association_fee_frequency', {
            length: 64,
        }),
        associationFeeIncludes: text('association_fee_includes').array(),
        associationAmenities: text('association_amenities').array(),
        associationPhone: varchar('association_phone', { length: 32 }),
        associationEmail: varchar('association_email', { length: 256 }),

        // ---- Schools ----
        elementarySchool: varchar('elementary_school', { length: 128 }),
        middleOrJuniorSchool: varchar('middle_or_junior_school', { length: 128 }),
        highSchool: varchar('high_school', { length: 128 }),
        elementarySchoolDistrict: varchar('elementary_school_district', {
            length: 128,
        }),
        middleOrJuniorSchoolDistrict: varchar('middle_or_junior_school_district', {
            length: 128,
        }),
        highSchoolDistrict: varchar('high_school_district', { length: 128 }),

        // ---- Financials ----
        taxYear: integer('tax_year'),
        taxLegalDescription: text('tax_legal_description'),
        parcelNumber: varchar('parcel_number', { length: 128 }),
        taxMapNumber: varchar('tax_map_number', { length: 64 }),
        listingTerms: text('listing_terms').array(),
        buyerFinancing: text('buyer_financing').array(),
        currentFinancing: text('current_financing').array(),
        specialListingConditions: text('special_listing_conditions').array(),
        listingContractDate: timestamp('listing_contract_date', {
            withTimezone: true,
        }),
        expirationDate: timestamp('expiration_date', { withTimezone: true }),
        leaseExpiration: timestamp('lease_expiration', { withTimezone: true }),
        rentIncludes: text('rent_includes').array(),
        capRate: numeric('cap_rate', { precision: 13, scale: 2 }),
        electricExpense: numeric('electric_expense', { precision: 13, scale: 2 }),
        fuelExpense: numeric('fuel_expense', { precision: 13, scale: 2 }),
        grossScheduledIncome: numeric('gross_scheduled_income', { precision: 13, scale: 2 }),
        insuranceExpense: numeric('insurance_expense', { precision: 13, scale: 2 }),
        landLeaseAmount: numeric('land_lease_amount', { precision: 13, scale: 2 }),
        landLeaseAmountFrequency: varchar('land_lease_amount_frequency', { length: 25 }),
        landLeaseYN: boolean('land_lease_yn'),
        netOperatingIncome: numeric('net_operating_income', { precision: 13, scale: 2 }),
        otherExpense: numeric('other_expense', { precision: 13, scale: 2 }),
        ownership: text('ownership'),
        taxAnnualAmount: numeric('tax_annual_amount', { precision: 13, scale: 2 }),
        totalActualRent: numeric('total_actual_rent', { precision: 13, scale: 2 }),

        // ---- Agent / Office ----
        listAgentKey: varchar('list_agent_key', { length: 64 }),
        listAgentMlsId: varchar('list_agent_mls_id', { length: 64 }),
        listAgentFullName: varchar('list_agent_full_name', { length: 256 }),
        listAgentEmail: varchar('list_agent_email', { length: 256 }),
        listAgentDirectPhone: varchar('list_agent_direct_phone', { length: 32 }),
        listOfficeKey: varchar('list_office_key', { length: 64 }),
        listOfficeMlsId: varchar('list_office_mls_id', { length: 64 }),
        listOfficeName: varchar('list_office_name', { length: 256 }),
        listOfficePhone: varchar('list_office_phone', { length: 32 }),
        coListAgentKey: varchar('co_list_agent_key', { length: 64 }),
        coListAgentMlsId: varchar('co_list_agent_mls_id', { length: 64 }),
        coListAgentFullName: varchar('co_list_agent_full_name', { length: 256 }),
        buyerAgentKey: varchar('buyer_agent_key', { length: 64 }),
        buyerAgentMlsId: varchar('buyer_agent_mls_id', { length: 64 }),
        buyerAgentFullName: varchar('buyer_agent_full_name', { length: 256 }),
        buyerAgentOfficePhone: varchar('buyer_agent_office_phone', { length: 16 }),
        buyerAgentOfficePhoneExt: varchar('buyer_agent_office_phone_ext', { length: 10 }),
        buyerOfficeKey: varchar('buyer_office_key', { length: 64 }),
        buyerOfficeMlsId: varchar('buyer_office_mls_id', { length: 64 }),
        buyerOfficeName: varchar('buyer_office_name', { length: 256 }),
        buyerOfficePhone: varchar('buyer_office_phone', { length: 16 }),
        buyerOfficePhoneExt: varchar('buyer_office_phone_ext', { length: 10 }),
        coBuyerAgentFullName: varchar('co_buyer_agent_full_name', { length: 150 }),
        coBuyerAgentKey: varchar('co_buyer_agent_key', { length: 255 }),
        coBuyerAgentMlsId: varchar('co_buyer_agent_mls_id', { length: 25 }),
        coBuyerOfficeKey: varchar('co_buyer_office_key', { length: 255 }),
        coBuyerOfficeMlsId: varchar('co_buyer_office_mls_id', { length: 25 }),
        coBuyerOfficeName: varchar('co_buyer_office_name', { length: 255 }),
        coBuyerOfficePhone: varchar('co_buyer_office_phone', { length: 16 }),
        coBuyerOfficePhoneExt: varchar('co_buyer_office_phone_ext', { length: 10 }),
        coListOfficeKey: varchar('co_list_office_key', { length: 255 }),
        coListOfficeMlsId: varchar('co_list_office_mls_id', { length: 25 }),
        coListOfficeName: varchar('co_list_office_name', { length: 255 }),
        coListOfficePhone: varchar('co_list_office_phone', { length: 16 }),
        coListOfficePhoneExt: varchar('co_list_office_phone_ext', { length: 10 }),
        listOfficePhoneExt: varchar('list_office_phone_ext', { length: 10 }),

        // ---- Business / Manufactured home ----
        businessName: varchar('business_name', { length: 255 }),
        businessType: text('business_type').array(),
        parkManagerName: varchar('park_manager_name', { length: 50 }),
        parkManagerPhone: varchar('park_manager_phone', { length: 16 }),
        parkName: varchar('park_name', { length: 50 }),
        serialU: varchar('serial_u', { length: 25 }),

        // ---- Compensation ----
        buyerAgencyCompensation: varchar('buyer_agency_compensation', {
            length: 32,
        }),
        buyerAgencyCompensationType: varchar('buyer_agency_compensation_type', {
            length: 32,
        }),
        buyerBrokerageCompensation: varchar('buyer_brokerage_compensation', { length: 25 }),
        buyerBrokerageCompensationType: varchar('buyer_brokerage_compensation_type', { length: 25 }),

        // ---- Remarks ----
        publicRemarks: text('public_remarks'),
        privateRemarks: text('private_remarks'),
        syndicationRemarks: text('syndication_remarks'),
        syndicateTo: text('syndicate_to').array(),

        // ---- Media counts ----
        photosCount: integer('photos_count'),
        videosCount: integer('videos_count'),

        // ---- Virtual tours ----
        virtualTourURLUnbranded: text('virtual_tour_url_unbranded'),
        virtualTourURLBranded: text('virtual_tour_url_branded'),

        // ---- Parking ----
        parkingFeatures: text('parking_features').array(),
        garageYN: boolean('garage_yn'),
        attachedGarageYN: boolean('attached_garage_yn'),
        openParkingYN: boolean('open_parking_yn'),

        // ---- Basement ----
        basement: text('basement').array(),
        basementYN: boolean('basement_yn'),

        // ---- Green ----
        greenBuildingVerificationType: text('green_building_verification_type').array(),
        greenEnergyEfficient: text('green_energy_efficient').array(),
        greenEnergyGeneration: text('green_energy_generation').array(),

        // ---- NWMLS Local Metadata ----
        NWM: jsonb('nwm').$type<NWM_Property>(),

        // ---- Platform metadata ----
        featuredListingYN: boolean('featured_listing_yn').default(false),
        ...timestamps,
        ...softDelete,

        // ---- Full-text search vector ────────────────────────────────────────────
        // GENERATED ALWAYS AS STORED — PostgreSQL maintains this automatically on
        // every INSERT and UPDATE. No trigger, no backfill, no application code.
        //
        // Must be declared last so drizzle-kit emits ADD COLUMN for new source
        // columns before this one in incremental diff migrations.
        searchVector: tsvector('search_vector')
            .language('english')
            // A — exact property identifier (address, listing ID)
            .cols(['unparsed_address', 'listing_id'])
            .weight('A')
            // B — contextual (agent, office, classification, year)
            .cols(['property_sub_type', 'list_agent_full_name', 'list_office_name', 'year_built'])
            .weight('B')
            // C — feature arrays (each element individually searchable)
            .cols([
                'interior_features',
                'exterior_features',
                'appliances',
                'heating',
                'cooling',
                'community_features',
                'view',
                'waterfront_features',
                'lot_features',
                'construction_materials',
                'parking_features',
            ])
            .weight('C')
            .array()
            // D — descriptive text (public remarks)
            .cols(['public_remarks'])
            .weight('D'),
    },
    (t) => [
        index('idx_properties_property_type')
            .on(t.propertyType)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // Geo bounding box (kept for raw lat/lng queries)
        index('idx_properties_geo')
            .on(t.latitude, t.longitude)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // H3 spatial indexes — btree, used with = ANY(:cells) queries
        // These are the primary geo search indexes; much faster than bbox for
        // "near me" and area searches because they avoid lat/lng inequality scans.
        index('idx_properties_visible_h3_r8_status')
            .on(t.h3R8, t.standardStatus)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        index('idx_properties_visible_h3_r7_status')
            .on(t.h3R7, t.standardStatus)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // Active-only featured/status filtering path.
        index('idx_properties_visible_featured_status')
            .on(t.featuredListingYN, t.standardStatus, t.listingKey)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // Featured path is non-geo scoped; keep featured/status index above.
        // Sync cursor
        index('idx_properties_sync').on(t.originatingSystemName, t.modificationTimestamp),
        // Query acceleration for visibility/status + section sort path.
        index('idx_properties_visible_status_sort')
            .on(t.standardStatus, t.onMarketDate, t.modificationTimestamp, t.listingKey)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // Scoped office filtering + section sort path.
        index('idx_properties_visible_office_status_sort')
            .on(t.listOfficeMlsId, t.standardStatus, t.onMarketDate, t.modificationTimestamp, t.listingKey)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        // Scoped member filtering + section sort path.
        index('idx_properties_visible_member_status_sort')
            .on(t.listAgentMlsId, t.standardStatus, t.onMarketDate, t.modificationTimestamp, t.listingKey)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
        index('idx_properties_visible_search_vector')
            .using('gin', t.searchVector)
            .where(sql`${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
    ],
);


/*
*** REFERENCE OData EDMX for Properties from RESO Web API ***
<EntityType Name="Property">
<Key>
    <PropertyRef Name="ListingId"/>
</Key>
<Property Name="AccessibilityFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AccessibilityFeatures"/>
</Property>
<Property Name="AdditionalParcelsDescription" Type="Edm.String" MaxLength="255"/>
<Property Name="Appliances" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Appliances"/>
</Property>
<Property Name="ArchitecturalStyle" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="ArchitecturalStyle"/>
</Property>
<Property Name="AssociationAmenities" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AssociationAmenities"/>
</Property>
<Property Name="AssociationFee" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="AssociationFeeFrequency" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="FeeFrequency"/>
</Property>
<Property Name="AssociationFeeIncludes" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AssociationFeeIncludes"/>
</Property>
<Property Name="AssociationYN" Type="Edm.Boolean" />
<Property Name="AttachedGarageYN" Type="Edm.Boolean" />
<Property Name="AvailabilityDate" Type="Edm.Date" />
<Property Name="Basement" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Basement"/>
</Property>
<Property Name="BathroomsFull" Type="Edm.Int16" Precision="3"/>
<Property Name="BathroomsHalf" Type="Edm.Int16" Precision="3"/>
<Property Name="BathroomsThreeQuarter" Type="Edm.Int16" Precision="3"/>
<Property Name="BathroomsTotalInteger" Type="Edm.Int16" Precision="3"/>
<Property Name="BedroomsPossible" Type="Edm.Int16" Precision="3"/>
<Property Name="BedroomsTotal" Type="Edm.Int16" Precision="3"/>
<Property Name="BodyType" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="BodyType"/>
</Property>
<Property Name="BuilderName" Type="Edm.String" MaxLength="50"/>
<Property Name="BuildingAreaTotal" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="BuildingAreaUnits" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AreaUnits"/>
</Property>
<Property Name="BuildingFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="BuildingFeatures"/>
</Property>
<Property Name="BuildingName" Type="Edm.String" MaxLength="50"/>
<Property Name="BusinessName" Type="Edm.String" MaxLength="255"/>
<Property Name="BusinessType" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="BusinessType"/>
</Property>
<Property Name="BuyerAgentFullName" Type="Edm.String" MaxLength="150"/>
<Property Name="BuyerAgentKey" Type="Edm.String" MaxLength="255"/>
<Property Name="BuyerAgentMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="BuyerAgentOfficePhone" Type="Edm.String" MaxLength="16"/>
<Property Name="BuyerAgentOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
<Property Name="BuyerBrokerageCompensation" Type="Edm.String" MaxLength="25"/>
<Property Name="BuyerBrokerageCompensationType" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="CompensationType"/>
</Property>
<Property Name="BuyerOfficeKey" Type="Edm.String" MaxLength="255"/>
<Property Name="BuyerOfficeMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="BuyerOfficeName" Type="Edm.String" MaxLength="255"/>
<Property Name="BuyerOfficePhone" Type="Edm.String" MaxLength="16"/>
<Property Name="BuyerOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
<Property Name="CapRate" Type="Edm.Decimal" Precision="4" Scale="2"/>
<Property Name="CarportSpaces" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="CarportYN" Type="Edm.Boolean" />
<Property Name="City" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="City"/>
</Property>
<Property Name="CloseDate" Type="Edm.Date" />
<Property Name="ClosePrice" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="CoBuyerAgentFullName" Type="Edm.String" MaxLength="150"/>
<Property Name="CoBuyerAgentKey" Type="Edm.String" MaxLength="255"/>
<Property Name="CoBuyerAgentMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="CoBuyerOfficeKey" Type="Edm.String" MaxLength="255"/>
<Property Name="CoBuyerOfficeMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="CoBuyerOfficeName" Type="Edm.String" MaxLength="255"/>
<Property Name="CoBuyerOfficePhone" Type="Edm.String" MaxLength="16"/>
<Property Name="CoBuyerOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
<Property Name="CoListAgentFullName" Type="Edm.String" MaxLength="150"/>
<Property Name="CoListAgentKey" Type="Edm.String" MaxLength="255"/>
<Property Name="CoListAgentMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="CoListOfficeKey" Type="Edm.String" MaxLength="255"/>
<Property Name="CoListOfficeMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="CoListOfficeName" Type="Edm.String" MaxLength="255"/>
<Property Name="CoListOfficePhone" Type="Edm.String" MaxLength="16"/>
<Property Name="CoListOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
<Property Name="CommunityFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="CommunityFeatures"/>
</Property>
<Property Name="ConstructionMaterials" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="ConstructionMaterials"/>
</Property>
<Property Name="ContingentDate" Type="Edm.Date" />
<Property Name="ContractStatusChangeDate" Type="Edm.Date" />
<Property Name="Cooling" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Cooling"/>
</Property>
<Property Name="CoolingYN" Type="Edm.Boolean" />
<Property Name="Country" Type="Edm.String" MaxLength="2">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Country"/>
</Property>
<Property Name="CountyOrParish" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="County"/>
</Property>
<Property Name="CoveredSpaces" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="CumulativeDaysOnMarket" Type="Edm.Int16" Precision="4"/>
<Property Name="DirectionFaces" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="DirectionFaces"/>
</Property>
<Property Name="Directions" Type="Edm.String" MaxLength="1024"/>
<Property Name="ElectricExpense" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="ElectricOnPropertyYN" Type="Edm.Boolean" />
<Property Name="ElementarySchool" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="School"/>
</Property>
<Property Name="Elevation" Type="Edm.Int16" Precision="5"/>
<Property Name="ElevationUnits" Type="Edm.String" MaxLength="10">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="LinearUnits"/>
</Property>
<Property Name="EntryLocation" Type="Edm.String" MaxLength="50"/>
<Property Name="ExteriorFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="ExteriorFeatures"/>
</Property>
<Property Name="Fencing" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Fencing"/>
</Property>
<Property Name="FireplaceFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="FireplaceFeatures"/>
</Property>
<Property Name="FireplacesTotal" Type="Edm.Int16" Precision="3"/>
<Property Name="FireplaceYN" Type="Edm.Boolean" />
<Property Name="Flooring" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Flooring"/>
</Property>
<Property Name="FoundationDetails" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="FoundationDetails"/>
</Property>
<Property Name="FuelExpense" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="Furnished" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Furnished"/>
</Property>
<Property Name="GarageSpaces" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="GarageYN" Type="Edm.Boolean" />
<Property Name="GreenBuildingVerificationType" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="GreenBuildingVerificationType"/>
</Property>
<Property Name="GreenEnergyEfficient" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="GreenEnergyEfficient"/>
</Property>
<Property Name="GreenEnergyGeneration" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="GreenEnergyGeneration"/>
</Property>
<Property Name="GrossScheduledIncome" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="Heating" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Heating"/>
</Property>
<Property Name="HeatingYN" Type="Edm.Boolean" />
<Property Name="HighSchool" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="School"/>
</Property>
<Property Name="HighSchoolDistrict" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="SchoolDistrict"/>
</Property>
<Property Name="Inclusions" Type="Edm.String" MaxLength="1024"/>
<Property Name="InsuranceExpense" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="InteriorFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="InteriorOrRoomFeatures"/>
</Property>
<Property Name="InternetAddressDisplayYN" Type="Edm.Boolean" />
<Property Name="InternetAutomatedValuationDisplayYN" Type="Edm.Boolean" />
<Property Name="InternetConsumerCommentYN" Type="Edm.Boolean" />
<Property Name="InternetEntireListingDisplayYN" Type="Edm.Boolean" />
<Property Name="IrrigationSource" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="IrrigationSource"/>
</Property>
<Property Name="IrrigationWaterRightsYN" Type="Edm.Boolean" />
<Property Name="LandLeaseAmount" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="LandLeaseAmountFrequency" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="FeeFrequency"/>
</Property>
<Property Name="LandLeaseYN" Type="Edm.Boolean" />
<Property Name="Latitude" Type="Edm.Decimal" Precision="11" Scale="8"/>
<Property Name="LaundryFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="LaundryFeatures"/>
</Property>
<Property Name="LeasableArea" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="LeasableAreaUnits" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AreaUnits"/>
</Property>
<Property Name="LeaseAssignableYN" Type="Edm.Boolean" />
<Property Name="Levels" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Levels"/>
</Property>
<Property Name="ListAgentFullName" Type="Edm.String" MaxLength="150"/>
<Property Name="ListAgentKey" Type="Edm.String" MaxLength="255"/>
<Property Name="ListAgentMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="ListingContractDate" Type="Edm.Date" />
<Property Name="ListingId" Type="Edm.String" MaxLength="255"/>
<Property Name="ListingKey" Type="Edm.String" MaxLength="255"/>
<Property Name="ListingTerms" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="ListingTerms"/>
</Property>
<Property Name="ListOfficeKey" Type="Edm.String" MaxLength="255"/>
<Property Name="ListOfficeMlsId" Type="Edm.String" MaxLength="25"/>
<Property Name="ListOfficeName" Type="Edm.String" MaxLength="255"/>
<Property Name="ListOfficePhone" Type="Edm.String" MaxLength="16"/>
<Property Name="ListOfficePhoneExt" Type="Edm.String" MaxLength="10"/>
<Property Name="ListPrice" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="LivingArea" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="LivingAreaUnits" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="AreaUnits"/>
</Property>
<Property Name="Longitude" Type="Edm.Decimal" Precision="11" Scale="8"/>
<Property Name="LotFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="LotFeatures"/>
</Property>
<Property Name="LotSizeAcres" Type="Edm.Decimal" Precision="15" Scale="4"/>
<Property Name="LotSizeDimensions" Type="Edm.String" MaxLength="150"/>
<Property Name="LotSizeSquareFeet" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="LotSizeUnits" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="LotSizeUnits"/>
</Property>
<Property Name="MainLevelBathrooms" Type="Edm.Int16" Precision="3"/>
<Property Name="MainLevelBedrooms" Type="Edm.Int16" Precision="3"/>
<Property Name="Make" Type="Edm.String" MaxLength="50"/>
<Property Name="MiddleOrJuniorSchool" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="School"/>
</Property>
<Property Name="MlgCanUse" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Allowed use case groups"/>
    <Annotation String="https://docs.mlsgrid.com/#mlgcanuse" Term="MLSGRID.Docs"/>
</Property>
<Property Name="MlgCanView" Type="Edm.Boolean" >
    <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Delete flag"/>
</Property>
<Property Name="MLSAreaMajor" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="MLSAreaMajor"/>
</Property>
<Property Name="MlsStatus" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="MlsStatus"/>
</Property>
<Property Name="MobileHomeRemainsYN" Type="Edm.Boolean" />
<Property Name="Model" Type="Edm.String" MaxLength="50"/>
<Property Name="ModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
<Property Name="NetOperatingIncome" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="NewConstructionYN" Type="Edm.Boolean" />
<Property Name="NumberOfUnitsInCommunity" Type="Edm.Int16" Precision="5"/>
<Property Name="NumberOfUnitsTotal" Type="Edm.Int16" Precision="3"/>
<Property Name="OffMarketDate" Type="Edm.Date" />
<Property Name="OnMarketDate" Type="Edm.Date" />
<Property Name="OpenParkingSpaces" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="OpenParkingYN" Type="Edm.Boolean" />
<Property Name="OperatingExpenseIncludes" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="OperatingExpenseIncludes"/>
</Property>
<Property Name="OriginalListPrice" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="OriginatingSystemModificationTimestamp" Type="Edm.DateTimeOffset" >
    <Annotation Term="MLS.OData.Metadata.nwmls" String="ModificationTimestamp from the Originating System"/>
</Property>
<Property Name="OriginatingSystemName" Type="Edm.String" MaxLength="255"/>
<Property Name="OtherEquipment" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="OtherEquipment"/>
</Property>
<Property Name="OtherExpense" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="Ownership" Type="Edm.String" MaxLength="1024"/>
<Property Name="ParcelNumber" Type="Edm.String" MaxLength="50"/>
<Property Name="ParkingFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="ParkingFeatures"/>
</Property>
<Property Name="ParkingTotal" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="ParkManagerName" Type="Edm.String" MaxLength="50"/>
<Property Name="ParkManagerPhone" Type="Edm.String" MaxLength="16"/>
<Property Name="ParkName" Type="Edm.String" MaxLength="50"/>
<Property Name="PetsAllowed" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PetsAllowed"/>
</Property>
<Property Name="PhotosChangeTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
<Property Name="PhotosCount" Type="Edm.Int16" Precision="2"/>
<Property Name="PoolFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PoolFeatures"/>
</Property>
<Property Name="Possession" Type="Collection(Edm.String)" MaxLength="255">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Possession"/>
</Property>
<Property Name="PossibleUse" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="CurrentOrPossibleUse"/>
</Property>
<Property Name="PostalCode" Type="Edm.String" MaxLength="10"/>
<Property Name="PostalCodePlus4" Type="Edm.String" MaxLength="4"/>
<Property Name="PowerProductionType" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PowerProductionType"/>
</Property>
<Property Name="PropertyCondition" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PropertyCondition"/>
</Property>
<Property Name="PropertySubType" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PropertySubType"/>
</Property>
<Property Name="PropertyType" Type="Edm.String" MaxLength="50">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="PropertyType"/>
</Property>
<Property Name="PublicRemarks" Type="Edm.String" MaxLength="4000"/>
<Property Name="PurchaseContractDate" Type="Edm.Date" />
<Property Name="RentIncludes" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="RentIncludes"/>
</Property>
<Property Name="RoadResponsibility" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="RoadResponsibility"/>
</Property>
<Property Name="RoadSurfaceType" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="RoadSurfaceType"/>
</Property>
<Property Name="Roof" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Roof"/>
</Property>
<Property Name="SecurityFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="SecurityFeatures"/>
</Property>
<Property Name="SeniorCommunityYN" Type="Edm.Boolean" />
<Property Name="SerialU" Type="Edm.String" MaxLength="25"/>
<Property Name="Sewer" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Sewer"/>
</Property>
<Property Name="SignOnPropertyYN" Type="Edm.Boolean" />
<Property Name="Skirt" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Skirt"/>
</Property>
<Property Name="SourceSystemName" Type="Edm.String" MaxLength="255"/>
<Property Name="SpaYN" Type="Edm.Boolean" />
<Property Name="SpecialLicenses" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="SpecialLicenses"/>
</Property>
<Property Name="SpecialListingConditions" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="SpecialListingConditions"/>
</Property>
<Property Name="StandardStatus" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StandardStatus"/>
</Property>
<Property Name="StateOrProvince" Type="Edm.String" MaxLength="2">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StateOrProvince"/>
</Property>
<Property Name="StatusChangeTimestamp" Type="Edm.DateTimeOffset" />
<Property Name="StoriesTotal" Type="Edm.Int16" Precision="3"/>
<Property Name="StreetDirPrefix" Type="Edm.String" MaxLength="15">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StreetDirection"/>
</Property>
<Property Name="StreetDirSuffix" Type="Edm.String" MaxLength="15">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StreetDirection"/>
</Property>
<Property Name="StreetName" Type="Edm.String" MaxLength="50"/>
<Property Name="StreetNumber" Type="Edm.String" MaxLength="25"/>
<Property Name="StreetNumberNumeric" Type="Edm.Int32" Precision="10"/>
<Property Name="StreetSuffix" Type="Edm.String" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StreetSuffix"/>
</Property>
<Property Name="StructureType" Type="Collection(Edm.String)" MaxLength="25">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="StructureType"/>
</Property>
<Property Name="SubdivisionName" Type="Edm.String" MaxLength="50"/>
<Property Name="TaxAnnualAmount" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="TaxYear" Type="Edm.Int16" Precision="4"/>
<Property Name="Topography" Type="Edm.String" MaxLength="255"/>
<Property Name="TotalActualRent" Type="Edm.Decimal" Precision="13" Scale="2"/>
<Property Name="UnitNumber" Type="Edm.String" MaxLength="25"/>
<Property Name="UnparsedAddress" Type="Edm.String" MaxLength="255"/>
<Property Name="Utilities" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Utilities"/>
</Property>
<Property Name="Vegetation" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="Vegetation"/>
</Property>
<Property Name="View" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="View"/>
</Property>
<Property Name="ViewYN" Type="Edm.Boolean" />
<Property Name="VirtualTourURLUnbranded" Type="Edm.String" MaxLength="8000"/>
<Property Name="WaterfrontFeatures" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="WaterfrontFeatures"/>
</Property>
<Property Name="WaterfrontYN" Type="Edm.Boolean" />
<Property Name="WaterSource" Type="Collection(Edm.String)" MaxLength="1024">
    <Annotation Term="RESO.OData.Metadata.LookupName" String="WaterSource"/>
</Property>
<Property Name="YearBuilt" Type="Edm.Int16" Precision="4"/>
<Property Name="YearBuiltEffective" Type="Edm.Int16" Precision="4"/>
<Property Name="YearEstablished" Type="Edm.Int16" Precision="4"/>
<Property Name="YearsCurrentOwner" Type="Edm.Int16" Precision="4"/>
<Property Name="Zoning" Type="Edm.String" MaxLength="25"/>
<Property Name="ZoningDescription" Type="Edm.String" MaxLength="255"/>
<NavigationProperty Name="Media" Type="Collection(com.mlsgrid.metadata.Media)" />
<NavigationProperty Name="Rooms" Type="Collection(com.mlsgrid.metadata.PropertyRooms)" />
<NavigationProperty Name="UnitTypes" Type="Collection(com.mlsgrid.metadata.PropertyUnitTypes)" />
<NavigationProperty Name="LivableStructure" Type="Collection(com.mlsgrid.metadata.PropertyLivableStructure)" />
</EntityType>
 */
