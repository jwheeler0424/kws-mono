import { env } from '@kws/config';
import {
  galleryListingEligibility,
  galleryMetadataIncomplete,
  galleryMissingMedia,
  mlsGalleryRequests,
  properties,
} from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/lib/database';

export async function requestListingGallery(listingKey: string) {
  return db.transaction(async (tx) => {
    const [listing] = await tx
      .select({
        missing: galleryMissingMedia(sql`${properties.listingKey}`),
        metadataIncomplete: galleryMetadataIncomplete(sql`${properties.listingKey}`),
      })
      .from(properties)
      .where(
        and(
          eq(properties.listingKey, listingKey),
          galleryListingEligibility(env.MLS_MEMBER_ID ?? [], env.MLS_OFFICE_ID ?? []),
        ),
      )
      .for('update');
    if (!listing) return { status: 'ineligible' };
    const [existing] = await tx
      .select()
      .from(mlsGalleryRequests)
      .where(eq(mlsGalleryRequests.listingKey, listingKey));
    if (existing && ['queued', 'running'].includes(existing.status))
      return { status: existing.status };
    if (existing?.status === 'failed' && existing.nextAttemptAt.getTime() > Date.now())
      return { status: 'failed' };
    const status =
      !listing.missing && (!listing.metadataIncomplete || existing?.status === 'complete')
        ? 'complete'
        : 'queued';
    const now = new Date();
    await tx
      .insert(mlsGalleryRequests)
      .values({ listingKey, status })
      .onConflictDoUpdate({
        target: mlsGalleryRequests.listingKey,
        set: {
          status,
          attempts: 0,
          runToken: null,
          leaseUntil: null,
          lastError: null,
          nextAttemptAt: now,
          requestedAt: now,
          updatedAt: now,
        },
      });
    return { status };
  });
}
