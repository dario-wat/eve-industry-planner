import { Service } from 'typedi';
import {
  EveAsset,
  EveConstellation,
  EveContract,
  EveIndustryJob,
  EveMarketHistory,
  EveMarketOrder,
  EveMarketOrderType,
  EveName,
  EvePortrait,
  EveSolarSystem,
  EveStructure,
  EveWalletJournalEntry,
  EveWalletTransaction,
} from '../../types/EsiQuery';
import EsiSequelizeProvider from '../esi/EsiSequelizeProvider';
import EsiQueryService, { EsiMultiPageResult } from '../esi/EsiQueryService';

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

  public async genPortrait(characterId: number): Promise<EvePortrait | null> {
    try {
      return await this.genxPortrait(characterId);
    } catch {
      return null;
    }
  }

  public async genxContracts(
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveContract>> {
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

  public async genxAssets(
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveAsset>> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxAssets(token, characterId, page);
  }

  public async genStructure(
    characterId: number,
    structureId: number,
  ): Promise<EveStructure | null> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genStructure(token, structureId);
  }

  public async genxSolarSystem(
    characterId: number,
    systemId: number,
  ): Promise<EveSolarSystem> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxSolarSystem(token, systemId);
  }

  public async genxConstellation(
    characterId: number,
    constellationId: number,
  ): Promise<EveConstellation> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxConstellation(token, constellationId);
  }

  public async genxWalletTransactions(
    characterId: number,
  ): Promise<EveWalletTransaction[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxWalletTransactions(token, characterId);
  }

  public async genWalletTransactions(
    characterId: number,
  ): Promise<EveWalletTransaction[] | null> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genWalletTransactions(token, characterId);
  }

  public async genxWalletJournal(
    characterId: number,
    page: number = 1,
  ): Promise<EsiMultiPageResult<EveWalletJournalEntry>> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxWalletJournal(token, characterId, page);
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
  ): Promise<EsiMultiPageResult<EveMarketOrder>> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxRegionMarketOrders(
      token,
      regionId,
      typeId,
      orderType,
      page,
    );
  }

  public async genxRegionMarketHistory(
    characterId: number,
    regionId: number,
    typeId: number,
  ): Promise<EveMarketHistory[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxRegionMarketHistory(
      token,
      regionId,
      typeId,
    );
  }

  public async genRegionMarketHistory(
    characterId: number,
    regionId: number,
    typeId: number,
  ): Promise<EveMarketHistory[] | null> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genRegionMarketHistory(
      token,
      regionId,
      typeId,
    );
  }
}
