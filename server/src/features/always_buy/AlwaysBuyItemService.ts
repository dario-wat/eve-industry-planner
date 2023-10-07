import { Service } from 'typedi';
import { AlwaysBuyItemsRes } from '@internal/shared';
import { AlwaysBuyItem } from './AlwaysBuyItem';
import EveSdeData from '../../core/sde/EveSdeData';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class AlwaysBuyItemService {

  constructor(
    private readonly sdeData: EveSdeData,
  ) { }

  /** Queries all AlwaysBuyItem TypeIDs from SDE. */
  public async genQuery(actorContext: ActorContext): Promise<AlwaysBuyItemsRes> {
    const account = await actorContext.genxAccount();
    const result = await account.getAlwaysBuyItems();
    return result.map(item => ({
      typeId: item.typeId,
      typeName: this.sdeData.types[item.typeId].name,
    }));
  }

  /** Updates Always-Buy items of the account. */
  public async genUpdate(
    actorContext: ActorContext,
    typeIds: number[],
  ): Promise<AlwaysBuyItemsRes> {
    const account = await actorContext.genxAccount();

    // Delete current data
    await AlwaysBuyItem.destroy({
      where: {
        accountId: account.id,
      },
    });

    // Recreate new data
    const result = await AlwaysBuyItem.bulkCreate(
      typeIds.map(typeId => ({ accountId: account.id, typeId })),
    );

    return result.map(i => ({
      typeId: i.typeId,
      typeName: this.sdeData.types[i.typeId].name,
    }));
  }
}