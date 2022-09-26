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

    let materials = {};
    this.traverseMaterialTree(
      plannedProducts.map(pp => ({
        typeId: pp.get().type_id,
        quantity: pp.get().quantity,
      })),
      materials,
    );
    console.log(Object.entries(materials).map((e: any) => ({
      name: this.sdeData.types[e[0]].name,
      quantity: e[1],
    })));

    return plannedProducts.map(pp => {
      const rootProduct = {
        type_id: pp.get().type_id,
        name: this.sdeData.types[pp.get().type_id].name,
        quantity: pp.get().quantity,
        materials: [],
        // blueprint_id: null,
        // runs: null,
      };
      const assetMap = mapify(assets, 'item_id');

      this.buildMaterialTree(rootProduct, assetMap);
      return rootProduct;
    });
  }

  /**
   * Outputs:
   * 1. Number of runs per blueprint (this is for non leaf nodes, but 
   *    I need to build a list of ALL materials first, including 
   *    non leaf materials)
   * 2. Amounts of materials to buy (only matters for leaf nodes,
   *    i.e. things that don't have a blueprint)
   * @param products 
   * @param materials 
   */
  private traverseMaterialTree(
    products: { typeId: number, quantity: number }[],
    materials: { [key: number]: number },
  ): void {
    let leftoverMaterials: { [key: number]: number } = {};
    while (products.length > 0) {
      const product = products.pop()!;

      if (product.typeId in materials) {
        materials[product.typeId] += product.quantity;
      } else {
        materials[product.typeId] = product.quantity;
      }

      if (product.typeId in leftoverMaterials) {
        const stockQuantity = Math.min(
          leftoverMaterials[product.typeId],
          product.quantity,
        );
        leftoverMaterials[product.typeId] -= stockQuantity;
        product.quantity -= stockQuantity;
      }

      if (product.quantity === 0) {
        continue;
      }

      const productBlueprint =
        this.sdeData.bpManufactureProductsByProduct[product.typeId]
        || this.sdeData.bpReactionProductsByProduct[product.typeId];
      if (productBlueprint === undefined) {
        // Leaf node (mineral, planetary commodity, ice, ...)
        continue;
      }

      const blueprintId = productBlueprint.blueprint_id;
      const bpMaterials =
        this.sdeData.bpManufactureMaterialsByBlueprint[blueprintId]
        || this.sdeData.bpReactionMaterialsByBlueprint[blueprintId]
        || [];    // TODO is empty array even possible?

      // const meLevel = this.sdeData.typeIdIsReactionFormula(blueprintId)
      //   || this.sdeData.types[product.typeId]?.meta_group_id === MetaGroup.TECH_I
      //   ? MIN_ME :
      //   MAX_ME;
      const meLevel = MIN_ME;

      // This is just the minimum number of runs required to build
      // the product. Actual number of blueprint runs for the output
      // will be computed later.
      const runs = Math.ceil(product.quantity / productBlueprint.quantity);

      const leftoverProduct = productBlueprint.quantity * runs - product.quantity;
      if (leftoverProduct > 0) {
        if (product.typeId in leftoverMaterials) {
          leftoverMaterials[product.typeId] += leftoverProduct;
        } else {
          leftoverMaterials[product.typeId] = leftoverProduct
        }
      }

      if (bpMaterials.length > 0) {
        products.push(...bpMaterials.map(m => ({
          typeId: m.type_id,
          quantity: Math.ceil(m.quantity * meLevel) * runs,
        })));
      }
    }

    console.log(Object.entries(leftoverMaterials).map((e: any) => ({
      name: this.sdeData.types[e[0]].name,
      quantity: e[1],
    })));
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
      this.sdeData.bpManufactureProductsByProduct[product.type_id]
      || this.sdeData.bpReactionProductsByProduct[product.type_id];
    if (productBlueprint === undefined) {
      // Leaf node (mineral, planetary commodity, ice, ...)
      return;
    }

    const blueprintId = productBlueprint.blueprint_id;

    const materials =
      this.sdeData.bpManufactureMaterialsByBlueprint[blueprintId]
      || this.sdeData.bpReactionMaterialsByBlueprint[blueprintId]
      || [];    // TODO is empty array even possible?

    const meLevel = this.sdeData.typeIdIsReactionFormula(blueprintId)
      || this.sdeData.types[product.type_id]?.meta_group_id === MetaGroup.TECH_I
      ? MIN_ME :
      MAX_ME;

    // Minimum number of runs required to produce necessary product quantity
    const runs = Math.ceil(product.quantity / productBlueprint.quantity);

    // product.runs = runs;
    // product.blueprint_id = blueprintId;
    product.materials = materials.map(m => ({
      type_id: m.type_id,
      name: this.sdeData.types[m.type_id].name,
      quantity: Math.ceil(m.quantity * meLevel) * runs,
      materials: [],
      // blueprint_id: null,
      // runs: null,
    }));
    product.materials.forEach(m => this.buildMaterialTree(m, assets));
  };
}