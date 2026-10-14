import { describe, expect, it } from 'bun:test';

import { MlsMediaDownloadError } from './media-download';
import { downloadMlsMediaWithUrlRefresh, isFreshCachedMlsMediaUrl } from './media-url';

describe('MLS media URL cache', () => {
  it('accepts only recently acquired links with enough remaining URL lifetime', () => {
    const now = Date.now();
    const url = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 600_000) / 1_000)}&id=photo`;
    expect(isFreshCachedMlsMediaUrl(url, new Date(now - 60_000), now)).toBe(true);
    expect(isFreshCachedMlsMediaUrl(url, new Date(now - 6 * 60_000), now)).toBe(true);
    expect(
      isFreshCachedMlsMediaUrl('https://media.mlsgrid.com/photo', new Date(now - 6 * 60_000), now),
    ).toBe(false);
    expect(
      isFreshCachedMlsMediaUrl(
        `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 10_000) / 1_000)}&id=photo`,
        new Date(now),
        now,
      ),
    ).toBe(false);
    expect(isFreshCachedMlsMediaUrl(url, null, now)).toBe(false);
  });

  it('refreshes an expired or unauthorized link once', async () => {
    const requests: string[] = [];
    const refreshFlags: boolean[] = [];
    const result = await downloadMlsMediaWithUrlRefresh(
      async (forceRefresh = false) => {
        refreshFlags.push(forceRefresh);
        return forceRefresh ? 'fresh-url' : 'expired-url';
      },
      async (url) => {
        requests.push(url);
        if (url === 'expired-url') throw new MlsMediaDownloadError(410);
        return 'downloaded';
      },
    );

    expect(result).toBe('downloaded');
    expect(requests).toEqual(['expired-url', 'fresh-url']);
    expect(refreshFlags).toEqual([false, true]);
  });

  it('does not refresh quota or transport failures', async () => {
    const refreshFlags: boolean[] = [];
    let errorMessage = '';
    try {
      await downloadMlsMediaWithUrlRefresh(
        async (forceRefresh = false) => {
          refreshFlags.push(forceRefresh);
          return 'url';
        },
        async () => {
          throw new MlsMediaDownloadError(429);
        },
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toContain('HTTP 429');
    expect(refreshFlags).toEqual([false]);
  });
});
