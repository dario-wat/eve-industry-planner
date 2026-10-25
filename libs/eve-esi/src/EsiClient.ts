import { EsiAuth } from './auth.js';
import { EsiConfigError } from './errors.js';
import { fetchAllPages } from './pages.js';
import {
  DEFAULT_ESI_BASE_URL,
  esiRequest,
  esiRequestPage,
  type EsiRequestContext,
  type EsiRequestOptions,
} from './request.js';
import { TokenManager } from './tokenManager.js';
import type {
  EsiAsset,
  EsiAssetName,
  EsiConstellation,
  EsiContract,
  EsiIndustryJob,
  EsiMarketHistory,
  EsiMarketOrder,
  EsiMarketOrderType,
  EsiName,
  EsiPage,
  EsiPortrait,
  EsiSolarSystem,
  EsiSsoConfig,
  EsiStation,
  EsiStructure,
  EsiTokenHooks,
  EsiWalletJournalEntry,
  EsiWalletTransaction,
} from './types.js';

export interface EsiClientOptions {
  /** Sent on every request. CCP uses it to contact the developer. */
  userAgent: string;
  /** Needed for `esi.auth` and for every logged-in endpoint. */
  sso?: EsiSsoConfig;
  /** Needed for every logged-in endpoint. See EsiTokenHooks. */
  tokens?: EsiTokenHooks;
  /** Defaults to https://esi.evetech.net/latest */
  baseUrl?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export interface EsiGetAllOptions {
  /** Pages fetched at once after the first. Defaults to 10. */
  concurrency?: number;
}

export interface EsiRegionMarketOrdersOptions {
  typeId?: number;
  /** Defaults to 'all'. */
  orderType?: EsiMarketOrderType;
  /** Defaults to 1. */
  page?: number;
}

/**
 * ESI client. Every method returns ESI's JSON as-is and throws on failure
 * (EsiError for ESI responses). Methods that need a login take the
 * character ID first and get the token through `tokens.load` / `tokens.save`.
 *
 * Paged endpoints come in two forms: `getX(..., page)` returns one
 * EsiPage, and `getAllX(...)` fetches every page.
 */
export class EsiClient {
  readonly #context: EsiRequestContext;
  readonly #auth: EsiAuth | null;
  readonly #tokenManager: TokenManager | null;

  constructor(options: EsiClientOptions) {
    if (options.userAgent.trim() === '') {
      throw new EsiConfigError('EsiClient needs a non-empty userAgent');
    }
    this.#context = {
      baseUrl: options.baseUrl ?? DEFAULT_ESI_BASE_URL,
      userAgent: options.userAgent,
      fetch: options.fetch,
    };
    this.#auth = options.sso === undefined
      ? null
      : new EsiAuth({ sso: options.sso, userAgent: options.userAgent, fetch: options.fetch });
    this.#tokenManager = this.#auth !== null && options.tokens !== undefined
      ? new TokenManager(this.#auth, options.tokens)
      : null;
  }

  /** Login URL, code exchange and token refresh. Needs the `sso` option. */
  get auth(): EsiAuth {
    if (this.#auth === null) {
      throw new EsiConfigError('esi.auth needs the `sso` option on EsiClient');
    }
    return this.#auth;
  }

  // ---------------------------------------------------------------------
  // Characters
  // ---------------------------------------------------------------------

