import { filterNullOrUndef } from '../util';

test('Null should be filtered out', () => {
  const arr = [1, 2, null, 4];
  expect(filterNullOrUndef(arr)).toEqual([1, 2, 4]);
});

export { };