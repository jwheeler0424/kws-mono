import { bigint, integer, pgTable, text } from 'drizzle-orm/pg-core';

import { idPrimaryKey, timestamps } from '../common.schema';

export const companies = pgTable('companies', {
  id: idPrimaryKey,
  name: text('name').notNull(),
  website: text('website'),
  industry: text('industry'),
  employeeCount: integer('employee_count'),
  annualRevenue: bigint('annual_revenue', {
    mode: 'number',
  }),
  description: text('description'),
  ...timestamps,
});
