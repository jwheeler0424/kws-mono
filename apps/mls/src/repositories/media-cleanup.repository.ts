import type { StandardStatus } from '@kws/schema';
import type { UUIDv7 } from '@kws/types';
import type { Dirent } from 'node:fs';

import { media, mediaVariants, members, mlsMedia, offices, properties } from '@kws/schema';
import { and, eq, inArray, isNotNull, isNull, not, or, sql } from 'drizzle-orm';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { db } from '@/lib/database';

import { buildPrimaryMlsMediaClause } from './mls-media-primary';

const FILE_DELETE_CHUNK_SIZE = 20;
const MEDIA_ID_QUERY_CHUNK_SIZE = 500;
const MLS_MEDIA_ENTITY_TYPES = ['properties', 'members', 'offices'] as const;
const DEFAULT_ACTIVE_PROPERTY_STATUSES: readonly StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];

export type MlsMediaStorageEntityType = (typeof MLS_MEDIA_ENTITY_TYPES)[number];

async function deleteFilesInChunks(storagePaths: string[]): Promise<number> {
  let deletedCount = 0;

  for (let start = 0; start < storagePaths.length; start += FILE_DELETE_CHUNK_SIZE) {
    const chunk = storagePaths.slice(start, start + FILE_DELETE_CHUNK_SIZE);
    const deleteResults = await Promise.all(
      chunk.map(async (storagePath) => {
        try {
          await fs.unlink(storagePath);
          return true;
        } catch (error) {
          if (isFilesystemNotFoundError(error)) return false;
          throw error;
        }
      }),
    );
    deletedCount += deleteResults.filter(Boolean).length;
  }

  return deletedCount;
}

function buildMlsStoragePathClauses(entityTypes: readonly MlsMediaStorageEntityType[]) {
  return entityTypes.map(
    (entityType) =>
      sql`replace(${media.storagePath}, chr(92), '/') like ${`%/mls/${entityType}/%`}`,
  );
}

function normalizeStoragePath(storagePath: string): string {
  const resolved = path.resolve(storagePath);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

async function* iterateFilesRecursively(directory: string): AsyncGenerator<string> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (isFilesystemNotFoundError(error)) return;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* iterateFilesRecursively(entryPath);
    } else if (entry.isFile()) {
      yield entryPath;
    }
  }
}

export interface OrphanedMlsMediaFilePurgeSummary {
  scannedFiles: number;
  orphanFilesFound: number;
  deletedFiles: number;
}

export async function purgeOrphanedMlsMediaFiles(
  entityTypes: readonly MlsMediaStorageEntityType[] = MLS_MEDIA_ENTITY_TYPES,
): Promise<OrphanedMlsMediaFilePurgeSummary> {
  const uniqueEntityTypes = [...new Set(entityTypes)];
  const summary: OrphanedMlsMediaFilePurgeSummary = {
    scannedFiles: 0,
    orphanFilesFound: 0,
    deletedFiles: 0,
  };
  if (uniqueEntityTypes.length === 0) return summary;

  const storagePathClauses = buildMlsStoragePathClauses(uniqueEntityTypes);
  const variantStoragePathClauses = uniqueEntityTypes.map(
    (entityType) =>
      sql`replace(${mediaVariants.storagePath}, chr(92), '/') like ${`%/mls/${entityType}/%`}`,
  );
  const referencedPaths = new Set<string>();
  const mediaPaths = await db
    .select({ storagePath: media.storagePath })
    .from(media)
    .where(or(...storagePathClauses));
  for (const row of mediaPaths) {
    if (typeof row.storagePath === 'string') {
      referencedPaths.add(normalizeStoragePath(row.storagePath));
    }
  }

  const variantPaths = await db
    .select({ storagePath: mediaVariants.storagePath })
    .from(mediaVariants)
    .where(or(...variantStoragePathClauses));
  for (const row of variantPaths) {
    if (typeof row.storagePath === 'string') {
      referencedPaths.add(normalizeStoragePath(row.storagePath));
    }
  }

  let orphanPaths: string[] = [];

  for (const entityType of uniqueEntityTypes) {
    for await (const filePath of iterateFilesRecursively(resolveMlsEntityRoot(entityType))) {
      summary.scannedFiles += 1;
      if (referencedPaths.has(normalizeStoragePath(filePath))) continue;
      try {
        orphanPaths.push(filePath);
        summary.orphanFilesFound += 1;
        if (orphanPaths.length >= FILE_DELETE_CHUNK_SIZE) {
          summary.deletedFiles += await deleteFilesInChunks(orphanPaths);
          orphanPaths = [];
        }
      } catch (error) {
        if (!isFilesystemNotFoundError(error)) throw error;
      }
    }
  }

  summary.deletedFiles += await deleteFilesInChunks(orphanPaths);
  return summary;
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

async function purgeUnreferencedMlsMediaIds(mediaIds: readonly UUIDv7[]): Promise<{
  mediaDeleted: number;
  variantFilesDeleted: number;
}> {
  let mediaDeleted = 0;
  let variantFilesDeleted = 0;

  for (let start = 0; start < mediaIds.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const chunk = mediaIds.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const publicReferences = await db
      .select({ mediaId: mlsMedia.mediaId })
      .from(mlsMedia)
      .where(
        and(
          inArray(mlsMedia.mediaId, chunk),
          isNull(mlsMedia.deletedAt),
          sql`not (coalesce(${mlsMedia.permission}, '{}'::varchar[]) && ARRAY['Private']::varchar[])`,
        ),
      );
    const protectedIds = new Set(publicReferences.map((row) => row.mediaId));
    const purgeIds = chunk.filter((id) => !protectedIds.has(id));
    if (purgeIds.length === 0) continue;

    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, purgeIds));
    variantFilesDeleted += await deleteFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );
    const deleted = await db
      .delete(media)
      .where(inArray(media.id, purgeIds))
      .returning({ id: media.id });
    mediaDeleted += deleted.length;
  }

  return { mediaDeleted, variantFilesDeleted };
}

