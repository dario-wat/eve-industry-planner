import { EveAsset, EveContract, EveMarketOrder, EveMarketOrderType, EveWalletJournalEntry } from 'types/EsiQuery';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { Service } from 'typedi';
import { range } from 'lodash';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';
import { EsiMultiPageResult } from '../../core/esi/EsiQueryService';

/**
 * Utility function that handles multi page ESI queries.
 * It will make sure that all pages are queried and full result returned.
 */
async function genxMultiPageData<T>(
  genQuery: (page: number) => Promise<EsiMultiPageResult<T>>,
): Promise<T[]> {
  const firstPageResult = await genQuery(1);
  const remainingResult = await Promise.all(
    range(2, firstPageResult.pages + 1).map(
      async page => await genQuery(page)
    ),
  );
  return [firstPageResult, ...remainingResult].map(({ data }) => data).flat();
}

/** 
 * Service class specifically for ESI queries that contain multiple pages
 * of results.
 */
@Service()
export default class EsiMultiPageQueryService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /* 
    Similar to genxAssets and genAssets, but instead it will look for multiple
    pages (page count is hardcoded for now) and combine all the results.
    This function does multiple requests.
    Returns the same type as genAssets.
  */
  public async genxAllAssets(character: EsiCharacter): Promise<EveAsset[]> {
    return await genxMultiPageData(
      async page => await this.esiQuery.genxAssets(character.characterId, page),
    );
  }

  /** Fetches all contracts for the given user. */
  public async genxAllContracts(character: EsiCharacter): Promise<EveContract[]> {
    return await genxMultiPageData(
      async page => await this.esiQuery.genxContracts(character.characterId, page),
    );
  }

  /** Fetches all wallet journal entries for the given user. */
  public async genxAllWalletJournal(
    character: EsiCharacter,
  ): Promise<EveWalletJournalEntry[]> {
    return await genxMultiPageData(
      async page => await this.esiQuery.genxWalletJournal(character.characterId, page),
    );
  }

  /** Fetches all market orders for the given region. */
  public async genxAllRegionMarketOrders(
    character: EsiCharacter,
    regionId: number,
    typeId: number,
    orderType: EveMarketOrderType = 'all',
  ): Promise<EveMarketOrder[]> {
    return await genxMultiPageData(
      async page => await this.esiQuery.genxRegionMarketOrders(
        character.characterId,
        regionId,
        typeId,
        orderType,
        page,
      ),
    );
  }

  /** Fetches all market orders for the given structure. */
  public async genxAllStructureMarketOrders(
    character: EsiCharacter,
    structureId: number,
  ): Promise<EveMarketOrder[]> {
    return await genxMultiPageData(
      async page => await this.esiQuery.genxStructureMarketOrders(
        character.characterId, 
        structureId, 
        page,
      ),
    );
  }

  /** Fetches all market orders for the given structure. */
  public async genAllStructureMarketOrders(
    character: EsiCharacter,
    structureId: number,
  ): Promise<EveMarketOrder[] | null> {
    try {
      return await this.genxAllStructureMarketOrders(character, structureId);
    } catch {
      return null;
    }
  }
}