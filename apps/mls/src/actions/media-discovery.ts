import type { StandardStatus } from '@kws/schema';

import { members, offices, properties } from '@kws/schema';
import { and, asc, eq, gt, inArray, isNull } from 'drizzle-orm';

import type { MlsMediaPayload } from '@/types';

import { db } from '@/lib/database';
import { mlsLogger } from '@/lib/logger';
import { MlsParentUnavailableError, fetchFreshParentMedia } from '@/lib/utils/fetch';
import {
  isMlsMediaBudgetExhausted,
  MlsQuotaExceededError,
  mlsQuotaTracker,
} from '@/lib/utils/quota';
import {
  mapMemberMedia,
  mapOfficeMedia,
  mapPropertyMedia,
  resolveMlsMediaKey,
  type MappedMedia,
} from '@/maps/media.mapper';
import { enqueueResourceMediaBatch } from '@/repositories/resource-media.repository';

import {
  checkpointMlsMediaDiscoveryCursor,
  claimMlsMediaDiscoveryCursor,
  finishMlsMediaDiscoveryCursor,
  type MlsMediaDiscoveryPhase,
} from '../repositories/media-discovery-cursor.repository';

const DISCOVERY_BATCH_SIZE = 100;
const ACTIVE_PROPERTY_STATUSES: readonly StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];
const phases: readonly MlsMediaDiscoveryPhase[] = ['properties', 'members', 'offices', 'complete'];

interface DiscoveryParent {
  key: string;
  listingId: string | null;
}

export interface MlsMediaDiscoverySummary {
  acquired: boolean;
  completed: boolean;
  budgetExhausted: boolean;
  parentsScanned: number;
  parentsSkipped: number;
  mediaRowsQueued: number;
  error?: string;
}

async function listDiscoveryParents(
  phase: MlsMediaDiscoveryPhase,
  lastKey: string | null,
  memberKeys: readonly string[],
  officeKeys: readonly string[],
): Promise<DiscoveryParent[]> {
  if (phase === 'properties') {
    const rows = await db
      .select({ key: properties.listingKey, listingId: properties.listingId })
      .from(properties)
      .where(
        and(
          isNull(properties.deletedAt),
          eq(properties.mlgCanView, true),
          inArray(properties.standardStatus, [...ACTIVE_PROPERTY_STATUSES]),
          lastKey ? gt(properties.listingKey, lastKey) : undefined,
        ),
      )
      .orderBy(asc(properties.listingKey))
      .limit(DISCOVERY_BATCH_SIZE);
    return rows.map((row) => ({ key: row.key, listingId: row.listingId }));
  }

  if (phase === 'members' && memberKeys.length > 0) {
    const rows = await db
      .select({ key: members.memberMlsId })
      .from(members)
      .where(
        and(
          isNull(members.deletedAt),
          eq(members.mlgCanView, true),
          inArray(members.memberMlsId, [...memberKeys]),
          lastKey ? gt(members.memberMlsId, lastKey) : undefined,
        ),
      )
      .orderBy(asc(members.memberMlsId))
      .limit(DISCOVERY_BATCH_SIZE);
    return rows.map((row) => ({ key: row.key, listingId: null }));
  }

  if (phase === 'offices' && officeKeys.length > 0) {
    const rows = await db
      .select({ key: offices.officeMlsId })
      .from(offices)
      .where(
        and(
          isNull(offices.deletedAt),
          eq(offices.mlgCanView, true),
          inArray(offices.officeMlsId, [...officeKeys]),
          lastKey ? gt(offices.officeMlsId, lastKey) : undefined,
        ),
      )
      .orderBy(asc(offices.officeMlsId))
      .limit(DISCOVERY_BATCH_SIZE);
    return rows.map((row) => ({ key: row.key, listingId: null }));
  }

  return [];
}

function mapSnapshotMedia(
  phase: Exclude<MlsMediaDiscoveryPhase, 'complete'>,
  parentKey: string,
  payloads: MlsMediaPayload[],
): MappedMedia[] {
  return payloads.flatMap((payload) => {
    if (!resolveMlsMediaKey(payload, parentKey, phase)) return [];
    const mapped =
      phase === 'properties'
        ? mapPropertyMedia(payload, parentKey)
        : phase === 'members'
          ? mapMemberMedia(payload, parentKey)
          : mapOfficeMedia(payload, parentKey);
    return mapped ? [mapped] : [];
  });
}

