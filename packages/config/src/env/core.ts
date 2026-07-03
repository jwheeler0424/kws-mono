import { z } from 'zod';

import './preload.ts';

const httpHttpsUrl = z.url().refine((value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}, 'Must be a valid HTTP(S) URL');

const envSchema = z.object({
  // ── Environment ──────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HOST: z.union([z.ipv4(), z.ipv6(), z.hostname(), z.literal('localhost')]).default('localhost'),
  PORT: z.coerce.number().int().positive(),

  // ── Logging configuration ────────────────────────────────────────────────────
  LOG_LEVEL: z.enum(['debug', 'trace', 'info', 'log', 'warn', 'error']).optional().default('info'),
  LOG_PRETTY: z.union([z.boolean(), z.stringbool()]).optional().default(true),
  LOG_REDACT_KEYS: z
    .string()
    .transform((value) => value.split(',').map((s) => s.trim()))
    .optional()
    .default([]),

  // ── Application configuration ────────────────────────────────────────────────
  APP_NAME: z.string(),
  APP_URL: httpHttpsUrl,
});

const runtimeEnv = process.env;
const parsed = envSchema.safeParse(runtimeEnv);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
