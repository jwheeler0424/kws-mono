import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/database/drizzle";
import { and, eq, not, notInArray, or } from "drizzle-orm";
import { property, StandardStatus } from "@/lib/database/schema/mls.schema";
import { deleteMediaObject } from "@/lib/utils/delete-media-object";
import { getMlsCredentials } from "./get-mls-credentials";

export async function clearPropertyData(limit: number = 1000) {
  const { officeMlsId } = getMlsCredentials();
  let iteration = 1;
  /**
   * Check if property data in general can be cleared by referencing the
   * MlgCanView field and StandardStatus. If false or deleted, clear all
   * data associated with the property.
   */
  let removableProperties = await db.query.property.findMany({
    with: { media: true },
    limit: limit,
    offset: (iteration - 1) * limit,
    where: (property, { eq, or }) =>
      or(
        eq(property.mlgCanView, false),
        eq(property.standardStatus, StandardStatus.Deleted)
      ),
  });

  while (removableProperties.length > 0) {
    for (const property of removableProperties) {
      const propertyMedia = property.media;
      const acquiredMedia = propertyMedia?.filter(
        (media) => !!media.resourceAcquired
      );
      if (!acquiredMedia) {
        continue;
      }
      for (const media of acquiredMedia) {
        // Set filepath and filename
        const groupBasePath = `properties/${property.listingId}/`;
        const filename = media?.fileName;
        const fileUrl = path.join(
          process.cwd(),
          "public/media/",
          groupBasePath,
          filename ?? ""
        );
        const filename_exists = fs.existsSync(fileUrl);

        if (filename_exists) {
          await deleteMediaObject(fileUrl);
        }
      }
    }

    removableProperties = await db.query.property.findMany({
      with: { media: true },
      limit: limit,
      offset: (++iteration - 1) * limit,
      where: (property, { eq }) =>
        eq(property.standardStatus, StandardStatus.Deleted),
    });
  }
  await db
    .delete(property)
    .where(
      or(
        eq(property.standardStatus, StandardStatus.Deleted),
        eq(property.mlgCanView, false)
      )
    );

  if (!officeMlsId) {
    return;
  }

  iteration = 1;

  let nonOfficeProperties = await db.query.property.findMany({
    with: { media: true },
    limit: limit,
    offset: (iteration - 1) * limit,
    where: (property, { eq, notInArray, not, and }) =>
      and(
        not(eq(property.listOfficeMlsId, officeMlsId)),
        not(eq(property.coListOfficeMlsId, officeMlsId)),
        not(eq(property.buyerOfficeMlsId, officeMlsId)),
        not(eq(property.coBuyerOfficeMlsId, officeMlsId)),
        notInArray(property.standardStatus, [
          StandardStatus.Active,
          StandardStatus.ActiveUnderContract,
        ])
      ),
  });

  while (nonOfficeProperties.length > 0) {
    for (const property of nonOfficeProperties) {
      const propertyMedia = property.media;
      const acquiredMedia = propertyMedia?.filter(
        (media) => !!media.resourceAcquired
      );
      if (!acquiredMedia) {
        continue;
      }
      for (const media of acquiredMedia) {
        // Set filepath and filename
        const groupBasePath = `properties/${property.listingId}/`;
        const filename = media?.fileName;
        const fileUrl = path.join(
          process.cwd(),
          "public/media/",
          groupBasePath,
          filename ?? ""
        );
        const filename_exists = fs.existsSync(fileUrl);

        if (filename_exists) {
          await deleteMediaObject(fileUrl);
        }
      }
    }
    nonOfficeProperties = await db.query.property.findMany({
      with: { media: true },
      limit: limit,
      offset: (++iteration - 1) * limit,
      where: (property, { eq, notInArray, not, and }) =>
        and(
          not(eq(property.listOfficeMlsId, officeMlsId)),
          not(eq(property.coListOfficeMlsId, officeMlsId)),
          not(eq(property.buyerOfficeMlsId, officeMlsId)),
          not(eq(property.coBuyerOfficeMlsId, officeMlsId)),
          notInArray(property.standardStatus, [
            StandardStatus.Active,
            StandardStatus.ActiveUnderContract,
          ])
        ),
    });
  }

  await db
    .delete(property)
    .where(
      and(
        not(eq(property.listOfficeMlsId, officeMlsId)),
        not(eq(property.coListOfficeMlsId, officeMlsId)),
        not(eq(property.buyerOfficeMlsId, officeMlsId)),
        not(eq(property.coBuyerOfficeMlsId, officeMlsId)),
        notInArray(property.standardStatus, [
          StandardStatus.Active,
          StandardStatus.ActiveUnderContract,
        ])
      )
    );
}
