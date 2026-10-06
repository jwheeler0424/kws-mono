import { mlsSyncCursors } from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/lib/database';

export async function claimSyncCursor(resource: string, osn: string, initialTimestamp?: Date) {
  const token = randomUUID();
  const values = {
    resource,
    originatingSystemName: osn,
    runToken: token,
    leaseUntil: new Date(Date.now() + 3_600_000),
    lastRunStatus: 'running',
    lastRunAt: new Date(),
    lastRunError: null,
  };
  const rows = await db
    .insert(mlsSyncCursors)
    .values({ ...values, lastModifiedTimestamp: initialTimestamp?.toISOString() })
    .onConflictDoUpdate({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
      set: values,
      setWhere: sql`${mlsSyncCursors.leaseUntil} is null or ${mlsSyncCursors.leaseUntil} <= now()`,
    })
    .returning();
  return rows[0] ? { token, timestamp: rows[0].lastModifiedTimestamp } : null;
}

export async function checkpointSyncCursor(token: string, timestamp?: Date): Promise<void> {
  const rows = await db
    .update(mlsSyncCursors)
    .set({
      ...(timestamp
        ? {
            lastModifiedTimestamp: sql`greatest(${mlsSyncCursors.lastModifiedTimestamp}, ${timestamp.toISOString()}::timestamptz)`,
          }
        : {}),
      leaseUntil: new Date(Date.now() + 3_600_000),
      checkpointedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(mlsSyncCursors.runToken, token), sql`${mlsSyncCursors.leaseUntil} > now()`))
    .returning({ id: mlsSyncCursors.id });
  if (rows.length === 0) throw new Error('MLS replication cursor lease expired');
}

export async function finishSyncCursor(token: string, error?: string): Promise<void> {
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
