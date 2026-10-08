import { describe, expect, it } from 'bun:test';

import { MLS_MEDIA_BUDGET_DEFAULTS } from '@/lib/constants';

import { isMlsMediaBudgetExhausted } from './quota';

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
});
