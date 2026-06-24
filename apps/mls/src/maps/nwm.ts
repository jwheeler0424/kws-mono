import type { infer as ZodInfer, ZodObject, ZodRawShape } from 'zod';

import { sanitizeJsonObject } from '../normalize';

export function extractSchemaMetadata<TShape extends ZodRawShape>(
  payload: Record<string, unknown>,
  schema: ZodObject<TShape>,
): ZodInfer<ZodObject<TShape>> | null {
  const schemaKeys = new Set(Object.keys(schema.shape));
  const metadata: Record<string, unknown> = {};

  for (const [rawKey, value] of Object.entries(payload)) {
    const canonicalKey = rawKey.toLowerCase().startsWith('nwm_')
      ? `NWM_${rawKey.slice(4)}`
      : rawKey;
    if (!schemaKeys.has(canonicalKey)) {
      continue;
    }
    metadata[canonicalKey] = value;
  }

  if (Object.keys(metadata).length === 0) {
    return null;
  }

  return sanitizeJsonObject(metadata) as ZodInfer<ZodObject<TShape>>;
}
