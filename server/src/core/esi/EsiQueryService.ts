import type {
  EsiAsset,
  EsiAssetName,
  EsiClient,
  EsiConstellation,
  EsiContract,
  EsiGetAllOptions,
  EsiIndustryJob,
  EsiMarketHistory,
  EsiMarketOrder,
  EsiName,
  EsiPage,
  EsiPortrait,
  EsiRegionMarketOrdersOptions,
  EsiSolarSystem,
  EsiStation,
  EsiStructure,
  EsiWalletJournalEntry,
  EsiWalletTransaction,
} from 'eve-esi';
import { Service } from 'typedi';
import EsiClientService from './EsiClientService';

/**
 * The app's ESI queries. Each method is one eve-esi call, and they all throw
 * on failure (EsiError and friends), so every method is `genx*`. Callers that
 * want "null when it fails" catch the error themselves.
 *
 * Logged-in queries take the character ID: the library gets and refreshes the
 * token through EsiTokenStore. Paged endpoints come as `genxX(page)` for a
 * single page and `genxAllX` for every page.
 *
 * For anything more complex (caching, combining, formatting) see
 * EveQueryService.
 */
@Service()
export default class EsiQueryService {

  constructor(
    private readonly esiClientService: EsiClientService,
  ) { }

  private get esi(): EsiClient {
    return this.esiClientService.get();
  }

  // Characters

  public async genxIndustryJobs(
    characterId: number,
    includeCompleted: boolean = false,
  ): Promise<EsiIndustryJob[]> {
    return await this.esi.getIndustryJobs(characterId, { includeCompleted });
  }

  public async genxAssets(
    characterId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiAsset>> {
    return await this.esi.getAssets(characterId, page);
  }

  public async genxAllAssets(
    characterId: number,
    options?: EsiGetAllOptions,
  ): Promise<EsiAsset[]> {
    return await this.esi.getAllAssets(characterId, options);
  }

  /** At most 1000 item IDs. */
  public async genxAssetNames(
    characterId: number,
    itemIds: number[],
  ): Promise<EsiAssetName[]> {
    return await this.esi.getAssetNames(characterId, itemIds);
  }

  public async genxContracts(
    characterId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiContract>> {
    return await this.esi.getContracts(characterId, page);
  }

  public async genxAllContracts(
    characterId: number,
    options?: EsiGetAllOptions,
  ): Promise<EsiContract[]> {
    return await this.esi.getAllContracts(characterId, options);
  }

  public async genxWalletTransactions(
    characterId: number,
  ): Promise<EsiWalletTransaction[]> {
    return await this.esi.getWalletTransactions(characterId);
  }

  public async genxWalletJournal(
    characterId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiWalletJournalEntry>> {
    return await this.esi.getWalletJournal(characterId, page);
  }

  public async genxAllWalletJournal(
    characterId: number,
    options?: EsiGetAllOptions,
  ): Promise<EsiWalletJournalEntry[]> {
    return await this.esi.getAllWalletJournal(characterId, options);
  }

  public async genxCharacterMarketOrders(
    characterId: number,
  ): Promise<EsiMarketOrder[]> {
    return await this.esi.getCharacterMarketOrders(characterId);
  }

  public async genxPortrait(characterId: number): Promise<EsiPortrait> {
    return await this.esi.getPortrait(characterId);
  }

  // Universe

  /** Only works if the character has docking access to the structure. */
  public async genxStructure(
    characterId: number,
    structureId: number,
  ): Promise<EsiStructure> {
    return await this.esi.getStructure(characterId, structureId);
  }

  public async genxStation(stationId: number): Promise<EsiStation> {
    return await this.esi.getStation(stationId);
  }

  public async genxSolarSystem(systemId: number): Promise<EsiSolarSystem> {
    return await this.esi.getSolarSystem(systemId);
  }

  public async genxConstellation(
    constellationId: number,
  ): Promise<EsiConstellation> {
    return await this.esi.getConstellation(constellationId);
  }

  /**
   * Note: try not to use this function directly since it doesn't sanitize the
   * input. ESI rejects duplicate IDs and more than 1000 IDs. EveQueryService
   * has a version that handles both.
   */
  public async genxNames(ids: number[]): Promise<EsiName[]> {
    return await this.esi.getNames(ids);
  }

  // Market

  public async genxRegionMarketOrders(
    regionId: number,
    options?: EsiRegionMarketOrdersOptions,
  ): Promise<EsiPage<EsiMarketOrder>> {
    return await this.esi.getRegionMarketOrders(regionId, options);
  }

  public async genxAllRegionMarketOrders(
    regionId: number,
    options?: Omit<EsiRegionMarketOrdersOptions, 'page'> & EsiGetAllOptions,
  ): Promise<EsiMarketOrder[]> {
    return await this.esi.getAllRegionMarketOrders(regionId, options);
  }

  public async genxStructureMarketOrders(
    characterId: number,
    structureId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiMarketOrder>> {
    return await this.esi.getStructureMarketOrders(characterId, structureId, page);
  }

  public async genxAllStructureMarketOrders(
    characterId: number,
    structureId: number,
    options?: EsiGetAllOptions,
  ): Promise<EsiMarketOrder[]> {
    return await this.esi.getAllStructureMarketOrders(characterId, structureId, options);
  }

  public async genxRegionMarketHistory(
    regionId: number,
    typeId: number,
  ): Promise<EsiMarketHistory[]> {
    return await this.esi.getRegionMarketHistory(regionId, typeId);
  }
}
