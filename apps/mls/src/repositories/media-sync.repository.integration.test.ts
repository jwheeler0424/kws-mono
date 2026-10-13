import { afterAll, beforeAll, describe, expect, it, mock } from 'bun:test';
import { drizzle } from 'drizzle-orm/node-postgres';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const connectionString = process.env.MLS_TEST_DATABASE_URL;
const isolated = connectionString ? new URL(connectionString) : null;
if (
  isolated &&
  (isolated.hostname !== '127.0.0.1' || isolated.pathname !== '/mls_compliance_test')
) {
  throw new Error(
    'MLS integration tests require the isolated loopback mls_compliance_test database',
  );
}

describe.skipIf(!connectionString)('MLS acquisition database contracts', () => {
  const pool = new Pool({ connectionString });
  const database = drizzle({ client: pool });
  let claimParentMedia: typeof import('./media-sync.repository').claimParentMedia;
  let releaseParentMedia: typeof import('./media-sync.repository').releaseParentMedia;
  let listMlsMediaSyncCandidates: typeof import('./media-sync.repository').listMlsMediaSyncCandidates;
  let reconcileResourceMediaBatch: typeof import('./resource-media.repository').reconcileResourceMediaBatch;
  let claimSyncCursor: typeof import('./sync-cursor.repository').claimSyncCursor;
  let checkpointSyncCursor: typeof import('./sync-cursor.repository').checkpointSyncCursor;
  let finishSyncCursor: typeof import('./sync-cursor.repository').finishSyncCursor;
  let purgeScopedMlsMediaBeforeSync: typeof import('./media-cleanup.repository').purgeScopedMlsMediaBeforeSync;
  const localId = '0199aabb-0000-7000-8000-000000000001';

  beforeAll(async () => {
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await pool.query(`CREATE FUNCTION immutable_array_to_string(text[], text)
      RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT array_to_string($1, $2); $$`);
    const exported = Bun.spawn(
      ['bunx', 'drizzle-kit', 'export', '--dialect', 'postgresql', '--schema', './src/schema.ts'],
      {
        cwd: fileURLToPath(new URL('../../../../packages/schema/', import.meta.url)),
        stdout: 'pipe',
        stderr: 'pipe',
      },
    );
    const [schemaSql, exportErrors, exitCode] = await Promise.all([
      new Response(exported.stdout).text(),
      new Response(exported.stderr).text(),
      exported.exited,
    ]);
    if (exitCode !== 0) throw new Error(`Schema SQL export failed: ${exportErrors}`);
    await pool.query(schemaSql);
    await pool.query(
      "INSERT INTO media(id, filename, original_filename, mime_type, file_size, file_extension, storage_path, storage_key, url) VALUES ($1, 'existing.webp', 'original.jpeg', 'image/webp', 1, 'webp', '/test/absent.webp', 'existing', '/media/existing.webp')",
      [localId],
    );
    await pool.query(
      "INSERT INTO mls_media(media_key, resource_record_key, media_id, media_modification_timestamp) VALUES ('photo', 'NWM1', $1, '2026-09-17T00:00:00Z')",
      [localId],
    );
    await mock.module(fileURLToPath(new URL('../lib/database.ts', import.meta.url)), () => ({
      db: database,
      pool,
    }));
    ({ claimParentMedia, releaseParentMedia, listMlsMediaSyncCandidates } =
      await import('./media-sync.repository'));
    ({ reconcileResourceMediaBatch } = await import('./resource-media.repository'));
    ({ claimSyncCursor, checkpointSyncCursor, finishSyncCursor } =
      await import('./sync-cursor.repository'));
    ({ purgeScopedMlsMediaBeforeSync } = await import('./media-cleanup.repository'));
  }, 30_000);

  afterAll(async () => {
    await pool.end();
    mock.restore();
  });

  it('stores local media links with unclaimed acquisition state', async () => {
    const result = await pool.query(
      "SELECT media_id, acquisition_token FROM mls_media WHERE media_key='photo'",
    );
    expect(result.rows[0]?.media_id).toBe(localId);
    expect(result.rows[0]?.acquisition_token).toBeNull();
  });

  it('permits one concurrent parent claim and persists a failed-download cooldown', async () => {
    const claims = await Promise.all([claimParentMedia('NWM1'), claimParentMedia('NWM1')]);
    const tokens = claims.filter((token): token is string => Boolean(token));
    expect(tokens).toHaveLength(1);
    await releaseParentMedia(tokens[0]!, 'HTTP 429');
    expect(await claimParentMedia('NWM1')).toBeNull();
    await pool.query('UPDATE mls_media SET next_attempt_at=null');
  });

  it('preserves associations on metadata updates and removes empty-snapshot media', async () => {
    await reconcileResourceMediaBatch([
      {
        resourceRecordKey: 'NWM1',
        mediaRecords: [
          {
            mediaKey: 'photo',
            resourceRecordKey: 'NWM1',
            mediaModificationTimestamp: '2026-09-17T00:00:00Z',
            order: 2,
            mediaURL: null,
            deletedAt: null,
          },
        ],
      },
    ]);
    const result = await pool.query(
      'SELECT media_id, "order" FROM mls_media WHERE media_key=\'photo\'',
    );
    expect(result.rows[0]?.media_id).toBe(localId);
    expect(result.rows[0]?.order).toBe(2);
    await reconcileResourceMediaBatch([{ resourceRecordKey: 'NWM1', mediaRecords: [] }]);
    const removed = await pool.query("SELECT deleted_at FROM mls_media WHERE media_key='photo'");
    expect(removed.rows[0]?.deleted_at).toBeInstanceOf(Date);
    expect((await pool.query('SELECT id FROM media WHERE id=$1', [localId])).rows).toHaveLength(0);
  });

  it('selects the first public photo when a private photo has a lower order', async () => {
    await pool.query(
      "INSERT INTO properties(listing_key, listing_id, standard_status, mlg_can_view) VALUES ('NWM_PRIMARY_TEST', 'NWM123', 'Active', true)",
    );
    await pool.query(
      `INSERT INTO mls_media(media_key, resource_record_key, permission, preferred_photo_yn, "order", media_modification_timestamp)
       VALUES
         ('private-primary', 'NWM_PRIMARY_TEST', ARRAY['Private'], false, 0, '2026-09-17T00:00:00Z'),
         ('public-secondary', 'NWM_PRIMARY_TEST', null, false, 1, '2026-09-17T00:00:00Z')`,
    );

    const candidates = await listMlsMediaSyncCandidates(10, {
      filterEntityTypes: ['properties'],
      primaryOnlyForAllProperties: true,
      enforceEligibilityForNonAssociatedProperties: true,
    });

    expect(candidates.map((candidate) => candidate.mediaKey)).toEqual(['public-secondary']);
    await pool.query("DELETE FROM mls_media WHERE resource_record_key='NWM_PRIMARY_TEST'");
    await pool.query("DELETE FROM properties WHERE listing_key='NWM_PRIMARY_TEST'");
  });

  it('purges non-primary photos from active unconfigured listings', async () => {
    const privateMediaId = '0199aabb-0000-7000-8000-000000000002';
    const publicMediaId = '0199aabb-0000-7000-8000-000000000003';
    await pool.query(
      "INSERT INTO properties(listing_key, listing_id, standard_status, mlg_can_view) VALUES ('NWM_PRIMARY_CLEANUP', 'NWM124', 'Active', true)",
    );
    await pool.query(
      `INSERT INTO media(id, filename, original_filename, mime_type, file_size, file_extension, storage_path, storage_key, url)
       VALUES
         ($1, 'private.webp', 'private.jpg', 'image/webp', 1, 'webp', '/test/private-primary.webp', 'private', '/media/private.webp'),
         ($2, 'public.webp', 'public.jpg', 'image/webp', 1, 'webp', '/test/public-primary.webp', 'public', '/media/public.webp')`,
      [privateMediaId, publicMediaId],
    );
    await pool.query(
      `INSERT INTO mls_media(media_key, resource_record_key, media_id, permission, preferred_photo_yn, "order", media_modification_timestamp)
       VALUES
         ('private-cleanup', 'NWM_PRIMARY_CLEANUP', $1, ARRAY['Private'], false, 0, '2026-09-17T00:00:00Z'),
         ('public-cleanup', 'NWM_PRIMARY_CLEANUP', $2, null, false, 1, '2026-09-17T00:00:00Z')`,
      [privateMediaId, publicMediaId],
    );

    const summary = await purgeScopedMlsMediaBeforeSync();
    const associations = await pool.query(
      `SELECT media_key, media_id FROM mls_media WHERE resource_record_key='NWM_PRIMARY_CLEANUP' ORDER BY media_key`,
    );
    const remainingMedia = await pool.query(
      'SELECT id FROM media WHERE id = ANY($1::uuid[]) ORDER BY id',
      [[privateMediaId, publicMediaId]],
    );

    expect(summary.linkedRowsDetached).toBe(1);
    expect(summary.mediaDeleted).toBe(1);
    expect(associations.rows).toEqual([
      { media_key: 'private-cleanup', media_id: null },
      { media_key: 'public-cleanup', media_id: publicMediaId },
    ]);
    expect(remainingMedia.rows).toEqual([{ id: publicMediaId }]);

    await pool.query("DELETE FROM mls_media WHERE resource_record_key='NWM_PRIMARY_CLEANUP'");
    await pool.query("DELETE FROM properties WHERE listing_key='NWM_PRIMARY_CLEANUP'");
  });

  it('serializes resource replication and does not regress received watermarks', async () => {
    const claims = await Promise.all([
      claimSyncCursor('Property', 'nwmls', new Date('2026-09-17T00:00:00Z')),
      claimSyncCursor('Property', 'nwmls', new Date('2026-09-17T00:00:00Z')),
    ]);
    const claimed = claims.find(Boolean)!;
    expect(claims.filter(Boolean)).toHaveLength(1);
    await checkpointSyncCursor(claimed.token, new Date('2026-09-18T00:00:00Z'));
    await checkpointSyncCursor(claimed.token, new Date('2026-09-17T00:00:00Z'));
    await finishSyncCursor(claimed.token);
    const next = await claimSyncCursor('Property', 'nwmls');
    expect(new Date(next!.timestamp!).toISOString()).toBe('2026-09-18T00:00:00.000Z');
    await finishSyncCursor(next!.token);
  });
});
