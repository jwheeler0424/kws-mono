export function shuffle<T>(array: T[], immutable: boolean = true): T[] {
  if (!immutable) {
    return shuffleInPlace(array);
  }

  // Create a shallow copy so the original input is never modified
  const shuffled = [...array];

  // Fisher-Yates shuffle on the copy
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Shuffles the array in place, mutating the original array.
 */
export function shuffleInPlace<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Swap elements
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array;
}
