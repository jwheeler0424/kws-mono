import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@/types';

import { idPrimaryKey, timestamps } from '../common.schema';
import { contacts } from './contacts.schema';

export const emailTypeEnum = pgEnum('email_type', [
  'personal',
  'work',
  'billing',
  'support',
  'other',
]);

export const phoneTypeEnum = pgEnum('phone_type', ['mobile', 'home', 'work', 'fax', 'other']);

export const addressTypeEnum = pgEnum('address_type', [
  'home',
  'work',
  'billing',
  'shipping',
  'other',
]);

export const contactEmails = pgTable(
  'contact_emails',
  {
    id: idPrimaryKey,
    contactId: uuid('contact_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),

    email: text('email').notNull(),
    type: emailTypeEnum('type').default('personal').notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    doNotEmail: boolean('do_not_email').default(false).notNull(),

    bouncedAt: timestamp('bounced_at', {
      withTimezone: true,
      mode: 'date',
    }),
    verifiedAt: timestamp('verified_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (t) => [
    index('contact_emails_contact_idx').on(t.contactId),
    index('contact_emails_contact_primary_idx').on(t.contactId, t.isPrimary),
    index('contact_emails_email_idx').on(t.email),
    uniqueIndex('primary_email_unique_idx')
      .on(t.email)
      .where(sql`${t.isPrimary} = true`),
  ],
);

export const contactPhones = pgTable(
  'contact_phones',
  {
    id: idPrimaryKey,

    contactId: uuid('contact_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),

    countryCode: text('country_code'),
    phoneNumber: text('phone_number').notNull(),
    extension: text('extension'),
    type: phoneTypeEnum('type').notNull(),

    isPrimary: boolean('is_primary').default(false).notNull(),

    doNotCall: boolean('do_not_call').default(false).notNull(),

    verifiedAt: timestamp('verified_at', {
      withTimezone: true,
      mode: 'date',
    }),
    ...timestamps,
  },
  (t) => [
    index('contact_phones_contact_idx').on(t.contactId),
    index('contact_phones_contact_primary_idx').on(t.contactId, t.isPrimary),
    index('contact_phones_phone_idx').on(t.phoneNumber),
    uniqueIndex('primary_phone_unique_idx')
      .on(t.phoneNumber)
      .where(sql`${t.isPrimary} = true`),
  ],
);

export const contactAddresses = pgTable(
  'contact_addresses',
  {
    id: idPrimaryKey,

    contactId: uuid('contact_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),

    type: addressTypeEnum('type').notNull(),
    line1: text('line1').notNull(),
    line2: text('line2'),
    city: text('city'),
    stateProvince: text('state_province'),
    postalCode: text('postal_code'),
    countryCode: text('country_code'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    isPrimary: boolean('is_primary').default(false).notNull(),
    ...timestamps,
  },
  (t) => [
    index('contact_addresses_contact_idx').on(t.contactId),
    index('contact_addresses_city_idx').on(t.city),
    index('contact_addresses_postal_idx').on(t.postalCode),
    uniqueIndex('primary_address_unique_idx')
      .on(t.contactId, t.type)
      .where(sql`${t.isPrimary} = true`),
  ],
);

export const contactWebsites = pgTable('contact_websites', {
  id: idPrimaryKey,

  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),

  label: text('label'),
  url: text('url').notNull(),
  ...timestamps,
});

export const socialPlatformsEnum = pgEnum('social_platform', [
  'linkedin',
  'x',
  'facebook',
  'instagram',
  'tiktok',
  'github',
  'other',
]);

export const contactSocialProfiles = pgTable('contact_social_profiles', {
  id: idPrimaryKey,

  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),

  platform: socialPlatformsEnum('platform').notNull(),
  username: text('username'),
  profileUrl: text('profile_url'),
  verifiedAt: timestamp('verified_at', {
    withTimezone: true,
    mode: 'date',
  }),
  ...timestamps,
});