export async function purgeUnavailableMlsMedia(
  resourceRecordKeys?: readonly string[],
): Promise<{ mediaDeleted: number; variantFilesDeleted: number }> {
  if (resourceRecordKeys && resourceRecordKeys.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }
  const unavailable = await db
    .select({ mediaId: mlsMedia.mediaId })
    .from(mlsMedia)
    .where(
      and(
        resourceRecordKeys
          ? inArray(mlsMedia.resourceRecordKey, [...resourceRecordKeys])
          : undefined,
        isNotNull(mlsMedia.mediaId),
        or(
          isNotNull(mlsMedia.deletedAt),
          sql`coalesce(${mlsMedia.permission}, '{}'::varchar[]) && ARRAY['Private']::varchar[]`,
        ),
      ),
    );
  const ids = [...new Set(unavailable.flatMap((row) => (row.mediaId ? [row.mediaId] : [])))];
  return purgeUnreferencedMlsMediaIds(ids);
}

export interface ScopedMlsMediaPurgeSummary {
  linkedRowsScanned: number;
  linkedRowsDetached: number;
  mediaDeleted: number;
  variantFilesDeleted: number;
}

export interface MlsFilesystemNamespacePruneSummary {
  scannedNamespaces: number;
  deletedNamespaces: number;
}

export interface PreSyncMlsMediaCleanupOptions {
  memberKeys?: readonly string[];
  officeKeys?: readonly string[];
  activePropertyStatuses?: readonly StandardStatus[];
}

