import { boolean, index, integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '../types';

import { tsvector } from '../../plugins/tsvector';
import { softDelete, timestamps } from '../common.schema';
import { media } from '../media';

// ---------------------------------------------------------------------------
// media
// ---------------------------------------------------------------------------

export const mlsMedia = pgTable(
  'mls_media',
  {
    mediaKey: varchar('media_key', { length: 255 }).primaryKey(),
    imageHeight: integer('image_height'),
    imageSizeDescription: varchar('image_size_description', { length: 1024 }),
    imageWidth: integer('image_width'),
    longDescription: varchar('long_description', { length: 1024 }),
    mediaModificationTimestamp: timestamp('media_modification_timestamp', {
      withTimezone: true,
      mode: 'string',
    }),
    mediaObjectId: varchar('media_object_id', { length: 255 }),
    mediaURL: varchar('media_url', { length: 8000 }),
    order: integer('order'),
    permission: varchar('permission', { length: 255 }).array(),
    preferredPhotoYN: boolean('preferred_photo_yn'),
    resourceRecordKey: varchar('resource_record_key', { length: 255 }),

    mediaId: uuid('media_id')
      .$type<UUIDv7>()
      .references(() => media.id, { onDelete: 'set null' }),

    ...timestamps,
    ...softDelete,

    // Full-text search vector
    // Keep this last in the column map
    searchVector: tsvector('search_vector')
      .language('english')
      .cols(['long_description', 'media_key'])
      .weight('A')
      .cols(['media_url', 'image_size_description'])
      .weight('B')
      .cols(['resource_record_key'])
      .weight('C'),
  },
  (t) => [
    index('idx_resource_record_key').on(t.resourceRecordKey),
    index('idx_media_modification_timestamp').on(t.mediaModificationTimestamp),
    index('idx_mls_media_updated_at').on(t.updatedAt),
    index('idx_mls_media_deleted_at').on(t.deletedAt),
    index('idx_mls_media_media_id').on(t.mediaId),
    index('idx_permission').on(t.permission),
    index('idx_media_listing_primary').on(t.resourceRecordKey, t.preferredPhotoYN, t.order),
    index('idx_mls_media_candidate_sort').on(t.updatedAt, t.mediaKey),
    index('idx_mls_media_listing_candidate_sort').on(t.resourceRecordKey, t.updatedAt, t.mediaKey),
    index('idx_image_size_description').on(t.imageSizeDescription),
    index('idx_media_search_vector').using('gin', t.searchVector),
  ],
);

export type TMlsMedia = typeof mlsMedia.$inferSelect;

/*
*** REFERENCE OData EDMX for Media from RESO Web API ***
<EntityType Name="Media">
    <Key>
        <PropertyRef Name="MediaKey"/>
    </Key>
    <Property Name="ImageHeight" Type="Edm.Int64" />
    <Property Name="ImageSizeDescription" Type="Edm.String" MaxLength="1024">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="ImageSizeDescription"/>
    </Property>
    <Property Name="ImageWidth" Type="Edm.Int64" />
    <Property Name="LongDescription" Type="Edm.String" MaxLength="1024"/>
    <Property Name="MediaKey" Type="Edm.String" MaxLength="255"/>
    <Property Name="MediaModificationTimestamp" Type="Edm.DateTimeOffset" Precision="27"/>
    <Property Name="MediaObjectID" Type="Edm.String" MaxLength="255"/>
    <Property Name="MediaURL" Type="Edm.String" MaxLength="8000"/>
    <Property Name="Order" Type="Edm.Int16" Precision="4"/>
    <Property Name="Permission" Type="Collection(Edm.String)" MaxLength="255">
        <Annotation Term="RESO.OData.Metadata.LookupName" String="Permission"/>
    </Property>
    <Property Name="PreferredPhotoYN" Type="Edm.Boolean" />
    <Property Name="ResourceRecordKey" Type="Edm.String" MaxLength="255"/>
</EntityType>
 */
