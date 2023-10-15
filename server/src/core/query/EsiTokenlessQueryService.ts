import { Service } from 'typedi';
import {
  EveAsset,
  EveContract,
  EveIndustryJob,
  EveMarketOrder,
  EveMarketOrderType,
  EveName,
  EvePortrait,
  EveStructure,
  EveWalletTransaction,
} from '../../types/EsiQuery';
import EsiSequelizeProvider from '../esi/EsiSequelizeProvider';
import EsiQueryService from '../esi/EsiQueryService';

/**
 * This is a token-agnostic version of ESI queries. Instead of fetching
 * ESI token each time we perform queries, instead we use these helper
 * functions that will query the token themselves.
 */
@Service()
export default class EsiTokenlessQueryService {

  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
  ) { }

  public async genxIndustryJobs(
    characterId: number,
    includeCompleted: boolean = false,
  ): Promise<EveIndustryJob[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxIndustryJobs(
      token,
      characterId,
      includeCompleted,
    );
  }

  public async genxPortrait(characterId: number): Promise<EvePortrait> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxPortrait(token, characterId);
  }

  public async genxContracts(
    characterId: number,
    page: number = 1,
  ): Promise<EveContract[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxContracts(token, characterId, page);
  }

  public async genxNames(
    characterId: number,
    ids: number[],
  ): Promise<EveName[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxNames(token, ids);
  }

  public async genAssets(
    characterId: number,
    page: number = 1,
  ): Promise<EveAsset[] | null> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genAssets(token, characterId, page);
  }

  public async genStructure(
    characterId: number,
    structureId: number,
  ): Promise<EveStructure | null> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genStructure(token, structureId);
  }

  public async genxWalletTransactions(
    characterId: number,
  ): Promise<EveWalletTransaction[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxWalletTransactions(token, characterId);
  }

  public async genxCharacterMarketOrders(
    characterId: number,
  ): Promise<EveMarketOrder[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxCharacterMarketOrders(token, characterId);
  }

  public async genxRegionMarketOrders(
    characterId: number,
    regionId: number,
    typeId: number,
    orderType: EveMarketOrderType = 'all',
    page: number = 1,
  ): Promise<EveMarketOrder[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxRegionMarketOrders(
      token,
      regionId,
      typeId,
      orderType,
      page,
    );
  }
}
