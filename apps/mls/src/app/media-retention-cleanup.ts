import type { UUIDv7 } from '@kws/types';

import { env } from '@kws/config';
import { media, mediaVariants } from '@kws/schema';
import { and, asc, eq, gt, inArray, sql } from 'drizzle-orm';
import { realpath, stat, unlink } from 'node:fs/promises';
import path from 'node:path';

import { db, pool } from '@/lib/database';
import { resolveMlsEntityRoot } from '@/repositories/media-cleanup.repository';
import {
  MLS_PUBLIC_GALLERY_LIMIT,
  retainedPropertyMediaClause,
} from '@/repositories/media-retention';

function excessMediaClause() {
  const retained = retainedPropertyMediaClause({
    mediaKey: sql`linked.media_key`,
    resourceRecordKey: sql`linked.resource_record_key`,
  });
  return and(
    eq(media.storageProvider, 'local'),
    sql`exists (
      select 1 from mls_media linked join properties parent
        on parent.listing_key = linked.resource_record_key
      where linked.media_id = ${media.id} and not ${retained}
    )`,
    sql`not exists (
      select 1 from mls_media linked
      where linked.media_id = ${media.id} and (
        not exists (select 1 from properties parent where parent.listing_key = linked.resource_record_key)
        or ${retained}
      )
    )`,
  );
}

export async function cleanupExcessListingMedia(args: string[]): Promise<void> {
  if (args.some((arg) => arg !== '--apply')) throw new Error('Usage: media:cleanup [--apply]');
  const apply = args.includes('--apply');
  const lock = await pool.connect();
  try {
    const result = await lock.query(
      "SELECT pg_try_advisory_lock(hashtext('mls-media-retention-cleanup')) AS acquired",
    );
    if (!result.rows[0]?.acquired) throw new Error('Another retention cleanup is running');

    const preview = !apply
      ? (
          await db
            .select({
              mediaRecords: sql<number>`count(*)`,
              estimatedBytes: sql<string>`coalesce(sum(coalesce((select sum(v.file_size) from media_variants v where v.media_id = ${media.id}), ${media.fileSize})), 0)`,
            })
            .from(media)
            .where(excessMediaClause())
        )[0]
      : undefined;
    console.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'preview',
        galleryLimit: MLS_PUBLIC_GALLERY_LIMIT,
        memberKeys: env.MLS_MEMBER_ID ?? [],
        officeKeys: env.MLS_OFFICE_ID ?? [],
        ...preview,
      }),
    );
    if (!apply) return;

    const root = await realpath(resolveMlsEntityRoot('properties'));
    let mediaDeleted = 0;
    let filesDeleted = 0;
    let bytesFreed = 0;
    let afterMediaId: UUIDv7 | null = null;
    while (true) {
      const batchStartedAt = Date.now();
      const deleted = await db.transaction(async (tx) => {
        const candidates = await tx
          .select({ id: media.id, storagePath: media.storagePath })
          .from(media)
          .where(and(excessMediaClause(), afterMediaId ? gt(media.id, afterMediaId) : undefined))
          .orderBy(asc(media.id))
          .limit(500)
          .for('update');
        if (!candidates.length) return 0;
        const candidateIds = candidates.map((candidate) => candidate.id);
        const variants = await tx
          .select({ mediaId: mediaVariants.mediaId, storagePath: mediaVariants.storagePath })
          .from(mediaVariants)
          .where(inArray(mediaVariants.mediaId, candidateIds));
        const allPaths = [...new Set([...candidates, ...variants].map((item) => item.storagePath))];
        const otherMedia = await tx
          .select({ mediaId: media.id, storagePath: media.storagePath })
          .from(media)
          .where(inArray(media.storagePath, allPaths));
        const otherVariants = await tx
          .select({ mediaId: mediaVariants.mediaId, storagePath: mediaVariants.storagePath })
          .from(mediaVariants)
          .where(inArray(mediaVariants.storagePath, allPaths));
        const references = [...otherMedia, ...otherVariants];
        for (const candidate of candidates) {
          const paths = [
            ...new Set([
              candidate.storagePath,
              ...variants
                .filter((variant) => variant.mediaId === candidate.id)
                .map((variant) => variant.storagePath),
            ]),
          ];
          for (const storagePath of paths) {
            if (!path.isAbsolute(storagePath))
              throw new Error(`Refusing relative media path: ${storagePath}`);
            try {
              const resolved = await realpath(storagePath);
              if (!resolved.startsWith(`${root}${path.sep}`))
                throw new Error(`Refusing path outside property media: ${storagePath}`);
              if (
                references.some(
                  (reference) =>
                    reference.storagePath === storagePath && reference.mediaId !== candidate.id,
                )
              ) {
                throw new Error(`Refusing shared media path: ${storagePath}`);
              }
              const file = await stat(resolved);
              await unlink(resolved);
              filesDeleted += 1;
              bytesFreed += file.size;
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            }
          }
        }
        if (candidates.length)
          await tx.delete(media).where(
            inArray(
              media.id,
              candidates.map((candidate) => candidate.id),
            ),
          );
        return { count: candidates.length, lastMediaId: candidates.at(-1)!.id };
      });
      if (!deleted) break;
      afterMediaId = deleted.lastMediaId;
      mediaDeleted += deleted.count;
      console.log(
        JSON.stringify({
          mediaDeleted,
          filesDeleted,
          bytesFreed,
          batchDurationMs: Date.now() - batchStartedAt,
        }),
      );
    }
    console.log(JSON.stringify({ completed: true, mediaDeleted, filesDeleted, bytesFreed }));
  } finally {
    await lock.query("SELECT pg_advisory_unlock(hashtext('mls-media-retention-cleanup'))");
    lock.release();
  }
}
