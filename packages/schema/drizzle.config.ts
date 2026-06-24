import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { z } from 'zod';

dotenv.config({ path: ['.env.local', '.env'] });

const dbConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_USER: z.string().nonempty(),
  DB_PASSWORD: z.string().nonempty(),
  DB_HOST: z.string().nonempty(),
  DB_PORT: z.coerce.number().int().positive(),
  DB_NAME: z.string().nonempty(),
});

const parsedConfig = dbConfigSchema.safeParse(process.env);

if (!parsedConfig.success) {
  const missingVars = parsedConfig.error.issues.map((err) => err.path[0]).join(', ');
  throw new Error(`Missing or invalid environment variables for drizzle-kit: ${missingVars}`);
}

const env = parsedConfig.data;

const DB_USER = env.DB_USER;
const DB_PASSWORD = env.DB_PASSWORD;
const DB_HOST = env.DB_HOST;
const DB_PORT = env.DB_PORT;
const DB_NAME = env.DB_NAME;

export default defineConfig({
  out: './drizzle/migrations',
  schema: './src/database/schema.ts',
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
