import { describe, expect, it } from 'bun:test';

import { MlsMediaDownloadError } from './media-download';
import {
  downloadQueuedMlsMedia,
  isFreshCachedMlsMediaUrl,
  MlsMediaUrlRefreshRequiredError,
} from './media-url';

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
    expect(isFreshCachedMlsMediaUrl(url, new Date(now + 60_000), now)).toBe(true);
  });

  it('downloads a fresh queued link once and records the attempt first', async () => {
    const now = Date.now();
    const url = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 600_000) / 1_000)}&id=photo`;
    const events: string[] = [];
    const result = await downloadQueuedMlsMedia(
      url,
      new Date(now),
      async () => {
        events.push('attempt');
      },
      async (requested) => {
        events.push(requested);
        return 'downloaded';
      },
    );

    expect(result).toBe('downloaded');
    expect(events).toEqual(['attempt', url]);
  });

  it('requires a chunk refresh for missing, expired, or rejected links without downloading again', async () => {
    const now = Date.now();
    const expired = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now - 1_000) / 1_000)}&id=photo`;
    const fresh = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 600_000) / 1_000)}&id=photo`;
    const requests: string[] = [];
    const download = async (url: string) => {
      requests.push(url);
      throw new MlsMediaDownloadError(410);
    };

    for (const url of [null, expired, fresh]) {
      let error: unknown;
      try {
        await downloadQueuedMlsMedia(url, new Date(now), async () => {}, download);
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(MlsMediaUrlRefreshRequiredError);
    }
    expect(requests).toEqual([fresh]);
  });

  it('keeps quota and transport failures as ordinary download failures', async () => {
    const now = Date.now();
    const url = `https://media.mlsgrid.com/token=x&expires=${Math.floor((now + 600_000) / 1_000)}&id=photo`;
    let errorMessage = '';
    try {
      await downloadQueuedMlsMedia(
        url,
        new Date(now),
        async () => {},
        async () => {
          throw new MlsMediaDownloadError(429);
        },
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
    expect(errorMessage).toContain('HTTP 429');
  });
});
