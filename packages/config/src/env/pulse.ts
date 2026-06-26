import { z } from 'zod';
import './preload.ts';

const envSchema = z.object({
  // ── Pulse email + analytics ───────────────────────────────────────────────
  TRACKING_HOST: z.string().min(1),
  TRACKING_PORT: z.coerce.number().int().positive(),
  TRACKING_DOMAIN: z.string().min(1),
  TRACKING_FALLBACK_URL: z.string().min(1),
  BOUNCE_DOMAIN: z.string().min(1),

  // ── Pulse runtime ─────────────────────────────────────────────────────────
  EMAIL_TOKEN_TTL_DAYS: z.coerce.number().int().positive(),
  PULSE_WEBHOOK_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  // ── Pulse GeoIP (ipwho.is) ───────────────────────────────────────────────
  GEOIP_IPWHOIS_BASE_URL: z.url().default('https://ipwho.is/'),
  GEOIP_IPWHOIS_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
  GEOIP_IPWHOIS_CACHE_TTL_MS: z.coerce.number().int().positive().default(300000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
