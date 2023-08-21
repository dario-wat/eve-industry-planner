import { Service } from 'typedi';
import { AlwaysBuyItemsRes } from '@internal/shared';
import { AlwaysBuyItem } from './AlwaysBuyItem';
import EveSdeData from '../../core/sde/EveSdeData';

@Service()
export default class AlwaysBuyItemService {

  constructor(
    private readonly sdeData: EveSdeData,
  ) { }

  public async genQuery(characterId: number): Promise<AlwaysBuyItemsRes> {
    const result = await AlwaysBuyItem.findAll({
      where: {
        characterId,
      },
    });
    return result.map(i => ({
      typeId: i.get().typeId,
      typeName: this.sdeData.types[i.get().typeId].name,
    }));
  }

  public async genUpdate(
    characterId: number,
    typeIds: number[],
  ): Promise<AlwaysBuyItemsRes> {
    // Delete current data
    await AlwaysBuyItem.destroy({
      where: {
        characterId,
      },
    });

    // Recreate new data
    const result = await AlwaysBuyItem.bulkCreate(
      typeIds.map(typeId => ({ characterId, typeId })),
    );
    return result.map(i => ({
      typeId: i.get().typeId,
      typeName: this.sdeData.types[i.get().typeId].name,
    }));
  }
}