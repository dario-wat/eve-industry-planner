import { Service } from 'typedi';
import { sum } from 'mathjs';
import { isEmpty } from 'underscore';
import { PlannedProduct } from '../../models/PlannedProduct';
import { PlannedProductsRes, PlannedProductsWithErrorRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';
import AssetsService from './AssetsService';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';
import { MANUFACTURING } from '../../const/IndustryActivity';

type ParsedLine = { name: string, quantity: number | null };

@Service()
export default class PlannedProductService {

  constructor(
    private readonly sdeData: EveSdeData,
    private readonly assetService: AssetsService,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  public async genAllPlannedProducts(
    characterId: number,
  ): Promise<PlannedProductsRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity', 'group'],
      where: {
        character_id: characterId,
      },
    });
    return await this.genProductsForResponse(characterId, plannedProducts);
  }

  public async genPlannedProductsForGroup(
    characterId: number,
    group: string,
  ): Promise<PlannedProductsRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity', 'group'],
      where: {
        character_id: characterId,
        group,
      },
    });
    return await this.genProductsForResponse(characterId, plannedProducts);
  }

  /*
  * This function will try to parse the raw input string and from there
  * it will delete all current data for the user and create whole new data.
  * This was the easiest option since it doesn't require figuring out
  * what has changed.
  */
  public async genParseAndRecreate(
    characterId: number,
    group: string,
    content: string,
  ): Promise<PlannedProductsWithErrorRes> {
    const lines = PlannedProductService.parseInput(content);
    const errors = this.validateParsedInput(lines);
    if (errors.length !== 0) {
      return errors;
    }

    // Delete current data
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
        group,
      },
    });

    // Recreate new data
    const result = await PlannedProduct.bulkCreate(
      lines.map(l => ({
        character_id: characterId,
        group,
        type_id: this.sdeData.typeByName[l.name].id,
        quantity: l.quantity,
      }))
    );
    return await this.genProductsForResponse(characterId, result);
  }

  private validateParsedInput(
    lines: ParsedLine[],
  ): { name: string, error: string }[] {
    const getError = (line: ParsedLine) =>
      this.sdeData.typeByName[line.name] === undefined
        ? `Product with name '${line.name}' doesn't exist`
        : line.quantity === null || Number.isNaN(line.quantity)
          ? `Incorrect format '${line.name}'`
          : null;
    return lines.map(l => ({ name: l.name, error: getError(l) }))
      .filter(l => l.error)
      .map(l => ({ name: l.name, error: l.error! })); // typescript happy
  }

  private static parseInput(content: string): ParsedLine[] {
    return content
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l !== '')
      .map(l => {
        const words = l.replace(/\s\s+/g, ' ').split(' ');
        if (words.length == 1) {  // can't be 0 because that's filtered
          return { name: l, quantity: null };
        }

        const quantity = Number(words[words.length - 1]);
        if (Number.isNaN(quantity)) {
          return { name: l, quantity: null };
        }
        return {
          name: words.slice(0, words.length - 1).join(' '),
          quantity: quantity,
        };
      });
  }

  /*
  * Matches planned products to the existing ones in assets so that we
  * can see how much is built so far.
  * This function will also format the result for output.
  */
  private async genProductsForResponse(
    characterId: number,
    plannedProducts: PlannedProduct[],
  ): Promise<PlannedProductsRes> {
    const [assets, industryJobs] = await Promise.all([
      this.assetService.genAssetsForProductionPlan(characterId),
      this.esiQuery.genxIndustryJobs(characterId),
    ]);

    const manufacturingJobs = industryJobs.filter(
      j => j.activity_id === MANUFACTURING,
    );

    const getActiveRuns = (typeId: number) =>
      manufacturingJobs.find(j => j.product_type_id === typeId)?.runs ?? 0;
    const getBpProductQuantity = (typeId: number) =>
      this.sdeData.bpManufactureProductsByProduct[typeId]?.quantity ?? 0;
    return plannedProducts.map(pp => ({
      name: this.sdeData.types[pp.get().type_id].name,
      typeId: pp.get().type_id,
      group: pp.get().group,
      categoryId: this.sdeData.categoryIdFromTypeId(pp.get().type_id),
      quantity: pp.get().quantity,
      stock: assets[pp.get().type_id] ?? 0,
      active:
        getActiveRuns(pp.get().type_id) * getBpProductQuantity(pp.get().type_id),
    }));
  }

  public async genDelete(
    characterId: number,
    group: string,
    typeId: number,
  ): Promise<void> {
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
        group,
        type_id: typeId,
      },
    });
  }

  public async genDeleteGroup(
    characterId: number,
    group: string,
  ): Promise<void> {
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
        group,
      },
    });
  }

  public async genAddPlannedProduct(
    characterId: number,
    group: string,
    typeName: string,
    quantity: number,
  ): Promise<void> {
    if (this.sdeData.typeByName[typeName] === undefined) {
      return;
    }

    const result = await PlannedProduct.findAll({
      where: {
        character_id: characterId,
        group,
        type_id: this.sdeData.typeByName[typeName].id,
      }
    });

    const totalQuantity = sum(result.map(pp => pp.get().quantity));
    if (!isEmpty(result)) {
      await PlannedProduct.destroy({
        where: {
          character_id: characterId,
          group,
          type_id: this.sdeData.typeByName[typeName].id,
        }
      });
    }

    await PlannedProduct.create({
      character_id: characterId,
      group,
      type_id: this.sdeData.typeByName[typeName].id,
      quantity: totalQuantity + quantity,
    });
  }
}