import { env } from '@kws/config';
import { Debouncer } from '@tanstack/pacer';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { DAY_MS, HOUR_MS } from '@/lib/constants';
import { logger } from '@/lib/logger';

import { startOfUtcDay, startOfUtcHour } from './helpers';

export interface QuotaWindowState {
  startedAtMs: number;
  requests: number;
  bytes: number;
}

export interface QuotaSnapshot {
  hour: QuotaWindowState;
  day: QuotaWindowState;
}

interface QuotaTrackerConfig {
  requestsPerHourLimit: number;
  requestsPerDayLimit: number;
  bytesPerHourLimit: number;
  bytesPerDayLimit: number;
  quotaWarnThresholdRatio: number;
  quotaStateFile?: string | null;
}

export class MlsQuotaExceededError extends Error {
  constructor(
    public readonly metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
    public readonly limit: number,
    public readonly attempted: number,
    public readonly resetAt: Date,
  ) {
    super(
      `MLS API quota exceeded for ${metric}. Attempted ${attempted}, limit ${limit}. Retry after ${resetAt.toISOString()}.`,
    );
    this.name = 'MlsQuotaExceededError';
  }
}

export class MlsQuotaTracker {
  private hour: QuotaWindowState;

  private day: QuotaWindowState;

  private warned = new Set<string>();

  private readonly persistDebouncer: Debouncer<(snapshot: QuotaSnapshot) => void>;

  private lastPersistPromise: Promise<void> = Promise.resolve();

