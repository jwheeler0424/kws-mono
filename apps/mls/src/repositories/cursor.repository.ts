// ---------------------------------------------------------------------------
// Sync cursor repository — manages mls_sync_cursors state
// ---------------------------------------------------------------------------

import { and, eq, isNull, lt, ne, or } from 'drizzle-orm'

import { db } from '@/lib/database'
import { mlsSyncCursors } from '@kws/schema'

type CursorRow = typeof mlsSyncCursors.$inferSelect
type CursorInsert = typeof mlsSyncCursors.$inferInsert
const MAX_CHECKPOINT_REQUEST_URL_HISTORY = 25
const DEFAULT_RUNNING_LEASE_MS = 4 * 60 * 60 * 1000

function parseCheckpointRequestUrlHistory(raw: string | null | undefined): string[] {
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter((value): value is string => typeof value === 'string' && value.length > 0)
  } catch {
    return []
  }
}

function buildCheckpointRequestUrlHistory(
  current: string | null | undefined,
  nextRequestUrl: string,
): string {
  const existing = parseCheckpointRequestUrlHistory(current)
  if (existing.at(-1) !== nextRequestUrl) {
    existing.push(nextRequestUrl)
  }

  return JSON.stringify(existing.slice(-MAX_CHECKPOINT_REQUEST_URL_HISTORY))
}

export async function getCursor(resource: string, osn: string): Promise<CursorRow | null> {
  const row = await db.query.mlsSyncCursors.findFirst({
    where: {
      AND: [{ resource }, { originatingSystemName: osn }],
    },
  })
  return row ?? null
}

/** Mark a sync run as started — sets status='running' and records lastRunAt. */
export async function startCursorRun(resource: string, osn: string): Promise<boolean> {
  const now = new Date()
  const leaseCutoff = new Date(now.getTime() - DEFAULT_RUNNING_LEASE_MS)

  const updated = await db
    .update(mlsSyncCursors)
    .set({
      lastRunAt: now,
      lastRunStatus: 'running',
      lastRunRecordsProcessed: 0,
      lastRunError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(mlsSyncCursors.resource, resource),
        eq(mlsSyncCursors.originatingSystemName, osn),
        or(
          ne(mlsSyncCursors.lastRunStatus, 'running'),
          isNull(mlsSyncCursors.lastRunStatus),
          isNull(mlsSyncCursors.lastRunAt),
          lt(mlsSyncCursors.lastRunAt, leaseCutoff),
        ),
      ),
    )
    .returning({ id: mlsSyncCursors.id })

  if (updated.length > 0) {
    return true
  }

  const inserted = await db
    .insert(mlsSyncCursors)
    .values({
      resource,
      originatingSystemName: osn,
      phase: 'initial',
      lastRunAt: now,
      lastRunStatus: 'running',
      lastRunRecordsProcessed: 0,
      updatedAt: now,
    } satisfies CursorInsert)
    .onConflictDoNothing({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
    })
    .returning({ id: mlsSyncCursors.id })

  if (inserted.length > 0) {
    return true
  }

  return false
}

/**
 * Advance the cursor checkpoint after each successfully processed page.
 * Keeps lastModifiedTimestamp at the max seen so far for resume safety.
 */
export async function advanceCursor(
  resource: string,
  osn: string,
  lastTimestamp: string | null,
  pageRecords: number,
  checkpoint: {
    requestUrl: string
    nextUrl: string | null
  },
): Promise<void> {
  const now = new Date()
  const cursor = await getCursor(resource, osn)
  const totalSoFar = (cursor?.totalRecordsProcessed ?? 0) + pageRecords
  const lastRunSoFar = (cursor?.lastRunRecordsProcessed ?? 0) + pageRecords
  const checkpointRequestUrlHistory = buildCheckpointRequestUrlHistory(
    cursor?.checkpointRecentRequestUrls,
    checkpoint.requestUrl,
  )

  await db
    .insert(mlsSyncCursors)
    .values({
      resource,
      originatingSystemName: osn,
      lastModifiedTimestamp: lastTimestamp,
      checkpointRequestUrl: checkpoint.requestUrl,
      checkpointNextUrl: checkpoint.nextUrl,
      checkpointRecentRequestUrls: checkpointRequestUrlHistory,
      checkpointedAt: now,
      totalRecordsProcessed: totalSoFar,
      lastRunRecordsProcessed: lastRunSoFar,
      updatedAt: now,
    } satisfies CursorInsert)
    .onConflictDoUpdate({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
      set: {
        ...(lastTimestamp ? { lastModifiedTimestamp: lastTimestamp } : {}),
        checkpointRequestUrl: checkpoint.requestUrl,
        checkpointNextUrl: checkpoint.nextUrl,
        checkpointRecentRequestUrls: checkpointRequestUrlHistory,
        checkpointedAt: now,
        totalRecordsProcessed: totalSoFar,
        lastRunRecordsProcessed: lastRunSoFar,
        updatedAt: now,
      },
    })
}

/** Mark a sync run complete — sets status='success' and transitions phase to 'delta'. */
export async function completeCursorRun(
  resource: string,
  osn: string,
  finalTimestamp: string | null,
): Promise<void> {
  const now = new Date()
  await db
    .update(mlsSyncCursors)
    .set({
      phase: 'delta',
      lastRunStatus: 'success',
      lastRunError: null,
      checkpointRequestUrl: null,
      checkpointNextUrl: null,
      checkpointRecentRequestUrls: null,
      checkpointedAt: null,
      ...(finalTimestamp ? { lastModifiedTimestamp: finalTimestamp } : {}),
      updatedAt: now,
    })
    .where(
      and(eq(mlsSyncCursors.resource, resource), eq(mlsSyncCursors.originatingSystemName, osn)),
    )
}

/** Mark a sync run as failed — cursor is NOT advanced, so re-run is safe. */
export async function failCursorRun(resource: string, osn: string, error: string): Promise<void> {
  await db
    .update(mlsSyncCursors)
    .set({
      lastRunStatus: 'error',
      lastRunError: error.slice(0, 5000),
      updatedAt: new Date(),
    })
    .where(
      and(eq(mlsSyncCursors.resource, resource), eq(mlsSyncCursors.originatingSystemName, osn)),
    )
}
