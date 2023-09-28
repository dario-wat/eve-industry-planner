import { WalletTransactionsRes } from '@internal/shared';
import ActorContext from '../../core/actor_context/ActorContext';
import { Service } from 'typedi';
import { WalletTransaction } from './WalletTransaction';
import EveQueryService from '../../core/query/EveQueryService';
import EveSdeData from '../../core/sde/EveSdeData';
import { Op } from 'sequelize';
import EsiTokenlessQueryService from '../../core/query/EsiTokenlessQueryService';

@Service()
export default class WalletService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /** Wallet transactions data for Market page. */
  public async genWalletTransactionsForPage(
    actorContext: ActorContext,
  ): Promise<WalletTransactionsRes> {
    await this.genSyncWalletTransactions(actorContext);

    const characters = await actorContext.genLinkedCharacters();

    // TODO this needs to be replaced with the new model
    // make sure to store data
    const transactionsResult = await WalletTransaction.findAll({
      where: {
        character_id: {
          [Op.in]: characters.map(character => character.characterId),
        },
      },
    });
    const transactions = transactionsResult.map(t => t.get());

    const stationNames = await this.eveQuery.genAllStationNamesForActor(
      actorContext,
      transactions.map(t => t.location_id),
    );

    return transactions
      .filter(t => t.is_personal)
      .map(t => ({
        // TODO ugly fix it
        characterName:
          characters.find(character =>
            character.characterId === t.character_id,
          )?.characterName || '',
        date: t.date,
        isBuy: t.is_buy,
        locationName: stationNames[t.location_id] ?? null,
        locationId: t.location_id,
        quantity: t.quantity,
        typeId: t.type_id,
        name: this.sdeData.types[t.type_id].name,
        categoryId: this.sdeData.categoryIdFromTypeId(t.type_id),
        unitPrice: t.unit_price,
      }));
  }

  /**
   * Queries wallet transactions from ESI for all characters linked to the
   * given actor context. Stores the transactions into the DB.
   * This is used for longer wallet transaction retention.
   */
  private async genSyncWalletTransactions(
    actorContext: ActorContext,
  ): Promise<void> {
    // TODO convert wallet transactions model
    const characters = await actorContext.genLinkedCharacters();

    // TODO use helper function
    const characterEsiTransactions = await Promise.all(characters.map(
      async character => ([
        character.characterId,
        await this.esiQuery.genxWalletTransactions(character.characterId)
      ] as const),
    ));
    const esiTransactions = characterEsiTransactions.flatMap(
      ([characterId, transactions]) =>
        transactions.map(transaction => ([characterId, transaction] as const))
    );

    // We are storing all transaction into the database for longer retention
    await WalletTransaction.bulkCreate(
      esiTransactions.map(([characterId, transaction]) => ({
        character_id: characterId,
        ...transaction,
      })),
      { ignoreDuplicates: true },
    );
  }
}