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

- Sync start is timestamp-only: each resource reads the latest `modificationTimestamp` from the
  database and uses that as the API `afterTimestamp` filter (with configured overlap).
- Cursor sync state has been removed from runtime flow.
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

Optional resource scope:

- `bun --bun run src/index.ts history:verify --resource=Property`
- `bun --bun run src/index.ts history:compact --resource=Property`
