/**
 * Checks if a value is defined and not "empty".
 * Considers null, undefined, '', [], and {} as empty.
 */
export function hasValue<T>(value: T | null | undefined): value is NonNullable<T> {
  // Handle null and undefined
  if (value === null || value === undefined) {
    return false;
  }

  // Handle Strings
  if (typeof value === 'string') {
    return value.trim() !== ''; // Use just value !== '' if you want to consider "   " as a value
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  // Handle Objects (including Sets and Maps for robustness)
  if (typeof value === 'object') {
    if (value instanceof Map || value instanceof Set) {
      return value.size > 0;
    }

    // Checks for empty plain objects like {}
    if (value.constructor === Object) {
      return Object.keys(value).length > 0;
    }
  }

  // Fallback for numbers, booleans, functions, symbols, and dates
  // (e.g., 0 and false will return true because they are valid, non-empty values)
  return true;
}

export function isMissing(value: unknown): value is null | undefined | '' {
  return value == null || value === '';
}

/**
 * The exact inverse of hasValue. Checks if a value is null, undefined, or "empty".
 * Considers null, undefined, '', [], and {} as empty.
 * Returns true for null, undefined, '', [], and {}.
 */
export function isEmpty<T>(value: T | null | undefined): boolean {
  return !hasValue(value);
}

/**
 * Specifically checks if a value is strictly null or undefined.
 * This allows TypeScript to safely narrow the type to just the real data.
 */
export function isNullable<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Evaluates standard JavaScript truthiness.
 * Narrows the type by excluding all standard falsy types.
 */
export function isTruthy<T>(value: T): value is Exclude<T, null | undefined | false | '' | 0 | 0n> {
  return !!value;
}

/**
 * Evaluates standard JavaScript falsiness.
 * Returns true for null, undefined, false, '', 0, 0n, and NaN.
 */
export function isFalsy<T>(value: T): boolean {
  return !value;
}