function nextPhase(phase: MlsMediaDiscoveryPhase): MlsMediaDiscoveryPhase {
  return phases[Math.min(phases.indexOf(phase) + 1, phases.length - 1)]!;
}

export async function discoverLegacyMlsMedia(options: {
  originatingSystemName: string;
  memberKeys: readonly string[];
  officeKeys: readonly string[];
  maxParentsPerRun?: number;
}): Promise<MlsMediaDiscoverySummary> {
  const cursor = await claimMlsMediaDiscoveryCursor(options.originatingSystemName);
  const summary: MlsMediaDiscoverySummary = {
    acquired: cursor !== null,
    completed: cursor?.state.phase === 'complete',
    budgetExhausted: false,
    parentsScanned: 0,
    parentsSkipped: 0,
    mediaRowsQueued: 0,
  };
  if (!cursor) return summary;

  const maxParentsPerRun = Math.max(1, options.maxParentsPerRun ?? DISCOVERY_BATCH_SIZE);
  let state = cursor.state;
  let failure: string | undefined;

  try {
    while (state.phase !== 'complete' && summary.parentsScanned < maxParentsPerRun) {
      const phase = state.phase;
      if (isMlsMediaBudgetExhausted(mlsQuotaTracker.snapshot())) {
        summary.budgetExhausted = true;
        break;
      }

      const parents = await listDiscoveryParents(
        phase,
        state.lastKey,
        options.memberKeys,
        options.officeKeys,
      );
      if (parents.length === 0) {
        state = { phase: nextPhase(state.phase), lastKey: null };
        await checkpointMlsMediaDiscoveryCursor(cursor.token, state);
        continue;
      }

      for (const parent of parents) {
        if (summary.parentsScanned >= maxParentsPerRun) break;
        if (isMlsMediaBudgetExhausted(mlsQuotaTracker.snapshot())) {
          summary.budgetExhausted = true;
          break;
        }
        if (phase === 'properties' && !parent.listingId) {
          summary.parentsScanned += 1;
          summary.parentsSkipped += 1;
          state = { ...state, lastKey: parent.key };
          await checkpointMlsMediaDiscoveryCursor(cursor.token, state);
          continue;
        }

        try {
          const mediaPayloads = await fetchFreshParentMedia(phase, parent.key, parent.listingId);
          const mediaRecords = mapSnapshotMedia(phase, parent.key, mediaPayloads);
          await enqueueResourceMediaBatch([{ resourceRecordKey: parent.key, mediaRecords }]);
          summary.mediaRowsQueued += mediaRecords.length;
        } catch (error) {
          if (error instanceof MlsQuotaExceededError) {
            summary.budgetExhausted = true;
            break;
          }
          if (!(error instanceof MlsParentUnavailableError)) throw error;
          summary.parentsSkipped += 1;
          mlsLogger.debug('skipping unavailable parent during MLS media discovery', {
            entityType: phase,
            resourceRecordKey: parent.key,
          });
        }

        summary.parentsScanned += 1;
        state = { ...state, lastKey: parent.key };
        await checkpointMlsMediaDiscoveryCursor(cursor.token, state);
      }

      if (summary.budgetExhausted) break;
      const lastParentKey = parents.at(-1)?.key;
      if (parents.length < DISCOVERY_BATCH_SIZE && state.lastKey === lastParentKey) {
        state = { phase: nextPhase(phase), lastKey: null };
        await checkpointMlsMediaDiscoveryCursor(cursor.token, state);
      }
    }

    if (state.phase === 'complete') {
      summary.completed = true;
    }
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
    summary.error = failure;
    mlsLogger.warn('legacy MLS media discovery paused with an error', {
      phase: state.phase,
      resourceRecordKey: state.lastKey,
      error: failure,
    });
  } finally {
    await finishMlsMediaDiscoveryCursor(cursor.token, failure);
  }

  return summary;
}