async function listLinkedNamespaceKeys(
  entityType: MlsMediaStorageEntityType,
  options: PreSyncMlsMediaCleanupOptions = {},
): Promise<Set<string>> {
  const memberKeys = [...new Set((options.memberKeys ?? []).filter(Boolean))];
  const officeKeys = [...new Set((options.officeKeys ?? []).filter(Boolean))];

  const propertyAssociationMemberClause =
    memberKeys.length > 0
      ? or(
          and(isNotNull(properties.listAgentKey), inArray(properties.listAgentKey, memberKeys)),
          and(isNotNull(properties.listAgentMlsId), inArray(properties.listAgentMlsId, memberKeys)),
          and(isNotNull(properties.coListAgentKey), inArray(properties.coListAgentKey, memberKeys)),
          and(
            isNotNull(properties.coListAgentMlsId),
            inArray(properties.coListAgentMlsId, memberKeys),
          ),
        )
      : undefined;

  const propertyAssociationOfficeClause =
    officeKeys.length > 0
      ? or(
          and(isNotNull(properties.listOfficeKey), inArray(properties.listOfficeKey, officeKeys)),
          and(
            isNotNull(properties.listOfficeMlsId),
            inArray(properties.listOfficeMlsId, officeKeys),
          ),
          and(
            isNotNull(properties.coListOfficeKey),
            inArray(properties.coListOfficeKey, officeKeys),
          ),
          and(
            isNotNull(properties.coListOfficeMlsId),
            inArray(properties.coListOfficeMlsId, officeKeys),
          ),
        )
      : undefined;

  const propertyAssociationClause =
    propertyAssociationMemberClause && propertyAssociationOfficeClause
      ? or(propertyAssociationMemberClause, propertyAssociationOfficeClause)
      : (propertyAssociationMemberClause ?? propertyAssociationOfficeClause);

  const resourceEligibilityClause =
    entityType === 'properties'
      ? and(
          isNotNull(properties.listingKey),
          isNull(properties.deletedAt),
          or(
            and(
              eq(properties.mlgCanView, true),
              isNotNull(properties.standardStatus),
              inArray(properties.standardStatus, [...DEFAULT_ACTIVE_PROPERTY_STATUSES]),
            ),
            propertyAssociationClause,
          ),
        )
      : entityType === 'members'
        ? and(
            isNotNull(members.memberMlsId),
            isNull(members.deletedAt),
            eq(members.mlgCanView, true),
          )
        : and(
            isNotNull(offices.officeMlsId),
            isNull(offices.deletedAt),
            eq(offices.mlgCanView, true),
          );

  const namespaceRows = await db
    .select({ resourceRecordKey: mlsMedia.resourceRecordKey })
    .from(mlsMedia)
    .innerJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
    .where(
      and(
        isNotNull(mlsMedia.resourceRecordKey),
        isNull(media.deletedAt),
        resourceEligibilityClause,
      ),
    );

  return new Set(
    namespaceRows
      .map((row) => row.resourceRecordKey)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
}

async function listNamespaceKeysBackedByMlsMediaRows(
  entityType: MlsMediaStorageEntityType,
): Promise<Set<string>> {
  const entityPresenceClause =
    entityType === 'properties'
      ? isNotNull(properties.listingKey)
      : entityType === 'members'
        ? isNotNull(members.memberMlsId)
        : isNotNull(offices.officeMlsId);

  const namespaceRows = await db
    .select({ resourceRecordKey: mlsMedia.resourceRecordKey })
    .from(mlsMedia)
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
    .where(
      and(
        isNotNull(mlsMedia.resourceRecordKey),
        entityPresenceClause,
        or(
          isNull(mlsMedia.deletedAt),
          and(isNotNull(mlsMedia.deletedAt), isNull(mlsMedia.mediaId)),
        ),
      ),
    );

  return new Set(
    namespaceRows
      .map((row) => row.resourceRecordKey)
      .filter((value): value is string => typeof value === 'string' && value.length > 0),
  );
}

export async function pruneMlsMediaNamespacesWithoutLinkedMedia(
  entityTypes: readonly MlsMediaStorageEntityType[] = MLS_MEDIA_ENTITY_TYPES,
  options: PreSyncMlsMediaCleanupOptions = {},
): Promise<Record<MlsMediaStorageEntityType, MlsFilesystemNamespacePruneSummary>> {
  const uniqueEntityTypes = [...new Set(entityTypes)];
  const summary: Record<MlsMediaStorageEntityType, MlsFilesystemNamespacePruneSummary> = {
    properties: { scannedNamespaces: 0, deletedNamespaces: 0 },
    members: { scannedNamespaces: 0, deletedNamespaces: 0 },
    offices: { scannedNamespaces: 0, deletedNamespaces: 0 },
  };

  for (const entityType of uniqueEntityTypes) {
    const keepNamespaces = await listLinkedNamespaceKeys(entityType, options);
    const keepNamespacesFromRows = await listNamespaceKeysBackedByMlsMediaRows(entityType);
    for (const namespace of keepNamespacesFromRows) {
      keepNamespaces.add(namespace);
    }

    // During DB resets or early bootstrap, there may be zero linked namespaces
    // and no matching mls_media keys yet. In that state, avoid destructive
    // pruning to protect local-first media reuse.
    if (keepNamespaces.size === 0) {
      continue;
    }

    const rootPath = resolveMlsEntityRoot(entityType);

    let entries: Dirent<string>[];
    try {
      entries = await fs.readdir(rootPath, { withFileTypes: true });
    } catch (error) {
      if (isFilesystemNotFoundError(error)) {
        continue;
      }
      throw error;
    }

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      summary[entityType].scannedNamespaces += 1;
      if (keepNamespaces.has(entry.name)) {
        continue;
      }

      await fs.rm(path.join(rootPath, entry.name), { recursive: true, force: true });
      summary[entityType].deletedNamespaces += 1;
    }
  }

  return summary;
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

  const uniqueResourceKeys = [...new Set(resourceRecordKeys.filter(Boolean))];
  const mediaIds = new Set<UUIDv7>();
  let mlsMediaRowsDeleted = 0;

  for (let start = 0; start < uniqueResourceKeys.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const keyChunk = uniqueResourceKeys.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const linkedRows = await db
      .select({ mediaId: mlsMedia.mediaId })
      .from(mlsMedia)
      .where(and(inArray(mlsMedia.resourceRecordKey, keyChunk), isNotNull(mlsMedia.mediaId)));

    for (const row of linkedRows) {
      if (row.mediaId) mediaIds.add(row.mediaId);
    }

    const deletedMlsMedia = await db
      .delete(mlsMedia)
      .where(inArray(mlsMedia.resourceRecordKey, keyChunk))
      .returning({ mediaKey: mlsMedia.mediaKey });
    mlsMediaRowsDeleted += deletedMlsMedia.length;
  }

  const mediaSummary = await purgeUnreferencedMlsMediaIds([...mediaIds]);

  return {
    ...mediaSummary,
    mlsMediaRowsDeleted,
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

  const storagePathClauses = buildMlsStoragePathClauses(uniqueEntityTypes);

  if (storagePathClauses.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }

  const deadMediaRows = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        isNull(media.deletedAt),
        or(...storagePathClauses),
        sql`not exists (
          select 1 from mls_media linked
          where linked.media_id = ${media.id}
        )`,
      ),
    );

  const mediaIds = deadMediaRows.map((row) => row.id);

  if (mediaIds.length === 0) {
    return { mediaDeleted: 0, variantFilesDeleted: 0 };
  }

  let mediaDeleted = 0;
  let variantFilesDeleted = 0;
  for (let start = 0; start < mediaIds.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const chunk = mediaIds.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, chunk));

    variantFilesDeleted += await deleteFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );

    const deletedMediaRows = await db
      .delete(media)
      .where(inArray(media.id, chunk))
      .returning({ id: media.id });
    mediaDeleted += deletedMediaRows.length;
  }

  return { mediaDeleted, variantFilesDeleted };
}

