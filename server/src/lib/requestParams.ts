/** Null when the parameter is missing, undefined when it is not a positive integer. */
export function optionalTypeId(value: unknown): number | null | undefined {
  if (value === undefined) {
    return null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return undefined;
  }
  const typeId = Number(value);
  return typeId > 0 ? typeId : undefined;
}
