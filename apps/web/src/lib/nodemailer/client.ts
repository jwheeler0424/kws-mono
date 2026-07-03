import { env } from '@kws/config';
import nodemailer, { type Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

const transportOptions: SMTPTransport.Options = {
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  dkim:
    env.DKIM_PRIVATE_KEY && env.DKIM_DOMAIN && env.DKIM_SELECTOR
      ? {
          domainName: env.DKIM_DOMAIN,
          keySelector: env.DKIM_SELECTOR,
          privateKey: env.DKIM_PRIVATE_KEY,
        }
      : undefined,
};

declare global {
  var __nodemailerClient: Transporter | undefined;
}

const nodemailerSingleton =
  globalThis.__nodemailerClient ?? nodemailer.createTransport(transportOptions);

if (env.NODE_ENV !== 'production') {
  globalThis.__nodemailerClient = nodemailerSingleton;
}

export const Mailer: Transporter = nodemailerSingleton;
export const nodemailerClient: Transporter = nodemailerSingleton;
export type { Transporter };

export default Mailer;
