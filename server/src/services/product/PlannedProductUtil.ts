import { EveSdeQuery } from '../query/EveSdeQuery';
import { PlannedProduct } from '../../models/PlannedProduct';

// TODO move to a more reasonable place
import { PlannedProductsRes } from '../../../../client/src/types/types';

export namespace PlannedProductUtil {

  export async function genQuery(
    characterId: number,
  ): Promise<PlannedProductsRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });
    return await genProductsForResponse(plannedProducts);
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
  ): Promise<PlannedProductsRes> {
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

    // Delete current data
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
      },
    });

    const typesMap = await EveSdeQuery.genEveTypesByName(
      lines.map(l => l.name)
    );
    // Recreate new data
    const result = await PlannedProduct.bulkCreate(
      lines.map(l => ({
        character_id: characterId,
        type_id: typesMap[l.name].id,
        quantity: Number(l.quantity),
      }))
    );
    return await genProductsForResponse(result);
  }

  /*
  * Helper function to format PlannedProducts for response.
  * We just need the name and quantities.
  */
  async function genProductsForResponse(
    plannedProducts: PlannedProduct[],
  ): Promise<PlannedProductsRes> {
    const typesMap = await EveSdeQuery.genEveTypes(
      plannedProducts.map(pp => pp.get().type_id),
    );
    return plannedProducts.map(pp => ({
      name: typesMap[pp.get().type_id].name,
      quantity: pp.get().quantity,
    }));
  }
}