export async function purgeSoftDeletedMlsMedia(
  entityTypes: readonly MlsMediaStorageEntityType[] = MLS_MEDIA_ENTITY_TYPES,
): Promise<{ mediaDeleted: number; filesDeleted: number }> {
  const uniqueEntityTypes = [...new Set(entityTypes)];
  if (uniqueEntityTypes.length === 0) return { mediaDeleted: 0, filesDeleted: 0 };

  const storagePathClauses = buildMlsStoragePathClauses(uniqueEntityTypes);
  const softDeletedRows = await db
    .select({ id: media.id, storagePath: media.storagePath })
    .from(media)
    .where(and(isNotNull(media.deletedAt), or(...storagePathClauses)));
  const mediaIds = softDeletedRows.map((row) => row.id);
  if (mediaIds.length === 0) return { mediaDeleted: 0, filesDeleted: 0 };
  const storagePathsById = new Map(softDeletedRows.map((row) => [row.id, row.storagePath]));

  let mediaDeleted = 0;
  let filesDeleted = 0;
  for (let start = 0; start < mediaIds.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const chunk = mediaIds.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, chunk));
    filesDeleted += await deleteFilesInChunks([
      ...chunk.flatMap((mediaId) => {
        const storagePath = storagePathsById.get(mediaId);
        return storagePath ? [storagePath] : [];
      }),
      ...variants.map((variant) => variant.storagePath),
    ]);

    const deleted = await db
      .delete(media)
      .where(inArray(media.id, chunk))
      .returning({ id: media.id });
    mediaDeleted += deleted.length;
  }

  return { mediaDeleted, filesDeleted };
}

/**
 * Purges linked MLS media that falls outside the desired sync scope:
 * - primary media for active + viewable properties
 * - full media for configured associated members/offices
 * - full property media for listings associated to configured members/offices
 */
