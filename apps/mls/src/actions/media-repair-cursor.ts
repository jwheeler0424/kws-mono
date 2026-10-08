import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { logger } from '@/lib/logger';

const CURSOR_FILE = resolve(process.cwd(), 'data', '.mls-media-repair-cursors.json');

type CursorState = Record<string, number>;

export function advanceMediaRepairOffset(
  offset: number,
  scanned: number,
  pageSize: number,
): number {
  return scanned < pageSize ? 0 : offset + scanned;
}

export async function readMediaRepairOffset(
  key: string,
  cursorFile = CURSOR_FILE,
): Promise<number> {
  try {
    const state = JSON.parse(await readFile(cursorFile, 'utf8')) as CursorState;
    const offset = state[key];
    return typeof offset === 'number' && Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('failed to read persisted MLS media repair cursor', { error });
    }
    return 0;
  }
}

export async function writeMediaRepairOffset(
  key: string,
  offset: number,
  cursorFile = CURSOR_FILE,
): Promise<void> {
  try {
    await mkdir(dirname(cursorFile), { recursive: true });
    let state: CursorState = {};
    try {
      state = JSON.parse(await readFile(cursorFile, 'utf8')) as CursorState;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }

    const temporaryFile = `${cursorFile}.${process.pid}.tmp`;
    await writeFile(temporaryFile, JSON.stringify({ ...state, [key]: offset }, null, 2));
    await rename(temporaryFile, cursorFile);
  } catch (error) {
    logger.warn('failed to persist MLS media repair cursor', { error });
  }
}