  private static shutdownHooksRegistered = false;

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly config: QuotaTrackerConfig = {
      requestsPerHourLimit: env.MLS_REQUESTS_PER_HOUR_LIMIT,
      requestsPerDayLimit: env.MLS_REQUESTS_PER_DAY_LIMIT,
      bytesPerHourLimit: env.MLS_BYTES_PER_HOUR_LIMIT,
      bytesPerDayLimit: env.MLS_BYTES_PER_DAY_LIMIT,
      quotaWarnThresholdRatio: env.MLS_QUOTA_WARN_THRESHOLD_RATIO,
      quotaStateFile: env.MLS_QUOTA_STATE_FILE,
    },
  ) {
    const nowMs = this.now();
    this.hour = {
      startedAtMs: startOfUtcHour(nowMs),
      requests: 0,
      bytes: 0,
    };
    this.day = {
      startedAtMs: startOfUtcDay(nowMs),
      requests: 0,
      bytes: 0,
    };

    this.persistDebouncer = new Debouncer(
      (snapshot: QuotaSnapshot) => {
        this.lastPersistPromise = this.persistStateNow(snapshot);
      },
      {
        key: 'mls-quota-state-persist',
        wait: 1000,
        leading: false,
        trailing: true,
      },
    );

    this.loadPersistedState();
    this.registerShutdownHooks();
  }

  snapshot(): QuotaSnapshot {
    this.rollWindows();
    return {
      hour: { ...this.hour },
      day: { ...this.day },
    };
  }

  prepareRequest(): QuotaSnapshot {
    this.rollWindows();

    const nextHourRequests = this.hour.requests + 1;
    const nextDayRequests = this.day.requests + 1;

    this.assertWithinLimits('requestsPerHour', nextHourRequests);
    this.assertWithinLimits('requestsPerDay', nextDayRequests);

    this.hour.requests = nextHourRequests;
    this.day.requests = nextDayRequests;

    this.warnNearLimit('requestsPerHour', nextHourRequests);
    this.warnNearLimit('requestsPerDay', nextDayRequests);
    this.persistState();

    return this.snapshot();
  }

  recordResponseBytes(responseBytes: number): QuotaSnapshot {
    this.rollWindows();

    const bytes = Math.max(0, responseBytes);
    const nextHourBytes = this.hour.bytes + bytes;
    const nextDayBytes = this.day.bytes + bytes;

    this.hour.bytes = nextHourBytes;
    this.day.bytes = nextDayBytes;
    this.persistState();

    if (this.config.bytesPerHourLimit > 0 && nextHourBytes > this.config.bytesPerHourLimit) {
      throw new MlsQuotaExceededError(
        'bytesPerHour',
        this.config.bytesPerHourLimit,
        nextHourBytes,
        new Date(this.getResetAtMs('bytesPerHour')),
      );
    }

    if (nextDayBytes > this.config.bytesPerDayLimit) {
      throw new MlsQuotaExceededError(
        'bytesPerDay',
        this.config.bytesPerDayLimit,
        nextDayBytes,
        new Date(this.getResetAtMs('bytesPerDay')),
      );
    }

    this.warnNearLimit('bytesPerHour', nextHourBytes);
    this.warnNearLimit('bytesPerDay', nextDayBytes);
    return this.snapshot();
  }

  consume(responseBytes: number): QuotaSnapshot {
    this.prepareRequest();
    return this.recordResponseBytes(responseBytes);
  }

  private rollWindows(): void {
    const nowMs = this.now();
    const hourStart = startOfUtcHour(nowMs);
    const dayStart = startOfUtcDay(nowMs);

    if (this.hour.startedAtMs !== hourStart) {
      this.hour = { startedAtMs: hourStart, requests: 0, bytes: 0 };
      this.clearWarnings('requestsPerHour');
      this.clearWarnings('bytesPerHour');
    }

    if (this.day.startedAtMs !== dayStart) {
      this.day = { startedAtMs: dayStart, requests: 0, bytes: 0 };
      this.clearWarnings('requestsPerDay');
      this.clearWarnings('bytesPerDay');
    }
  }

  private assertWithinLimits(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
    attempted: number,
  ): void {
    const limit = this.getLimit(metric);
    if (attempted <= limit) return;

    throw new MlsQuotaExceededError(metric, limit, attempted, new Date(this.getResetAtMs(metric)));
  }

  private warnNearLimit(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
    usage: number,
  ): void {
    const limit = this.getLimit(metric);
    if (limit <= 0) return;
    const key = `${metric}:${this.getWindowStartMs(metric)}`;
    if (this.warned.has(key)) return;
    if (usage / limit < this.config.quotaWarnThresholdRatio) return;

    this.warned.add(key);
    logger.warn('mls api quota nearing limit', {
      metric,
      usage,
      limit,
      resetAt: new Date(this.getResetAtMs(metric)).toISOString(),
    });
  }

  private clearWarnings(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
  ): void {
    for (const key of this.warned) {
      if (key.startsWith(`${metric}:`)) {
        this.warned.delete(key);
      }
    }
  }

  private getStateFilePath(): string | null {
    if (!this.config.quotaStateFile) return null;
    return resolve(process.cwd(), this.config.quotaStateFile);
  }

  private loadPersistedState(): void {
    const filePath = this.getStateFilePath();
    if (!filePath || !existsSync(filePath)) return;

    try {
      const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as QuotaSnapshot;
      if (!parsed || typeof parsed !== 'object' || !parsed.hour || !parsed.day) {
        return;
      }

      this.hour = {
        startedAtMs: Number(parsed.hour.startedAtMs) || this.hour.startedAtMs,
        requests: Number(parsed.hour.requests) || 0,
        bytes: Number(parsed.hour.bytes) || 0,
      };
      this.day = {
        startedAtMs: Number(parsed.day.startedAtMs) || this.day.startedAtMs,
        requests: Number(parsed.day.requests) || 0,
        bytes: Number(parsed.day.bytes) || 0,
      };
      this.rollWindows();
    } catch {
      logger.warn('failed to load persisted mls quota state');
    }
  }

  private persistState(): void {
    if (!this.getStateFilePath()) return;
    this.persistDebouncer.maybeExecute(this.snapshot());
  }

  private async persistStateNow(snapshot: QuotaSnapshot): Promise<void> {
    const filePath = this.getStateFilePath();
    if (!filePath) return;

    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, JSON.stringify(snapshot, null, 2));
    } catch {
      logger.warn('failed to persist mls quota state');
    }
  }

  private registerShutdownHooks(): void {
    if (MlsQuotaTracker.shutdownHooksRegistered) {
      return;
    }

    MlsQuotaTracker.shutdownHooksRegistered = true;

    const flush = () => {
      void this.flushPersistedState();
    };

    process.once('beforeExit', flush);
    process.once('SIGINT', flush);
    process.once('SIGTERM', flush);
  }

  private async flushPersistedState(): Promise<void> {
    if (!this.getStateFilePath()) return;

    try {
      this.persistDebouncer.flush();
      await this.lastPersistPromise;
    } catch {
      logger.warn('failed to flush persisted mls quota state');
    }
  }

  private getLimit(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
  ): number {
    switch (metric) {
      case 'requestsPerHour':
        return this.config.requestsPerHourLimit;
      case 'requestsPerDay':
        return this.config.requestsPerDayLimit;
      case 'bytesPerHour':
        return this.config.bytesPerHourLimit;
      case 'bytesPerDay':
        return this.config.bytesPerDayLimit;
    }
  }

  private getWindowStartMs(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
  ): number {
    return metric === 'requestsPerHour' || metric === 'bytesPerHour'
      ? this.hour.startedAtMs
      : this.day.startedAtMs;
  }

  private getResetAtMs(
    metric: 'requestsPerHour' | 'requestsPerDay' | 'bytesPerHour' | 'bytesPerDay',
  ): number {
    return metric === 'requestsPerHour' || metric === 'bytesPerHour'
      ? this.hour.startedAtMs + HOUR_MS
      : this.day.startedAtMs + DAY_MS;
  }
}

export const mlsQuotaTracker = new MlsQuotaTracker();
