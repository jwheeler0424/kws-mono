import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_FILES = ['.env.local', '.env'] as const;

const resolvePackageRootFromFile = () => {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), '../../');
};

const resolvePackageRootCandidates = () => {
  const candidates = [
    // Standard container/runtime location in this monorepo.
    resolve(process.cwd(), 'packages/config'),
    // Explicit absolute fallback for container runtime.
    '/app/packages/config',
    // Works for non-bundled execution from package source.
    resolvePackageRootFromFile(),
  ];

  return [...new Set(candidates.map((candidate) => resolve(candidate)))];
};

const collectEnvPaths = () => {
  const candidateFiles = [...ENV_FILES];

  for (const packageRoot of resolvePackageRootCandidates()) {
    const resolvedPaths = candidateFiles
      .map((envFile) => join(packageRoot, envFile))
      .filter((envPath) => existsSync(envPath));

    if (resolvedPaths.length > 0) {
      return resolvedPaths;
    }
  }

  throw new Error('No runtime env file found in packages/config. Expected .env.local or .env.');
};

const envConfig = dotenv.config({ path: collectEnvPaths() });
dotenvExpand.expand(envConfig);
