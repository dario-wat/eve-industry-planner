import { Service } from 'typedi';
import { PlannedProduct } from '../../models/PlannedProduct';
import { PlannedProductsRes, PlannedProductsWithErrorRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';

// TODO maybe split out parsing from here
type ParsedLine = { name: string, quantity: number | null };

@Service()
export default class PlannedProductService {

  constructor(
    private readonly sdeData: EveSdeData,
  ) { }

  public async genData(characterId: number): Promise<PlannedProductsRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });
    return this.getProductsForResponse(plannedProducts);
  }

  /*
  * This function will try to parse the raw input string and from there
  * it will delete all current data for the user and create whole new data.
  * This was the easiest option since it doesn't require figuring out
  * what has changed.
  */
  public async genParseAndRecreate(
    characterId: number,
    content: string,
  ): Promise<PlannedProductsWithErrorRes> {
    const lines = PlannedProductService.parseInput(content);
    const errors = this.validateParsedInput(lines);
    if (errors.length !== 0) {
      return errors;
    }

    // Delete current data
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
      },
    });

    // Recreate new data
    const result = await PlannedProduct.bulkCreate(
      lines.map(l => ({
        character_id: characterId,
        type_id: this.sdeData.typeByName[l.name].id,
        quantity: l.quantity,
      }))
    );
    return this.getProductsForResponse(result);
  }

  private validateParsedInput(
    lines: ParsedLine[],
  ): { name: string, error: string }[] {
    const getError = (line: ParsedLine) =>
      this.sdeData.typeByName[line.name] === undefined
        ? `Product with name '${line.name}' doesn't exist`
        : line.quantity === null || Number.isNaN(line.quantity)
          ? `Incorrect format '${line.name}'`
          : null;
    return lines.map(l => ({ name: l.name, error: getError(l) }))
      .filter(l => l.error)
      .map(l => ({ name: l.name, error: l.error! })); // typescript happy
  }

  private static parseInput(content: string): ParsedLine[] {
    return content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l !== '')
      .map(l => {
        const words = l.replace(/\s\s+/g, ' ').split(' ');
        if (words.length == 1) {  // can't be 0 because that's filtered
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

  /*
  * Helper function to format PlannedProducts for response.
  * We just need the name and quantities.
  */
  private getProductsForResponse(
    plannedProducts: PlannedProduct[],
  ): PlannedProductsRes {
    return plannedProducts.map(pp => ({
      name: this.sdeData.types[pp.get().type_id].name,
      quantity: pp.get().quantity,
    }));
  }
}