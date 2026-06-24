import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-orm/zod';

import type { UUIDv7 } from '@/types';

import { user } from './auth';
import { idPrimaryKey, timestamps } from './common.schema';

// ── Notification ────────────────────────────────────────────────────────────
export const notificationType = pgEnum('notification_type', ['CONTACT_REQUEST']);

export const notifications = pgTable('notifications', {
  id: idPrimaryKey,
  user_id: uuid('user_id')
    .$type<UUIDv7>()
    .references(() => user.id),
  type: notificationType('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  resource_type: text('resource_type'),
  resource_id: uuid('resource_id').$type<UUIDv7>(),
  read_at: timestamp('read_at', { mode: 'date' }),
  ...timestamps,
});

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export const selectNotificationsSchema = createSelectSchema(notifications);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
