import { Service } from 'typedi';
import { hoursToSeconds } from 'date-fns';
import { PlannedProduct } from '../../models/PlannedProduct';
import { ManufactureTreeRes, ManufactureTreeRootRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import { EsiCacheItem, EsiCacheAction } from '../foundation/EsiCacheAction';
import EveQueryService from '../query/EveQueryService';
import EsiSequelizeProvider from '../foundation/EsiSequelizeProvider';
import { mapify } from '../../lib/util';
import { EveAsset } from '../../types/EsiQuery';
import { MetaGroup } from '../../const/MetaGroups';

const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0  // For ME = 0

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
    const [plannedProducts, assets] = await Promise.all([
      PlannedProduct.findAll({
        attributes: ['type_id', 'quantity'],
        where: {
          character_id: characterId,
        },
      }),
      (async () => {
        const token = await this.esiSequelizeProvider.genxToken(characterId);
        return await EsiCacheAction.gen(
          characterId.toString(),
          EsiCacheItem.ASSETS,
          hoursToSeconds(6),
          async () => await this.eveQuery.genAllAssets(token, characterId),
        );
      })(),
    ]);

    return plannedProducts.map(pp => {
      const rootProduct = {
        type_id: pp.get().type_id,
        name: this.sdeData.types[pp.get().type_id].name,
        quantity: pp.get().quantity,
        materials: [],
        blueprint_id: null,
        runs: null,
      };
      const assetMap = mapify(assets, 'item_id');

      this.buildMaterialTree(rootProduct, assetMap);
      return rootProduct;
    });
  }

  /**
   * Recursive helper function to build the tree of required materials
   * for the given product.
   * @param product 
   * @returns Built out tree with 'product' as the root node
   */
  private buildMaterialTree(
    product: ManufactureTreeRes,
    assets: { [key: number]: EveAsset },
  ): void {
    const productBlueprint =
      this.sdeData.bpManufactureProductsByProduct[product.type_id];
    const productReaction =
      this.sdeData.bpReactionProductsByProduct[product.type_id];
    if (productBlueprint === undefined && productReaction === undefined) {
      // Leaf node (mineral, planetary commodity, ice, ...)
      return;
    }

    const blueprintId = productBlueprint?.blueprint_id;
    const reactionId = productReaction?.blueprint_id;

    const materials =
      this.sdeData.bpManufactureMaterialsByBlueprint[blueprintId]
      || this.sdeData.bpReactionMaterialsByBlueprint[reactionId]
      || [];    // TODO is empty array even possible?

    const meLevel = this.sdeData.typeIdIsReactionFormula(reactionId)
      || this.sdeData.types[product.type_id]?.meta_group_id === MetaGroup.TECH_I
      ? MIN_ME :
      MAX_ME;

    // Blueprint or reaction output quantity
    const productQuantity =
      productBlueprint?.quantity ?? productReaction?.quantity;

    // Minimum number of runs required to produce necessary product quantity
    const runs = Math.ceil(product.quantity / productQuantity);

    product.runs = runs;
    product.blueprint_id = blueprintId ?? reactionId;
    product.materials = materials.map(m => ({
      type_id: m.type_id,
      name: this.sdeData.types[m.type_id].name,
      quantity: Math.ceil(m.quantity * meLevel) * runs,
      materials: [],
      blueprint_id: null,
      runs: null,
    }));
    product.materials.forEach(m => this.buildMaterialTree(m, assets));
  };
}