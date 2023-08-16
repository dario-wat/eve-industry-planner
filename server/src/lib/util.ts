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
