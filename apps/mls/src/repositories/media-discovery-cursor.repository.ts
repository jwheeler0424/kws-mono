import { mlsSyncCursors } from '@kws/schema';
import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { db } from '@/lib/database';

const DISCOVERY_RESOURCE = 'MlsMediaDiscovery';
const DISCOVERY_LEASE_MS = 60 * 60_000;

export type MlsMediaDiscoveryPhase = 'properties' | 'members' | 'offices' | 'complete';

export interface MlsMediaDiscoveryState {
  phase: MlsMediaDiscoveryPhase;
  lastKey: string | null;
}

function normalizeState(phase: string | null, lastKey: string | null): MlsMediaDiscoveryState {
  const validPhase = ['properties', 'members', 'offices', 'complete'].includes(phase ?? '')
    ? (phase as MlsMediaDiscoveryPhase)
    : 'properties';
  return { phase: validPhase, lastKey: validPhase === 'complete' ? null : lastKey };
}

export async function claimMlsMediaDiscoveryCursor(
  originatingSystemName: string,
): Promise<{ token: string; state: MlsMediaDiscoveryState } | null> {
  const token = randomUUID();
  const rows = await db
    .insert(mlsSyncCursors)
    .values({
      resource: DISCOVERY_RESOURCE,
      originatingSystemName,
      runToken: token,
      leaseUntil: new Date(Date.now() + DISCOVERY_LEASE_MS),
      lastRunStatus: 'running',
      lastRunAt: new Date(),
      lastRunError: null,
      phase: 'properties',
      checkpointRequestUrl: null,
    })
    .onConflictDoUpdate({
      target: [mlsSyncCursors.resource, mlsSyncCursors.originatingSystemName],
      set: {
        runToken: token,
        leaseUntil: new Date(Date.now() + DISCOVERY_LEASE_MS),
        lastRunStatus: 'running',
        lastRunAt: new Date(),
        lastRunError: null,
      },
      setWhere: sql`${mlsSyncCursors.leaseUntil} is null or ${mlsSyncCursors.leaseUntil} <= now()`,
    })
    .returning({
      phase: mlsSyncCursors.phase,
      lastKey: mlsSyncCursors.checkpointRequestUrl,
    });

  const cursor = rows[0];
  return cursor ? { token, state: normalizeState(cursor.phase, cursor.lastKey) } : null;
}

export async function checkpointMlsMediaDiscoveryCursor(
  token: string,
  state: MlsMediaDiscoveryState,
): Promise<void> {
  const rows = await db
    .update(mlsSyncCursors)
    .set({
      phase: state.phase,
      checkpointRequestUrl: state.lastKey,
      leaseUntil: new Date(Date.now() + DISCOVERY_LEASE_MS),
      checkpointedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(mlsSyncCursors.runToken, token), sql`${mlsSyncCursors.leaseUntil} > now()`))
    .returning({ id: mlsSyncCursors.id });
  if (rows.length === 0) throw new Error('MLS media discovery cursor lease expired');
}

export async function finishMlsMediaDiscoveryCursor(token: string, error?: string): Promise<void> {
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
