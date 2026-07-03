// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

import { getBodyPreview } from './helpers';

export class MlsApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    public readonly body: string,
    public readonly bodyPreview: string = getBodyPreview(body, 240),
  ) {
    super(`MLS API ${status} at ${endpoint} (body: ${bodyPreview})`);
    this.name = 'MlsApiError';
  }
}
