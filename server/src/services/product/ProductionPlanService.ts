import { Service } from 'typedi';
import { hoursToSeconds } from 'date-fns';
import { PlannedProduct } from '../../models/PlannedProduct';
import { ManufactureTreeRes, ManufactureTreeRootRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import { EsiCacheItem, EsiCacheUtil } from '../foundation/EsiCacheUtil';
import EveQueryService from '../query/EveQueryService';
import EsiSequelizeProvider from '../foundation/EsiSequelizeProvider';
import { requiredScopes } from '../../const/EveScopes';

@Service()
export default class ProductionPlanService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
    private readonly sdeData: EveSdeData,
  ) { }

  /*
    * Takes all planned products and finds the required materials to build those.
    * Then for each material recursively keeps finding the next list of materials
    * until it reaches leaves (minerals, planetary commodities, 
    * moon minerals, ...).
    */
  public async genMaterialTree(
    characterId: number,
  ): Promise<ManufactureTreeRootRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });

    // TODO finish using assets
    const token = await this.esiSequelizeProvider.getToken(characterId, requiredScopes);
    const assets = await EsiCacheUtil.gen(
      characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(6),
      async () => await this.eveQuery.genAllAssets(token!, characterId),
    );

    const buildMaterialTree = (product: ManufactureTreeRes) => {
      const productBp =
        this.sdeData.bpManufactureProductsByProduct[product.type_id]
        || this.sdeData.bpReactionProductsByProduct[product.type_id];
      if (productBp === undefined) {
        return;
      }

      // TODO add ME 10
      const materials =
        this.sdeData.bpManufactureMaterialsByBlueprint[productBp.blueprint_id]
        || this.sdeData.bpReactionMaterialsByBlueprint[productBp.blueprint_id]
        || [];

      const multiplier = Math.ceil(product.quantity / productBp.quantity);
      product.materials = materials.map(m => ({
        type_id: m.type_id,
        name: this.sdeData.types[m.type_id].name,
        quantity: m.quantity * multiplier,
        materials: [],
      }));
      product.materials.forEach(m => buildMaterialTree(m));
    };

    return plannedProducts.map(pp => {
      const rootProduct = {
        type_id: pp.get().type_id,
        name: this.sdeData.types[pp.get().type_id].name,
        quantity: pp.get().quantity,
        materials: [],
      };
      buildMaterialTree(rootProduct);
      return rootProduct;
    });
  }

}