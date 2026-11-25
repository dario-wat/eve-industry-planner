import { CharacterContextRes, CharacterSummaryRes } from '@internal/shared';
import type { EsiMarketOrder } from 'eve-esi';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import EsiQueryService from '../../core/esi/EsiQueryService';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { genQueryResultPerCharacter } from '../../lib/eveUtil';
import {
  NpcStandings,
  npcStandings,
  orderSlots,
  orderValues,
  TradeSkills,
  tradeSkills,
} from './characterTrading';

export type CharacterContext = {
  characterId: number;
  characterName: string;
  skills: TradeSkills;
  standings: NpcStandings;
  walletBalance: number;
  orderSlots: number;
  orderSlotsUsed: number;
  /** Includes orders placed for a corporation, which use the character's slots too. */
  orders: EsiMarketOrder[];
};

@Service()
export default class CharacterContextService {

  constructor(
    private readonly esiQuery: EsiQueryService,
  ) { }

  /** One character's failure does not hide the others. */
  public async genSummaries(actorContext: ActorContext): Promise<CharacterContextRes> {
    return await genQueryResultPerCharacter(
      actorContext,
      (character) => this.genSummary(character),
    );
  }

  public async genxForCharacter(character: EsiCharacter): Promise<CharacterContext> {
    const { characterId, characterName } = character;
    const [{ skills }, standings, walletBalance, orders] = await Promise.all([
      this.esiQuery.genxSkills(characterId),
      this.esiQuery.genxStandings(characterId),
      this.esiQuery.genxWalletBalance(characterId),
      this.esiQuery.genxCharacterMarketOrders(characterId),
    ]);
    return {
      characterId,
      characterName,
      skills: tradeSkills(skills),
      standings: npcStandings(standings),
      walletBalance,
      orderSlots: orderSlots(skills),
      orderSlotsUsed: orders.length,
      orders,
    };
  }

  private async genSummary(character: EsiCharacter): Promise<CharacterSummaryRes> {
    const { characterId, characterName } = character;
    try {
      const context = await this.genxForCharacter(character);
      const values = orderValues(context.orders);
      return {
        characterId,
        characterName,
        error: null,
        walletBalance: context.walletBalance,
        orderSlots: context.orderSlots,
        orderSlotsUsed: context.orderSlotsUsed,
        buyOrderValue: values.buy,
        sellOrderValue: values.sell,
      };
    } catch (error) {
      console.error(`Character context failed for ${characterId}`, error);
      return {
        characterId,
        characterName,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
