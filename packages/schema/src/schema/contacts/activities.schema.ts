import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { user } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';
import { contacts } from './contacts.schema';

export const activityTypeEnum = pgEnum('activity_type', [
  'call',
  'email',
  'meeting',
  'sms',
  'note',
  'task',
]);

export const activities = pgTable('activities', {
  id: idPrimaryKey,

  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),

  type: activityTypeEnum('type').notNull(),
  subject: text('subject'),
  body: text('body'),

  createdBy: uuid('created_by')
    .$type<UUIDv7>()
    .references(() => user.id),

  occurredAt: timestamp('occurred_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  ...timestamps,
});
