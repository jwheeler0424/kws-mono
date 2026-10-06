export class MlsMediaDownloadError extends Error {
  constructor(
    public readonly status: number,
    public readonly retryAfterMs: number = 3_600_000,
  ) {
    super(`MLS media acquisition deferred (HTTP ${status})`);
    this.name = 'MlsMediaDownloadError';
  }
}

export function validateMediaDownloadUrl(value: string, now = Date.now(), demo = false): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new MlsMediaDownloadError(400);
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.hostname !== (demo ? 'media-demo.mlsgrid.com' : 'media.mlsgrid.com') ||
    parsed.port ||
    parsed.username ||
    parsed.password
  ) {
    throw new MlsMediaDownloadError(400);
  }
  const expiration = /(?:[?&])expires=(\d+)(?:&|\/|$)/.exec(value);
  if (expiration && Number(expiration[1]) * 1_000 <= now) {
    throw new MlsMediaDownloadError(410);
  }
}

export async function downloadMlsMedia(
  url: string,
  accessToken: string,
  fetcher: (url: string, options: RequestInit) => Promise<Response> = fetch,
  options: { demo?: boolean } = {},
): Promise<Blob> {
  validateMediaDownloadUrl(url, Date.now(), options.demo === true);
  try {
    let response = await fetcher(url, {
      headers: { 'User-Agent': accessToken },
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const status = response.status;
      const location = response.headers.get('location');
      await response.body?.cancel();
      let destination: URL;
      try {
        destination = new URL(location ?? '');
      } catch {
        throw new MlsMediaDownloadError(status);
      }
      if (
        destination.protocol !== 'https:' ||
        !/^mlsgrid\.[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(destination.hostname) ||
        destination.port ||
        destination.username ||
        destination.password
      ) {
        throw new MlsMediaDownloadError(status);
      }
      response = await fetcher(location!, {
        headers: {},
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
    }
    if (!response.ok) {
      const retryAfter = response.headers.get('retry-after');
      const delay =
        retryAfter && /^\d+$/.test(retryAfter)
          ? Number(retryAfter) * 1_000
          : retryAfter
            ? Date.parse(retryAfter) - Date.now()
            : 0;
      throw new MlsMediaDownloadError(
        response.status,
        Math.max(3_600_000, Number.isFinite(delay) ? delay : 0),
      );
    }
    return await response.blob();
  } catch (error) {
    if (error instanceof MlsMediaDownloadError) throw error;
    throw new MlsMediaDownloadError(0);
  }
}