  /** Needs esi-industry.read_character_jobs.v1 */
  getIndustryJobs(
    characterId: number,
    options: { includeCompleted?: boolean } = {},
  ): Promise<EsiIndustryJob[]> {
    return this.#getAs<EsiIndustryJob[]>(characterId, `/characters/${characterId}/industry/jobs/`, {
      query: { include_completed: options.includeCompleted ?? false },
    });
  }

  /** One page of assets. Needs esi-assets.read_assets.v1 */
  getAssets(characterId: number, page: number = 1): Promise<EsiPage<EsiAsset>> {
    return this.#getPageAs<EsiAsset>(characterId, `/characters/${characterId}/assets/`, {
      query: { page },
    });
  }

  /** Every page of assets. */
  getAllAssets(characterId: number, options: EsiGetAllOptions = {}): Promise<EsiAsset[]> {
    return fetchAllPages((page) => this.getAssets(characterId, page), options.concurrency);
  }

  /**
   * Names of named items (ships, containers). `itemIds` can hold at most
   * 1000 IDs. Needs esi-assets.read_assets.v1
   */
  getAssetNames(characterId: number, itemIds: number[]): Promise<EsiAssetName[]> {
    return this.#getAs<EsiAssetName[]>(characterId, `/characters/${characterId}/assets/names/`, {
      method: 'POST',
      body: itemIds,
    });
  }

  /** One page of contracts. Needs esi-contracts.read_character_contracts.v1 */
  getContracts(characterId: number, page: number = 1): Promise<EsiPage<EsiContract>> {
    return this.#getPageAs<EsiContract>(characterId, `/characters/${characterId}/contracts/`, {
      query: { page },
    });
  }

  /** Every page of contracts. */
  getAllContracts(characterId: number, options: EsiGetAllOptions = {}): Promise<EsiContract[]> {
    return fetchAllPages((page) => this.getContracts(characterId, page), options.concurrency);
  }

  /** Needs esi-wallet.read_character_wallet.v1 */
  getWalletTransactions(characterId: number): Promise<EsiWalletTransaction[]> {
    return this.#getAs<EsiWalletTransaction[]>(
      characterId,
      `/characters/${characterId}/wallet/transactions/`,
    );
  }

  /** One page of the wallet journal. Needs esi-wallet.read_character_wallet.v1 */
  getWalletJournal(
    characterId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiWalletJournalEntry>> {
    return this.#getPageAs<EsiWalletJournalEntry>(
      characterId,
      `/characters/${characterId}/wallet/journal/`,
      { query: { page } },
    );
  }

  /** Every page of the wallet journal. */
  getAllWalletJournal(
    characterId: number,
    options: EsiGetAllOptions = {},
  ): Promise<EsiWalletJournalEntry[]> {
    return fetchAllPages((page) => this.getWalletJournal(characterId, page), options.concurrency);
  }

  /** Open orders of the character. Needs esi-markets.read_character_orders.v1 */
  getCharacterMarketOrders(characterId: number): Promise<EsiMarketOrder[]> {
    return this.#getAs<EsiMarketOrder[]>(characterId, `/characters/${characterId}/orders/`);
  }

  /** Public. */
  async getPortrait(characterId: number): Promise<EsiPortrait> {
    return (await esiRequest<EsiPortrait>(
      this.#context,
      `/characters/${characterId}/portrait/`,
    )).data;
  }

  // ---------------------------------------------------------------------
  // Universe
  // ---------------------------------------------------------------------

  /**
   * Player structure. Only works if the character has docking access.
   * Needs esi-universe.read_structures.v1
   */
  getStructure(characterId: number, structureId: number): Promise<EsiStructure> {
    return this.#getAs<EsiStructure>(characterId, `/universe/structures/${structureId}/`);
  }

  /** NPC station. Public. */
  async getStation(stationId: number): Promise<EsiStation> {
    return (await esiRequest<EsiStation>(this.#context, `/universe/stations/${stationId}/`)).data;
  }

  /** Public. */
  async getSolarSystem(systemId: number): Promise<EsiSolarSystem> {
    return (await esiRequest<EsiSolarSystem>(this.#context, `/universe/systems/${systemId}`)).data;
  }

  /** Public. */
  async getConstellation(constellationId: number): Promise<EsiConstellation> {
    return (await esiRequest<EsiConstellation>(
      this.#context,
      `/universe/constellations/${constellationId}`,
    )).data;
  }

  /**
   * Names for IDs of anything that has one (character, corporation, ...).
   * Public. ESI rejects more than 1000 IDs and duplicate IDs, and this
   * method does not fix either.
   */
  async getNames(ids: number[]): Promise<EsiName[]> {
    return (await esiRequest<EsiName[]>(this.#context, '/universe/names/', {
      method: 'POST',
      body: ids,
    })).data;
  }

  // ---------------------------------------------------------------------
  // Market
  // ---------------------------------------------------------------------

  /** One page of public orders in a region. Public. */
  getRegionMarketOrders(
    regionId: number,
    options: EsiRegionMarketOrdersOptions = {},
  ): Promise<EsiPage<EsiMarketOrder>> {
    return esiRequestPage<EsiMarketOrder>(this.#context, `/markets/${regionId}/orders/`, {
      query: {
        page: options.page ?? 1,
        order_type: options.orderType ?? 'all',
        type_id: options.typeId,
      },
    });
  }

  /** Every page of public orders in a region. Without `typeId` this is a lot of pages. */
  getAllRegionMarketOrders(
    regionId: number,
    options: Omit<EsiRegionMarketOrdersOptions, 'page'> & EsiGetAllOptions = {},
  ): Promise<EsiMarketOrder[]> {
    const { concurrency, ...filter } = options;
    return fetchAllPages(
      (page) => this.getRegionMarketOrders(regionId, { ...filter, page }),
      concurrency,
    );
  }

  /** One page of orders in a structure. Needs esi-markets.structure_markets.v1 */
  getStructureMarketOrders(
    characterId: number,
    structureId: number,
    page: number = 1,
  ): Promise<EsiPage<EsiMarketOrder>> {
    return this.#getPageAs<EsiMarketOrder>(characterId, `/markets/structures/${structureId}/`, {
      query: { page },
    });
  }

  /** Every page of orders in a structure. */
  getAllStructureMarketOrders(
    characterId: number,
    structureId: number,
    options: EsiGetAllOptions = {},
  ): Promise<EsiMarketOrder[]> {
    return fetchAllPages(
      (page) => this.getStructureMarketOrders(characterId, structureId, page),
      options.concurrency,
    );
  }

  /** Daily history of one type in a region. Public. */
  async getRegionMarketHistory(regionId: number, typeId: number): Promise<EsiMarketHistory[]> {
    return (await esiRequest<EsiMarketHistory[]>(this.#context, `/markets/${regionId}/history/`, {
      query: { type_id: typeId },
    })).data;
  }

  // ---------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------

  async #accessToken(characterId: number): Promise<string> {
    if (this.#tokenManager === null) {
      throw new EsiConfigError(
        'Logged-in endpoints need both the `sso` and `tokens` options on EsiClient',
      );
    }
    return await this.#tokenManager.getAccessToken(characterId);
  }

  async #getAs<T>(
    characterId: number,
    path: string,
    options: EsiRequestOptions = {},
  ): Promise<T> {
    const accessToken = await this.#accessToken(characterId);
    return (await esiRequest<T>(this.#context, path, { ...options, accessToken })).data;
  }

  async #getPageAs<T>(
    characterId: number,
    path: string,
    options: EsiRequestOptions = {},
  ): Promise<EsiPage<T>> {
    const accessToken = await this.#accessToken(characterId);
    return await esiRequestPage<T>(this.#context, path, { ...options, accessToken });
  }
}
