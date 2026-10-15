import { describe, expect, it } from 'bun:test';

import { MlsMediaBackoff } from './media-backoff';

const MINUTE_MS = 60_000;
const config = {
  mediaRateLimitThreshold: 3,
  basePauseMs: 5 * MINUTE_MS,
  maxPauseMs: 20 * MINUTE_MS,
  escalationWindowMs: 60 * MINUTE_MS,
};

function createBackoff() {
  let nowMs = 0;
  const backoff = new MlsMediaBackoff(() => nowMs, config);
  return {
    backoff,
    advance: (ms: number) => {
      nowMs += ms;
    },
  };
}

describe('MlsMediaBackoff', () => {
  it('tolerates isolated media 429s interleaved with successful downloads', () => {
    const { backoff } = createBackoff();
    backoff.recordRateLimited('media');
    backoff.recordRateLimited('media');
    backoff.recordSuccess();
    backoff.recordRateLimited('media');

    expect(backoff.isPaused()).toBe(false);
  });

  it('pauses after a streak of media 429s', () => {
    const { backoff } = createBackoff();
    for (let index = 0; index < 3; index += 1) backoff.recordRateLimited('media');

    expect(backoff.pausedUntil()?.getTime()).toBe(5 * MINUTE_MS);
  });

  it('pauses immediately when the API itself is rate limited', () => {
    const { backoff } = createBackoff();
    backoff.recordRateLimited('api');

    expect(backoff.isPaused()).toBe(true);
  });

  it('doubles repeated pauses up to the cap and resets after a quiet window', () => {
    const { backoff, advance } = createBackoff();
    const pausedUntilMinutes: number[] = [];
    let elapsedMs = 0;
    for (let trip = 0; trip < 4; trip += 1) {
      backoff.recordRateLimited('api');
      const pausedUntilMs = backoff.pausedUntil()!.getTime();
      pausedUntilMinutes.push(pausedUntilMs / MINUTE_MS);
      advance(pausedUntilMs - elapsedMs);
      elapsedMs = pausedUntilMs;
    }

    expect(pausedUntilMinutes).toEqual([5, 15, 35, 55]);

    advance(61 * MINUTE_MS);
    backoff.recordRateLimited('api');
    expect(backoff.pausedUntil()!.getTime()).toBe(121 * MINUTE_MS);
  });

  it('does not escalate while already paused', () => {
    const { backoff } = createBackoff();
    backoff.recordRateLimited('api');
    backoff.recordRateLimited('api');

    expect(backoff.pausedUntil()?.getTime()).toBe(5 * MINUTE_MS);
  });
});
