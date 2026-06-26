import { and, eq, sql } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import mime from "mime-types";
import { getMlsCredentials } from "./get-mls-credentials";
import { makeIncrementedFilename } from "@/lib/utils/unique-file-name";
import { db } from "@/lib/database/drizzle";
import { propertyMedia, PropertyType } from "@/lib/database/schema";
import { processImage } from "@/lib/utils/process-image";
import { createMedia } from "@/services/media/create-media";

export async function clearPropertyMediaDuplicates() {
  const propertyMediaPath = path.join(process.cwd(), "public/media/properties");

  const propertiesDirectoryExists = fs.existsSync(propertyMediaPath);
  if (propertiesDirectoryExists) {
    const listingFolders = fs.readdirSync(propertyMediaPath);

    for (const folder of listingFolders) {
      // Get a list of all files in the property media folder
      const listingMediaFiles = fs.readdirSync(
        `${propertyMediaPath}/${folder}`
      );

      // Loop through and delete each file
      for (const mediaFile of listingMediaFiles) {
        const fileUrl = path.join(propertyMediaPath, folder, mediaFile);
        const filename_exists = fs.existsSync(fileUrl);
        const isIndexedFile = /(\(\d+\))$/.test(mediaFile);

        if (filename_exists && isIndexedFile) {
          // await deleteMediaObject(fileUrl);
          fs.unlinkSync(fileUrl);
        }
      }
    }
  }
}

export async function clearPropertyMediaStale() {
  const propertyMediaPath = path.join(process.cwd(), "public/media/properties");

  const propertiesDirectoryExists = fs.existsSync(propertyMediaPath);
  if (propertiesDirectoryExists) {
    const listingFolders = fs.readdirSync(propertyMediaPath);

    if (!listingFolders || listingFolders.length <= 0) return;

    for (const folder of listingFolders) {
      // Get a list of all files in the property media folder
      const listingMediaFiles = fs.readdirSync(
        `${propertyMediaPath}/${folder}`
      );

      const propertyListing = await db.query.property.findFirst({
        where: (property, { and, eq, or }) =>
          and(
            eq(property.listingId, folder),
            eq(property.mlgCanView, true),
            sql`${property.mlgCanUse} @> ARRAY['IDX']::text[]`,
            or(
              eq(property.propertyType, PropertyType.Residential),
              eq(property.propertyType, PropertyType.ResidentialIncome),
              eq(property.propertyType, PropertyType.ResidentialLease)
            )
          ),
      });

      if (!!propertyListing) {
        continue;
      }

      // Loop through and delete each file
      for (const mediaFile of listingMediaFiles) {
        const fileUrl = path.join(propertyMediaPath, folder, mediaFile);
        const filename_exists = fs.existsSync(fileUrl);

        if (filename_exists) {
          // await deleteMediaObject(fileUrl);
          fs.unlinkSync(fileUrl);
        }
      }

      fs.rmdirSync(`${propertyMediaPath}/${folder}`);
    }
  }
}

export async function generatePropertyMedia(limit: number = 200) {
  const { officeMlsId } = getMlsCredentials();
  const propertyRecords = await db.query.property.findMany({
    limit,
    where: (property, { and, eq, or }) =>
      and(
        eq(property.mlgCanView, true),
        sql`${property.mlgCanUse} @> ARRAY['IDX']::text[]`,
        or(
          eq(property.listOfficeMlsId, officeMlsId ?? ""),
          eq(property.coListOfficeMlsId, officeMlsId ?? ""),
          eq(property.buyerOfficeMlsId, officeMlsId ?? ""),
          eq(property.coBuyerOfficeMlsId, officeMlsId ?? "")
        )
      ),
    with: {
      media: {
        where: (propertyMedia, { eq }) =>
          eq(propertyMedia.resourceAcquired, false),
      },
    },
  });

  const propertiesFlatMap = propertyRecords.flatMap((l) => l.media);
  if (propertiesFlatMap.length === 0) return;

  // process them *in place*, never accumulate more than 200
  for (const record of propertiesFlatMap) {
    const { mediaKey, mediaURL, listingId } = record;
    if (!mediaKey || !mediaURL || !listingId) continue;

    // Set filepath and filename
    const groupBasePath = `properties/${listingId}/`;
    let filename = path.basename(mediaURL); // mediaURL.split('/').pop();
    let filename_exists = fs.existsSync(
      path.join(process.cwd(), "public/media/" + groupBasePath + filename)
    );
    const fileExt = path.extname(filename);
    const fileType = mime.lookup(fileExt) || "application/octet-stream";

    while (filename_exists) {
      filename = makeIncrementedFilename(filename);
      filename_exists = fs.existsSync(
        path.join(process.cwd(), "public/media/" + groupBasePath + filename)
      );
    }

    // Assume local storage, make sure directory exists
    if (
      !fs.existsSync(path.join(process.cwd(), "public/media/" + groupBasePath))
    ) {
      fs.mkdirSync(path.join(process.cwd(), "public/media/" + groupBasePath), {
        recursive: true,
      });
    }

    let client: typeof http | typeof https = http;
    if (mediaURL.toString().indexOf("https") === 0) {
      client = https;
    }

    const buffer: Buffer<ArrayBufferLike> | null = await new Promise(
      (resolve, _reject) => {
        try {
          client.get(mediaURL, (res) => {
            const data: Buffer<ArrayBufferLike>[] = [];
            res
              .on("data", (chunk) => {
                data.push(chunk);
              })
              .on("end", () => {
                resolve(Buffer.concat(data));
              });
          });
        } catch (error) {
          console.error(error);
          resolve(null);
        }
      }
    );
    if (!buffer) continue;

    const data = await processImage(buffer);
    if (!data) continue;

    const { image, thumbnail, micro, blur, metadata } = data;

    try {
      // Assume local storage, write file
      fs.writeFileSync(
        path.join(process.cwd(), "public/media/" + groupBasePath + filename),
        buffer
      );
      await createMedia(
        fileExt,
        filename,
        fileType,
        image.byteLength,
        groupBasePath,
        metadata as unknown as Record<string, unknown>,
        blur,
        micro,
        thumbnail,
        "Property",
        undefined
      );
      await db
        .update(propertyMedia)
        .set({ resourceAcquired: true })
        .where(
          and(
            eq(propertyMedia.mediaKey, mediaKey),
            eq(propertyMedia.listingId, listingId)
          )
        );
    } catch (err) {
      const error = err as Error;
      console.error("Error writing media file!", error);
    }
  }
}
