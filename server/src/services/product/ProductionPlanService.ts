import { Service } from 'typedi';
import { PlannedProduct } from '../../models/PlannedProduct';
import { EveAssetsRes, ProductionPlanRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import { MetaGroup } from '../../const/MetaGroups';
import { MaterialStation } from '../../models/MaterialStation';
import AssetsService from './AssetsService';
import { SHIP } from '../../const/Categories';

const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0  // For ME = 0

@Service()
export default class ProductionPlanService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
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
    const [plannedProducts, assets] = await Promise.all([
      PlannedProduct.findAll({
        attributes: ['type_id', 'quantity'],
        where: {
          character_id: characterId,
        },
      }),
      this.genAssetsForProductionPlan(characterId),
    ]);

    const materialsPlan = this.traverseMaterialTree(
      plannedProducts.map(pp => ({
        typeId: pp.get().type_id,
        quantity: pp.get().quantity,
      })),
      assets,
    );

    const plannedProductIds = plannedProducts.map(pp => pp.get().type_id);
    return {
      blueprintRuns: Object.entries(materialsPlan.materials)
        .filter(e => e[1].runs > 0)
        .map(e => ({
          typeId: Number(e[0]),
          categoryId: this.sdeData.categoryIdFromTypeId(Number(e[0])),
          productionCategory: this.getProductionCategory(
            Number(e[0]),
            plannedProductIds,
          ),
          name: this.sdeData.types[Number(e[0])]?.name,
          runs: e[1].runs,
        })),
      materials: Object.entries(materialsPlan.materials)
        .filter(e => e[1].runs === 0)
        .map(e => ({
          typeId: Number(e[0]),
          categoryId: this.sdeData.categoryIdFromTypeId(Number(e[0])),
          name: this.sdeData.types[Number(e[0])]?.name,
          quantity: e[1].quantity,
        })),
    };
  }

  /**
   * We don't want all assets, but only those that the user has configured.
   * The user cares about assets located only in a specific set of
   * stations stored in MaterialStation.
   */
  private async genAssetsForProductionPlan(
    characterId: number,
  ): Promise<EveAssetsRes> {
    const materialStations = await MaterialStation.findAll({
      attributes: ['station_id'],
      where: {
        character_id: characterId,
      },
    });
    const stationIds =
      materialStations.map(station => station.get().station_id);

    const allAssets = await this.assetService.genData(characterId);
    return allAssets.filter(asset =>
      // TODO ignoring ships for now since there are a lot of fitted
      // ships that I don't want to include as assets here.
      // Ideally I would modify the asset service to be modular
      // and filter stuff based on the inputs
      stationIds.includes(asset.location_id) && asset.category_id !== SHIP,
    );
  }

  private getProductionCategory(
    typeId: number,
    plannedProductIds: number[],
  ): string {
    if (plannedProductIds.includes(typeId)) {
      return 'End Product / Other';
    }

    const groupId = this.sdeData.types[typeId].group_id;
    switch (groupId) {
      case 334: return 'Construction Components';
      case 428: return 'Intermediate Materials';
      case 429: return 'Composite Materials';
      case 964: return 'Hybrid Tech Components';
      case 974: return 'Hybrid Polymers';
      default: return 'Other';
    }
  }

  /**
   * Outputs:
   * 1. Number of runs per blueprint (this is for non leaf nodes)
   * 2. Amounts of materials to buy (only matters for leaf nodes,
   *    i.e. things that don't have a blueprint)
   */
  private traverseMaterialTree(
    products: { typeId: number, quantity: number }[],
    assets: EveAssetsRes,
  ): MaterialPlan {
    let materialPlan = new MaterialPlan(assets);
    while (products.length > 0) {
      const product = products.pop()!;
      materialPlan.addQuantity(product.typeId, product.quantity);

      // FIRST check if we have any leftover from previous blueprint runs
      // or from pre-existing assets
      const subtracted = materialPlan.subtractLeftover(
        product.typeId,
        product.quantity,
      );
      product.quantity -= subtracted;

      if (product.quantity === 0) {
        continue;
      }

      // SECOND if there wasn't enough leftover then we go make more
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
        || this.sdeData.bpReactionMaterialsByBlueprint[blueprintId];

      const meLevel = this.sdeData.typeIdIsReactionFormula(blueprintId)
        || this.sdeData.types[product.typeId]?.meta_group_id === MetaGroup.TECH_I
        ? MIN_ME :
        MAX_ME;

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

  public materials: MaterialsType;

  constructor(
    assets: EveAssetsRes,
  ) {
    this.materials = {};
    // Initialize leftover with existing assets
    assets.forEach(a => this.addLeftover(a.type_id, a.quantity));
  }

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