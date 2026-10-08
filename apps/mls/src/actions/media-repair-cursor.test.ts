import { afterEach, describe, expect, it } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  advanceMediaRepairOffset,
  readMediaRepairOffset,
  writeMediaRepairOffset,
} from './media-repair-cursor';

let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe('advanceMediaRepairOffset', () => {
  it('advances full pages and wraps after the final partial page', () => {
    expect(advanceMediaRepairOffset(0, 250, 250)).toBe(250);
    expect(advanceMediaRepairOffset(250, 250, 250)).toBe(500);
    expect(advanceMediaRepairOffset(500, 19, 250)).toBe(0);
  });

  it('does not advance an empty page', () => {
    expect(advanceMediaRepairOffset(500, 0, 250)).toBe(0);
  });

  it('persists independent offsets for repair query keys', async () => {
    temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'mls-media-repair-'));
    const cursorFile = path.join(temporaryDirectory, 'cursors.json');

    await writeMediaRepairOffset('properties', 500, cursorFile);
    await writeMediaRepairOffset('offices', 250, cursorFile);

    expect(await readMediaRepairOffset('properties', cursorFile)).toBe(500);
    expect(await readMediaRepairOffset('offices', cursorFile)).toBe(250);
    expect(await readMediaRepairOffset('members', cursorFile)).toBe(0);
  });
});
