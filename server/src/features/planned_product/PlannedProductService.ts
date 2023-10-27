import { Service } from 'typedi';
import { sum } from 'mathjs';
import { isEmpty } from 'underscore';
import { PlannedProduct } from './PlannedProduct';
import { PlannedProductsRes, PlannedProductsWithErrorRes } from '@internal/shared';
import EveSdeData from '../../core/sde/EveSdeData';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';
import AssetsService from '../eve_data/AssetsService';
import { MANUFACTURING } from '../../const/IndustryActivity';
import ActorContext from '../../core/actor_context/ActorContext';
import { genQueryFlatResultPerCharacter } from '../../lib/eveUtil';
import ItemQuantitiesParserService from '../../features/item_quantities/ItemQuantitiesParserService';

@Service()
export default class PlannedProductService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly itemQuantitiesParser: ItemQuantitiesParserService,
  ) { }

  /** Queries all planned products for the given ActorContext. */
  public async genAllPlannedProducts(
    actorContext: ActorContext,
  ): Promise<PlannedProductsRes> {
    const account = await actorContext.genxAccount();
    const plannedProducts = await account.getPlannedProducts();
    return await this.genProductsForResponse(actorContext, plannedProducts);
  }

  /** Queries planned products for the specific group. */
  public async genPlannedProductsForGroup(
    actorContext: ActorContext,
    group: string,
  ): Promise<PlannedProductsRes> {
    const account = await actorContext.genxAccount();
    const allPlannedProducts = await account.getPlannedProducts();
    const plannedProducts = allPlannedProducts.filter(pp => pp.group === group);
    return await this.genProductsForResponse(actorContext, plannedProducts);
  }

  /*
  * This function will try to parse the raw input string and from there
  * it will delete all current data for the user and create whole new data.
  * This was the easiest option since it doesn't require figuring out
  * what has changed.
  */
  public async genParseAndRecreate(
    actorContext: ActorContext,
    group: string,
    content: string,
  ): Promise<PlannedProductsWithErrorRes> {
    if (group === '') {
      throw Error('Planned product group name cannot be empty');
    }

    const { itemQuantities, errors } =
      this.itemQuantitiesParser.parseItemQuantities(content);
    if (errors.length !== 0) {
      return errors;
    }

    const account = await actorContext.genxAccount();

    // Delete current data
    await PlannedProduct.destroy({
      where: {
        accountId: account.id,
        group,
      },
    });

    // Recreate new data
    const result = await PlannedProduct.bulkCreate(
      itemQuantities.map(l => ({
        accountId: account.id,
        group,
        type_id: this.sdeData.typeByName[l.name].id,
        quantity: l.quantity,
      }))
    );

    return await this.genProductsForResponse(actorContext, result);
  }

  /*
  * Matches planned products to the existing ones in assets so that we
  * can see how much is built so far.
  * This function will also format the result for output.
  */
  private async genProductsForResponse(
    actorContext: ActorContext,
    plannedProducts: PlannedProduct[],
  ): Promise<PlannedProductsRes> {
    const assets = await this.assetService.genAssetsForProductionPlan(
      actorContext,
    );

    const industryJobs = await genQueryFlatResultPerCharacter(
      actorContext,
      character => this.esiQuery.genxIndustryJobs(character.characterId),
    );

    const manufacturingJobs = industryJobs.filter(
      j => j.activity_id === MANUFACTURING,
    );

    const getActiveRuns = (typeId: number) =>
      manufacturingJobs.find(j => j.product_type_id === typeId)?.runs ?? 0;
    const getBpProductQuantity = (typeId: number) =>
      this.sdeData.bpManufactureProductsByProduct[typeId]?.quantity ?? 0;

    return plannedProducts.map(pp => ({
      name: this.sdeData.types[pp.type_id].name,
      typeId: pp.type_id,
      group: pp.group,
      categoryId: this.sdeData.categoryIdFromTypeId(pp.type_id),
      quantity: pp.quantity,
      stock: assets[pp.type_id] ?? 0,
      active: getActiveRuns(pp.type_id) * getBpProductQuantity(pp.type_id),
    }));
  }

  /** Deletes a single row from the group. */
  public async genDelete(
    actorContext: ActorContext,
    group: string,
    typeId: number,
  ): Promise<void> {
    const account = await actorContext.genxAccount();
    await PlannedProduct.destroy({
      where: {
        accountId: account.id,
        group,
        type_id: typeId,
      },
    });
  }

  /** Deletes the entire group */
  public async genDeleteGroup(
    actorContext: ActorContext,
    group: string,
  ): Promise<void> {
    const account = await actorContext.genxAccount();
    await PlannedProduct.destroy({
      where: {
        accountId: account.id,
        group,
      },
    });
  }

  /** Adds a single item to the specific group. */
  public async genAddPlannedProduct(
    actorContext: ActorContext,
    group: string,
    typeName: string,
    quantity: number,
  ): Promise<void> {
    if (this.sdeData.typeByName[typeName] === undefined) {
      return;
    }

    const account = await actorContext.genxAccount();
    const result = await account.getPlannedProducts({
      where: {
        group,
        type_id: this.sdeData.typeByName[typeName].id,
      }
    })

    if (!isEmpty(result)) {
      await PlannedProduct.destroy({
        where: {
          accountId: account.id,
          group,
          type_id: this.sdeData.typeByName[typeName].id,
        }
      });
    }

    const totalQuantity = sum(result.map(pp => pp.quantity));
    await PlannedProduct.create({
      accountId: account.id,
      group,
      type_id: this.sdeData.typeByName[typeName].id,
      quantity: totalQuantity + quantity,
    });
  }
}
