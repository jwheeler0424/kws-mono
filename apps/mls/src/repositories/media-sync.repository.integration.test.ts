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
  let enqueueResourceMediaBatch: typeof import('./resource-media.repository').enqueueResourceMediaBatch;
  let reconcileResourceMediaBatch: typeof import('./resource-media.repository').reconcileResourceMediaBatch;
  let claimMlsMediaQueueCursor: typeof import('./media-queue-cursor.repository').claimMlsMediaQueueCursor;
  let checkpointMlsMediaQueueCursor: typeof import('./media-queue-cursor.repository').checkpointMlsMediaQueueCursor;
  let finishMlsMediaQueueCursor: typeof import('./media-queue-cursor.repository').finishMlsMediaQueueCursor;
  let listIncompleteActiveListingKeys: typeof import('./media-queue.repository').listIncompleteActiveListingKeys;
  let findOldestIncompleteActiveListingTimestamp: typeof import('./media-queue.repository').findOldestIncompleteActiveListingTimestamp;
  let countPendingFreshMediaUrls: typeof import('./media-queue.repository').countPendingFreshMediaUrls;
  let clearDeadMlsMediaQueueEntries: typeof import('./media-queue.repository').clearDeadMlsMediaQueueEntries;
  let purgeRetiredMlsMediaRows: typeof import('./media-queue.repository').purgeRetiredMlsMediaRows;
  let claimSyncCursor: typeof import('./sync-cursor.repository').claimSyncCursor;
  let checkpointSyncCursor: typeof import('./sync-cursor.repository').checkpointSyncCursor;
  let finishSyncCursor: typeof import('./sync-cursor.repository').finishSyncCursor;
  let purgeScopedMlsMediaBeforeSync: typeof import('./media-cleanup.repository').purgeScopedMlsMediaBeforeSync;
  let isInitialSeedComplete: typeof import('./seed-state.repository').isInitialSeedComplete;
  let markInitialSeedComplete: typeof import('./seed-state.repository').markInitialSeedComplete;
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
    ({ enqueueResourceMediaBatch, reconcileResourceMediaBatch } =
      await import('./resource-media.repository'));
    ({ claimMlsMediaQueueCursor, checkpointMlsMediaQueueCursor, finishMlsMediaQueueCursor } =
      await import('./media-queue-cursor.repository'));
    ({
      listIncompleteActiveListingKeys,
      findOldestIncompleteActiveListingTimestamp,
      countPendingFreshMediaUrls,
      clearDeadMlsMediaQueueEntries,
      purgeRetiredMlsMediaRows,
    } = await import('./media-queue.repository'));
    ({ claimSyncCursor, checkpointSyncCursor, finishSyncCursor } =
      await import('./sync-cursor.repository'));
    ({ purgeScopedMlsMediaBeforeSync } = await import('./media-cleanup.repository'));
    ({ isInitialSeedComplete, markInitialSeedComplete } = await import('./seed-state.repository'));
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

  it('enqueues discovered media without retiring other media in the parent snapshot', async () => {
    await enqueueResourceMediaBatch([
      {
        resourceRecordKey: 'NWM1',
        mediaRecords: [
          {
            mediaKey: 'discovered-photo',
            resourceRecordKey: 'NWM1',
            mediaURL: 'https://media.mlsgrid.com/discovered',
            deletedAt: null,
          },
        ],
      },
    ]);
    const rows = await pool.query(
      "SELECT media_key, media_url, deleted_at FROM mls_media WHERE resource_record_key='NWM1' ORDER BY media_key",
    );
    expect(rows.rows).toEqual([
      {
        media_key: 'discovered-photo',
        media_url: 'https://media.mlsgrid.com/discovered',
        deleted_at: null,
      },
      { media_key: 'photo', media_url: null, deleted_at: null },
    ]);
    await pool.query("DELETE FROM mls_media WHERE media_key='discovered-photo'");
  });

  it('leases and resumes the media queue refresh cursor', async () => {
    const first = await claimMlsMediaQueueCursor('nwmls-queue-test');
    expect(first?.resumeFrom).toBeNull();
    expect(await claimMlsMediaQueueCursor('nwmls-queue-test')).toBeNull();

    await checkpointMlsMediaQueueCursor(first!.token, new Date('2026-10-01T00:00:00Z'));
    await finishMlsMediaQueueCursor(first!.token);

    const resumed = await claimMlsMediaQueueCursor('nwmls-queue-test');
    expect(resumed?.resumeFrom?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    await checkpointMlsMediaQueueCursor(resumed!.token, null);
    await finishMlsMediaQueueCursor(resumed!.token);
  });

  it('treats only galleries without a downloadable fresh URL as incomplete', async () => {
    const freshExpiry = Math.floor((Date.now() + 30 * 60_000) / 1_000);
    await pool.query(
      `INSERT INTO properties(listing_key, listing_id, standard_status, mlg_can_view, modification_timestamp, photos_count)
       VALUES
         ('NWM_QUEUE_STALE', 'NWMQ1', 'Active', true, '2026-09-01T00:00:00Z', 2),
         ('NWM_QUEUE_FRESH', 'NWMQ2', 'Active', true, '2026-08-01T00:00:00Z', 1),
         ('NWM_QUEUE_UNSEEN', 'NWMQ3', 'Active', true, '2026-10-01T00:00:00Z', 3),
         ('NWM_QUEUE_PENDING', 'NWMQ4', 'Pending', true, '2026-07-01T00:00:00Z', 1)`,
    );
    await pool.query(
      `INSERT INTO mls_media(media_key, resource_record_key, media_url, last_acquisition_error, media_modification_timestamp)
       VALUES
         ('queue-stale', 'NWM_QUEUE_STALE', null, 'MLS media URL refresh required', '2026-09-01T00:00:00Z'),
         ('queue-fresh', 'NWM_QUEUE_FRESH', $1, null, '2026-08-01T00:00:00Z'),
         ('queue-pending', 'NWM_QUEUE_PENDING', null, null, '2026-07-01T00:00:00Z')`,
      [`https://media.mlsgrid.com/token=x&expires=${freshExpiry}&id=a/photo.jpeg`],
    );

    const incomplete = await listIncompleteActiveListingKeys([
      'NWM_QUEUE_STALE',
      'NWM_QUEUE_FRESH',
      'NWM_QUEUE_UNSEEN',
      'NWM_QUEUE_PENDING',
    ]);
    expect([...incomplete].sort()).toEqual(['NWM_QUEUE_STALE', 'NWM_QUEUE_UNSEEN']);
    expect((await findOldestIncompleteActiveListingTimestamp(null))?.toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );

    await pool.query("DELETE FROM mls_media WHERE resource_record_key LIKE 'NWM_QUEUE_%'");
    await pool.query("DELETE FROM properties WHERE listing_key LIKE 'NWM_QUEUE_%'");
  });

  it('counts only usable links as backlog and clears dead links and retired rows', async () => {
    const now = Date.now();
    const fresh = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 30 * 60_000) / 1_000)}&id=a/photo.jpeg`;
    const expired = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now - 60_000) / 1_000)}&id=a/photo.jpeg`;
    const downloadedId = '0199aabb-0000-7000-8000-000000000020';
    await pool.query(
      `INSERT INTO properties(listing_key, listing_id, standard_status, mlg_can_view)
       VALUES ('NWM_DEAD', 'NWMD1', 'Active', true), ('NWM_DEAD_PENDING', 'NWMD2', 'Pending', true)`,
    );
    await pool.query(
      "INSERT INTO mls_media(media_key, resource_record_key, media_url, media_modification_timestamp) VALUES ('pending-parent-link', 'NWM_DEAD_PENDING', $1, '2026-09-01T00:00:00Z')",
      [
        `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 30 * 60_000) / 1_000)}&id=b/photo.jpeg`,
      ],
    );
    await pool.query(
      "INSERT INTO media(id, filename, original_filename, mime_type, file_size, file_extension, storage_path, storage_key, url) VALUES ($1, 'done.webp', 'done.jpg', 'image/webp', 1, 'webp', '/test/done.webp', 'done', '/media/done.webp')",
      [downloadedId],
    );
    await pool.query(
      `INSERT INTO mls_media(media_key, resource_record_key, media_id, media_url, downloaded_source_timestamp, media_modification_timestamp, deleted_at, last_acquisition_error)
       VALUES
         ('dead-pending', 'NWM_DEAD', null, $1, null, '2026-09-01T00:00:00Z', null, null),
         ('dead-done', 'NWM_DEAD', $3, $1, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', null, null),
         ('live-pending', 'NWM_DEAD', null, $2, null, '2026-09-01T00:00:00Z', null, null),
         ('live-done', 'NWM_DEAD', $3, $2, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z', null, null),
         ('legacy-pending', 'NWM_DEAD', null, null, null, '2026-09-01T00:00:00Z', null, null),
         ('retired-marked', 'NWM_DEAD', null, null, null, '2026-09-01T00:00:00Z', '2026-01-01T00:00:00Z', 'MLS media URL refresh required'),
         ('retired-recent', 'NWM_DEAD', null, null, null, '2026-09-01T00:00:00Z', now(), null)`,
      [expired, fresh, downloadedId],
    );

    expect(await countPendingFreshMediaUrls()).toBe(1);
    expect(await clearDeadMlsMediaQueueEntries()).toEqual({
      expiredUrlsCleared: 2,
      urlLessRowsMarked: 1,
      deadRefreshMarkersCleared: 1,
    });
    const rows = await pool.query(
      "SELECT media_key, media_url IS NOT NULL AS has_url, last_acquisition_error FROM mls_media WHERE resource_record_key='NWM_DEAD' ORDER BY media_key",
    );
    expect(rows.rows).toEqual([
      { media_key: 'dead-done', has_url: false, last_acquisition_error: null },
      {
        media_key: 'dead-pending',
        has_url: false,
        last_acquisition_error: 'MLS media URL refresh required',
      },
      {
        media_key: 'legacy-pending',
        has_url: false,
        last_acquisition_error: 'MLS media URL refresh required',
      },
      { media_key: 'live-done', has_url: true, last_acquisition_error: null },
      { media_key: 'live-pending', has_url: true, last_acquisition_error: null },
      { media_key: 'retired-marked', has_url: false, last_acquisition_error: null },
      { media_key: 'retired-recent', has_url: false, last_acquisition_error: null },
    ]);
    expect(await clearDeadMlsMediaQueueEntries()).toEqual({
      expiredUrlsCleared: 0,
      urlLessRowsMarked: 0,
      deadRefreshMarkersCleared: 0,
    });

    expect(await purgeRetiredMlsMediaRows(new Date('2026-06-01T00:00:00Z'))).toBe(1);
    const remaining = await pool.query(
      "SELECT media_key FROM mls_media WHERE resource_record_key='NWM_DEAD' ORDER BY media_key",
    );
    expect(remaining.rows.map((row: { media_key: string }) => row.media_key)).toEqual([
      'dead-done',
      'dead-pending',
      'legacy-pending',
      'live-done',
      'live-pending',
      'retired-recent',
    ]);

    await pool.query(
      "DELETE FROM mls_media WHERE resource_record_key IN ('NWM_DEAD', 'NWM_DEAD_PENDING')",
    );
    await pool.query(
      "DELETE FROM properties WHERE listing_key IN ('NWM_DEAD', 'NWM_DEAD_PENDING')",
    );
    await pool.query('DELETE FROM media WHERE id=$1', [downloadedId]);
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
            mediaURL: 'https://media.mlsgrid.com/queued-photo',
            deletedAt: null,
          },
        ],
      },
    ]);
    const result = await pool.query(
      'SELECT media_id, "order", media_url FROM mls_media WHERE media_key=\'photo\'',
    );
    expect(result.rows[0]?.media_id).toBe(localId);
    expect(result.rows[0]?.order).toBe(2);
    expect(result.rows[0]?.media_url).toBe('https://media.mlsgrid.com/queued-photo');
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
      `INSERT INTO mls_media(media_key, resource_record_key, media_url, permission, preferred_photo_yn, "order", media_modification_timestamp)
       VALUES
        ('private-primary', 'NWM_PRIMARY_TEST', null, ARRAY['Private'], false, 0, '2026-09-17T00:00:00Z'),
        ('public-secondary', 'NWM_PRIMARY_TEST', 'https://media.mlsgrid.com/secondary', null, false, 1, '2026-09-17T00:00:00Z')`,
    );

    const candidates = await listMlsMediaSyncCandidates(10, {
      filterEntityTypes: ['properties'],
      primaryOnlyForAllProperties: true,
      enforceEligibilityForNonAssociatedProperties: true,
    });

    expect(candidates.map((candidate) => candidate.mediaKey)).toEqual(['public-secondary']);
    expect(candidates[0]?.mediaURL).toBe('https://media.mlsgrid.com/secondary');
    expect(candidates[0]?.mediaUrlUpdatedAt).toBeInstanceOf(Date);
    await pool.query("DELETE FROM mls_media WHERE resource_record_key='NWM_PRIMARY_TEST'");
    await pool.query("DELETE FROM properties WHERE listing_key='NWM_PRIMARY_TEST'");
  });

  it('keeps full gallery images but trims non-primary variants on active listings', async () => {
    const privateMediaId = '0199aabb-0000-7000-8000-000000000002';
    const primaryMediaId = '0199aabb-0000-7000-8000-000000000003';
    const secondaryMediaId = '0199aabb-0000-7000-8000-000000000004';
    const memberPrimaryMediaId = '0199aabb-0000-7000-8000-000000000005';
    const memberSecondaryMediaId = '0199aabb-0000-7000-8000-000000000006';
    const officePrimaryMediaId = '0199aabb-0000-7000-8000-000000000007';
    const officeSecondaryMediaId = '0199aabb-0000-7000-8000-000000000008';
    await pool.query(
      "INSERT INTO properties(listing_key, listing_id, standard_status, mlg_can_view) VALUES ('NWM_PRIMARY_CLEANUP', 'NWM124', 'Active', true)",
    );
    await pool.query(
      "INSERT INTO members(member_mls_id, mlg_can_view) VALUES ('NWM_MEMBER_CLEANUP', true)",
    );
    await pool.query(
      "INSERT INTO offices(office_mls_id, mlg_can_view) VALUES ('NWM_OFFICE_CLEANUP', true)",
    );
    await pool.query(
      `INSERT INTO media(id, filename, original_filename, mime_type, file_size, file_extension, storage_path, storage_key, url)
       VALUES
         ($1, 'private.webp', 'private.jpg', 'image/webp', 1, 'webp', '/test/private-primary.webp', 'private', '/media/private.webp'),
         ($2, 'primary.webp', 'primary.jpg', 'image/webp', 1, 'webp', '/test/public-primary.webp', 'primary', '/media/primary.webp'),
         ($3, 'secondary.webp', 'secondary.jpg', 'image/webp', 1, 'webp', '/test/public-secondary.webp', 'secondary', '/media/secondary.webp'),
         ($4, 'member-primary.webp', 'member-primary.jpg', 'image/webp', 1, 'webp', '/test/member-primary.webp', 'member-primary', '/media/member-primary.webp'),
         ($5, 'member-secondary.webp', 'member-secondary.jpg', 'image/webp', 1, 'webp', '/test/member-secondary.webp', 'member-secondary', '/media/member-secondary.webp'),
         ($6, 'office-primary.webp', 'office-primary.jpg', 'image/webp', 1, 'webp', '/test/office-primary.webp', 'office-primary', '/media/office-primary.webp'),
         ($7, 'office-secondary.webp', 'office-secondary.jpg', 'image/webp', 1, 'webp', '/test/office-secondary.webp', 'office-secondary', '/media/office-secondary.webp')`,
      [
        privateMediaId,
        primaryMediaId,
        secondaryMediaId,
        memberPrimaryMediaId,
        memberSecondaryMediaId,
        officePrimaryMediaId,
        officeSecondaryMediaId,
      ],
    );
    await pool.query(
      `INSERT INTO mls_media(media_key, resource_record_key, media_id, permission, preferred_photo_yn, "order", media_modification_timestamp)
       VALUES
         ('private-cleanup', 'NWM_PRIMARY_CLEANUP', $1, ARRAY['Private'], false, 0, '2026-09-17T00:00:00Z'),
         ('primary-cleanup', 'NWM_PRIMARY_CLEANUP', $2, null, false, 1, '2026-09-17T00:00:00Z'),
         ('secondary-cleanup', 'NWM_PRIMARY_CLEANUP', $3, null, false, 2, '2026-09-17T00:00:00Z'),
         ('member-primary-cleanup', 'NWM_MEMBER_CLEANUP', $4, null, false, 1, '2026-09-17T00:00:00Z'),
         ('member-secondary-cleanup', 'NWM_MEMBER_CLEANUP', $5, null, false, 2, '2026-09-17T00:00:00Z'),
         ('office-primary-cleanup', 'NWM_OFFICE_CLEANUP', $6, null, false, 1, '2026-09-17T00:00:00Z'),
         ('office-secondary-cleanup', 'NWM_OFFICE_CLEANUP', $7, null, false, 2, '2026-09-17T00:00:00Z')`,
      [
        privateMediaId,
        primaryMediaId,
        secondaryMediaId,
        memberPrimaryMediaId,
        memberSecondaryMediaId,
        officePrimaryMediaId,
        officeSecondaryMediaId,
      ],
    );
    const mediaIds = [
      privateMediaId,
      primaryMediaId,
      secondaryMediaId,
      memberPrimaryMediaId,
      memberSecondaryMediaId,
      officePrimaryMediaId,
      officeSecondaryMediaId,
    ];
    for (const mediaId of mediaIds) {
      for (const variantName of ['thumbnail', 'preview', 'full']) {
        await pool.query(
          `INSERT INTO media_variants(media_id, variant_name, width, height, file_size, url, storage_path, storage_key)
           VALUES ($1, $2, 1, 1, 1, $3, $4, $5)`,
          [
            mediaId,
            variantName,
            `/media/${mediaId}_${variantName}.webp`,
            `/test/${mediaId}_${variantName}.webp`,
            `${mediaId}-${variantName}`,
          ],
        );
      }
    }

    const summary = await purgeScopedMlsMediaBeforeSync({
      memberKeys: ['NWM_MEMBER_CLEANUP'],
      officeKeys: ['NWM_OFFICE_CLEANUP'],
    });
    const associations = await pool.query(
      `SELECT media_key, media_id FROM mls_media WHERE resource_record_key='NWM_PRIMARY_CLEANUP' ORDER BY media_key`,
    );
    const remainingMedia = await pool.query(
      'SELECT id FROM media WHERE id = ANY($1::uuid[]) ORDER BY id',
      [mediaIds],
    );
    const remainingVariants = await pool.query(
      'SELECT media_id, variant_name FROM media_variants WHERE media_id = ANY($1::uuid[]) ORDER BY media_id, variant_name',
      [mediaIds],
    );

    expect(summary.linkedRowsDetached).toBe(1);
    expect(summary.mediaDeleted).toBe(1);
    expect(associations.rows).toEqual([
      { media_key: 'private-cleanup', media_id: null },
      { media_key: 'primary-cleanup', media_id: primaryMediaId },
      { media_key: 'secondary-cleanup', media_id: secondaryMediaId },
    ]);
    expect(remainingMedia.rows).toEqual(
      mediaIds
        .filter((mediaId) => mediaId !== privateMediaId)
        .sort()
        .map((id) => ({ id })),
    );
    for (const mediaId of [primaryMediaId, memberPrimaryMediaId, officePrimaryMediaId]) {
      expect(
        remainingVariants.rows
          .filter((row: { media_id: string }) => row.media_id === mediaId)
          .map((row: { variant_name: string }) => row.variant_name),
      ).toEqual(['full', 'preview', 'thumbnail']);
    }
    for (const mediaId of [secondaryMediaId, memberSecondaryMediaId, officeSecondaryMediaId]) {
      expect(
        remainingVariants.rows
          .filter((row: { media_id: string }) => row.media_id === mediaId)
          .map((row: { variant_name: string }) => row.variant_name),
      ).toEqual(['full']);
    }

    const repeatedCleanup = await purgeScopedMlsMediaBeforeSync({
      memberKeys: ['NWM_MEMBER_CLEANUP'],
      officeKeys: ['NWM_OFFICE_CLEANUP'],
    });
    expect(repeatedCleanup.linkedRowsDetached).toBe(0);
    expect(repeatedCleanup.mediaDeleted).toBe(0);
    expect(repeatedCleanup.variantFilesDeleted).toBe(0);

    await pool.query(
      "DELETE FROM mls_media WHERE resource_record_key IN ('NWM_PRIMARY_CLEANUP', 'NWM_MEMBER_CLEANUP', 'NWM_OFFICE_CLEANUP')",
    );
    await pool.query("DELETE FROM properties WHERE listing_key='NWM_PRIMARY_CLEANUP'");
    await pool.query("DELETE FROM members WHERE member_mls_id='NWM_MEMBER_CLEANUP'");
    await pool.query("DELETE FROM offices WHERE office_mls_id='NWM_OFFICE_CLEANUP'");
  });

  it('gates media jobs until a seed or a full set of delta runs has succeeded', async () => {
    expect(await isInitialSeedComplete('nwmls-seed-fresh')).toBe(false);
    await markInitialSeedComplete('nwmls-seed-fresh');
    expect(await isInitialSeedComplete('nwmls-seed-fresh')).toBe(true);

    const resources = ['Lookup', 'Office', 'Member', 'Property', 'OpenHouse'];
    for (const resource of resources.slice(0, 4)) {
      await pool.query(
        "INSERT INTO mls_sync_cursors(resource, originating_system_name, last_run_status) VALUES ($1, 'nwmls-seed-legacy', 'success')",
        [resource],
      );
    }
    expect(await isInitialSeedComplete('nwmls-seed-legacy')).toBe(false);
    await pool.query(
      "INSERT INTO mls_sync_cursors(resource, originating_system_name, last_run_status) VALUES ('OpenHouse', 'nwmls-seed-legacy', 'success')",
    );
    expect(await isInitialSeedComplete('nwmls-seed-legacy')).toBe(true);
    await pool.query(
      "UPDATE mls_sync_cursors SET last_run_status='error' WHERE originating_system_name='nwmls-seed-legacy' AND resource <> 'InitialSeed'",
    );
    expect(await isInitialSeedComplete('nwmls-seed-legacy')).toBe(true);

    await pool.query(
      "DELETE FROM mls_sync_cursors WHERE originating_system_name IN ('nwmls-seed-fresh', 'nwmls-seed-legacy')",
    );
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
