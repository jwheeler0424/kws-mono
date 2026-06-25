import { describe, expect, test } from 'bun:test';

import { tsquery, tsvector } from './tsvector';

describe('tsvector', () => {
  test('rejects empty .language() value', () => {
    const col = tsvector('search_vector') as unknown as {
      language: (language: string) => unknown;
    };

    expect(() => col.language('   ')).toThrow('tsvector: .language() requires a non-empty value');
  });

  test('rejects empty .cols() definition', () => {
    expect(() => tsvector('search_vector').cols([])).toThrow(
      'tsvector: .cols() requires at least one column or expression',
    );
  });

  test('rejects blank column entries in .cols()', () => {
    expect(() => tsvector('search_vector').cols(['city', '   '])).toThrow(
      'tsvector: .cols() entry at index 1 is empty',
    );
  });

  test('enforces .weight() after .cols()', () => {
    const pending = tsvector('search_vector').cols(['city']) as unknown as {
      notNull: () => unknown;
    };

    expect(() => pending.notNull()).toThrow(
      'tsvector: .weight() must follow .cols() before accessing "notNull"',
    );
  });
});

describe('tsquery', () => {
  test('marks whitespace-only query as empty', () => {
    const q = tsquery('   ');
    expect(q.isEmpty).toBe(true);
  });

  test('supports all search modes without throwing during compilation', () => {
    expect(() => tsquery('waterfront').mode('websearch').tsq).not.toThrow();
    expect(() => tsquery('waterfront').mode('plain').tsq).not.toThrow();
    expect(() => tsquery('waterfront').mode('phrase').tsq).not.toThrow();
    expect(() => tsquery('waterfront').mode('raw').tsq).not.toThrow();
  });
});
