import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { rm } from 'node:fs/promises';

import { db } from './client';
import { generate, resetDatabase } from './helpers';

export async function runMigrations() {
  await migrate(db, {
    migrationsFolder: './drizzle/migrations',
  }).catch((err) => {
    console.error('❌ Migrations failed', err);
    process.exit(1);
  });

  console.log('✅ Migrations complete');
}

async function removeMigrationsFolder() {
  try {
    await rm('./drizzle/migrations', { recursive: true, force: true });
    console.log('✅ Migrations folder removed successfully.');
  } catch (err) {
    console.error('❌ Error removing migrations folder:', err);
    process.exit(1);
  }
}

export async function reset() {
  console.log('⚠️  Resetting database...');

  try {
    await removeMigrationsFolder();
    await resetDatabase();
    console.log('✅ Database completely reset. Ready for fresh migrations!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

async function freshDatabase() {
  try {
    await reset();
    await generate();
    console.log('✅ Migrations generated successfully');
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed fresh database flow:', error);
    process.exit(1);
  }
}

void freshDatabase();
