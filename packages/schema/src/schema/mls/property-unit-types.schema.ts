import { index, integer, jsonb, numeric, pgTable, varchar } from 'drizzle-orm/pg-core';

import type { NWM_PropertyUnitType } from '../types';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';
import { properties } from './properties.schema';

// ---------------------------------------------------------------------------
// property_unit_types
// ---------------------------------------------------------------------------

export const propertyUnitTypes = pgTable(
  'property_unit_types',
  {
    unitTypeKey: varchar('unit_type_key', { length: 255 }).primaryKey(),
    listingKey: varchar('listing_key', { length: 64 })
      .notNull()
      .references(() => properties.listingKey, { onDelete: 'cascade' }),
    unitTypeBedsTotal: integer('unit_type_beds_total'),
    unitTypeBathsTotal: integer('unit_type_baths_total'),
    unitTypeActualRent: numeric('unit_type_actual_rent', {
      precision: 13,
      scale: 2,
    }),

    // ---- NWMLS Local Metadata ----
    NWM: jsonb('nwm').$type<NWM_PropertyUnitType>(),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['unit_type_key', 'listing_key'])
      .weight('A')
      .cols(['unit_type_beds_total', 'unit_type_baths_total', 'unit_type_actual_rent'])
      .weight('B'),
  },
  (t) => [
    index('idx_property_unit_types_listing_key').on(t.listingKey),
    index('idx_property_unit_types_search_vector').using('gin', t.searchVector),
  ],
);

/*
*** REFERENCE OData EDMX for Property Unit Types from RESO Web API ***
<EntityType Name="PropertyUnitTypes">
  <Key>
      <PropertyRef Name="UnitTypeKey"/>
  </Key>
  <Property Name="UnitTypeActualRent" Type="Edm.Decimal" Precision="13" Scale="2"/>
  <Property Name="UnitTypeBathsTotal" Type="Edm.Int16" Precision="3"/>
  <Property Name="UnitTypeBedsTotal" Type="Edm.Int16" Precision="3"/>
  <Property Name="UnitTypeKey" Type="Edm.String" MaxLength="255"/>
</EntityType>
 */
