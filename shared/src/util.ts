// Helper function for strictly typed filter
function notEmpty<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars 
  const testDummy: T = value;
  return true;
}

// Strictly typed null filter
export function filterNullOrUndef<T>(arr: (T | null)[]): T[] {
  return arr.filter(notEmpty);
}