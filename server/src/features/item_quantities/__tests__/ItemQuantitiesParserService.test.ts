import ItemQuantitiesParserService from '../ItemQuantitiesParserService';
import EveSdeData from '../../../core/sde/EveSdeData';

const KNOWN_ITEMS = [
  'Kikimora',
  'Raptor',
  'Large Shield Extender II',
  'Ballistic Control System I',
  'Warrior II',
];

function createParser(names: string[] = KNOWN_ITEMS): ItemQuantitiesParserService {
  const typeByName = Object.fromEntries(
    names.map((name, index) => [name, { id: index + 1, name }]),
  );
  return new ItemQuantitiesParserService({ typeByName } as unknown as EveSdeData);
}

describe('ItemQuantitiesParserService', () => {

  test('Test correct input', () => {
    const output = createParser().parseItemQuantities(
      `Kikimora 10
      Raptor 1
      Large Shield Extender II 4
      Ballistic Control System I 200
      Warrior II 15
      `,
    );
    expect(output).toEqual({
      itemQuantities: [
        { name: 'Kikimora', quantity: 10 },
        { name: 'Raptor', quantity: 1 },
        { name: 'Large Shield Extender II', quantity: 4 },
        { name: 'Ballistic Control System I', quantity: 200 },
        { name: 'Warrior II', quantity: 15 },
      ],
      errors: [],
    });
  });

  test('Empty input', () => {
    const output = createParser().parseItemQuantities('');
    expect(output).toEqual({
      itemQuantities: [],
      errors: [],
    });
  });

  test('Missing quantity', () => {
    const output = createParser().parseItemQuantities(
      `Kikimora
      Large Shield Extender II 2
      Ballistic Control System I 200
      Warrior II
      `,
    );
    expect(output).toEqual({
      itemQuantities: [
        { name: 'Large Shield Extender II', quantity: 2 },
        { name: 'Ballistic Control System I', quantity: 200 },
      ],
      errors: [
        { name: 'Kikimora', error: "Incorrect format 'Kikimora'" },
        { name: 'Warrior II', error: "Incorrect format 'Warrior II'" },
      ],
    });
  });

  test('Multiple spaces in between', () => {
    const output = createParser().parseItemQuantities(
      `Kikimora     10
      Raptor    1
      Large Shield Extender   II 4
      Ballistic Control      System I 200
      Warrior   II     15
      `,
    );
    expect(output).toEqual({
      itemQuantities: [
        { name: 'Kikimora', quantity: 10 },
        { name: 'Raptor', quantity: 1 },
        { name: 'Large Shield Extender II', quantity: 4 },
        { name: 'Ballistic Control System I', quantity: 200 },
        { name: 'Warrior II', quantity: 15 },
      ],
      errors: [],
    });
  });

  test('Unknown item name', () => {
    const output = createParser().parseItemQuantities('Not A Real Item 3');
    expect(output).toEqual({
      itemQuantities: [
        { name: 'Not A Real Item', quantity: 3 },
      ],
      errors: [
        { name: 'Not A Real Item', error: "Product with name 'Not A Real Item' doesn't exist" },
      ],
    });
  });
});
