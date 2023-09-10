import PlannedProductService from '../PlannedProductService';

describe('Test planned product parser', () => {

  test('Test correct input', () => {
    const output = PlannedProductService['parseInput'](
      `Kikimora 10
      Raptor 1
      Large Shield Extender II 4
      Ballistic Control System I 200
      Warrior II 15
      `,
    );
    expect(output).toEqual([
      { name: 'Kikimora', quantity: 10 },
      { name: 'Raptor', quantity: 1 },
      { name: 'Large Shield Extender II', quantity: 4 },
      { name: 'Ballistic Control System I', quantity: 200 },
      { name: 'Warrior II', quantity: 15 },
    ]);
  });

  test('Empty input', () => {
    const output = PlannedProductService['parseInput']('');
    expect(output).toEqual([]);
  });

  test('Missing quantity', () => {
    const output = PlannedProductService['parseInput'](
      `Kikimora
      Large Shield Extender II 2
      Ballistic Control System I 200
      Warrior II
      `,
    );
    expect(output).toEqual([
      { name: 'Kikimora', quantity: null },
      { name: 'Large Shield Extender II', quantity: 2 },
      { name: 'Ballistic Control System I', quantity: 200 },
      { name: 'Warrior II', quantity: null },
    ]);
  });

  test('Multiple spaces in between', () => {
    const output = PlannedProductService['parseInput'](
      `Kikimora     10
      Raptor    1
      Large Shield Extender   II 4
      Ballistic Control      System I 200
      Warrior   II     15
      `,
    );
    expect(output).toEqual([
      { name: 'Kikimora', quantity: 10 },
      { name: 'Raptor', quantity: 1 },
      { name: 'Large Shield Extender II', quantity: 4 },
      { name: 'Ballistic Control System I', quantity: 200 },
      { name: 'Warrior II', quantity: 15 },
    ]);
  });
});

export { };