import { boolean, index, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// offices
// ---------------------------------------------------------------------------

export const offices = pgTable(
  'offices',
  {
    officeMlsId: varchar('office_mls_id', { length: 25 }).primaryKey(),
    mainOfficeKey: varchar('main_office_key', { length: 255 }),
    mainOfficeMlsId: varchar('main_office_mls_id', { length: 25 }),
    mlgCanUse: varchar('mlg_can_use', { length: 1024 }).array().default([]),
    mlgCanView: boolean('mlg_can_view').default(true),
    modificationTimestamp: timestamp('modification_timestamp', {
      withTimezone: true,
      mode: 'string',
    }),

    officeAddress1: varchar('office_address1', { length: 50 }),
    officeAddress2: varchar('office_address2', { length: 50 }),
    officeBrokerKey: varchar('office_broker_key', { length: 255 }),
    officeBrokerMlsId: varchar('office_broker_mls_id', { length: 25 }),
    officeCity: varchar('office_city', { length: 50 }),
    officeCountyOrParish: varchar('office_county_or_parish', { length: 50 }),
    officeEmail: varchar('office_email', { length: 80 }),
    officeFax: varchar('office_fax', { length: 16 }),
    officeKey: varchar('office_key', { length: 255 }),
    officeName: varchar('office_name', { length: 255 }),
    officePhone: varchar('office_phone', { length: 16 }),
    officePostalCode: varchar('office_postal_code', { length: 10 }),
    officePostalCodePlus4: varchar('office_postal_code_plus_4', { length: 4 }),
    officeStateOrProvince: varchar('office_state_or_province', { length: 2 }),
    officeStatus: varchar('office_status', { length: 25 }),

    originatingSystemName: varchar('originating_system_name', {
      length: 255,
    }).default('nwmls'),
    photosChangeTimestamp: timestamp('photos_change_timestamp', {
      withTimezone: true,
      mode: 'string',
    }),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['office_name', 'office_mls_id', 'main_office_mls_id'])
      .weight('A')
      .cols([
        'office_address1',
        'office_address2',
        'office_city',
        'office_state_or_province',
        'office_postal_code',
        'office_postal_code_plus_4',
      ])
      .weight('B')
      .cols(['office_email', 'office_phone', 'office_status', 'office_broker_mls_id', 'office_key'])
      .weight('C'),
  },
  (t) => [
    index('idx_offices_sync').on(t.originatingSystemName, t.modificationTimestamp),
    index('idx_offices_name').on(t.officeName),
    index('idx_offices_key').on(t.officeKey),
    index('idx_offices_search_vector').using('gin', t.searchVector),
  ],
);

export type TMlsOffice = typeof offices.$inferSelect;

/*
*** REFERENCE OData EDMX for Offices from RESO Web API ***
<EntityType Name="Office">
  <Key>
      <PropertyRef Name="OfficeMlsId"/>
  </Key>
  <Property Name="MainOfficeKey" Type="Edm.String" MaxLength="255"/>
  <Property Name="MainOfficeMlsId" Type="Edm.String" MaxLength="25"/>
  <Property Name="MlgCanUse" Type="Collection(Edm.String)" MaxLength="1024">
      <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Allowed use case groups"/>
      <Annotation String="https://docs.mlsgrid.com/#mlgcanuse" Term="MLSGRID.Docs"/>
  </Property>
  <Property Name="MlgCanView" Type="Edm.Boolean" >
      <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Delete flag"/>
  </Property>
  <Property Name="ModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
  <Property Name="OfficeAddress1" Type="Edm.String" MaxLength="50"/>
  <Property Name="OfficeBrokerKey" Type="Edm.String" MaxLength="255"/>
  <Property Name="OfficeBrokerMlsId" Type="Edm.String" MaxLength="25"/>
  <Property Name="OfficeCity" Type="Edm.String" MaxLength="50"/>
  <Property Name="OfficeCountyOrParish" Type="Edm.String" MaxLength="50">
      <Annotation Term="RESO.OData.Metadata.LookupName" String="County"/>
  </Property>
  <Property Name="OfficeEmail" Type="Edm.String" MaxLength="80"/>
  <Property Name="OfficeFax" Type="Edm.String" MaxLength="16"/>
  <Property Name="OfficeKey" Type="Edm.String" MaxLength="255"/>
  <Property Name="OfficeMlsId" Type="Edm.String" MaxLength="25"/>
  <Property Name="OfficeName" Type="Edm.String" MaxLength="255"/>
  <Property Name="OfficePhone" Type="Edm.String" MaxLength="16"/>
  <Property Name="OfficePostalCode" Type="Edm.String" MaxLength="10"/>
  <Property Name="OfficePostalCodePlus4" Type="Edm.String" MaxLength="4"/>
  <Property Name="OfficeStateOrProvince" Type="Edm.String" MaxLength="2">
      <Annotation Term="RESO.OData.Metadata.LookupName" String="StateOrProvince"/>
  </Property>
  <Property Name="OfficeStatus" Type="Edm.String" MaxLength="25">
      <Annotation Term="RESO.OData.Metadata.LookupName" String="OfficeStatus"/>
  </Property>
  <Property Name="OriginatingSystemName" Type="Edm.String" MaxLength="255"/>
  <Property Name="PhotosChangeTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
  <NavigationProperty Name="Media" Type="Collection(com.mlsgrid.metadata.Media)" />
</EntityType>
 */
