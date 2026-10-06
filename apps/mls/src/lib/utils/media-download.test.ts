import { describe, expect, it } from 'bun:test';

import { downloadMlsMedia, validateMediaDownloadUrl } from './media-download';

describe('single-use MLS media transport', () => {
  it('preserves the signed URL and sends the token only as User-Agent', async () => {
    const url = 'https://media.mlsgrid.com/token=a%2Fb&expires=9999999999&id=abc/images/photo.jpeg';
    const requests: Array<{ url: unknown; options: RequestInit | undefined }> = [];
    const fetcher = (async (input, options) => {
      requests.push({ url: input, options });
      return new Response('image');
    }) as typeof fetch;
    await downloadMlsMedia(url, 'test-token', fetcher);
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(url);
    expect(requests[0]?.options?.headers).toEqual({ 'User-Agent': 'test-token' });
    expect(requests[0]?.options?.redirect).toBe('manual');
  });

  it('does not retry a spent URL or expose it in errors', async () => {
    let requests = 0;
    const fetcher = (async () => {
      requests += 1;
      return new Response('', { status: 429 });
    }) as unknown as typeof fetch;
    let message = '';
    try {
      await downloadMlsMedia(
        'https://media.mlsgrid.com/token=secret&expires=9999999999&id=a/image.jpeg',
        'token',
        fetcher,
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('HTTP 429');
    expect(message).not.toContain('secret');
    expect(requests).toBe(1);
  });

  it('rejects expired URLs and unapproved destinations before requesting', () => {
    expect(() =>
      validateMediaDownloadUrl('https://media.mlsgrid.com/token=a&expires=1&id=b/image.jpeg'),
    ).toThrow('HTTP 410');
    expect(() => validateMediaDownloadUrl('https://example.com/image.jpeg')).toThrow('HTTP 400');
  });

  it('allows the demo media host only in explicitly selected demo mode', async () => {
    const url = 'https://media-demo.mlsgrid.com/token=demo&expires=9999999999&id=a/image.jpeg';
    expect(() => validateMediaDownloadUrl(url)).toThrow('HTTP 400');
    expect(() => validateMediaDownloadUrl(url, Date.now(), true)).not.toThrow();
    expect(() =>
      validateMediaDownloadUrl('https://media.mlsgrid.com/image.jpeg', Date.now(), true),
    ).toThrow('HTTP 400');
    let requested = '';
    const fetcher = async (input: string) => {
      requested = input;
      return new Response('image');
    };
    await downloadMlsMedia(url, 'test-token', fetcher, { demo: true });
    expect(requested).toBe(url);
  });

  it('follows one signed R2 redirect without forwarding the MLS token', async () => {
    const source = 'https://media-demo.mlsgrid.com/token=demo&expires=9999999999&id=a/image.jpeg';
    const destination =
      'https://mlsgrid.f9ebe9654c02ab185d2bc1491ca042a5.r2.cloudflarestorage.com/photo.jpeg?signature=a%2Fb';
    const requests: Array<{ url: unknown; options: RequestInit | undefined }> = [];
    const fetcher = (async (input, options) => {
      requests.push({ url: input, options });
      return requests.length === 1
        ? new Response(null, { status: 307, headers: { location: destination } })
        : new Response('image');
    }) as typeof fetch;
    await downloadMlsMedia(source, 'private-token', fetcher, { demo: true });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.url).toBe(destination);
    expect(requests[1]?.options?.headers).toEqual({});
    expect(requests[1]?.options?.redirect).toBe('error');
  });

  it('does not follow redirects to arbitrary hosts or private addresses', async () => {
    for (const destination of ['https://example.com/image.jpeg', 'http://127.0.0.1/image.jpeg']) {
      let requests = 0;
      const fetcher = (async () => {
        requests += 1;
        return new Response(null, { status: 307, headers: { location: destination } });
      }) as unknown as typeof fetch;
      let failed = false;
      try {
        await downloadMlsMedia('https://media.mlsgrid.com/image.jpeg', 'token', fetcher);
      } catch {
        failed = true;
      }
      expect(failed).toBe(true);
      expect(requests).toBe(1);
    }
  });
});
