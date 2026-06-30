/**
 * Resolves any supported image source into a `Blob` ready for `Bun.Image`.
 *
 * Supported inputs:
 * - HTTP / HTTPS URL (string or `URL` object) — fetched with `fetch()`
 * - `s3://` or `r2://` path string — read with `Bun.file()` (native S3 support)
 * - `data:` URL string — read with `Bun.file()`
 * - Local filesystem path string — read with `Bun.file()`
 * - `Blob` / `File` / `BunFile` — returned as-is (BunFile extends Blob)
 * - `ArrayBuffer` / `TypedArray` — copied into a `Blob`
 */
export async function resolveImageSource(
  source: string | URL | Blob | ArrayBuffer | ArrayBufferView,
): Promise<Blob> {
  // Blob / File / BunFile — already usable (BunFile extends File extends Blob)
  if (source instanceof Blob) {
    return source;
  }

  // ArrayBuffer — wrap directly
  if (source instanceof ArrayBuffer) {
    return new Blob([source]);
  }

  // TypedArray / DataView — extract a plain ArrayBuffer slice to satisfy the
  // BlobPart constraint.  Image data never comes from a SharedArrayBuffer so
  // the cast is safe.
  if (ArrayBuffer.isView(source)) {
    const copy = (source.buffer as ArrayBuffer).slice(
      source.byteOffset,
      source.byteOffset + source.byteLength,
    );
    return new Blob([copy]);
  }

  const src = source instanceof URL ? source.href : source;

  // HTTP / HTTPS — fetch from the network
  if (src.startsWith('http://') || src.startsWith('https://')) {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Image fetch failed: ${response.status} ${response.statusText} — ${src}`);
    }
    return response.blob();
  }

  // S3 / R2 — Bun resolves s3:// and r2:// natively via Bun.file().
  // BunFile extends File extends Blob, so it satisfies the Promise<Blob> return.
  if (src.startsWith('s3://') || src.startsWith('r2://')) {
    return Bun.file(src) as unknown as Blob;
  }

  // data: URL — Bun.file() can read data: URIs directly
  if (src.startsWith('data:')) {
    return Bun.file(src) as unknown as Blob;
  }

  // Everything else — treat as a local filesystem path
  const file = Bun.file(src);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`Image file not found: ${src}`);
  }
  // BunFile extends File extends Blob — satisfies Promise<Blob>
  return file as unknown as Blob;
}
