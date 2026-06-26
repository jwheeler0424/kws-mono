import { env } from '@kws/config';
import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const MIGRATIONS_DIR = path.join(process.cwd(), 'drizzle', 'migrations');

async function removeMigrationsFolder() {
  try {
    await rm(MIGRATIONS_DIR, { recursive: true, force: true });
    console.log('✅ Migrations folder removed successfully.');
  } catch (err) {
    console.error('❌ Error removing migrations folder:', err);
  }
}

export async function resetDatabase() {
  console.log('⚠️  Resetting database...');

  const DATABASE_URL = env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error(`[resetDatabase] Missing required environment variable: DATABASE_URL`);
  }

  // Remove the migrations folder
  await removeMigrationsFolder();

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    // Drop the public schema and everything inside it
    await client.query('DROP SCHEMA public CASCADE');

    // Recreate the public schema
    await client.query('CREATE SCHEMA public');

    // Restore default permissions
    await client.query('GRANT ALL ON SCHEMA public TO public');

    console.log('✅ Database completely reset. Ready for fresh migrations!');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    throw error;
  } finally {
    await client.end();
  }
}

const IMMUTABLE_FUNC_SQL = `CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT array_to_string($1, $2); $$;

`;

const INVALID_REFRESHMENTS_CALL_RE =
  /immutable_array_to_string\(("?refreshments"?),\s*' '\s*::text\)/g;
const INVALID_CONTACT_SEARCH_SCALAR_CALL_RE =
  /coalesce\(immutable_array_to_string\(notes,\s*' '\s*::text\),\s*''\)\s*\|\|\s*' '\s*\|\|\s*coalesce\(immutable_array_to_string\(activityText,\s*' '\s*::text\),\s*''\)/g;
const FIXED_CONTACT_SEARCH_SCALAR_EXPR =
  "coalesce(\"notes\"::text, '') || ' ' || coalesce(\"activity_text\"::text, '')";
const INVALID_CONTACT_SEARCH_ACTIVITY_CAMEL_RE = /"activityText"::text/g;

async function getSqlFiles(dir: string): Promise<string[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // New folder-based format: <timestamp>_name/migration.sql
      const migrationFile = path.join(fullPath, 'migration.sql');
      try {
        await fsp.access(migrationFile);
        results.push(migrationFile);
      } catch {
        // No migration.sql in this subdirectory — skip
      }
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
      // Legacy flat format: <timestamp>_name.sql
      results.push(fullPath);
    }
  }

  return results.sort((a, b) => a.localeCompare(b));
}

async function runDrizzleGenerate() {
  await new Promise<void>((resolve, reject) => {
    const p = spawn(
      'bun',
      ['x', 'drizzle-kit', 'generate', '--config', './drizzle.config.ts', '--name', 'init'],
      {
        stdio: 'inherit',
        shell: process.platform === 'win32',
      },
    );

    p.on('error', (err) => reject(err));
    p.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`drizzle-kit generate failed with exit code ${code}`));
    });
  });
}

export async function generate() {
  await runDrizzleGenerate();

  const sqlFiles = await getSqlFiles(MIGRATIONS_DIR);

  if (sqlFiles.length === 0) {
    throw new Error(`No SQL migration file found in ${MIGRATIONS_DIR}`);
  }

  for (const file of sqlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let nextContent = content;
    let changed = false;

    const usesImmutableArrayToString = nextContent.includes('immutable_array_to_string(');
    const hasImmutableFunction = nextContent.includes(
      'CREATE OR REPLACE FUNCTION immutable_array_to_string',
    );

    if (usesImmutableArrayToString && !hasImmutableFunction) {
      nextContent = IMMUTABLE_FUNC_SQL + nextContent;
      changed = true;
      console.log(`✨ Injected immutable_array_to_string into ${path.basename(file)}`);
    }

    // Older generated SQL may call immutable_array_to_string on scalar Refreshments.
    // Replace with a direct text cast so open_houses can be created on fresh DBs.
    const repaired = nextContent.replace(INVALID_REFRESHMENTS_CALL_RE, '$1::text');
    if (repaired !== nextContent) {
      nextContent = repaired;
      changed = true;
      console.log(`✨ Repaired scalar refreshments tsvector expression in ${path.basename(file)}`);
    }

    // Guard against generated SQL that incorrectly treats contact_search scalar text
    // columns as arrays and references activityText instead of activity_text.
    const repairedContactSearch = nextContent.replace(
      INVALID_CONTACT_SEARCH_SCALAR_CALL_RE,
      FIXED_CONTACT_SEARCH_SCALAR_EXPR,
    );
    if (repairedContactSearch !== nextContent) {
      nextContent = repairedContactSearch;
      changed = true;
      console.log(
        `✨ Repaired contact_search scalar tsvector expression in ${path.basename(file)}`,
      );
    }

    const repairedActivityColumn = nextContent.replace(
      INVALID_CONTACT_SEARCH_ACTIVITY_CAMEL_RE,
      '"activity_text"::text',
    );
    if (repairedActivityColumn !== nextContent) {
      nextContent = repairedActivityColumn;
      changed = true;
      console.log(
        `✨ Repaired contact_search activity_text column reference in ${path.basename(file)}`,
      );
    }

    if (changed) {
      fs.writeFileSync(file, nextContent);
    }
  }
}
