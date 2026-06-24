"use client";
// @refresh reset

/**
 * grid.ts
 *
 * CSS `gridTemplateColumns` string parsers used by the OverflowGroup calc
 * engine to determine column count and track widths at runtime.
 */

/**
 * Tokenises a `gridTemplateColumns` string into individual track definitions,
 * correctly handling nested parentheses (e.g. `repeat(3, minmax(0, 1fr))`).
 *
 * O(n) where n = string length.
 *
 * @example
 * splitTracks("100px 1fr minmax(0, 200px)")
 * // ["100px", "1fr", "minmax(0, 200px)"]
 */
export function splitTracks(template: string): Array<string> {
  const tokens: Array<string> = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    if (ch === "(") depth += 1;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    else if (/\s/.test(ch) && depth === 0) {
      if (start < i) tokens.push(template.slice(start, i));
      start = i + 1;
    }
  }
  if (start < template.length) tokens.push(template.slice(start));
  return tokens.filter(Boolean);
}

/**
 * Extracts the explicit repetition count from `repeat(N, …)`.
 * Returns `null` when the template is not an explicit integer repeat.
 *
 * @example
 * parseRepeatCount("repeat(3, 1fr)") // 3
 * parseRepeatCount("repeat(auto-fill, minmax(200px, 1fr))") // null
 */
export function parseRepeatCount(template: string): number | null {
  const trimmed = template.trim();
  const match = /^repeat\(\s*(\d+)\s*,/i.exec(trimmed);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Extracts the minimum track size (px) from
 * `repeat(auto-fit|auto-fill, minmax(Npx, …))`.
 *
 * Returns `null` when the template does not match this pattern.
 *
 * @example
 * parseAutoRepeatMinTrack("repeat(auto-fill, minmax(200px, 1fr))") // 200
 * parseAutoRepeatMinTrack("repeat(3, 1fr)") // null
 */
export function parseAutoRepeatMinTrack(template: string): number | null {
  const trimmed = template.trim();
  if (!/^repeat\(\s*auto-(fit|fill)\s*,/i.test(trimmed)) return null;
  const minmaxMatch = /minmax\(\s*([0-9]*\.?[0-9]+)px\s*,/i.exec(trimmed);
  if (!minmaxMatch) return null;
  const value = Number(minmaxMatch[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}
