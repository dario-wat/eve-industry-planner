import { Service } from 'typedi';
import { PlannedProduct } from '../../models/PlannedProduct';
import { ProductionPlanRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import { MetaGroup } from '../../const/MetaGroups';
import AssetsService from './AssetsService';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import { MANUFACTURING } from '../../const/IndustryActivity';

const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0  // For ME = 0

@Service()
export default class ProductionPlanService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
    private readonly esiQuery: EsiTokenlessQueryService,
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
    const [plannedProducts, assets, industryJobs] = await Promise.all([
      PlannedProduct.findAll({
        attributes: ['type_id', 'quantity'],
        where: {
          character_id: characterId,
        },
      }),
      this.assetService.genAssetsForProductionPlan(characterId),
      this.esiQuery.genxIndustryJobs(characterId),
    ]);

    const materialsPlan = this.traverseMaterialTree(
      plannedProducts.map(pp => ({
        typeId: pp.get().type_id,
        quantity: pp.get().quantity,
      })),
      assets,
    );

    const plannedProductIds = plannedProducts.map(pp => pp.get().type_id);
    const manufacturingJobs = industryJobs.filter(
      j => j.activity_id === MANUFACTURING,
    );
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
          activeRuns: manufacturingJobs.find(
            j => j.product_type_id === Number(e[0]),
          )?.runs,
        })),
      materials: Object.entries(materialsPlan.materials)
        .filter(e => e[1].runs === 0 && e[1].quantity !== 0)
        .map(e => ({
          typeId: Number(e[0]),
          categoryId: this.sdeData.categoryIdFromTypeId(Number(e[0])),
          name: this.sdeData.types[Number(e[0])]?.name,
          quantity: e[1].quantity,
        })),
    };
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
      case 873: return 'Capital Components';
      case 964: return 'Hybrid Tech Components';
      case 974: return 'Hybrid Reactions';
      case 4096: return 'Biochem Reactions';
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
    assets: { [typeId: number]: number },
  ): MaterialPlan {
    let materialPlan = new MaterialPlan(assets);
    while (products.length > 0) {
      const product = products.pop()!;

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

      // IF the material already exists in the leftover or assets,
      // then we don't need to add it to the plan (since it doesn't
      // need to be built nor bought). Hence this is the right place
      // to add it to the plan
      materialPlan.addQuantity(product.typeId, product.quantity);

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
    assets: { [typeId: number]: number },
  ) {
    this.materials = {};
    // Initialize leftover with existing assets
    Object.entries(assets).forEach(a => this.addLeftover(Number(a[0]), a[1]));
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