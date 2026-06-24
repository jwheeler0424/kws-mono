import { sql } from 'drizzle-orm';
import { boolean, index, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import type { NWM_OpenHouse } from '@/types/property';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';
import { properties } from './properties.schema';

// ---------------------------------------------------------------------------
// open_houses
// ---------------------------------------------------------------------------

export const openHouses = pgTable(
  'open_houses',
  {
    openHouseKey: varchar('open_house_key', { length: 255 }).primaryKey(),
    listingKey: varchar('listing_key', { length: 64 }).references(() => properties.listingKey, {
      onDelete: 'cascade',
    }),
    listingId: varchar('listing_id', { length: 255 }),
    mlgCanUse: varchar('mlg_can_use', { length: 1024 }).array().default([]),
    originatingSystemName: varchar('originating_system_name', {
      length: 255,
    }).default('nwmls'),

    openHouseDate: timestamp('open_house_date', { withTimezone: true }),
    openHouseStartTime: timestamp('open_house_start_time', {
      withTimezone: true,
    }),
    openHouseEndTime: timestamp('open_house_end_time', { withTimezone: true }),
    openHouseRemarks: varchar('open_house_remarks', { length: 500 }),
    openHouseType: varchar('open_house_type', { length: 25 }),
    refreshments: varchar('refreshments', { length: 255 }),

    modificationTimestamp: timestamp('modification_timestamp', {
      withTimezone: true,
    }),
    mlgCanView: boolean('mlg_can_view').default(true),

    // ---- NWMLS Local Metadata ----
    NWM: jsonb('nwm').$type<NWM_OpenHouse>(),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['listing_key', 'listing_id'])
      .weight('A')
      .cols(['open_house_remarks', 'open_house_type'])
      .weight('B')
      .cols(['refreshments'])
      .weight('C')
      .cols(['mlg_can_use'])
      .weight('C')
      .array(),
  },
  (t) => [
    index('idx_open_houses_listing_key').on(t.listingKey),
    index('idx_open_houses_date').on(t.openHouseDate),
    index('idx_open_houses_sync').on(t.originatingSystemName, t.modificationTimestamp),
    // Reconciliation hot path: unresolved open houses for active records.
    index('idx_open_houses_missing_listing_active')
      .on(t.originatingSystemName, t.openHouseKey)
      .where(sql`${t.listingKey} IS NULL AND ${t.mlgCanView} = true AND ${t.deletedAt} IS NULL`),
    index('idx_open_houses_mlg_can_use').on(t.mlgCanUse),
    index('idx_open_houses_search_vector').using('gin', t.searchVector),
  ],
);

/*
*** REFERENCE OData EDMX for Open Houses from RESO Web API ***
<EntityType Name="OpenHouse">
    <Key>
        <PropertyRef Name="OpenHouseKey"/>
    </Key>
    <Property Name="ListingId" Type="Edm.String" MaxLength="255"/>
    <Property Name="ListingKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="MlgCanUse" Type="Collection(Edm.String)" MaxLength="1024">
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Allowed use case groups"/>
        <Annotation String="https://docs.mlsgrid.com/#mlgcanuse" Term="MLSGRID.Docs"/>
    </Property>
    <Property Name="MlgCanView" Type="Edm.Boolean" >
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Delete flag"/>
    </Property>
    <Property Name="ModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
    <Property Name="OpenHouseDate" Type="Edm.Date" />
    <Property Name="OpenHouseEndTime" Type="Edm.DateTimeOffset" />
    <Property Name="OpenHouseKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="OpenHouseRemarks" Type="Edm.String" MaxLength="500"/>
    <Property Name="OpenHouseStartTime" Type="Edm.DateTimeOffset" />
    <Property Name="OpenHouseType" Type="Edm.String" MaxLength="25">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="OpenHouseType"/>
    </Property>
    <Property Name="OriginatingSystemName" Type="Edm.String" MaxLength="255"/>
    <Property Name="Refreshments" Type="Edm.String" MaxLength="255"/>
</EntityType>
 */
