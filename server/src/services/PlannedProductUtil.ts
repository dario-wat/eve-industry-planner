import { EveSdeQuery } from '../lib/EveSdeQuery';
import { PlannedProduct, TPlannedProduct } from '../models/PlannedProduct';

export namespace PlannedProductUtil {

  export async function genPlannedProducts(
    characterId: number,
  ): Promise<TPlannedProduct[]> {
    const sqlResult = await PlannedProduct.findAll({
      attributes: ['character_id', 'type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });
    return sqlResult.map(pp => pp.get());
  }

  /*
  * This function will try to parse the raw input string and from there
  * it will delete all current data for the user and create whole new data.
  * This was the easiest option since it doesn't require figuring out
  * what has changed.
  */
  export async function genParseAndRecreate(
    characterId: number,
    content: string,
  ): Promise<TPlannedProduct[]> {
    // TODO this parsing might be wrong, who knows
    const lines = content
      .split(/\r?\n/)
      .filter(l => l !== '')
      .map(l => {
        const trimmedLine = l.trim();
        const splitIndex = trimmedLine.lastIndexOf(' ');
        return {
          name: trimmedLine.slice(0, splitIndex),
          quantity: trimmedLine.slice(splitIndex, trimmedLine.length).trim(),
        };
      });

    const typesMap = await EveSdeQuery.genEveTypesByName(
      lines.map(l => l.name)
    );

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
        type_id: typesMap[l.name].id,
        quantity: Number(l.quantity),
      }))
    );
    return result.map(r => r.get());
  }
}