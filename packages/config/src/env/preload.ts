import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ENV_FILES = ['.env.local', '.env'] as const;
const ENV_FALLBACK_FILES = ['.env.example'] as const;

const resolvePackageRootFromFile = () => {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), '../../');
};

const collectEnvPaths = () => {
  const packageRoot = resolvePackageRootFromFile();
  const candidateFiles = [...ENV_FILES, ...ENV_FALLBACK_FILES];

  return candidateFiles
    .map((envFile) => join(packageRoot, envFile))
    .filter((envPath) => existsSync(envPath));
};

const envConfig = dotenv.config({ path: collectEnvPaths() });
dotenvExpand.expand(envConfig);
