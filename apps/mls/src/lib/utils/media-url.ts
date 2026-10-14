import { MlsMediaDownloadError } from './media-download';

const CACHED_MLS_MEDIA_URL_MAX_AGE_MS = 5 * 60_000;
const REFRESHABLE_DOWNLOAD_STATUSES = new Set([401, 403, 404, 410]);

export function isFreshCachedMlsMediaUrl(
  mediaURL: string | null,
  updatedAt: Date | null,
  now = Date.now(),
): boolean {
  if (!mediaURL || !updatedAt) return false;
  const age = now - updatedAt.getTime();
  if (age < 0) return false;
  const expiration = /(?:[?&])expires=(\d+)(?:&|\/|$)/.exec(mediaURL);
  if (expiration) return Number(expiration[1]) * 1_000 > now + 30_000;
  return age <= CACHED_MLS_MEDIA_URL_MAX_AGE_MS;
}

export async function downloadMlsMediaWithUrlRefresh<T>(
  getMediaUrl: (forceRefresh?: boolean) => Promise<string>,
  download: (url: string) => Promise<T>,
): Promise<T> {
  try {
    return await download(await getMediaUrl());
  } catch (error) {
    if (
      !(error instanceof MlsMediaDownloadError) ||
      !REFRESHABLE_DOWNLOAD_STATUSES.has(error.status)
    ) {
      throw error;
    }
    return download(await getMediaUrl(true));
  }
}
