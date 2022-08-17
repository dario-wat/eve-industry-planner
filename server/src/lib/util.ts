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
    obj:    { id: 692, name: 'Stabber Blueprint' }
    key:    id
    value:  name
  Return  
    { '692': 'Stabber Blueprint' }
*/
export function mapify(objs: any[], key: any, value: any) {
  return Object.assign({}, ...objs.map(o => ({ [o[key]]: o[value] })));
}