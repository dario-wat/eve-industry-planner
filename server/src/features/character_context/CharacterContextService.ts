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

  public async genxForAccount(actorContext: ActorContext): Promise<CharacterContext[]> {
    return await genQueryResultPerCharacter(
      actorContext,
      (character) => this.genxForCharacter(character),
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
}
