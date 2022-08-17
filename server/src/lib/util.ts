export function chunkify(arr: any[], chunkSize: number) {
  let chunks = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    chunks.push(chunk);
  }
  return chunks;
}

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
export function mapify(objs: any[], key: any) {
  const mapOne = (obj: any) => {
    const objKey = obj[key];
    delete obj[key];
    return { [objKey]: obj };
  };
  return Object.assign({}, ...objs.map(mapOne));
}