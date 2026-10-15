import { MLS_MEDIA_BACKOFF_DEFAULTS } from '@/lib/constants';
import { mlsLogger } from '@/lib/logger';

import { sleep } from './helpers';

const backoffLogger = mlsLogger.child('media-backoff');

export type MlsRateLimitSource = 'media' | 'api';

type MediaBackoffConfig = {
  mediaRateLimitThreshold: number;
  basePauseMs: number;
  maxPauseMs: number;
  escalationWindowMs: number;
};

export class MlsMediaBackoff {
  private consecutiveMediaRateLimits = 0;

  private level = 0;

  private pausedUntilMs = 0;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly config: MediaBackoffConfig = MLS_MEDIA_BACKOFF_DEFAULTS,
  ) {}

  isPaused(): boolean {
    return this.now() < this.pausedUntilMs;
  }

  pausedUntil(): Date | null {
    return this.isPaused() ? new Date(this.pausedUntilMs) : null;
  }

  recordSuccess(): void {
    this.consecutiveMediaRateLimits = 0;
  }

  recordRateLimited(source: MlsRateLimitSource): void {
    if (source === 'media') {
      this.consecutiveMediaRateLimits += 1;
      if (this.consecutiveMediaRateLimits < this.config.mediaRateLimitThreshold) return;
    }
    if (this.isPaused()) return;

    const nowMs = this.now();
    this.level =
      this.level > 0 && nowMs - this.pausedUntilMs <= this.config.escalationWindowMs
        ? this.level + 1
        : 1;
    const pauseMs = Math.min(
      this.config.basePauseMs * 2 ** (this.level - 1),
      this.config.maxPauseMs,
    );
    this.pausedUntilMs = nowMs + pauseMs;
    this.consecutiveMediaRateLimits = 0;

    backoffLogger.warn('MLS media downloads paused after rate limiting', {
      source,
      level: this.level,
      pauseMs,
      pausedUntil: new Date(this.pausedUntilMs).toISOString(),
    });
  }
}

export const mlsMediaBackoff = new MlsMediaBackoff();

let mediaQueue: Promise<void> = Promise.resolve();
let lastMediaDownloadAtMs = 0;

/** Paces media downloads on their own lane so they don't consume the API throttle. */
export function throttleMediaDownload(
  delayMs: number = MLS_MEDIA_BACKOFF_DEFAULTS.downloadDelayMs,
): Promise<void> {
  const slot = mediaQueue.then(async () => {
    const waitMs = lastMediaDownloadAtMs + delayMs - Date.now();
    if (waitMs > 0) await sleep(waitMs);
    lastMediaDownloadAtMs = Date.now();
  });
  mediaQueue = slot.catch(() => {});
  return slot;
}
