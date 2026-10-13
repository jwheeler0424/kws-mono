import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { MLS_MEDIA_BUDGET_DEFAULTS } from '@/lib/constants';

import { isMlsMediaBudgetExhausted, MlsQuotaTracker } from './quota';

let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe('isMlsMediaBudgetExhausted', () => {
  it('uses the stricter normal media cap but permits repairs into the reserved share', () => {
    const snapshot = {
      hour: { startedAtMs: 0, requests: 17, bytes: 15_358_751 },
      day: { startedAtMs: 0, requests: 34_279, bytes: 14_496_051_337 },
    };

    expect(isMlsMediaBudgetExhausted(snapshot)).toBe(true);
    expect(isMlsMediaBudgetExhausted(snapshot, MLS_MEDIA_BUDGET_DEFAULTS.repairMaxQuotaShare)).toBe(
      false,
    );
  });

  it('stops repair at its upper quota share', () => {
    const snapshot = {
      hour: { startedAtMs: 0, requests: 17, bytes: 15_358_751 },
      day: { startedAtMs: 0, requests: 38_000, bytes: 14_496_051_337 },
    };

    expect(isMlsMediaBudgetExhausted(snapshot, MLS_MEDIA_BUDGET_DEFAULTS.repairMaxQuotaShare)).toBe(
      true,
    );
  });

  it('flushes pending quota state before shutdown', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'mls-quota-flush-'));
    const stateFile = path.join(temporaryDirectory, 'quota.json');
    const now = Date.UTC(2026, 9, 13, 12);
    const tracker = new MlsQuotaTracker(() => now, {
      requestsPerHourLimit: 100,
      requestsPerDayLimit: 1000,
      bytesPerHourLimit: 1_000_000,
      bytesPerDayLimit: 10_000_000,
      quotaWarnThresholdRatio: 0.9,
      quotaStateFile: stateFile,
    });

    tracker.prepareRequest();
    await tracker.flush();

    const persisted = JSON.parse(await readFile(stateFile, 'utf8')) as {
      hour: { requests: number };
      day: { requests: number };
    };
    expect(persisted.hour.requests).toBe(1);
    expect(persisted.day.requests).toBe(1);
  });
});
