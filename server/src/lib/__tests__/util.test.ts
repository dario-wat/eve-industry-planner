import { mapify } from '../util';

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