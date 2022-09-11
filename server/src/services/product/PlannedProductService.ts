import { Service } from 'typedi';
import { PlannedProduct } from '../../models/PlannedProduct';
import { ManufactureMaterialsRes, PlannedProductsRes } from '@internal/shared';
import EveSdeData from '../query/EveSdeData';

@Service()
export default class PlannedProductService {

  constructor(
    private readonly sdeData: EveSdeData,
  ) { }

  // TODO rename to genData?
  public async getData(
    characterId: number,
  ): Promise<PlannedProductsRes> {
    const plannedProducts = await PlannedProduct.findAll({
      attributes: ['type_id', 'quantity'],
      where: {
        character_id: characterId,
      },
    });

    const buildMaterialTree = (product: ManufactureMaterialsRes) => {
      // const materials = this.sdeData.manufactureMaterialsForTypeId(
      //   product.get().type_id,
      // );
      const productBp =
        this.sdeData.bpManufactureProductsByProduct[product.type_id];
      if (productBp === undefined) {
        return;
      }
      const multiplier = Math.ceil(product.quantity / productBp.quantity);
      const materials = this.sdeData.bpManufactureMaterialsByBlueprint[productBp.blueprint_id];
      product.materials = materials.map(m => ({
        type_id: m.type_id,
        name: this.sdeData.types[m.type_id].name,
        quantity: m.quantity * multiplier,
        materials: [],
      }));
      product.materials.forEach(m => buildMaterialTree(m));
    };


    plannedProducts.map(pp => {
      const rootProduct = {
        type_id: pp.get().type_id,
        name: this.sdeData.types[pp.get().type_id].name,
        quantity: pp.get().quantity,
        materials: [],
      };
      buildMaterialTree(rootProduct);
      console.log(JSON.stringify(rootProduct));
    });

    // console.log(plannedProducts.map(pp =>
    //   this.sdeData.manufactureMaterialsForTypeId(pp.get().type_id).map(m =>
    //     this.sdeData.types[m.type_id].name)
    // ));


    return await this.genProductsForResponse(plannedProducts);
  }

  /*
  * This function will try to parse the raw input string and from there
  * it will delete all current data for the user and create whole new data.
  * This was the easiest option since it doesn't require figuring out
  * what has changed.
  */
  public async genParseAndRecreate(
    characterId: number,
    content: string,
  ): Promise<PlannedProductsRes> {
    // TODO this parsing might be wrong, who knows
    const lines = content
      .split(/\r?\n/)
      .filter(l => l !== '')
      .map(l => {
        const trimmedLine = l.trim();
        const splitIndex = trimmedLine.lastIndexOf(' ');
        return {
          name: trimmedLine.slice(0, splitIndex),
          quantity: trimmedLine.slice(splitIndex, trimmedLine.length).trim(),
        };
      });

    // Delete current data
    await PlannedProduct.destroy({
      where: {
        character_id: characterId,
      },
    });

    // Recreate new data
    const result = await PlannedProduct.bulkCreate(
      lines.map(l => ({
        character_id: characterId,
        type_id: this.sdeData.typeByName[l.name].id,
        quantity: Number(l.quantity),
      }))
    );
    return await this.genProductsForResponse(result);
  }

  /*
  * Helper function to format PlannedProducts for response.
  * We just need the name and quantities.
  */
  async genProductsForResponse(
    plannedProducts: PlannedProduct[],
  ): Promise<PlannedProductsRes> {
    return plannedProducts.map(pp => ({
      name: this.sdeData.types[pp.get().type_id].name,
      quantity: pp.get().quantity,
    }));
  }
}