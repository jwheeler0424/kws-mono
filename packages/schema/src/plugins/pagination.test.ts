import { describe, expect, test } from 'bun:test';

import { withPagination } from './pagination';

type MockQueryBuilder = {
  limitValue: number | null;
  offsetValue: number | null;
  limit: (value: number) => MockQueryBuilder;
  offset: (value: number) => MockQueryBuilder;
};

function createMockBuilder(): MockQueryBuilder {
  return {
    limitValue: null,
    offsetValue: null,
    limit(value: number) {
      this.limitValue = value;
      return this;
    },
    offset(value: number) {
      this.offsetValue = value;
      return this;
    },
  };
}

describe('withPagination', () => {
  test('uses defaults when invalid values are provided', () => {
    const qb = createMockBuilder();

    withPagination(qb as never, 0, 0);

    expect(qb.limitValue).toBe(10);
    expect(qb.offsetValue).toBe(0);
  });

  test('normalizes negative and fractional values', () => {
    const qb = createMockBuilder();

    withPagination(qb as never, -2.7, 5.9);

    expect(qb.limitValue).toBe(5);
    expect(qb.offsetValue).toBe(0);
  });

  test('caps page size to max bound', () => {
    const qb = createMockBuilder();

    withPagination(qb as never, 2, 5000);

    expect(qb.limitValue).toBe(100);
    expect(qb.offsetValue).toBe(100);
  });
});
