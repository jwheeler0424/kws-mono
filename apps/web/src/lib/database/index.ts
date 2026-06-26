import { drizzle } from 'drizzle-orm/node-postgres';

import env from '@kws/config/env/data';

import { relations } from '@kws/schema/relations';

const db = drizzle(env.DATABASE_URL, { relations });
const pool = db.$client;

export { db, pool };

