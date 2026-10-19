import { env } from '@kws/config';
import {
  galleryListingEligibility,
  galleryMetadataIncomplete,
  galleryMissingMedia,
  mlsGalleryRequests,
  mlsMedia,
  properties,
} from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/lib/database';
import { mlsLogger } from '@/lib/logger';
import { MlsApiError } from '@/lib/utils/errors';
import { fetchFreshParentMedia, MlsParentUnavailableError } from '@/lib/utils/fetch';
import { mlsMediaBackoff } from '@/lib/utils/media-backoff';
import {
  isMlsMediaBudgetExhausted,
  mlsQuotaTracker,
  MlsQuotaExceededError,
} from '@/lib/utils/quota';
import { mapPropertyMedia } from '@/maps/media.mapper';
import { reconcileResourceMediaBatch } from '@/repositories/resource-media.repository';

import { runMlsMediaSync } from './seed-media';

const galleryLogger = mlsLogger.child('on-demand-gallery');

export async function claimGalleryRequest() {
  return db.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(mlsGalleryRequests)
      .where(sql`
      ${mlsGalleryRequests.status} in ('queued', 'running')
      and ${mlsGalleryRequests.nextAttemptAt} <= now()
      and (${mlsGalleryRequests.leaseUntil} is null or ${mlsGalleryRequests.leaseUntil} <= now())
      and not exists (select 1 from mls_media busy
        where busy.resource_record_key = ${mlsGalleryRequests.listingKey}
          and (busy.acquisition_lease_until > now() or busy.next_attempt_at > now()))
    `)
      .orderBy(mlsGalleryRequests.requestedAt)
      .limit(1)
      .for('update', { skipLocked: true });
    if (!request) return null;
    const token = randomUUID();
    await tx
      .update(mlsGalleryRequests)
      .set({
        status: 'running',
        runToken: token,
        leaseUntil: new Date(Date.now() + 10 * 60_000),
        attempts: request.attempts + 1,
        updatedAt: new Date(),
      })
      .where(eq(mlsGalleryRequests.listingKey, request.listingKey));
    return { ...request, runToken: token, attempts: request.attempts + 1 };
  });
}

export async function processNextGalleryRequest(): Promise<boolean> {
  if (mlsMediaBackoff.isPaused() || isMlsMediaBudgetExhausted(mlsQuotaTracker.snapshot()))
    return false;
  const request = await claimGalleryRequest();
  if (!request) return false;
  const identity = and(
    eq(mlsGalleryRequests.listingKey, request.listingKey),
    eq(mlsGalleryRequests.runToken, request.runToken),
  );
  const finish = async (status: string) => {
    await db
      .update(mlsGalleryRequests)
      .set({ status, runToken: null, leaseUntil: null, lastError: null, updatedAt: new Date() })
      .where(identity);
    galleryLogger.info('on-demand gallery request finished', {
      listingKey: request.listingKey,
      status,
    });
  };
  try {
    const [listing] = await db
      .select({
        listingId: properties.listingId,
        missing: galleryMissingMedia(sql`${properties.listingKey}`),
        metadataIncomplete: galleryMetadataIncomplete(sql`${properties.listingKey}`),
      })
      .from(properties)
      .where(
        and(
          eq(properties.listingKey, request.listingKey),
          galleryListingEligibility(env.MLS_MEMBER_ID ?? [], env.MLS_OFFICE_ID ?? []),
        ),
      );
    if (!listing) {
      await finish('ineligible');
      return true;
    }
    if (!listing.missing && !listing.metadataIncomplete) {
      await finish('complete');
      return true;
    }

    galleryLogger.info('processing highest-priority gallery request', {
      listingKey: request.listingKey,
      attempt: request.attempts,
    });
    const payloads = await fetchFreshParentMedia(
      'properties',
      request.listingKey,
      listing.listingId,
      { retryRateLimited: false },
    );
    const mapped = payloads.map((payload) => mapPropertyMedia(payload, request.listingKey));
    if (mapped.some((photo) => photo === null))
      throw new Error('Invalid media in on-demand gallery snapshot');
    const unique = new Map(
      mapped.filter((photo) => photo !== null).map((photo) => [photo.mediaKey, photo]),
    );
    await reconcileResourceMediaBatch([
      { resourceRecordKey: request.listingKey, mediaRecords: [...unique.values()] },
    ]);
    await runMlsMediaSync({
      listingKeys: [request.listingKey],
      priorityRequest: true,
      filterEntityTypes: ['properties'],
      batchSize: 100,
      maxBatches: 2,
      processConcurrency: 1,
      includeMissingFilesRepair: true,
      repairMaxBatches: 1,
    });
    const [progress] = await db
      .select({ missing: galleryMissingMedia(sql`${properties.listingKey}`) })
      .from(properties)
      .where(
        and(
          eq(properties.listingKey, request.listingKey),
          galleryListingEligibility(env.MLS_MEMBER_ID ?? [], env.MLS_OFFICE_ID ?? []),
        ),
      );
    if (!progress) {
      await finish('ineligible');
      return true;
    }
    if (progress.missing) throw new Error('Gallery has deferred or incomplete downloads');
    await finish('complete');
  } catch (error) {
    if (error instanceof MlsParentUnavailableError) {
      await finish('ineligible');
      return true;
    }
    const [parent] = await db
      .select({ retryAt: sql<Date | null>`max(${mlsMedia.nextAttemptAt})` })
      .from(mlsMedia)
      .where(eq(mlsMedia.resourceRecordKey, request.listingKey));
    const retryAt = new Date(
      Math.max(
        Date.now() + Math.min(15 * 60_000, 15_000 * 2 ** (request.attempts - 1)),
        parent?.retryAt ? new Date(parent.retryAt).getTime() : 0,
        mlsMediaBackoff.pausedUntil()?.getTime() ?? 0,
        error instanceof MlsQuotaExceededError ? error.resetAt.getTime() : 0,
        error instanceof MlsApiError ? Date.now() + error.retryAfterMs : 0,
      ),
    );
    const status = request.attempts >= 5 ? 'failed' : 'queued';
    const message = error instanceof Error ? error.name : 'UnknownError';
    await db
      .update(mlsGalleryRequests)
      .set({
        status,
        runToken: null,
        leaseUntil: null,
        nextAttemptAt: retryAt,
        lastError: message,
        updatedAt: new Date(),
      })
      .where(identity);
    galleryLogger.warn('on-demand gallery request deferred', {
      listingKey: request.listingKey,
      attempt: request.attempts,
      status,
      retryAt: retryAt.toISOString(),
      error: message,
    });
  }
  return true;
}
