
import { env } from '@kws/config';
import { defineConfig } from 'drizzle-kit';

const DB_USER = env.DB_USER;
const DB_PASSWORD = env.DB_PASSWORD;
const DB_HOST = env.DB_HOST;
const DB_PORT = env.DB_PORT;
const DB_NAME = env.DB_NAME;

export default defineConfig({
  out: './drizzle/migrations',
  schema: './src/schema.ts',
  dialect: 'postgresql',
  strict: true,
  verbose: true,
  dbCredentials: {
    database: DB_NAME,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: env.NODE_ENV === 'production',
  },
});