export async function purgeScopedMlsMediaBeforeSync(
  options: PreSyncMlsMediaCleanupOptions = {},
): Promise<ScopedMlsMediaPurgeSummary> {
  const memberKeys = [...new Set((options.memberKeys ?? []).filter(Boolean))];
  const officeKeys = [...new Set((options.officeKeys ?? []).filter(Boolean))];
  const activePropertyStatuses: StandardStatus[] = [
    ...new Set(
      (options.activePropertyStatuses && options.activePropertyStatuses.length > 0
        ? options.activePropertyStatuses
        : [...DEFAULT_ACTIVE_PROPERTY_STATUSES]
      ).filter(Boolean) as StandardStatus[],
    ),
  ];

  const propertyActiveViewableMediaClause = and(
    isNotNull(properties.listingKey),
    eq(properties.mlgCanView, true),
    isNotNull(properties.standardStatus),
    inArray(properties.standardStatus, activePropertyStatuses),
    isNull(mlsMedia.deletedAt),
    sql`not (coalesce(${mlsMedia.permission}, '{}'::varchar[]) && ARRAY['Private']::varchar[])`,
  );
  const propertyPrimaryActiveViewableClause = and(
    propertyActiveViewableMediaClause,
    buildPrimaryMlsMediaClause(),
  );
  const propertySecondaryActiveViewableClause = and(
    propertyActiveViewableMediaClause,
    not(buildPrimaryMlsMediaClause()),
  );

  const propertyAssociationMemberClause =
    memberKeys.length > 0
      ? or(
          and(isNotNull(properties.listAgentKey), inArray(properties.listAgentKey, memberKeys)),
          and(isNotNull(properties.listAgentMlsId), inArray(properties.listAgentMlsId, memberKeys)),
          and(isNotNull(properties.coListAgentKey), inArray(properties.coListAgentKey, memberKeys)),
          and(
            isNotNull(properties.coListAgentMlsId),
            inArray(properties.coListAgentMlsId, memberKeys),
          ),
        )
      : undefined;

  const propertyAssociationOfficeClause =
    officeKeys.length > 0
      ? or(
          and(isNotNull(properties.listOfficeKey), inArray(properties.listOfficeKey, officeKeys)),
          and(
            isNotNull(properties.listOfficeMlsId),
            inArray(properties.listOfficeMlsId, officeKeys),
          ),
          and(
            isNotNull(properties.coListOfficeKey),
            inArray(properties.coListOfficeKey, officeKeys),
          ),
          and(
            isNotNull(properties.coListOfficeMlsId),
            inArray(properties.coListOfficeMlsId, officeKeys),
          ),
        )
      : undefined;

  const propertyAssociationClause =
    propertyAssociationMemberClause && propertyAssociationOfficeClause
      ? or(propertyAssociationMemberClause, propertyAssociationOfficeClause)
      : (propertyAssociationMemberClause ?? propertyAssociationOfficeClause);

  const propertyAssociatedAnyMediaClause = propertyAssociationClause
    ? and(isNotNull(properties.listingKey), propertyAssociationClause)
    : undefined;

  const memberAssociatedAnyMediaClause = and(
    isNotNull(members.memberMlsId),
    isNull(members.deletedAt),
    eq(members.mlgCanView, true),
  );

  const officeAssociatedAnyMediaClause = and(
    isNotNull(offices.officeMlsId),
    isNull(offices.deletedAt),
    eq(offices.mlgCanView, true),
  );

  const desiredScopeClauses = [
    propertyActiveViewableMediaClause,
    propertyAssociatedAnyMediaClause,
    memberAssociatedAnyMediaClause,
    officeAssociatedAnyMediaClause,
  ].filter((clause) => clause !== undefined);

  const desiredLinkedScopeClause =
    desiredScopeClauses.length === 1 ? desiredScopeClauses[0] : or(...desiredScopeClauses);
  const desiredLinkedScopeClauseNonNull =
    desiredLinkedScopeClause ?? propertyPrimaryActiveViewableClause;

  let variantFilesDeleted = 0;
  const secondaryMediaRows = await db
    .select({ mediaId: media.id })
    .from(mlsMedia)
    .innerJoin(media, eq(mlsMedia.mediaId, media.id))
    .innerJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .where(
      and(
        isNotNull(mlsMedia.mediaId),
        isNull(media.deletedAt),
        propertySecondaryActiveViewableClause,
      ),
    );
  const secondaryMediaIds = [...new Set(secondaryMediaRows.map((row) => row.mediaId))];
  for (let start = 0; start < secondaryMediaIds.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const chunk = secondaryMediaIds.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(
        and(inArray(mediaVariants.mediaId, chunk), not(eq(mediaVariants.variantName, 'full'))),
      );
    if (variants.length === 0) continue;

    await db
      .delete(mediaVariants)
      .where(
        and(inArray(mediaVariants.mediaId, chunk), not(eq(mediaVariants.variantName, 'full'))),
      );
    variantFilesDeleted += await deleteFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );
  }

  const rowsToDetach = await db
    .select({ mediaId: media.id, mediaKey: mlsMedia.mediaKey })
    .from(mlsMedia)
    .innerJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
    .where(
      and(
        isNotNull(mlsMedia.mediaId),
        isNull(media.deletedAt),
        not(desiredLinkedScopeClauseNonNull as NonNullable<typeof desiredLinkedScopeClauseNonNull>),
      ),
    );

  const linkedRowsScannedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(mlsMedia)
    .innerJoin(media, eq(mlsMedia.mediaId, media.id))
    .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
    .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
    .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
    .where(and(isNotNull(mlsMedia.mediaId), isNull(media.deletedAt)));

  const linkedRowsScanned = Number(linkedRowsScannedResult[0]?.count ?? 0);

  const mediaIds = [...new Set(rowsToDetach.map((row) => row.mediaId).filter(Boolean))] as UUIDv7[];

  if (mediaIds.length === 0) {
    return {
      linkedRowsScanned,
      linkedRowsDetached: 0,
      mediaDeleted: 0,
      variantFilesDeleted,
    };
  }

  let mediaDeleted = 0;

  for (let start = 0; start < mediaIds.length; start += MEDIA_ID_QUERY_CHUNK_SIZE) {
    const chunk = mediaIds.slice(start, start + MEDIA_ID_QUERY_CHUNK_SIZE);
    const retainedReferences = await db
      .select({ mediaId: mlsMedia.mediaId })
      .from(mlsMedia)
      .innerJoin(media, eq(mlsMedia.mediaId, media.id))
      .leftJoin(properties, eq(mlsMedia.resourceRecordKey, properties.listingKey))
      .leftJoin(members, eq(mlsMedia.resourceRecordKey, members.memberMlsId))
      .leftJoin(offices, eq(mlsMedia.resourceRecordKey, offices.officeMlsId))
      .where(
        and(
          inArray(mlsMedia.mediaId, chunk),
          isNull(mlsMedia.deletedAt),
          isNull(media.deletedAt),
          sql`not (coalesce(${mlsMedia.permission}, '{}'::varchar[]) && ARRAY['Private']::varchar[])`,
          desiredLinkedScopeClauseNonNull,
        ),
      );
    const protectedIds = new Set(retainedReferences.map((row) => row.mediaId));
    const purgeIds = chunk.filter((id) => !protectedIds.has(id));

    const rowsSharingRetainedMedia = rowsToDetach
      .filter((row) => row.mediaId && protectedIds.has(row.mediaId))
      .map((row) => row.mediaKey);
    for (
      let keyStart = 0;
      keyStart < rowsSharingRetainedMedia.length;
      keyStart += MEDIA_ID_QUERY_CHUNK_SIZE
    ) {
      await db
        .update(mlsMedia)
        .set({ mediaId: null, downloadedSourceTimestamp: null, updatedAt: new Date() })
        .where(
          inArray(
            mlsMedia.mediaKey,
            rowsSharingRetainedMedia.slice(keyStart, keyStart + MEDIA_ID_QUERY_CHUNK_SIZE),
          ),
        );
    }

    if (purgeIds.length === 0) continue;

    const variants = await db
      .select({ storagePath: mediaVariants.storagePath })
      .from(mediaVariants)
      .where(inArray(mediaVariants.mediaId, purgeIds));

    const deletedMediaRows = await db
      .delete(media)
      .where(inArray(media.id, purgeIds))
      .returning({ id: media.id });

    mediaDeleted += deletedMediaRows.length;
    variantFilesDeleted += await deleteFilesInChunks(
      variants.map((variant) => variant.storagePath),
    );
  }

  return {
    linkedRowsScanned,
    linkedRowsDetached: rowsToDetach.length,
    mediaDeleted,
    variantFilesDeleted,
  };
}
