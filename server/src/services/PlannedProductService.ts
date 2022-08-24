import { Sequelize } from 'sequelize/types';
import { Inject, Service } from 'typedi';
import { DIKeys } from '../lib/DIKeys';
import { PlannedProduct, TPlannedProduct } from '../models/PlannedProduct';

@Service()
export default class PlannedProductService {

  constructor(
    @Inject(DIKeys.DB) private readonly sequelize: Sequelize,
  ) { }

  public async genPlannedProducts(characterId: number) {
    const sqlResult = await PlannedProduct.findAll({
      attributes: ['character_id', 'type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });
    return sqlResult;
  }

  private async genSavePlannedProducts(
    products: TPlannedProduct[]
  ): Promise<PlannedProduct[]> {
    return await PlannedProduct.bulkCreate(products);
  }
}