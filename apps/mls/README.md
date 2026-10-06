# mls

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast
all-in-one JavaScript runtime.

## Seed and Sync Pipeline

- Delta sync uses `mls_sync_cursors` per resource and originating system, with a renewable lease and
  timestamp overlap. Existing database watermarks initialize new cursors.
- Cursors advance after successful page ingestion, including timestamps of scope-excluded records.
  Failed pages stop the run without advancing their checkpoint.
- A local history store is enabled by default and writes incoming MLS payloads to disk during both
  seed and sync.
- Rollout controls can independently gate initial data seed, initial media seed, and sync job
  registration.

## Local History Store

- Default path: `apps/mls/data`
- Partitioning: `data/{resource}/{YYYY}/{MM}/*.jsonl.gz`
- Format: compressed JSONL (gzip)
- Partition manifest: each partition maintains `manifest.json` with per-chunk checksum and metadata
- Corrupt or partial chunks are moved to `data/.quarantine/**` instead of being deleted
- Records with missing or invalid `ModificationTimestamp` are quarantined to
  `data/.quarantine/records/**` and excluded from ingest

Seed behavior is local-first:

1. Replay local history partitions for the resource.
2. Upsert replayed records in bounded batches.
3. Continue with MLS API pagination and write-through each fetched page to local history.
4. In API phase, bounded fetch/ingest overlap is enabled by default to reduce idle time between
   fetch and ingest.

## Environment Variables

- `MLS_ACCESS_KEY` (required)
- `MLS_API_URL` (required)
- `MLS_ORIGINATING_SYSTEM_NAME` (required)
- `MLS_MEMBER_ID` (optional list)
- `MLS_OFFICE_ID` (optional list)
- `MLS_RESOURCE_EXPAND` (optional)
- `MLS_START_DATE` (optional)
- `MLS_MEDIA_STORE_PATH` (optional, default `store/media`)
- `MLS_QUEUE_RESOURCE_CRON_SCHEDULES` (required)
- `MLS_QUEUE_CLEANUP_CRON` (required)
- `MLS_QUEUE_MEDIA_SYNC_CRON` (required)
- `MLS_QUEUE_MEDIA_RECONCILE_CRON` (optional, default `0 */6 * * *`)

Most MLS sync and scheduler tuning values are now fixed in app constants so they do not need to be
set via environment variables.

## Maintenance APIs

History store helpers available in
[apps/mls/src/lib/history-store.ts](apps/mls/src/lib/history-store.ts):

- `verifyHistoryStore(resource?)`
  - Validates `.jsonl.gz` files by decompressing and parsing each line.
  - Returns checked and corrupted file counts/paths.
- `compactHistoryStore(resource?)`
  - Merges multiple chunk files per partition into a single compacted chunk.
  - Uses a single-writer lock and respects `MLS_HISTORY_COMPACT_MAX_BYTES`.

## Maintenance Commands

- `bun run history:verify`
- `bun run history:compact`
- `bun run history:recover`
- `bun run history:quarantine-summary`
- `bun run history:storage-report`
- `bun run benchmark:delta`
- `bun run contacts:backfill --max-pages=1`
- `bun run contacts:backfill --apply --max-pages=100`

Optional resource scope:

- `bun --bun run src/index.ts history:verify --resource=Property`
- `bun --bun run src/index.ts history:compact --resource=Property`

## September 2026 NWMLS Updates

Schema definitions and the Property mapper preserve all six announced contact fields:
`ListAgentPreferredPhone`, `ListAgentEmail`, `ListOfficeEmail`, `CoListAgentPreferredPhone`,
`CoListAgentEmail`, and `CoListOfficeEmail`. Web attribution must comply by October 15. Database
changes belong in schema files; migration artifacts are managed separately by the owner. Tests must
not depend on migration filenames.

`contacts:backfill` requests contact fields without Media expansion. It defaults to a dry run
starting September 17. `--apply` enables updates and a separate resumable `PropertyContacts`
checkpoint. `--after=ISO` sets the initial lower bound; `--max-pages=N` bounds a run. An existing
applied checkpoint is not reset by `--after`. Backfill does not insert missing listings, overwrite
newer records, advance normal replication cursors, or download images. Dry runs consume API quota.

## Signed Media Acquisition

- `apps/mls` owns downloads. Web reads local variants and does not fetch MLS images on page views.
- Signed URLs are obtained just before download, passed verbatim, and never persisted in new
  metadata/history. Existing history is not rewritten; its old URLs are not used for downloads.
- Parent-scoped database claims prevent competing workers. Failed downloads defer acquisition for at
  least one hour, honoring longer `Retry-After` periods. Media traffic is conservatively included in
  local quota accounting. The OAuth token is sent as the required `User-Agent`.
- Property media lookup filters use the prefixed `ListingId`, not `ListingKey`; the returned
  `ListingKey` must still match the intended parent. Member/Office lookups use their MLS IDs.
- Production accepts HTTPS `media.mlsgrid.com`; the demo API uses `media-demo.mlsgrid.com`. One
  redirect to an HTTPS `mlsgrid.<32-hex-account>.r2.cloudflarestorage.com` host is supported. The
  MLS token is not forwarded to storage, both requests consume the local request budget, and further
  redirects or immediate retries are disabled. Other destinations are rejected.
- Full WebP files are published atomically before derived variants. Repairs reuse the full WebP
  without recompression or permanent original retention. Missing full files need controlled
  reacquisition. Changed source versions use distinct filenames.
- Complete snapshots reconcile removed keys; omitted expansions do not erase galleries. Private or
  removed media is excluded from web queries, and unshared local files are purged after commit.
  Previously downloaded browser/CDN copies may remain until cache expiry.

## Rollout Checks

1. Verify NWMLS metadata, parent-key lookup support, and the provider's listing-level hourly
   restriction for galleries. Do not test by repeatedly downloading an asset.
2. Have the owner apply database changes from the schema definitions before deploying consumers.
   Retire the web downloader before enabling the new MLS acquisition worker. Do not reset data.
3. Run bounded contact-backfill dry runs before explicitly applying updates. Preserve valid local
   WebP files and associations; do not mass-download images to refresh signed URLs.
4. Check attribution beside actions on cards, map popups, detail and listing-specific contact forms
   on desktop/mobile. Keep NWMLS source identification and sold buyer-brokerage attribution.

The opt-in repository test uses `MLS_TEST_DATABASE_URL`, restricted to `127.0.0.1` and database
`mls_compliance_test`. It resets only that disposable schema and loads SQL exported directly from
current schema files, without creating migration files. Never set this variable on a deployed
worker. Run repository integration tests separately from module-mocked unit tests.

Sources: [NWMLS notice](mls-email-1.md), [media notice](mls-email-2.md), and
[MLS Grid documentation](https://docs.mlsgrid.com/api-documentation/api-version-2.0#media).
