import { Service } from 'typedi';
import { secondsToHours } from 'date-fns';
import { PlannedProduct } from '../planned_product/PlannedProduct';
import { ProductionPlanRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import AssetsService, { mergeAssetQuantities } from '../eve_data/AssetsService';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import { MaterialPlan } from './MaterialPlan';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';
import { EveIndustryJob } from '../../types/EsiQuery';
import { MANUFACTURING, REACTION } from '../../const/IndustryActivity';
import { isEmpty, sum } from 'lodash';
import { AlwaysBuyItem } from 'features/always_buy/AlwaysBuyItem';

// TODO this whole thing needs a big refactor

// const MAX_ME = 0.9; // For ME = 10
const MIN_ME = 1.0; // For ME = 0
const MAX_TE = 0.8; // For TE = 20
const HOURS_IN_DAY = 24;

/** Data required to create a production plan. */
type ProductionPlanCreationData = {
  plannedProducts: PlannedProduct[];
  assets: Record<number, number>;
  alwaysBuyItems: AlwaysBuyItem[];
  activeIndustryJobs: EveIndustryJob[];
};

@Service()
export default class ProductionPlanService {
  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
    private readonly esiQuery: EsiTokenlessQueryService
  ) {}

  /**
   * Takes all planned products and finds the required materials to build those.
   * Then for each material recursively keeps finding the next list of materials
   * until it reaches leaves(minerals, planetary commodities,
   * moon minerals, ...).
   */
  public async genProductionPlan(
    actorContext: ActorContext,
    group?: string
  ): Promise<ProductionPlanRes> {
    const ppData = await this.genProductionPlanCreationData(actorContext, group);

    const indyAssets = Object.fromEntries(
      ppData.activeIndustryJobs.map((j) => {
        const bp = this.sdeData.productBlueprintFromTypeId(j.product_type_id);
        return [j.product_type_id, (bp?.quantity ?? 0) * j.runs];
      })
    ) as Record<number, number>;

    const fullAssets = mergeAssetQuantities(indyAssets, ppData.assets);

    const materialsPlan = this.traverseMaterialTree(
      ppData.plannedProducts.map((pp) => ({
        typeId: pp.type_id,
        quantity: pp.quantity,
      })),
      fullAssets
    );

    return {
      blueprintRuns: materialsPlan
        .getMaterialsList()
        .map(({ typeId, runs }) => ({
          typeId: typeId,
          categoryId: this.sdeData.categoryIdFromTypeId(typeId),
          productionCategory: this.getProductionCategory(ppData, typeId),
          name: this.sdeData.types[typeId]?.name,
          blueprintExists: this.blueprintExists(ppData, typeId),
          runs: runs,
          activeRuns:
            activeManufacturingRuns(typeId, ppData.activeIndustryJobs) +
            activeReactionRuns(typeId, ppData.activeIndustryJobs),
          daysToRun:
            secondsToHours(MAX_TE * runs * (this.blueprintManufactureTime(typeId) ?? 0)) /
            HOURS_IN_DAY,
        }))
        .filter((res) => res.activeRuns > 0 || res.runs !== 0),
      materials: materialsPlan
        .getMaterialsList()
        .filter(({ runs, quantity }) => runs === 0 && quantity !== 0)
        .map(({ typeId, quantity }) => ({
          typeId: typeId,
          categoryId: this.sdeData.categoryIdFromTypeId(typeId),
          name: this.sdeData.types[typeId]?.name,
          quantity: quantity,
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
    products: { typeId: number; quantity: number }[],
    assets: Record<number, number>
  ): MaterialPlan {
    const materialPlan = new MaterialPlan(assets);
    while (products.length > 0) {
      const product = products.pop()!;

      // FIRST check if we have any leftover from previous blueprint runs
      // or from pre-existing assets
      const subtracted = materialPlan.subtractLeftover(product.typeId, product.quantity);
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
      const productBlueprint = this.sdeData.productBlueprintFromTypeId(product.typeId);
      if (productBlueprint === undefined) {
        // Leaf node (mineral, planetary commodity, ice, ...)
        continue;
      }

      const blueprintId = productBlueprint.blueprint_id;
      const bpMaterials =
        this.sdeData.bpManufactureMaterialsByBlueprint[blueprintId] ||
        this.sdeData.bpReactionMaterialsByBlueprint[blueprintId];

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
        products.push(
          ...bpMaterials.map((m) => ({
            typeId: m.type_id,
            quantity: Math.ceil(m.quantity * meLevel) * runs,
          }))
        );
      }
    }

    return materialPlan;
  }

  /** Queries all the necessary data to create the production plan. */
  private async genProductionPlanCreationData(
    actorContext: ActorContext,
    group?: string
  ): Promise<ProductionPlanCreationData> {
    const account = await actorContext.genxAccount();
    const [plannedProducts, assets, alwaysBuyItems, activeIndustryJobs] = await Promise.all([
      PlannedProduct.findAll({
        attributes: ['type_id', 'quantity'],
        where: group ? { accountId: account.id, group } : { accountId: account.id },
      }),
      this.assetService.genAssetsForProductionPlan(actorContext),
      account.getAlwaysBuyItems(),
      genQueryFlatResultPerCharacter(actorContext, (character) =>
        this.esiQuery.genxIndustryJobs(character.characterId)
      ),
    ]);

    return { plannedProducts, assets, alwaysBuyItems, activeIndustryJobs };
  }

  private getProductionCategory(ppData: ProductionPlanCreationData, typeId: number): string {
    if (ppData.plannedProducts.map((pp) => pp.type_id).includes(typeId)) {
      return 'End Product / Other';
    }

    const groupId = this.sdeData.types[typeId]?.group_id;
    switch (groupId) {
      case 334:
        return 'Construction Components';
      case 428:
        return 'Intermediate Materials';
      case 429:
        return 'Composite Materials';
      case 873:
        return 'Capital Components';
      case 964:
        return 'Hybrid Tech Components';
      case 974:
        return 'Hybrid Reactions';
      case 4096:
        return 'Biochem Reactions';
      default:
        return 'Other';
    }
  }

  private blueprintManufactureTime(typeId: number): number | undefined {
    return (
      this.sdeData.productBlueprintTimeDataFromTypeId(typeId)?.manufacturing_time ??
      this.sdeData.productBlueprintTimeDataFromTypeId(typeId)?.reaction_time
    );
  }

  private blueprintExists(ppData: ProductionPlanCreationData, typeId: number): boolean {
    const blueprintId = this.sdeData.productBlueprintFromTypeId(typeId)?.blueprint_id;
    return (
      blueprintId !== undefined &&
      (blueprintId in ppData.assets || this.industryJobContainsBlueprint(ppData, blueprintId))
    );
  }

  private industryJobContainsBlueprint(
    ppData: ProductionPlanCreationData,
    blueprintId: number
  ): boolean {
    return !isEmpty(
      ppData.activeIndustryJobs.filter((job) => job.blueprint_type_id === blueprintId)
    );
  }
}

function activeManufacturingRuns(typeId: number, industryJobs: EveIndustryJob[]): number {
  const qualifiedJobs = industryJobs.filter(
    (j) => j.activity_id === MANUFACTURING && j.product_type_id === typeId
  );
  return sum(qualifiedJobs.map((job) => job.runs));
}

function activeReactionRuns(typeId: number, industryJobs: EveIndustryJob[]): number {
  const qualifiedJobs = industryJobs.filter(
    (j) => j.activity_id === REACTION && j.product_type_id === typeId
  );
  return sum(qualifiedJobs.map((job) => job.runs));
}
