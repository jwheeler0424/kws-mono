import { boolean, index, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';

// ---------------------------------------------------------------------------
// lookups
// ---------------------------------------------------------------------------

export const lookups = pgTable(
  'lookups',
  {
    lookupKey: varchar('lookup_key', { length: 255 }).primaryKey(),
    lookupName: varchar('lookup_name', { length: 255 }).notNull(),
    lookupValue: text('lookup_value'),
    standardLookupValue: text('standard_lookup_value'),
    mlgCanUse: varchar('mlg_can_use', { length: 1024 }).array().default([]),
    originatingSystemName: varchar('originating_system_name', {
      length: 255,
    }).default('nwmls'),
    modificationTimestamp: timestamp('modification_timestamp', {
      withTimezone: true,
    }),
    mlgCanView: boolean('mlg_can_view').default(true),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['lookup_name', 'lookup_key'])
      .weight('A')
      .cols(['lookup_value', 'standard_lookup_value'])
      .weight('B')
      .cols(['mlg_can_use'])
      .weight('C')
      .array(),
  },
  (t) => [
    index('idx_lookups_name').on(t.lookupName, t.originatingSystemName),
    index('idx_lookups_sync').on(t.originatingSystemName, t.modificationTimestamp),
    index('idx_lookups_search_vector').using('gin', t.searchVector),
  ],
);

/*
*** REFERENCE OData EDMX for Lookups from RESO Web API ***
<EntityType Name="Lookup">
    <Key>
        <PropertyRef Name="LookupKey"/>
    </Key>
    <Property Name="LookupKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="LookupName" Type="Edm.String" MaxLength="255">
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="The name of the lookup."/>
    </Property>
    <Property Name="LookupValue" Type="Edm.String" >
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="The human-friendly display name the data consumer receives in the payload and uses in queries."/>
    </Property>
    <Property Name="MlgCanUse" Type="Collection(Edm.String)" MaxLength="1024">
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Allowed use case groups"/>
        <Annotation String="https://docs.mlsgrid.com/#mlgcanuse" Term="MLSGRID.Docs"/>
    </Property>
    <Property Name="MlgCanView" Type="Edm.Boolean" >
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="Delete flag"/>
    </Property>
    <Property Name="ModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
    <Property Name="OriginatingSystemName" Type="Edm.String" MaxLength="255"/>
    <Property Name="StandardLookupValue" Type="Edm.String" >
        <Annotation Term="MLS.OData.Metadata.MLSGRID" String="The Data Dictionary LookupDisplayName of the enumerated value."/>
    </Property>
</EntityType>
 */
