import { boolean, date, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-orm/zod';

import type { UUIDv7 } from '@kws/types';

import { idPrimaryKey, timestamps } from '../common.schema';
import { companies } from './companies.schema';

// ── Contacts ─────────────────────────────────────────────────────────
export const contactTypeEnum = pgEnum('contact_type', ['person', 'organization']);
export const contactStatusEnum = pgEnum('contact_status', [
  'lead',
  'prospect',
  'customer',
  'subscriber',
  'inactive',
]);
export const contactSourceEnum = pgEnum('contact_source', [
  'website',
  'referral',
  'import',
  'newsletter',
  'event',
  'social_media',
  'other',
]);

export const contacts = pgTable('contacts', {
  id: idPrimaryKey,
  type: contactTypeEnum('type').default('person').notNull(),

  firstName: text('first_name'),
  middleName: text('middle_name'),
  lastName: text('last_name'),
  preferredName: text('preferred_name'),

  prefix: text('prefix'),
  suffix: text('suffix'),

  jobTitle: text('job_title'),
  department: text('department'),

  birthday: date('birthday'),

  timezone: text('timezone'),
  language: text('language'),

  source: contactSourceEnum('source').default('website').notNull(),
  status: contactStatusEnum('status').default('subscriber').notNull(),
  notes: text('notes'),
  ownerUserId: uuid('owner_user_id'),
  ...timestamps,
});

export const contactCompanies = pgTable('contact_companies', {
  id: idPrimaryKey,
  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  role: text('role'),
  isPrimary: boolean('is_primary').default(false).notNull(),

  startDate: date('start_date'),
  endDate: date('end_date'),
  ...timestamps,
});

export const contactNewsletter = pgTable('contact_newsletters', {
  id: idPrimaryKey,
  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id')
    .$type<UUIDv7>()
    .references(() => companies.id, { onDelete: 'cascade' }),
  subscribedAt: timestamp('subscribed_at', {
    withTimezone: true,
    mode: 'date',
  }).notNull(),
  ...timestamps,
});

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export const selectContactsSchema = createSelectSchema(contacts);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
