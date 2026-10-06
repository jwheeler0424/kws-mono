import { env } from '@kws/config';
import { relations } from '@kws/schema/relations';
import { drizzle } from 'drizzle-orm/node-postgres';

const testDatabaseUrl = process.env.MLS_TEST_DATABASE_URL;
if (testDatabaseUrl) {
  const target = new URL(testDatabaseUrl);
  if (target.hostname !== '127.0.0.1' || target.pathname !== '/mls_compliance_test') {
    throw new Error('MLS_TEST_DATABASE_URL must target the isolated loopback test database');
  }
}
const db = drizzle(testDatabaseUrl ?? env.DATABASE_URL, { relations });
const pool = db.$client;

export { db, pool };
