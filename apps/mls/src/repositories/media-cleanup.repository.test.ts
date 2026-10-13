import { media, mediaVariants, mlsMedia } from '@kws/schema';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { mkdtemp, mkdir, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let mediaPaths: Array<{ storagePath: string }> = [];
let variantPaths: Array<{ storagePath: string }> = [];
let unavailableRows: Array<{ mediaId: string }> = [];
let publicMediaRows: Array<{ mediaId: string }> = [];
let mlsMediaSelectCount = 0;
let deletedMediaRows: Array<{ id: string }> = [];
let temporaryDirectory: string;
let originalMediaStorePath: string | undefined;

const databaseModulePath = fileURLToPath(new URL('../lib/database.ts', import.meta.url));
await mock.module(databaseModulePath, () => ({
  db: {
    select: () => ({
      from: (table: unknown) => ({
        where: async () => {
          if (table === media) return mediaPaths;
          if (table === mediaVariants) return variantPaths;
          if (table === mlsMedia) {
            mlsMediaSelectCount += 1;
            return mlsMediaSelectCount % 2 === 1 ? unavailableRows : publicMediaRows;
          }
          return [];
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: () => ({
        returning: async () => (table === media ? deletedMediaRows : []),
      }),
    }),
  },
}));

const { purgeEntityMedia, purgeOrphanedMlsMediaFiles, purgeUnavailableMlsMedia } =
  await import('./media-cleanup.repository');

beforeEach(async () => {
  originalMediaStorePath = process.env.MLS_MEDIA_STORE_PATH;
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'mls-media-cleanup-'));
  process.env.MLS_MEDIA_STORE_PATH = temporaryDirectory;
  mediaPaths = [];
  variantPaths = [];
  unavailableRows = [];
  publicMediaRows = [];
  mlsMediaSelectCount = 0;
  deletedMediaRows = [];
});

afterEach(async () => {
  if (originalMediaStorePath === undefined) {
    delete process.env.MLS_MEDIA_STORE_PATH;
  } else {
    process.env.MLS_MEDIA_STORE_PATH = originalMediaStorePath;
  }
  await rm(temporaryDirectory, { recursive: true, force: true });
  mock.restore();
});

describe('purgeOrphanedMlsMediaFiles', () => {
  it('removes old unreferenced files and preserves referenced and recent files', async () => {
    const namespace = path.join(temporaryDirectory, 'mls', 'properties', 'NWM1');
    await mkdir(namespace, { recursive: true });
    const referencedPath = path.join(namespace, 'referenced_full.webp');
    const variantPath = path.join(namespace, 'referenced_preview.webp');
    const orphanPath = path.join(namespace, 'orphan_preview.webp');
    const recentPath = path.join(namespace, 'recent_thumbnail.webp');
    await Promise.all([
      writeFile(referencedPath, 'referenced'),
      writeFile(variantPath, 'variant'),
      writeFile(orphanPath, 'orphan'),
      writeFile(recentPath, 'recent'),
    ]);
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(orphanPath, oldDate, oldDate);
    mediaPaths = [{ storagePath: referencedPath }];
    variantPaths = [{ storagePath: variantPath }];

    const summary = await purgeOrphanedMlsMediaFiles(['properties'], { minimumAgeMs: 60_000 });

    expect(summary).toEqual({
      scannedFiles: 4,
      orphanFilesFound: 1,
      deletedFiles: 1,
    });
    expect(await Bun.file(referencedPath).exists()).toBe(true);
    expect(await Bun.file(variantPath).exists()).toBe(true);
    expect(await Bun.file(orphanPath).exists()).toBe(false);
    expect(await Bun.file(recentPath).exists()).toBe(true);
  });

  it('deletes old files when no MLS media paths are referenced', async () => {
    const namespace = path.join(temporaryDirectory, 'mls', 'properties', 'NWM1');
    await mkdir(namespace, { recursive: true });
    const localFirstPath = path.join(namespace, 'local-first_full.webp');
    await writeFile(localFirstPath, 'local-first');
    const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
    await utimes(localFirstPath, oldDate, oldDate);

    const summary = await purgeOrphanedMlsMediaFiles(['properties'], { minimumAgeMs: 0 });

    expect(summary).toEqual({
      scannedFiles: 1,
      orphanFilesFound: 1,
      deletedFiles: 1,
    });
    expect(await Bun.file(localFirstPath).exists()).toBe(false);
  });
});

describe('purgeUnavailableMlsMedia', () => {
  it('deletes hidden media and its variant files when no public association remains', async () => {
    const namespace = path.join(temporaryDirectory, 'mls', 'properties', 'NWM1');
    await mkdir(namespace, { recursive: true });
    const variantPath = path.join(namespace, 'private_preview.webp');
    await writeFile(variantPath, 'private');
    unavailableRows = [{ mediaId: '0199aabb-0000-7000-8000-000000000001' }];
    variantPaths = [{ storagePath: variantPath }];
    deletedMediaRows = [{ id: unavailableRows[0]!.mediaId }];

    const summary = await purgeUnavailableMlsMedia();

    expect(summary).toEqual({ mediaDeleted: 1, variantFilesDeleted: 1 });
    expect(await Bun.file(variantPath).exists()).toBe(false);
  });

  it('preserves media still referenced by a public MLS association', async () => {
    unavailableRows = [{ mediaId: '0199aabb-0000-7000-8000-000000000001' }];
    publicMediaRows = [{ mediaId: unavailableRows[0]!.mediaId }];

    const summary = await purgeUnavailableMlsMedia();

    expect(summary).toEqual({ mediaDeleted: 0, variantFilesDeleted: 0 });
  });
});

describe('purgeEntityMedia', () => {
  it('preserves media still linked to another public MLS record', async () => {
    const mediaId = '0199aabb-0000-7000-8000-000000000001';
    unavailableRows = [{ mediaId }];
    publicMediaRows = [{ mediaId }];

    const summary = await purgeEntityMedia(['deleted-listing']);

    expect(summary.mediaDeleted).toBe(0);
    expect(summary.variantFilesDeleted).toBe(0);
  });
});
