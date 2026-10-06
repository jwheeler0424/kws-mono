import { z } from 'zod';

import './preload.ts';

const durationRegex = /^(-?\d+(?:\.\d+)?(?:ns|us|µs|ms|s|m|h))+$/;

const durationSchema = z.string().regex(durationRegex, {
  message: "Invalid duration format (e.g., '1h30m', '45s', '500ms')",
});

const envSchema = z.object({
  ALERT_WEBHOOK_URL: z.union([z.httpUrl(), z.literal('')]).optional(),
  ALERT_WEBHOOK_SECRET: z.string().optional(),
  ALERT_SERVICE_NAME: z.string().optional(),
  ALERT_WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

  // ── Ollama configuration ──────────────────────────────────────────────────
  OLLAMA_MODEL: z.string().min(1),
  OLLAMA_PORT: z.coerce.number().int().positive(),
  OLLAMA_HOST: z.union([z.string(), z.ipv4(), z.ipv6()]).default('localhost'),
  OLLAMA_BASE_URL: z.url().default('http://localhost:11434'),
  OLLAMA_NUM_CTX: z.coerce.number().int().positive(),
  OLLAMA_NUM_PREDICT: z.coerce.number().int().positive(),
  OLLAMA_KEEP_ALIVE: durationSchema,

  // ── BetterAuth configuration ──────────────────────────────────────────────
  BETTER_AUTH_SECRET: z
    .string({ message: 'Invalid Base64 string format' })
    .min(32, { message: 'String must be at least 32 characters long' })
    .max(64, { message: 'String must be at most 64 characters long' }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
