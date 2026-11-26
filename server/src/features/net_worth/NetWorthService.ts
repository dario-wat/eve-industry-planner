import { NetWorthHistoryRes } from '@internal/shared';
import { Op } from 'sequelize';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import CharacterContextService from '../character_context/CharacterContextService';
import { orderValues } from '../character_context/characterTrading';
import { NetWorthDaily } from './NetWorthDaily';

export type NetWorthSnapshotResult = {
  day: string;
  stored: { characterId: number; total: number }[];
  failed: { characterId: number; error: string }[];
  skippedLoggedOut: number[];
};

@Service()
export default class NetWorthService {

  constructor(
    private readonly characterContext: CharacterContextService,
  ) { }

  /** Characters one at a time, so the asset pages of several do not hit ESI at once. */
  public async genxSnapshotAll(): Promise<NetWorthSnapshotResult> {
    const recordedAt = new Date();
    const day = recordedAt.toISOString().slice(0, 10);
    const result: NetWorthSnapshotResult = { day, stored: [], failed: [], skippedLoggedOut: [] };
    for (const character of await EsiCharacter.findAll()) {
      if (!(await character.isLoggedIn())) {
        result.skippedLoggedOut.push(character.characterId);
        continue;
      }
      try {
        const row = await this.genxSnapshot(character, day, recordedAt);
        await NetWorthDaily.upsert(row);
        result.stored.push({
          characterId: character.characterId,
          total: row.wallet + row.buy_orders + row.sell_orders + row.assets_sell,
        });
      } catch (error) {
        console.error(`Net worth failed for ${character.characterId}`, error);
        result.failed.push({
          characterId: character.characterId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    return result;
  }

  public async genHistory(actorContext: ActorContext): Promise<NetWorthHistoryRes> {
    const characters = await actorContext.genLinkedCharacters();
    const rows = await NetWorthDaily.findAll({
      where: { character_id: { [Op.in]: characters.map((c) => c.characterId) } },
      order: [['day', 'ASC']],
    });
    return {
      characters: characters.map(({ characterId, characterName }) => ({
        characterId,
        characterName,
      })),
      days: rows.map((row) => ({
        day: row.day,
        characterId: row.character_id,
        wallet: row.wallet,
        buyOrders: row.buy_orders,
        sellOrders: row.sell_orders,
        assetsBuy: row.assets_buy,
        assetsSell: row.assets_sell,
      })),
    };
  }

  private async genxSnapshot(character: EsiCharacter, day: string, recordedAt: Date) {
    const [context, assets] = await Promise.all([
      this.characterContext.genxForCharacter(character),
      this.characterContext.genxAssetValues(character.characterId),
    ]);
    const orders = orderValues(context.orders);
    return {
      day,
      character_id: character.characterId,
      wallet: context.walletBalance,
      buy_orders: orders.buy,
      sell_orders: orders.sell,
      assets_buy: assets.buy,
      assets_sell: assets.sell,
      recorded_at: recordedAt,
    };
  }
}
