import { env } from '@kws/config';
import { relations } from '@kws/schema/relations';
import { drizzle } from 'drizzle-orm/node-postgres';

const DB_USER = env.DB_USER;
const DB_PASSWORD = env.DB_PASSWORD;
const DB_HOST = env.DB_HOST;
const DB_PORT = env.DB_PORT;
const DB_NAME = env.DB_NAME;

const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;

export const db = drizzle(DATABASE_URL, { relations });