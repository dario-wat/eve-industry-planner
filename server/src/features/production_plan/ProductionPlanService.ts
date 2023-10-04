import { Service } from 'typedi';
import { groupBy } from 'underscore';
import { secondsToHours } from 'date-fns';
import { PlannedProduct } from '../planned_product/PlannedProduct';
import { ProductionPlanRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import AssetsService, { mergeAssetQuantities } from '../eve_data/AssetsService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { MaterialPlan } from './MaterialPlan';
import ProductionPlanCreationUtil from './ProductionPlanCreationUtil';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';

// TODO this whole thing needs a big refactor

// const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0; // For ME = 0
const MAX_TE = 0.8; // For TE = 20
const HOURS_IN_DAY = 24;

@Service()
export default class ProductionPlanService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /**
   * Takes all planned products and finds the required materials to build those.
   * Then for each material recursively keeps finding the next list of materials
   * until it reaches leaves(minerals, planetary commodities, 
   * moon minerals, ...).
   */
  public async genProductionPlan(
    actorContext: ActorContext,
    group?: string,
  ): Promise<ProductionPlanRes> {
    const account = await actorContext.genxAccount();
    const [plannedProducts, assets, alwaysBuy, industryJobs] =
      await Promise.all([
        PlannedProduct.findAll({
          attributes: ['type_id', 'quantity'],
          where: group
            ? { accountId: account.id, group }
            : { accountId: account.id },
        }),
        this.assetService.genAssetsForProductionPlan(actorContext),
        account.getAlwaysBuyItems(),
        genQueryFlatResultPerCharacter(
          actorContext,
          async character => await this.esiQuery.genxIndustryJobs(character.characterId),
        ),
      ]);

    const alwaysBuyTypeIds = alwaysBuy.map(ab => ab.typeId);
    const plannedProductData = groupBy(
      plannedProducts.map(pp => ({
        typeId: pp.type_id,
        quantity: pp.quantity,
      })),
      pp => alwaysBuyTypeIds.includes(pp.typeId) ? 'buy' : 'build',
    );

    const indyAssets = Object.fromEntries(
      industryJobs.map(j => {
        const bp = this.sdeData.productBlueprintFromTypeId(j.product_type_id);
        return [j.product_type_id, (bp?.quantity ?? 0) * j.runs];
      })
    ) as Record<number, number>;

    const fullAssets = mergeAssetQuantities(indyAssets, assets);

    const materialsPlan = this.traverseMaterialTree(
      plannedProductData['build'] ?? [],
      fullAssets,
    );
    plannedProductData['buy']?.forEach(pp =>
      materialsPlan.addQuantity(pp.typeId, pp.quantity)
    );

    const creationUtil = new ProductionPlanCreationUtil(
      industryJobs,
      fullAssets,
      plannedProducts.map(pp => pp.type_id),
      this.sdeData,
    );

    return {
      blueprintRuns: Object.entries(materialsPlan.materials)
        .filter(e => e[1].runs > 0)
        .map(e => ({
          typeId: Number(e[0]),
          categoryId: this.sdeData.categoryIdFromTypeId(Number(e[0])),
          productionCategory: creationUtil.getProductionCategory(
            Number(e[0]),
          ),
          name: this.sdeData.types[Number(e[0])]?.name,
          blueprintExists: creationUtil.blueprintExists(Number(e[0])),
          runs: e[1].runs,
          activeRuns: creationUtil.activeManufacturingRuns(Number(e[0]))
            + creationUtil.activeReactionRuns(Number(e[0])),
          daysToRun: secondsToHours(
            MAX_TE * e[1].runs
            * (creationUtil.blueprintManufactureTime(Number(e[0]))
              ?? 0)
          ) / HOURS_IN_DAY,
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
    const materialPlan = new MaterialPlan(assets);
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
        this.sdeData.productBlueprintFromTypeId(product.typeId);
      if (productBlueprint === undefined) {
        // Leaf node (mineral, planetary commodity, ice, ...)
        continue;
      }

      const blueprintId = productBlueprint.blueprint_id;
      const bpMaterials =
        this.sdeData.bpManufactureMaterialsByBlueprint[blueprintId]
        || this.sdeData.bpReactionMaterialsByBlueprint[blueprintId];

      // TODO fix this
      // const meLevel = this.sdeData.typeIdIsReactionFormula(blueprintId)
      //   || this.sdeData.types[product.typeId]?.meta_group_id === MetaGroup.TECH_I
      //   ? MIN_ME :
      //   MAX_ME;
      const meLevel = MIN_ME;

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