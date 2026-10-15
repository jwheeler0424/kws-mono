import { mlsSyncCursors } from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/lib/database';

const QUEUE_REFRESH_RESOURCE = 'MlsMediaQueueRefresh';
const QUEUE_REFRESH_LEASE_MS = 60 * 60_000;

export async function claimMlsMediaQueueCursor(
  originatingSystemName: string,
): Promise<{ token: string; resumeFrom: Date | null } | null> {
  const token = randomUUID();
  const lease = {
    runToken: token,
    leaseUntil: new Date(Date.now() + QUEUE_REFRESH_LEASE_MS),
    lastRunStatus: 'running',
    lastRunAt: new Date(),
    lastRunError: null,
  };
  const rows = await db
    .insert(mlsSyncCursors)
    .values({ resource: QUEUE_REFRESH_RESOURCE, originatingSystemName, ...lease })
    .onConflictDoUpdate({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
      set: lease,
      setWhere: sql`${mlsSyncCursors.leaseUntil} is null or ${mlsSyncCursors.leaseUntil} <= now()`,
    })
    .returning({ resumeFrom: mlsSyncCursors.lastModifiedTimestamp });

  const cursor = rows[0];
  if (!cursor) return null;
  return { token, resumeFrom: cursor.resumeFrom ? new Date(cursor.resumeFrom) : null };
}

export async function checkpointMlsMediaQueueCursor(
  token: string,
  resumeFrom: Date | null,
): Promise<void> {
  const rows = await db
    .update(mlsSyncCursors)
    .set({
      lastModifiedTimestamp: resumeFrom?.toISOString() ?? null,
      leaseUntil: new Date(Date.now() + QUEUE_REFRESH_LEASE_MS),
      checkpointedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(mlsSyncCursors.runToken, token), sql`${mlsSyncCursors.leaseUntil} > now()`))
    .returning({ id: mlsSyncCursors.id });
  if (rows.length === 0) throw new Error('MLS media queue cursor lease expired');
}

export async function finishMlsMediaQueueCursor(token: string, error?: string): Promise<void> {
  await db
    .update(mlsSyncCursors)
    .set({
      runToken: null,
      leaseUntil: null,
      lastRunStatus: error ? 'error' : 'success',
      lastRunError: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(mlsSyncCursors.runToken, token));
}
