import EveSdeData from '../../core/sde/EveSdeData';
import { Service } from 'typedi';

/** Single parsed line in the item quantities text. */
type ParsedLine = { name: string; quantity: number | null };

/** Valid item quantity pair. */
export type ItemQuantity = { name: string; quantity: number };

/** Errors while parsing the input. */
type ParsingError = { name: string; error: string };

/**
 * Returns a list of valid parsed lines and a list of errors for
 * invalid lines.
 */
type ItemQuantitiesParseResult = {
  itemQuantities: ItemQuantity[];
  errors: ParsingError[];
};

@Service()
export default class ItemQuantitiesParserService {
  constructor(private readonly sdeData: EveSdeData) {}

  /**
   * Parses the input string which usually comes from a text area
   * and returns an object with valid lines (item, quantity pairs),
   * and a list of parsing errors.
   */
  public parseItemQuantities(content: string): ItemQuantitiesParseResult {
    const lines = this.parseItemQuantitiesInternal(content);
    const errors = this.validateParsedInput(lines);

    const validLines = lines
      .filter(({ quantity }) => quantity !== null)
      .map(({ name, quantity }) => ({ name, quantity: quantity! }));

    return {
      itemQuantities: validLines,
      errors: errors,
    };
  }

  /**
   * Takes in an array of parsed lines and validates each line. Checks for
   * errors and returns an array of errors if there are any.
   */
  private validateParsedInput(lines: ParsedLine[]): ParsingError[] {
    const getError = (line: ParsedLine) =>
      this.sdeData.typeByName[line.name] === undefined
        ? `Product with name '${line.name}' doesn't exist`
        : line.quantity === null || Number.isNaN(line.quantity)
        ? `Incorrect format '${line.name}'`
        : null;

    return lines
      .map((l) => ({ name: l.name, error: getError(l) }))
      .filter((l) => l.error)
      .map((l) => ({ name: l.name, error: l.error! })); // typescript happy
  }

  /**
   * Parses the input that the user puts into the text area. Each line should
   * be a separate item with the name and quantity.
   * Ignores empty lines and trims excess whitespace.
   */
  private parseItemQuantitiesInternal(content: string): ParsedLine[] {
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '')
      .map((l) => {
        const words = l.replace(/\s\s+/g, ' ').replace('\t', ' ').split(' ');
        if (words.length == 1) {
          // can't be 0 because that's filtered
          return { name: l, quantity: null };
        }

        const quantity = Number(words[words.length - 1]);
        if (Number.isNaN(quantity)) {
          return { name: l, quantity: null };
        }
        return {
          name: words.slice(0, words.length - 1).join(' '),
          quantity: quantity,
        };
      });
  }
}
