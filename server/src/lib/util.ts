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
export function mapify<Type>(
  objs: Type[],
  key: (string | number),   // No clue how to make this more generic
): { [key: string | number]: Type } {
  const mapOne = (obj: any) => ({ [obj[key]]: obj });
  return Object.assign({}, ...objs.map(mapOne));
}
