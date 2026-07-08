import type { UUIDv7 } from '@kws/types';
import type { Dirent } from 'node:fs';

import { media, mediaVariants, mlsMedia } from '@kws/schema';
import { and, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { db } from '@/lib/database';

const FILE_DELETE_CHUNK_SIZE = 20;
const MLS_MEDIA_ENTITY_TYPES = ['properties', 'members', 'offices'] as const;

export type MlsMediaStorageEntityType = (typeof MLS_MEDIA_ENTITY_TYPES)[number];

async function deleteVariantFilesInChunks(storagePaths: string[]): Promise<number> {
  let deletedCount = 0;

  for (let start = 0; start < storagePaths.length; start += FILE_DELETE_CHUNK_SIZE) {
    const chunk = storagePaths.slice(start, start + FILE_DELETE_CHUNK_SIZE);
    const deleteResults = await Promise.allSettled(chunk.map(async (path) => fs.unlink(path)));
    deletedCount += deleteResults.filter((result) => result.status === 'fulfilled').length;
  }

  return deletedCount;
}

export interface EntityMediaPurgeSummary {
  mediaDeleted: number;
  variantFilesDeleted: number;
  mlsMediaRowsDeleted: number;
}

export interface DeadMlsMediaPurgeSummary {
  mediaDeleted: number;
  variantFilesDeleted: number;
}

function findWorkspaceRoot(startDir: string): string {
  let current = startDir;

  while (true) {
    if (existsSync(path.join(current, 'turbo.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }

    current = parent;
  }
}

function resolveLocalMediaBasePath(): string {
  const workspaceRoot = findWorkspaceRoot(process.cwd());
  const configuredPath = process.env.MLS_MEDIA_STORE_PATH;

  if (configuredPath && configuredPath.length > 0) {
    return path.isAbsolute(configuredPath)
      ? configuredPath
      : path.resolve(workspaceRoot, configuredPath);
  }

  return path.join(workspaceRoot, 'store', 'media');
}

function resolveMlsEntityRoot(entityType: MlsMediaStorageEntityType): string {
  return path.join(resolveLocalMediaBasePath(), 'mls', entityType);
}

function isFilesystemNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  );
}

function isFilesystemNotEmptyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOTEMPTY'
  );
}

async function pruneEmptyDirectoriesRecursively(
  currentDir: string,
  preserveCurrentDir: boolean,
): Promise<number> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if (isFilesystemNotFoundError(error)) {
      return 0;
    }
    throw error;
  }

  let pruned = 0;
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    pruned += await pruneEmptyDirectoriesRecursively(path.join(currentDir, entry.name), false);
  }

  if (preserveCurrentDir) {
    return pruned;
  }

  try {
    const remaining = await fs.readdir(currentDir);
    if (remaining.length === 0) {
      await fs.rmdir(currentDir);
      return pruned + 1;
    }
  } catch (error) {
    if (isFilesystemNotFoundError(error) || isFilesystemNotEmptyError(error)) {
      return pruned;
    }
    throw error;
  }

  return pruned;
}

export async function pruneEmptyMlsMediaDirectories(
  entityTypes: readonly MlsMediaStorageEntityType[] = MLS_MEDIA_ENTITY_TYPES,
): Promise<number> {
  const uniqueEntityTypes = [...new Set(entityTypes)];
  let pruned = 0;

  for (const entityType of uniqueEntityTypes) {
    pruned += await pruneEmptyDirectoriesRecursively(resolveMlsEntityRoot(entityType), true);
  }

  return pruned;
}

/**
 * Purge all media (files + DB records) associated with a set of MLS
 * resource_record_keys.  Called before hard-deleting properties/offices/members
 * during scheduled cleanup so files are not left orphaned on disk.
 */
export async function purgeEntityMedia(
  resourceRecordKeys: string[],
): Promise<EntityMediaPurgeSummary> {
  if (resourceRecordKeys.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0, mlsMediaRowsDeleted: 0 };
  }

  // 1. Find all mls_media rows for these resource keys that have a linked media ID.
  const linkedRows = await db
    .select({ mediaId: mlsMedia.mediaId })
    .from(mlsMedia)
    .where(
      and(inArray(mlsMedia.resourceRecordKey, resourceRecordKeys), isNotNull(mlsMedia.mediaId)),
    );

  const mediaIds = linkedRows.map((r) => r.mediaId).filter((id): id is UUIDv7 => id !== null);

  let variantFilesDeleted = 0;

  if (mediaIds.length > 0) {
    // 2. Collect all stored variant file paths.
    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, mediaIds));

    // 3. Delete physical variant files, ignoring already-missing files.
    variantFilesDeleted = await deleteVariantFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );

    // 4. Hard-delete media records.  mediaVariants rows are removed automatically
    //    via their ON DELETE CASCADE foreign key.  mls_media.media_id is set to
    //    NULL via its ON DELETE SET NULL foreign key.
    await db.delete(media).where(inArray(media.id, mediaIds));
  }

  // 5. Hard-delete all mls_media rows for these resource keys (including any
  //    rows that had no linked media record).
  const deletedMlsMedia = await db
    .delete(mlsMedia)
    .where(inArray(mlsMedia.resourceRecordKey, resourceRecordKeys))
    .returning({ mediaKey: mlsMedia.mediaKey });

  return {
    mediaDeleted: mediaIds.length,
    variantFilesDeleted,
    mlsMediaRowsDeleted: deletedMlsMedia.length,
  };
}

/**
 * Purges unattached MLS property media rows from `media` and their variant
 * files.
 *
 * This only targets media stored under the MLS properties local namespace
 * (`.../mls/properties/...`) and with no referencing row in `mls_media`.
 */
export async function purgeDeadMlsPropertyMedia(): Promise<DeadMlsMediaPurgeSummary> {
  return purgeDeadMlsMedia(['properties']);
}

export async function purgeDeadMlsMedia(
  entityTypes: readonly MlsMediaStorageEntityType[] = MLS_MEDIA_ENTITY_TYPES,
): Promise<DeadMlsMediaPurgeSummary> {
  const uniqueEntityTypes = [...new Set(entityTypes)];
  if (uniqueEntityTypes.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }

  const storagePathClauses = uniqueEntityTypes.flatMap((entityType) => {
    const unixLike = `%/mls/${entityType}/%`;
    const winLike = `%\\mls\\${entityType}\\%`;
    return [sql`${media.storagePath} like ${unixLike}`, sql`${media.storagePath} like ${winLike}`];
  });

  if (storagePathClauses.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }

  const deadMediaRows = await db
    .select({ id: media.id })
    .from(media)
    .leftJoin(mlsMedia, eq(media.id, mlsMedia.mediaId))
    .where(and(isNull(mlsMedia.mediaId), isNull(media.deletedAt), or(...storagePathClauses)));

  const mediaIds = deadMediaRows.map((row) => row.id);

  if (mediaIds.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }

  const variants = await db
    .select({ storagePath: mediaVariants.storagePath })
    .from(mediaVariants)
    .where(inArray(mediaVariants.mediaId, mediaIds));

  const variantFilesDeleted = await deleteVariantFilesInChunks(
    variants.map((variant) => variant.storagePath),
  );

  const deletedMediaRows = await db
    .delete(media)
    .where(inArray(media.id, mediaIds))
    .returning({ id: media.id });

  return {
    mediaDeleted: deletedMediaRows.length,
    variantFilesDeleted,
  };
}
