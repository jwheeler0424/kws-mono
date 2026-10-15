import { MlsMediaDownloadError } from './media-download';

export const MLS_MEDIA_URL_REFRESH_REQUIRED = 'MLS media URL refresh required';
const CACHED_MLS_MEDIA_URL_MAX_AGE_MS = 5 * 60_000;
const REFRESHABLE_DOWNLOAD_STATUSES = new Set([401, 403, 404, 410]);

export class MlsMediaUrlRefreshRequiredError extends Error {
  constructor() {
    super(MLS_MEDIA_URL_REFRESH_REQUIRED);
    this.name = 'MlsMediaUrlRefreshRequiredError';
  }
}

export function isFreshCachedMlsMediaUrl(
  mediaURL: string | null,
  updatedAt: Date | null,
  now = Date.now(),
): boolean {
  if (!mediaURL || !updatedAt) return false;
  const expiration = /(?:[?&])expires=(\d+)(?:&|\/|$)/.exec(mediaURL);
  if (expiration) return Number(expiration[1]) * 1_000 > now + 30_000;
  const age = now - updatedAt.getTime();
  return age >= 0 && age <= CACHED_MLS_MEDIA_URL_MAX_AGE_MS;
}

export async function downloadQueuedMlsMedia<T>(
  mediaURL: string | null,
  updatedAt: Date | null,
  markAttempt: () => Promise<void>,
  download: (url: string) => Promise<T>,
): Promise<T> {
  if (!mediaURL || !isFreshCachedMlsMediaUrl(mediaURL, updatedAt)) {
    throw new MlsMediaUrlRefreshRequiredError();
  }
  await markAttempt();
  try {
    return await download(mediaURL);
  } catch (error) {
    if (error instanceof MlsMediaDownloadError && REFRESHABLE_DOWNLOAD_STATUSES.has(error.status)) {
      throw new MlsMediaUrlRefreshRequiredError();
    }
    throw error;
  }
}
