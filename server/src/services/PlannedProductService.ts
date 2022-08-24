import { Service } from 'typedi';
import { PlannedProduct, TPlannedProduct } from '../models/PlannedProduct';

// TODO maybe this shouldnt be a service
@Service()
export default class PlannedProductService {

  // TODO needs return type
  public async genPlannedProducts(characterId: number) {
    const sqlResult = await PlannedProduct.findAll({
      attributes: ['character_id', 'type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });
    return sqlResult.map(pp => pp.get());
  }

  public async genParseAndRecreate(content: any) {

  }

  private async genRecreatePlannedProducts(
    characterId: number,
    products: TPlannedProduct[],
  ): Promise<PlannedProduct[]> {
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
      },
    });
    return await PlannedProduct.bulkCreate(products);
  }
}