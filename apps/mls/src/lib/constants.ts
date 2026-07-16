export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const REQUEST_TIMEOUT_MS = 30_000;
export const MAX_RETRIES = 3;

export const MLS_SYNC_DEFAULTS = {
  pageSize: 5000,
  maxPageSizeWithExpand: 1000,
  deltaOverlapMs: 0,
  minDeltaOverlapMs: 1000,
  timestampPrecisionSafetyMs: 1000,
  seedFetchIngestOverlapEnabled: true,
  seedFetchIngestQueueDepth: 2,
  cleanupRetentionDays: 30,
} as const;

export const MLS_RATE_LIMIT_DEFAULTS = {
  requestDelayMs: 550,
  requestsPerSecond: 2,
  requestThrottleCurvePower: 4,
  requestThrottleMaxDelayMs: 5000,
} as const;

export const MLS_QUOTA_DEFAULTS = {
  requestsPerHourLimit: 7200,
  requestsPerDayLimit: 40_000,
  bytesPerHourLimit: 3_221_225_472,
  bytesPerDayLimit: 64_424_509_440,
  quotaWarnThresholdRatio: 0.9,
  quotaStateFile: '.mls-quota-state.json',
} as const;

export const MLS_HISTORY_DEFAULTS = {
  storeEnabled: true,
  storePath: 'data',
  replayBatchSize: 1000,
  lockTimeoutMs: 30_000,
  lockStaleMs: 300_000,
  compactMaxBytes: 256 * 1024 * 1024,
  verifyChecksumEnabled: true,
  quarantineEnabled: true,
  quarantineAlertThreshold: 1,
} as const;

export const MLS_PROPERTY_DEFAULTS = {
  processBatchSize: 500,
  replayBatchSize: 1000,
  upsertBatchSize: 150,
  childUpsertBatchSize: 750,
  childUpsertConcurrency: 2,
  seedUseStaging: false,
  seedStagingSyncCommitOff: false,
  seedStagingStatementTimeoutMs: 120_000,
  seedStagingLockTimeoutMs: 5000,
  seedStagingWorkMemMb: 128,
  seedStagingJitOff: true,
} as const;

export const MLS_SCHEDULER_DEFAULTS = {
  maxConcurrentScheduledJobs: 2,
  mediaSyncBatchSize: 64,
  mediaSyncMaxBatches: 24,
  mediaSyncProcessConcurrency: 6,
  mediaSyncIncludeMissingFilesRepair: false,
  mediaSyncRepairMaxBatches: 2,
} as const;

export const DEFAULT_RESOURCE_EXPANDS: Readonly<Record<string, readonly string[]>> = {
  Member: ['Media'],
  Office: ['Media'],
  Property: ['Media', 'Rooms', 'UnitTypes'],
};

export const MLS_RESOURCE_NAMES = ['Lookup', 'Member', 'Office', 'Property', 'OpenHouse'] as const;
