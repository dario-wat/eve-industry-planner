import { filterNullOrUndef, mapify } from '../util';

describe('Test filterNullOrUndef', () => {

  test('Null should be filtered out', () => {
    const arr = [1, 2, null, 4];
    expect(filterNullOrUndef(arr)).toEqual([1, 2, 4]);
  });

  test('Undefined should be filtered out', () => {
    const arr = ['a', 'bc', 'd', undefined];
    expect(filterNullOrUndef(arr)).toEqual(['a', 'bc', 'd']);
  });

  test('Array with both null and undefined', () => {
    const arr = [null, 1, undefined, 'a'];
    expect(filterNullOrUndef(arr)).toEqual([1, 'a']);
  });

  test('Empty array should return empty array', () => {
    const arr: any[] = [];
    expect(filterNullOrUndef(arr)).toEqual([]);
  });

});

describe('Test mapify', () => {

  test('mapify', () => {
    const input = [
      { id: 12038, name: 'Purifier', group_id: 834 },
      { id: 12041, name: 'Purifier Blueprint', group_id: 105 },
    ];
    const expected = {
      '12038': { id: 12038, name: 'Purifier', group_id: 834 },
      '12041': { id: 12041, name: 'Purifier Blueprint', group_id: 105 }
    };
    expect(mapify(input, 'id')).toEqual(expected);
  });

});