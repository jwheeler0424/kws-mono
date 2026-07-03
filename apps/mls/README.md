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

- `MLS_HISTORY_STORE_ENABLED` (default `true`)
- `MLS_HISTORY_STORE_PATH` (default `data`)
- `MLS_HISTORY_REPLAY_BATCH_SIZE` (default `500`)
- `MLS_HISTORY_LOCK_TIMEOUT_MS` (default `30000`)
- `MLS_HISTORY_LOCK_STALE_MS` (default `300000`)
- `MLS_HISTORY_COMPACT_MAX_BYTES` (default `268435456`)
- `MLS_HISTORY_VERIFY_CHECKSUM_ENABLED` (default `true`)
- `MLS_HISTORY_QUARANTINE_ENABLED` (default `true`)
- `MLS_TIMESTAMP_QUARANTINE_ALERT_THRESHOLD` (default `1`)
- `MLS_MIN_DELTA_OVERLAP_MS` (default `1000`)
- `MLS_TIMESTAMP_PRECISION_SAFETY_MS` (default `1000`)
- `MLS_PROPERTY_BATCH_SIZE` (default `100`)
- `MLS_PROPERTY_UPSERT_BATCH_SIZE` (default `150`)
- `MLS_PROPERTY_CHILD_UPSERT_BATCH_SIZE` (default `750`)
- `MLS_PROPERTY_CHILD_UPSERT_CONCURRENCY` (default `2`)
- `MLS_PROPERTY_SEED_STAGING_STATEMENT_TIMEOUT_MS` (default `120000`)
- `MLS_PROPERTY_SEED_STAGING_LOCK_TIMEOUT_MS` (default `5000`)
- `MLS_PROPERTY_SEED_STAGING_WORK_MEM_MB` (default `128`)
- `MLS_PROPERTY_SEED_STAGING_JIT_OFF` (default `true`)
- `MLS_SEED_FETCH_INGEST_OVERLAP_ENABLED` (default `true`)
- `MLS_SEED_FETCH_INGEST_QUEUE_DEPTH` (default `2`)
- `MLS_SEED_PREFETCH_ENABLED` (default `true`)
- `MLS_ROLLOUT_ENABLE_INITIAL_DATA_SEED` (default `true`)
- `MLS_ROLLOUT_ENABLE_INITIAL_MEDIA_SEED` (default `true`)
- `MLS_ROLLOUT_ENABLE_SYNC_JOB_REGISTRATION` (default `true`)

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
