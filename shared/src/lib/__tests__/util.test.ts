import { filterNullOrUndef } from '../util';

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
