export function notEmpty<T>(value: T | null | undefined): value is T;
export function filterNullOrUndef<T>(arr: (T | null | undefined)[]): T[];
