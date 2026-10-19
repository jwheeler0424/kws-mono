// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

import { getBodyPreview } from './helpers';

export function mlsErrorDetails(error: unknown) {
  let cause = error;
  for (
    let depth = 0;
    depth < 5 && cause instanceof Error && cause.cause instanceof Error;
    depth += 1
  ) {
    cause = cause.cause;
  }
  const message = cause instanceof Error ? cause.message : 'Unknown error';
  return {
    error: error instanceof Error ? error.name : 'UnknownError',
    message: message
      .split('\n')[0]!
      .replace(/(?:https?|postgres(?:ql)?):\/\/\S+/gi, '[redacted URL]')
      .slice(0, 500),
    code:
      cause instanceof Error && 'code' in cause && typeof cause.code === 'string'
        ? cause.code
        : null,
  };
}

export class MlsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string,
    public readonly bodyPreview: string = getBodyPreview(body, 240),
    public readonly retryAfterMs: number = 0,
  ) {
    super(`MLS API ${status} at ${endpoint} (body: ${bodyPreview})`);
    this.name = 'MlsApiError';
  }
}
