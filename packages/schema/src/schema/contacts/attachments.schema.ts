import { pgTable, uuid } from 'drizzle-orm/pg-core';

import type { UUIDv7 } from '@kws/types';

import { user } from '../auth';
import { idPrimaryKey, timestamps } from '../common.schema';
import { contacts } from './contacts.schema';

export const attachments = pgTable('attachments', {
  id: idPrimaryKey,

  contactId: uuid('contact_id')
    .$type<UUIDv7>()
    .notNull()
    .references(() => contacts.id, { onDelete: 'cascade' }),

  fileId: uuid('file_id').notNull(),

  uploadedBy: uuid('uploaded_by')
    .$type<UUIDv7>()
    .references(() => user.id),
  ...timestamps,
});
