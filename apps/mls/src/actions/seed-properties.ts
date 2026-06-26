import { db } from "@/lib/database/drizzle";
import { fetchProperties } from "./fetch";
import { throttle } from "@/lib/utils/queued-throttle";
import { formatMedia, formatNWMlsRecord, formatProperty } from "./format";
import {
  nwmls,
  NWMlsRecord,
  Property,
  property,
  propertyMedia,
  PropertyMedia,
  StandardStatus,
} from "@/lib/database/schema/mls.schema";
import { batchPromises } from "@/lib/utils/batch-promises";

const throttledFetchProperties = throttle(fetchProperties, 200);

export async function seedOfficeProperties() {
  // 1. Default to Jan 1 of three years ago.
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 3;
  const minDate = new Date(`${startYear}-01-01`);

  // 2. We'll page through properties using just a nextLink token.
  let nextLink: string | null = null;
  let iteration = 1;

  do {
    // 3. Fetch a batch of properties.
    console.log(`Fetching property listings (Iteration: ${iteration++})...`);
    const { properties, nextLink: newNext } = await throttledFetchProperties(
      minDate,
      nextLink,
      true,
      null,
      null
    );

    // 4. Stop if nothing came back.
    if (!Array.isArray(properties) || properties.length === 0) break;

    // 5. Format and immediately process each property in this batch.
    const formattedProperties: Property[] = [];
    const formattedNWMlsRecords: NWMlsRecord[] = [];
    const formattedPropertyMedia: PropertyMedia[] = [];

    properties.forEach((propertyRecord) => {
      formattedProperties.push(formatProperty(propertyRecord) as Property);
      formattedNWMlsRecords.push(
        formatNWMlsRecord(propertyRecord) as NWMlsRecord
      );
      if (propertyRecord.Media)
        formattedPropertyMedia.push(
          ...formatMedia(propertyRecord.Media, propertyRecord.ListingId)
        );
    });

    await batchPromises(
      formattedProperties.map((propertyRecord) =>
        db
          .insert(property)
          .values(propertyRecord)
          .onConflictDoUpdate({
            target: [property.listingId],
            set: propertyRecord,
          })
      )
    );

    await batchPromises(
      formattedNWMlsRecords.map((nwMlsRecord) =>
        db
          .insert(nwmls)
          .values(nwMlsRecord)
          .onConflictDoUpdate({
            target: [nwmls.listingId],
            set: nwMlsRecord,
          })
      )
    );

    await batchPromises(
      formattedPropertyMedia.map((mediaRecord) =>
        db
          .insert(propertyMedia)
          .values(mediaRecord)
          .onConflictDoUpdate({
            target: [propertyMedia.mediaKey],
            set: mediaRecord,
          })
      )
    );

    // 6. Move on to the next page.
    nextLink = newNext;
  } while (nextLink);
}

export async function seedActiveProperties() {
  // 1. Default to Jan 1 of three years ago.
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 3;
  const minDate = new Date(`${startYear}-01-01`);

  // 2. We'll page through properties using just a nextLink token.
  let nextLink: string | null = null;
  let iteration = 1;

  do {
    // 3. Fetch a batch of properties.
    console.log(`Fetching property listings (Iteration: ${iteration++})...`);
    const { properties, nextLink: newNext } = await throttledFetchProperties(
      minDate,
      nextLink,
      false,
      null,
      StandardStatus.Active
    );

    // 4. Stop if nothing came back.
    if (!Array.isArray(properties) || properties.length === 0) break;

    // 5. Format and immediately process each property in this batch.
    const formattedProperties: Property[] = [];
    const formattedNWMlsRecords: NWMlsRecord[] = [];
    const formattedPropertyMedia: PropertyMedia[] = [];

    properties.forEach((propertyRecord) => {
      formattedProperties.push(formatProperty(propertyRecord) as Property);
      formattedNWMlsRecords.push(
        formatNWMlsRecord(propertyRecord) as NWMlsRecord
      );
      if (propertyRecord.Media)
        formattedPropertyMedia.push(
          ...formatMedia(propertyRecord.Media, propertyRecord.ListingId)
        );
    });

    await batchPromises(
      formattedProperties.map((propertyRecord) =>
        db
          .insert(property)
          .values(propertyRecord)
          .onConflictDoUpdate({
            target: [property.listingId],
            set: propertyRecord,
          })
      )
    );

    await batchPromises(
      formattedNWMlsRecords.map((nwMlsRecord) =>
        db
          .insert(nwmls)
          .values(nwMlsRecord)
          .onConflictDoUpdate({
            target: [nwmls.listingId],
            set: nwMlsRecord,
          })
      )
    );

    await batchPromises(
      formattedPropertyMedia.map((mediaRecord) =>
        db
          .insert(propertyMedia)
          .values(mediaRecord)
          .onConflictDoUpdate({
            target: [propertyMedia.mediaKey],
            set: mediaRecord,
          })
      )
    );

    // 6. Move on to the next page.
    nextLink = newNext;
  } while (nextLink);
}
