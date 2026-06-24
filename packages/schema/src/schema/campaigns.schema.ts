import { index, pgTable, text, varchar } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-orm/zod';

import { tsvector } from '../plugins/tsvector';
import { idPrimaryKey, timestamps } from './common.schema';

// ── Contact Requests ─────────────────────────────────────────────────────────
export const contactRequests = pgTable(
  'contact_requests',
  {
    id: idPrimaryKey,
    name: varchar('name', { length: 256 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    phone: varchar('phone', { length: 32 }).notNull(),
    message: text('message').notNull(),
    propertyAddress: text('property_address'),
    ...timestamps,

    // ── Full-text search vector ────────────────────────────────────────────
    searchVector: tsvector('search_vector')
      .language('english')
      // A — contact info (name, email)
      .cols(['name', 'email'])
      .weight('A')
      // B — property info (address, phone)
      .cols(['property_address', 'phone'])
      .weight('B')
      // C — message
      .cols(['message'])
      .weight('C'),
  },
  (t) => [index('idx_contact_requests_search_vector').using('gin', t.searchVector)],
);

// ── Zod Schemas ─────────────────────────────────────────────────────────────
export const selectContactRequestsSchema = createSelectSchema(contactRequests);

export type ContactRequest = typeof contactRequests.$inferSelect;
export type NewContactRequest = typeof contactRequests.$inferInsert;
