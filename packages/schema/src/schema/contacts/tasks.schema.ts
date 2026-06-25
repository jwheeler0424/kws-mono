import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { user } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';
import { contacts } from './contacts.schema';

export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);

export const tasks = pgTable('tasks', {
  id: idPrimaryKey,

  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),

  assignedTo: uuid('assigned_to')
    .$type<UUIDv7>()
    .references(() => user.id),

  title: text('title').notNull(),
  description: text('description'),

  status: taskStatusEnum('status').default('pending').notNull(),
  priority: taskPriorityEnum('priority').default('medium').notNull(),

  dueAt: timestamp('due_at', {
    withTimezone: true,
    mode: 'date',
  }),
  ...timestamps,
});
