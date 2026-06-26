import { z } from 'zod';
import './preload.ts';

const domainSchema = z.string().regex(z.regexes.domain);

const dkimSelectorRegex = /^[a-zA-Z0-9][-a-zA-Z0-9.]{0,62}$/;

const dkimPrivateKeySchema = z.string().superRefine((val, ctx) => {
  // 1. Check if the string is empty
  if (!val || val.trim() === '') {
    ctx.addIssue({
      code: 'custom',
      message: 'Private key is required and cannot be empty.',
    });
    return;
  }

  // 2. Check for standard PEM format start/end tags
  const hasValidHeader = val.includes('-----BEGIN PRIVATE KEY-----');
  const hasValidFooter = val.includes('-----END PRIVATE KEY-----');

  if (!hasValidHeader || !hasValidFooter) {
    ctx.addIssue({
      code: 'custom',
      message:
        'Invalid PEM format. Ensure it includes both "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----".',
    });
    return;
  }

  // 3. Extract inner Base64 string payload
  const pemBody = val
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, ''); // Remove all newlines and spaces

  // 4. Validate Base64 formatting
  if (!z.base64().safeParse(pemBody).success) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid key content. The private key contains illegal Base64 characters.',
    });
    return;
  }

  // 5. Ensure length is plausible for an RSA-2048/1024 or Ed25519 key
  const result = z.base64().min(100).safeParse(pemBody);

  if (!result.success) {
    ctx.addIssue({
      code: 'custom',
      message: 'Invalid key content. The private key contains illegal Base64 characters.',
    });
    return;
  }
});

const envSchema = z.object({
  // ── Email configuration ───────────────────────────────────────────────────
  EMAIL_DOMAIN: domainSchema,
  EMAIL_FROM: z.string().min(1),

  // ── SMTP transport ────────────────────────────────────────────────────────
  SMTP_HOST: z.hostname(),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.union([z.boolean(), z.stringbool()]),
  SMTP_USER: z.email(),
  SMTP_PASS: z.string().min(1),

  // ── IMAP incoming (optional, defaults to SMTP values when omitted) ────────
  IMAP_HOST: z.hostname(),
  IMAP_PORT: z.coerce.number().int().positive(),
  IMAP_SECURE: z.union([z.boolean(), z.stringbool()]),
  IMAP_USER: z.email(),
  IMAP_PASS: z.string().min(1),

  // ── DKIM optional unless required by your provider/policy ─────────────────
  DKIM_DOMAIN: domainSchema,
  DKIM_SELECTOR: z
    .string()
    .min(1, { message: 'DKIM selector cannot be empty.' })
    .max(63, { message: 'DKIM selector must be 63 characters or less.' })
    .regex(dkimSelectorRegex, {
      message:
        'Invalid selector format. Only alphanumeric characters, hyphens, and periods are allowed.',
    }),
  DKIM_PRIVATE_KEY: dkimPrivateKeySchema,
});

const parsed = envSchema.safeParse(Bun.env);

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${parsed.error.message}`);
}

export default parsed.data;
