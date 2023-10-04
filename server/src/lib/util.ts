/*
  Kinda turns an object into a map entry
  E.g.
  Input
    objs:   
      [ 
        { id: 12038, name: 'Purifier', group_id: 834 },
        { id: 12041, name: 'Purifier Blueprint', group_id: 105 }
      ]     
    key:    id
    value:  name
  Return  
    {
      '12038': { id: 12038, name: 'Purifier', group_id: 834 },
      '12041': { id: 12041, name: 'Purifier Blueprint', group_id: 105 }
    }
*/
export function mapify<T, K extends keyof T>(
  objs: T[],
  key: K,
): Record<string | number, T> {
  const result: Record<string, T> = {};

  for (const item of objs) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keyValue = item[key] as any;
    result[keyValue] = item;
  }

  return result;
}

/**
 * Combines an array of Records (dictionaries, maps) in such a way
 * that it adds the key-value mapping in the result array only if
 * it currently doesn't exist in the result array or if the new value
 * is not null (meaning that it could potentially overwrite the previous
 * null value).
 */
export function combineMapsWithNulls<T>(
  dicts: Record<number, T | null>[],
): Record<number, T | null> {
  return dicts.reduce(
    (acc, dict) => {
      for (const key in dict) {
        // Add to the result only if the key is not in the result
        // or if the key is not null
        if (!(key in dict) || dict[key] !== null) {
          acc[key] = dict[key];
        }
      }
      return acc;
    },
    {}, // Initial state
  );
}