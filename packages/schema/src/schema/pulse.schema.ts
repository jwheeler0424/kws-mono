import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  inet,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { idPrimaryKey, timestamps } from './common.schema';

export const emailCampaignStatusValues = ['draft', 'sending', 'sent', 'paused'] as const;
export const emailSendStatusValues = [
  'queued',
  'sent',
  'delivered',
  'opened',
  'clicked',
  'bounced_soft',
  'bounced_hard',
  'unsubscribed',
  'spam_complaint',
  'failed',
] as const;
export const emailTrackingEventTypeValues = ['open', 'click', 'unsub'] as const;
export const emailEventTypeValues = [
  'open',
  'open_mpp',
  'click',
  'click_bot',
  'bounce_hard',
  'bounce_soft',
  'unsubscribed',
  'spam_complaint',
  'delivered',
  'failed',
] as const;
export const suppressionReasonValues = [
  'hard_bounce',
  'unsubscribed',
  'spam_complaint',
  'manual',
] as const;
export const bounceTypeValues = ['hard', 'soft', 'undetermined'] as const;
export const reportFormatValues = ['csv', 'json'] as const;
export const reportStatusValues = ['pending', 'complete', 'failed'] as const;

export const emailCampaignStatusEnum = pgEnum('email_campaign_status', emailCampaignStatusValues);
export const emailSendStatusEnum = pgEnum('email_send_status', emailSendStatusValues);
export const emailTrackingEventTypeEnum = pgEnum(
  'email_tracking_event_type',
  emailTrackingEventTypeValues,
);
export const emailEventTypeEnum = pgEnum('email_event_type', emailEventTypeValues);
export const suppressionReasonEnum = pgEnum('email_suppression_reason', suppressionReasonValues);
export const bounceTypeEnum = pgEnum('email_bounce_type', bounceTypeValues);
export const reportFormatEnum = pgEnum('email_report_format', reportFormatValues);
export const reportStatusEnum = pgEnum('email_report_status', reportStatusValues);

