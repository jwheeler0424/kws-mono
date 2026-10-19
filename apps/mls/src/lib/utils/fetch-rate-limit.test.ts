import { afterAll, afterEach, expect, mock, test } from 'bun:test';
import { fileURLToPath } from 'node:url';

import { MlsApiError, mlsErrorDetails } from './errors';

const quotaPath = fileURLToPath(new URL('./quota.ts', import.meta.url));
const rateLimitPath = fileURLToPath(new URL('./rate-limit.ts', import.meta.url));
// Bun module mocks are process-wide, so keep every real export available to later test files.
const actualQuota = { ...(await import('./quota')) };
const actualRateLimit = { ...(await import('./rate-limit')) };

await mock.module(quotaPath, () => ({
  ...actualQuota,
  mlsQuotaTracker: { prepareRequest: () => {}, recordResponseBytes: () => {} },
}));
await mock.module(rateLimitPath, () => ({ ...actualRateLimit, throttle: async () => {} }));

const { fetchActivePropertyMediaChunk, fetchPage } = await import('./fetch');
const originalFetch = globalThis.fetch;
let requests = 0;

function respondWith(status: number) {
  globalThis.fetch = (async () => {
    requests += 1;
    return new Response('rate limited', { status, headers: { 'retry-after': '3600' } });
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  requests = 0;
});

afterAll(async () => {
  await mock.module(quotaPath, () => actualQuota);
  await mock.module(rateLimitPath, () => actualRateLimit);
  mock.restore();
});

test('media chunk requests fail fast on 429 instead of honoring Retry-After', async () => {
  respondWith(429);
  const started = Date.now();
  let error: unknown;
  try {
    await fetchActivePropertyMediaChunk(new Date('2026-09-01T00:00:00Z'), 1000);
  } catch (caught) {
    error = caught;
  }

  expect(error).toBeInstanceOf(MlsApiError);
  expect((error as MlsApiError).status).toBe(429);
  expect(requests).toBe(1);
  expect(Date.now() - started).toBeLessThan(5_000);
});

test('client errors are not retried for ordinary requests', async () => {
  respondWith(400);
  let error: unknown;
  try {
    await fetchPage('Property?$top=1');
  } catch (caught) {
    error = caught;
  }

  expect((error as MlsApiError).status).toBe(400);
  expect(requests).toBe(1);
});

test('database logs expose the root SQLSTATE without SQL parameters or URLs', () => {
  const postgres = Object.assign(new Error('permission denied for table mls_gallery_requests'), {
    code: '42501',
  });
  const wrapped = new Error('Failed query: select ...\nparams: secret', { cause: postgres });
  expect(mlsErrorDetails(wrapped)).toEqual({
    error: 'Error',
    message: 'permission denied for table mls_gallery_requests',
    code: '42501',
  });
  expect(
    mlsErrorDetails(new Error('Failure at https://media.mlsgrid.com/token=secret\nparams: secret'))
      .message,
  ).toBe('Failure at [redacted URL]');
});
