import env from '@kws/config/env/data';
import { relations } from '@kws/schema/relations';
import { drizzle } from 'drizzle-orm/node-postgres';

const db = drizzle(env.DATABASE_URL, { relations });
const pool = db.$client;

export { db, pool };