export const emailCampaigns = pgTable(
  'email_campaigns',
  {
    id: idPrimaryKey,
    name: text('name').notNull(),
    subject: text('subject').notNull(),
    fromName: text('from_name').notNull(),
    fromEmail: text('from_email').notNull(),
    replyTo: text('reply_to'),
    status: emailCampaignStatusEnum('status').notNull().default('draft'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('email_campaigns_created_id_idx').on(table.createdAt, table.id),
    index('email_campaigns_status_created_id_idx').on(table.status, table.createdAt, table.id),
  ],
);

export const emailSends = pgTable(
  'email_sends',
  {
    id: idPrimaryKey,
    campaignId: uuid('campaign_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
    recipientEmail: text('recipient_email').notNull(),
    recipientName: text('recipient_name'),
    status: emailSendStatusEnum('status').notNull().default('queued'),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('email_sends_campaign_idx').on(table.campaignId),
    index('email_sends_recipient_sent_idx').on(table.recipientEmail, table.sentAt),
    index('email_sends_status_idx').on(table.status),
  ],
);

export const emailTrackingTokens = pgTable(
  'email_tracking_tokens',
  {
    token: varchar('token', { length: 32 }).primaryKey(),
    sendId: uuid('send_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailSends.id, { onDelete: 'cascade' }),
    eventType: emailTrackingEventTypeEnum('event_type').notNull(),
    destination: text('destination'),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('email_tracking_tokens_send_event_idx').on(table.sendId, table.eventType),
    index('email_tracking_tokens_expires_idx').on(table.expiresAt),
  ],
);

export const emailEvents = pgTable(
  'email_events',
  {
    id: idPrimaryKey,
    sendId: uuid('send_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailSends.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
    eventType: emailEventTypeEnum('event_type').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    countryCode: varchar('country_code', { length: 2 }),
    region: text('region'),
    city: text('city'),
    emailClient: text('email_client'),
    isMobile: boolean('is_mobile'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    isDuplicate: boolean('is_duplicate').notNull().default(false),
  },
  (table) => [
    index('email_events_send_type_occurred_idx').on(
      table.sendId,
      table.eventType,
      table.occurredAt,
    ),
    index('email_events_campaign_type_occurred_idx').on(
      table.campaignId,
      table.eventType,
      table.occurredAt,
    ),
    index('email_events_campaign_occurred_id_idx').on(table.campaignId, table.occurredAt, table.id),
    index('email_events_campaign_type_occurred_id_idx').on(
      table.campaignId,
      table.eventType,
      table.occurredAt,
      table.id,
    ),
    index('email_events_occurred_idx').on(table.occurredAt),
    index('email_events_campaign_country_open_click_idx')
      .on(table.campaignId, table.countryCode)
      .where(
        sql`${table.isDuplicate} = false AND ${table.countryCode} IS NOT NULL AND ${table.eventType} IN ('open', 'click')`,
      ),
    index('email_events_campaign_client_mobile_open_click_idx')
      .on(table.campaignId, table.emailClient, table.isMobile)
      .where(sql`${table.isDuplicate} = false AND ${table.eventType} IN ('open', 'click')`),
  ],
);

export const emailCampaignStats = pgTable('email_campaign_stats', {
  campaignId: uuid('campaign_id')
    .$type<UUIDv7>()
    .primaryKey()
    .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
  sentCount: integer('sent_count').notNull().default(0),
  deliveredCount: integer('delivered_count').notNull().default(0),
  openCount: integer('open_count').notNull().default(0),
  openCountRaw: integer('open_count_raw').notNull().default(0),
  openCountMpp: integer('open_count_mpp').notNull().default(0),
  clickCount: integer('click_count').notNull().default(0),
  clickCountTotal: integer('click_count_total').notNull().default(0),
  clickCountBot: integer('click_count_bot').notNull().default(0),
  bounceHardCount: integer('bounce_hard_count').notNull().default(0),
  bounceSoftCount: integer('bounce_soft_count').notNull().default(0),
  unsubscribeCount: integer('unsubscribe_count').notNull().default(0),
  spamComplaintCount: integer('spam_complaint_count').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const emailLinkStats = pgTable(
  'email_link_stats',
  {
    id: idPrimaryKey,
    campaignId: uuid('campaign_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
    destinationUrl: text('destination_url').notNull(),
    clickCount: integer('click_count').notNull().default(0),
    uniqueClickCount: integer('unique_click_count').notNull().default(0),
    firstClickedAt: timestamp('first_clicked_at', {
      withTimezone: true,
      mode: 'date',
    }),
    lastClickedAt: timestamp('last_clicked_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    uniqueIndex('email_link_stats_campaign_destination_unique').on(
      table.campaignId,
      table.destinationUrl,
    ),
    index('email_link_stats_campaign_idx').on(table.campaignId),
  ],
);

export const emailEventsHourly = pgTable(
  'email_events_hourly',
  {
    id: idPrimaryKey,
    campaignId: uuid('campaign_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailCampaigns.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    hourBucket: timestamp('hour_bucket', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (table) => [
    uniqueIndex('email_events_hourly_campaign_event_hour_unique').on(
      table.campaignId,
      table.eventType,
      table.hourBucket,
    ),
    index('email_events_hourly_campaign_bucket_idx').on(table.campaignId, table.hourBucket),
  ],
);

export const emailSuppressionList = pgTable(
  'email_suppression_list',
  {
    email: text('email').primaryKey(),
    reason: suppressionReasonEnum('reason').notNull(),
    suppressedAt: timestamp('suppressed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    sendId: uuid('send_id')
      .$type<UUIDv7>()
      .references(() => emailSends.id, {
        onDelete: 'set null',
      }),
    notes: text('notes'),
  },
  (table) => [
    index('email_suppression_list_suppressed_email_idx').on(table.suppressedAt, table.email),
  ],
);

export const emailBounces = pgTable(
  'email_bounces',
  {
    id: idPrimaryKey,
    sendId: uuid('send_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailSends.id, { onDelete: 'cascade' }),
    bounceType: bounceTypeEnum('bounce_type').notNull(),
    smtpCode: varchar('smtp_code', { length: 3 }),
    enhancedCode: varchar('enhanced_code', { length: 10 }),
    diagnostic: text('diagnostic'),
    retryCount: integer('retry_count').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', {
      withTimezone: true,
      mode: 'date',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('email_bounces_send_idx').on(table.sendId),
    index('email_bounces_next_retry_idx').on(table.nextRetryAt),
  ],
);

export const emailWebhooks = pgTable('email_webhooks', {
  id: idPrimaryKey,
  url: text('url').notNull(),
  events: jsonb('events')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  secret: text('secret').notNull(),
  active: boolean('active').notNull().default(true),
  failCount: integer('fail_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export const emailWebhookDeliveries = pgTable(
  'email_webhook_deliveries',
  {
    id: idPrimaryKey,
    webhookId: uuid('webhook_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailWebhooks.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => emailEvents.id, { onDelete: 'cascade' }),
    attempt: integer('attempt').notNull().default(1),
    statusCode: integer('status_code'),
    responseBody: text('response_body'),
    error: text('error'),
    deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    nextRetryAt: timestamp('next_retry_at', {
      withTimezone: true,
      mode: 'date',
    }),
  },
  (table) => [
    index('email_webhook_deliveries_webhook_delivered_idx').on(table.webhookId, table.deliveredAt),
    index('email_webhook_deliveries_next_retry_idx').on(table.nextRetryAt),
  ],
);

export const emailReportSchedules = pgTable('email_report_schedules', {
  id: idPrimaryKey,
  name: text('name').notNull(),
  campaignIds: jsonb('campaign_ids')
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  metrics: jsonb('metrics').$type<string[]>().notNull(),
  format: reportFormatEnum('format').notNull().default('csv'),
  cronExpression: text('cron_expression').notNull(),
  recipientEmail: text('recipient_email').notNull(),
  active: boolean('active').notNull().default(true),
  lastRunAt: timestamp('last_run_at', { withTimezone: true, mode: 'date' }),
  ...timestamps,
});

export const emailReports = pgTable(
  'email_reports',
  {
    id: idPrimaryKey,
    status: reportStatusEnum('status').notNull().default('pending'),
    request: jsonb('request')
      .$type<{
        campaignIds: UUIDv7[];
        dateRange: { from: string; to: string };
        metrics: string[];
        format: (typeof reportFormatValues)[number];
      }>()
      .notNull(),
    error: text('error'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'date',
    }),
    failedAt: timestamp('failed_at', { withTimezone: true, mode: 'date' }),
    ...timestamps,
  },
  (table) => [index('email_reports_status_created_idx').on(table.status, table.createdAt)],
);

export const emailAuditLog = pgTable('email_audit_log', {
  id: idPrimaryKey,
  action: text('action').notNull(),
  actor: text('actor'),
  target: text('target'),
  metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
  occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type EmailTrackingTokenRow = typeof emailTrackingTokens.$inferSelect;
export type EmailSendRow = typeof emailSends.$inferSelect;
export type EmailSuppressionRow = typeof emailSuppressionList.$inferSelect;
