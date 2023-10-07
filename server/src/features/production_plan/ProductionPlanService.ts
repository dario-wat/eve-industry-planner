import { Service } from 'typedi';
import { groupBy } from 'underscore';
import { secondsToHours } from 'date-fns';
import { PlannedProduct } from '../planned_product/PlannedProduct';
import { ProductionPlanRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import AssetsService, { mergeAssetQuantities } from '../eve_data/AssetsService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { MaterialPlan } from './MaterialPlan';
import ProductionPlanCreationUtil from './ProductionPlanCreationUtilService';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';
import { EveIndustryJob } from '../../types/EsiQuery';
import { MANUFACTURING, REACTION } from '../../const/IndustryActivity';
import { sum } from 'lodash';
import { AlwaysBuyItem } from 'features/always_buy/AlwaysBuyItem';

// TODO this whole thing needs a big refactor

// const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0; // For ME = 0
const MAX_TE = 0.8; // For TE = 20
const HOURS_IN_DAY = 24;

/** Data required to create a production plan. */
type ProductionPlanCreationData = {
  plannedProducts: PlannedProduct[],
  assets: Record<number, number>,
  alwaysBuyItems: AlwaysBuyItem[],
  activeIndustryJobs: EveIndustryJob[],
};

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
    const ppData = await this.genProductionPlanCreationData(actorContext, group);

    const alwaysBuyTypeIds = ppData.alwaysBuyItems.map(ab => ab.typeId);
    const plannedProductData = groupBy(
      ppData.plannedProducts.map(pp => ({
        typeId: pp.type_id,
        quantity: pp.quantity,
      })),
      pp => alwaysBuyTypeIds.includes(pp.typeId) ? 'buy' : 'build',
    );

    const indyAssets = Object.fromEntries(
      ppData.activeIndustryJobs.map(j => {
        const bp = this.sdeData.productBlueprintFromTypeId(j.product_type_id);
        return [j.product_type_id, (bp?.quantity ?? 0) * j.runs];
      })
    ) as Record<number, number>;

    const fullAssets = mergeAssetQuantities(indyAssets, ppData.assets);

    const materialsPlan = this.traverseMaterialTree(
      plannedProductData['build'] ?? [],
      fullAssets,
    );
    plannedProductData['buy']?.forEach(pp =>
      materialsPlan.addQuantity(pp.typeId, pp.quantity)
    );

    const creationUtil = new ProductionPlanCreationUtil(
      ppData.activeIndustryJobs,
      fullAssets,
      ppData.plannedProducts.map(pp => pp.type_id),
      this.sdeData,
    );

    return {
      blueprintRuns: materialsPlan.getMaterialsList()
        .filter(material => material.runs > 0)
        .map(({ typeId, runs }) => ({
          typeId: typeId,
          categoryId: this.sdeData.categoryIdFromTypeId(typeId),
          productionCategory: creationUtil.getProductionCategory(typeId),
          name: this.sdeData.types[typeId]?.name,
          blueprintExists: creationUtil.blueprintExists(typeId),
          runs: runs,
          activeRuns: activeManufacturingRuns(typeId, ppData.activeIndustryJobs)
            + activeReactionRuns(typeId, ppData.activeIndustryJobs),
          daysToRun: secondsToHours(
            MAX_TE * runs
            * (creationUtil.blueprintManufactureTime(typeId) ?? 0)
          ) / HOURS_IN_DAY,
        })),
      materials: materialsPlan.getMaterialsList()
        .filter(({ runs, quantity }) => runs === 0 && quantity !== 0)
        .map(({ typeId, quantity }) => ({
          typeId: typeId,
          categoryId: this.sdeData.categoryIdFromTypeId(typeId),
          name: this.sdeData.types[typeId]?.name,
          quantity: quantity,
        })),
    };
  }

  /** Queries all the necessary data to create the production plan. */
  private async genProductionPlanCreationData(
    actorContext: ActorContext,
    group?: string,
  ): Promise<ProductionPlanCreationData> {
    const account = await actorContext.genxAccount();
    const [plannedProducts, assets, alwaysBuyItems, activeIndustryJobs] =
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
          character => this.esiQuery.genxIndustryJobs(character.characterId),
        ),
      ]);

    return { plannedProducts, assets, alwaysBuyItems, activeIndustryJobs };
  }

  /**
   * Outputs:
   * 1. Number of runs per blueprint (this is for non leaf nodes)
   * 2. Amounts of materials to buy (only matters for leaf nodes,
   *    i.e. things that don't have a blueprint)
   */
  private traverseMaterialTree(
    products: { typeId: number, quantity: number }[],
    assets: Record<number, number>,
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

function activeManufacturingRuns(
  typeId: number,
  industryJobs: EveIndustryJob[]
): number {
  const qualifiedJobs = industryJobs.filter(j =>
    j.activity_id === MANUFACTURING && j.product_type_id === typeId
  );
  return sum(qualifiedJobs.map(job => job.runs));
}

function activeReactionRuns(
  typeId: number,
  industryJobs: EveIndustryJob[]
): number {
  const qualifiedJobs = industryJobs.filter(j =>
    j.activity_id === REACTION && j.product_type_id === typeId
  );
  return sum(qualifiedJobs.map(job => job.runs));
}
