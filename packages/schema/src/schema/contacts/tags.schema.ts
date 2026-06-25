import { pgTable, uuid } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { timestamps } from '../common.schema';
import { terms } from '../taxonomies.schema';
import { contacts } from './contacts.schema';

export const contactTags = pgTable('contact_tags', {
  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => terms.id, { onDelete: 'cascade' }),
  ...timestamps,
});
