import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";
import mime from "mime-types";
import { db } from "@/lib/database/drizzle";
import { makeIncrementedFilename } from "@/lib/utils/unique-file-name";
import { propertyMedia } from "@/lib/database/schema";
import { and, eq } from "drizzle-orm";
import { processImage } from "@/lib/utils/process-image";
import { createMedia } from "@/services/media/create-media";

export async function acquirePropertyMedia() {
  const mediaRecords = await db.query.propertyMedia.findMany({
    where: (propertyMedia, { eq }) => eq(propertyMedia.resourceAcquired, false),
  });

  if (mediaRecords.length <= 0) return;

  for (const record of mediaRecords) {
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
