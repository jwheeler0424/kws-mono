import { defineRelationsPart } from 'drizzle-orm';

import { media } from '../media';
import { mlsMedia } from './media.schema';
import { members } from './members.schema';
import { offices } from './offices.schema';
import { openHouses } from './open-houses.schema';
import { properties } from './properties.schema';
import { propertyRooms } from './property-rooms.schema';
import { propertyUnitTypes } from './property-unit-types.schema';

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const mlsRelations = defineRelationsPart(
  {
    media,
    mlsMedia,
    members,
    offices,
    openHouses,
    properties,
    propertyRooms,
    propertyUnitTypes,
  },
  (r) => ({
    // ── Properties ────────────────────────────────────────────────────────────
    properties: {
      media: r.many.mlsMedia({
        from: r.properties.listingKey,
        to: r.mlsMedia.resourceRecordKey,
      }),
      rooms: r.many.propertyRooms({
        from: r.properties.listingKey,
        to: r.propertyRooms.listingKey,
      }),
      unitTypes: r.many.propertyUnitTypes({
        from: r.properties.listingKey,
        to: r.propertyUnitTypes.listingKey,
      }),
      openHouses: r.many.openHouses({
        from: r.properties.listingKey,
        to: r.openHouses.listingKey,
      }),
    },

    // ── Media ─────────────────────────────────────────────────────────────────
    // mlsMedia.resourceRecordKey is a polymorphic FK — linked to property, member,
    // or office depending on which resource the media belongs to.
    mlsMedia: {
      media: r.one.media({ from: r.mlsMedia.mediaId, to: r.media.id }),
      property: r.one.properties({
        from: r.mlsMedia.resourceRecordKey,
        to: r.properties.listingKey,
      }),
      member: r.one.members({ from: r.mlsMedia.resourceRecordKey, to: r.members.memberKey }),
      office: r.one.offices({ from: r.mlsMedia.resourceRecordKey, to: r.offices.officeKey }),
    },

    // ── Property sub-resources ─────────────────────────────────────────────────
    propertyRooms: {
      property: r.one.properties({
        from: r.propertyRooms.listingKey,
        to: r.properties.listingKey,
      }),
    },

    propertyUnitTypes: {
      property: r.one.properties({
        from: r.propertyUnitTypes.listingKey,
        to: r.properties.listingKey,
      }),
    },

    // ── Members & Offices ──────────────────────────────────────────────────────
    members: {
      media: r.many.mlsMedia({
        from: r.members.memberKey,
        to: r.mlsMedia.resourceRecordKey,
      }),
    },

    offices: {
      media: r.many.mlsMedia({
        from: r.offices.officeKey,
        to: r.mlsMedia.resourceRecordKey,
      }),
    },

    // ── Open Houses ────────────────────────────────────────────────────────────
    openHouses: {
      property: r.one.properties({ from: r.openHouses.listingKey, to: r.properties.listingKey }),
    },
  }),
);
