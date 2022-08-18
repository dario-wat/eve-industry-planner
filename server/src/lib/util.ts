/*
  Kinda turns an object into a map entry
  E.g.
  Input
    objs:   
      [ 
        { id: 12038, name: 'Purifier', group_id: 834 }
        { id: 12041, name: 'Purifier Blueprint', group_id: 105 }
      ]     
    key:    id
    value:  name
  Return  
    {
      '12038': { name: 'Purifier', group_id: 834 },
      '12041': { name: 'Purifier Blueprint', group_id: 105 }
    }
*/
export function mapify<Type>(objs: Type[], key: any) {
  const mapOne = (obj: any) => ({ [obj[key]]: obj });
  return Object.assign({}, ...objs.map(mapOne));
}

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