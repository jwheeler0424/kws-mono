import { index, numeric, pgTable, varchar } from 'drizzle-orm/pg-core';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';
import { properties } from './properties.schema';

// ---------------------------------------------------------------------------
// property_rooms
// ---------------------------------------------------------------------------

export const propertyRooms = pgTable(
  'property_rooms',
  {
    roomKey: varchar('room_key', { length: 255 }).primaryKey(),
    listingKey: varchar('listing_key', { length: 64 })
      .notNull()
      .references(() => properties.listingKey, { onDelete: 'cascade' }),
    roomDescription: varchar('room_description', { length: 1024 }),
    roomDimensions: varchar('room_dimensions', { length: 50 }),
    roomLength: numeric('room_length', { precision: 13, scale: 2 }),
    roomLengthWidthUnits: varchar('room_length_width_units', { length: 25 }),
    roomLevel: varchar('room_level', { length: 25 }),
    roomType: varchar('room_type', { length: 1024 }),
    roomWidth: numeric('room_width', { precision: 13, scale: 2 }),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['room_key', 'listing_key', 'room_type'])
      .weight('A')
      .cols(['room_description', 'room_dimensions'])
      .weight('B')
      .cols(['room_level', 'room_length_width_units'])
      .weight('C'),
  },
  (t) => [
    index('idx_property_rooms_listing_key').on(t.listingKey),
    index('idx_property_rooms_search_vector').using('gin', t.searchVector),
  ],
);

/*
*** REFERENCE OData EDMX for Property Rooms from RESO Web API ***
<EntityType Name="PropertyRooms">
    <Key>
        <PropertyRef Name="RoomKey"/>
    </Key>
    <Property Name="RoomDescription" Type="Edm.String" MaxLength="1024"/>
    <Property Name="RoomDimensions" Type="Edm.String" MaxLength="50"/>
    <Property Name="RoomKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="RoomLength" Type="Edm.Decimal" Precision="13" Scale="2"/>
    <Property Name="RoomLengthWidthUnits" Type="Edm.String" MaxLength="25">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="LinearUnits"/>
    </Property>
    <Property Name="RoomLevel" Type="Edm.String" MaxLength="25">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="RoomLevel"/>
    </Property>
    <Property Name="RoomType" Type="Edm.String" MaxLength="1024">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="RoomType"/>
    </Property>
    <Property Name="RoomWidth" Type="Edm.Decimal" Precision="13" Scale="2"/>
</EntityType>
 */
