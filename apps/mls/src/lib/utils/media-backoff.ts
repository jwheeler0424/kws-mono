import { HOUR_MS, MLS_MEDIA_BACKOFF_DEFAULTS } from '@/lib/constants';
import { mlsLogger } from '@/lib/logger';

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

  private usageHourStartMs = 0;

  private usageDownloads = 0;

  private usageBytes = 0;

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

  recordSuccess(bytes = 0): void {
    this.consecutiveMediaRateLimits = 0;

    // Hourly totals let us compare our media traffic against the MLS Grid Usage tab.
    const hourStartMs = Math.floor(this.now() / HOUR_MS) * HOUR_MS;
    if (hourStartMs !== this.usageHourStartMs) {
      if (this.usageDownloads > 0) {
        backoffLogger.info('MLS media download usage', {
          hour: new Date(this.usageHourStartMs).toISOString(),
          downloads: this.usageDownloads,
          bytes: this.usageBytes,
        });
      }
      this.usageHourStartMs = hourStartMs;
      this.usageDownloads = 0;
      this.usageBytes = 0;
    }
    this.usageDownloads += 1;
    this.usageBytes += bytes;
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
