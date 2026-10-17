import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { processImage } from './pipeline';

const pixel = new Blob([
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  ),
]);

test('full WebP survives a failed derived write and is reused without recompression', async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), 'mls-image-'));
  const fullPath = path.join(basePath, 'listing', 'photo_full.webp');
  const previewPath = path.join(basePath, 'listing', 'photo_preview.webp');
  try {
    await mkdir(previewPath, { recursive: true });
    let failed = false;
    try {
      await processImage({
        source: pixel,
        filename: 'photo',
        organizationId: 'listing',
        durableFull: true,
        storage: { provider: 'local', basePath },
      });
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
    expect(await Bun.file(fullPath).exists()).toBe(true);
    const fullBytes = await Bun.file(fullPath).arrayBuffer();
    await rm(previewPath, { recursive: true });
    await processImage({
      source: fullPath,
      filename: 'photo',
      organizationId: 'listing',
      durableFull: true,
      preserveFullWebp: true,
      storage: { provider: 'local', basePath },
    });
    expect(await Bun.file(fullPath).arrayBuffer()).toEqual(fullBytes);
    expect(await Bun.file(previewPath).exists()).toBe(true);
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test('JPEG input produces decodable WebP variants at the expected dimensions', async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), 'mls-jpeg-'));
  try {
    const source = await new Bun.Image(pixel).resize(1280, 960).jpeg({ quality: 80 }).blob();
    const result = await processImage({
      source,
      filename: 'photo',
      organizationId: 'listing',
      durableFull: true,
      storage: { provider: 'local', basePath },
    });
    for (const [name, width] of [
      ['thumbnail', 120],
      ['preview', 600],
      ['full', 1280],
    ] as const) {
      const file = Bun.file(result.variants[name].storagePath);
      const metadata = await new Bun.Image(await file.arrayBuffer()).metadata();
      expect(metadata.width).toBe(width);
      expect(metadata.height).toBe((width * 3) / 4);
      expect(metadata.format).toBe('webp');
      expect(file.size).toBeGreaterThan(0);
    }
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test('maxFullWidth downscales the stored full variant for both profiles', async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), 'mls-image-max-width-'));
  try {
    const source = await new Bun.Image(pixel).resize(2400, 1600).jpeg({ quality: 80 }).blob();
    for (const variantProfile of ['all', 'full-only'] as const) {
      const result = await processImage({
        source,
        filename: `photo-${variantProfile}`,
        organizationId: 'listing',
        durableFull: true,
        maxFullWidth: 1920,
        webp: { quality: 80 },
        variantProfile,
        storage: { provider: 'local', basePath },
      } as Parameters<typeof processImage>[0]);
      const full = result.variants.full;
      const metadata = await new Bun.Image(
        await Bun.file(full.storagePath).arrayBuffer(),
      ).metadata();

      expect(full.width).toBe(1920);
      expect(full.height).toBe(1280);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1280);
      expect(result.source.width).toBe(2400);
    }
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test('full-only profile stores no derived variants', async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), 'mls-image-full-only-'));
  try {
    const result = await processImage({
      source: pixel,
      filename: 'photo',
      organizationId: 'listing',
      variantProfile: 'full-only',
      storage: { provider: 'local', basePath },
    });

    expect(Object.keys(result.variants)).toEqual(['full']);
    expect(await Bun.file(path.join(basePath, 'listing', 'photo_full.webp')).exists()).toBe(true);
    expect(await Bun.file(path.join(basePath, 'listing', 'photo_thumbnail.webp')).exists()).toBe(
      false,
    );
    expect(await Bun.file(path.join(basePath, 'listing', 'photo_preview.webp')).exists()).toBe(
      false,
    );
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});
