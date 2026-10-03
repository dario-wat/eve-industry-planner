/** Type guard that drops null and undefined from an array filter. */
export function notEmpty<T>(value: T | null | undefined): value is T {
  return !(value === null || value === undefined);
}

/** Returns a copy of `arr` with null and undefined entries removed. */
export function filterNullOrUndef<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter(notEmpty);
}
