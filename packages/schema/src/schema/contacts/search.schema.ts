import { index, pgTable, text, uuid } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { tsvector } from '../../plugins/tsvector';
import { idPrimaryKey } from '../common.schema';
import { contacts } from './contacts.schema';

export const contactSearch = pgTable(
  'contact_search',
  {
    id: idPrimaryKey,

    contactId: uuid('contact_id')
      .$type<UUIDv7>()
      .notNull()
      .references(() => contacts.id, { onDelete: 'cascade' }),

    names: text('names'),
    emails: text('emails'),
    phones: text('phones'),
    addresses: text('addresses'),
    companies: text('companies'),
    tags: text('tags'),
    notes: text('notes'),
    activityText: text('activity_text'),
    searchVector: tsvector('search_vector')
      .language('english')

      .cols(['names', 'emails', 'companies'])
      .weight('A')

      .cols(['phones', 'addresses', 'tags'])
      .weight('B')

      .cols(['notes', 'activity_text'])
      .weight('C'),
  },
  (t) => [index('idx_contact_search_search_vector').using('gin', t.searchVector)],
);
