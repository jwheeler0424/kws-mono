import { z } from 'zod';

import './preload.ts';

const envSchema = z.object({
  // ── Database configuration ──────────────────────────────────────────────
  DATABASE_URL: z.url(),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  DB_HOST: z.hostname().default('localhost'),
  DB_PORT: z.coerce.number().int().positive(),

  // ── Redis configuration ─────────────────────────────────────────────────
  REDIS_HOST: z.hostname().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive(),
  REDIS_URL: z.url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
