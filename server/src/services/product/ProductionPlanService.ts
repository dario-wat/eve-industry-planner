import { Service } from 'typedi';
import { hoursToSeconds } from 'date-fns';
import { PlannedProduct } from '../../models/PlannedProduct';
import { ProductionPlanRes } from '@internal/shared';
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
  public async genProductionPlan(
    characterId: number,
  ): Promise<ProductionPlanRes> {
    // TODO finish assets
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


    const materialsPlan = this.traverseMaterialTree(
      plannedProducts.map(pp => ({
        typeId: pp.get().type_id,
        quantity: pp.get().quantity,
      })),
    );

    // TODO split runs by categories
    return {
      blueprintRuns: Object.entries(materialsPlan.materials)
        .filter((e: any) => e[1].runs > 0)
        .map((e: any) => ({
          typeId: e[0],
          categoryId: this.sdeData.categoryIdFromTypeId(e[0]),
          name: this.sdeData.types[e[0]].name,
          runs: e[1].runs,
        })),
      materials: Object.entries(materialsPlan.materials)
        .filter((e: any) => e[1].runs === 0)
        .map((e: any) => ({
          typeId: e[0],
          categoryId: this.sdeData.categoryIdFromTypeId(e[0]),
          name: this.sdeData.types[e[0]].name,
          quantity: e[1].quantity,
        })),
    };
  }

  /**
   * Outputs:
   * 1. Number of runs per blueprint (this is for non leaf nodes, but 
   *    I need to build a list of ALL materials first, including 
   *    non leaf materials)
   * 2. Amounts of materials to buy (only matters for leaf nodes,
   *    i.e. things that don't have a blueprint)
   */
  private traverseMaterialTree(
    products: { typeId: number, quantity: number }[],
  ): MaterialPlan {
    let materialPlan = new MaterialPlan();
    while (products.length > 0) {
      const product = products.pop()!;

      materialPlan.addQuantity(product.typeId, product.quantity);
      const subtracted = materialPlan.subtractLeftover(
        product.typeId,
        product.quantity,
      );
      product.quantity -= subtracted;

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

      const meLevel = this.sdeData.typeIdIsReactionFormula(blueprintId)
        || this.sdeData.types[product.typeId]?.meta_group_id === MetaGroup.TECH_I
        ? MIN_ME :
        MAX_ME;

      // This is just the minimum number of runs required to build
      // the product. Actual number of blueprint runs for the output
      // will be computed later.
      const runs = Math.ceil(product.quantity / productBlueprint.quantity);

      materialPlan.addRuns(product.typeId, runs);

      const leftoverProduct = productBlueprint.quantity * runs - product.quantity;
      if (leftoverProduct > 0) {
        materialPlan.addLeftover(product.typeId, leftoverProduct);
      }

      if (bpMaterials.length > 0) {
        products.push(...bpMaterials.map(m => ({
          typeId: m.type_id,
          quantity: Math.ceil(m.quantity * meLevel) * runs,
        })));
      }
    }

    return materialPlan;
  }
}

type MaterialsType = {
  [typeId: number]: {
    quantity: number,
    runs: number,
    leftover: number,
  }
};

class MaterialPlan {

  constructor(
    public materials: MaterialsType = {},
  ) { }

  public addQuantity(typeId: number, quantity: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].quantity += quantity;
    } else {
      this.materials[typeId] = { quantity, runs: 0, leftover: 0 };
    }
  }

  public addRuns(typeId: number, runs: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].runs += runs;
    } else {
      this.materials[typeId] = { quantity: 0, runs, leftover: 0 };
    }
  }

  public addLeftover(typeId: number, leftover: number): void {
    if (typeId in this.materials) {
      this.materials[typeId].leftover += leftover;
    } else {
      this.materials[typeId] = { quantity: 0, runs: 0, leftover };
    }
  }

  /**
   * Subtracts the quantity from leftover
   * @returns the amount subtracted
   */
  public subtractLeftover(typeId: number, quantity: number): number {
    if (typeId in this.materials) {
      const stockQuantity = Math.min(
        this.materials[typeId].leftover,
        quantity,
      );
      this.materials[typeId].leftover -= stockQuantity;
      return stockQuantity;
    }
    return 0;
  }
}