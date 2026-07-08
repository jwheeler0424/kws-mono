import type { StandardStatus } from '@kws/schema';

export const DEFAULT_ACTIVE_STATUSES: StandardStatus[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];
export const DEFAULT_PENDING_STATUSES: StandardStatus[] = ['Pending'];
export const DEFAULT_SOLD_STATUSES: StandardStatus[] = ['Closed'];
export const DEFAULT_FEATURED_STATUSES: StandardStatus[] = ['Active'];
