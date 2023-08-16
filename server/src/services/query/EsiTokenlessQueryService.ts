import { Service } from 'typedi';
import {
  EveAsset,
  EveContract,
  EveIndustryJob,
  EveMarketOrder,
  EveName,
  EvePortrait,
  EveStructure,
  EveWalletTransaction,
} from '../../types/EsiQuery';
import EsiSequelizeProvider from '../../core/esi/EsiSequelizeProvider';
import EsiQueryService from '../../core/esi/EsiQueryService';

// TODO this should not exist, or maybe it should idk
// either way we should be using some kind of ActorContext
@Service()
export default class EsiTokenlessQueryService {

  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
  ) { }

  public async genxIndustryJobs(
    characterId: number,
  ): Promise<EveIndustryJob[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxIndustryJobs(
      token,
      characterId,
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

  public async genxMarketOrders(
    characterId: number,
  ): Promise<EveMarketOrder[]> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    return await this.esiQuery.genxMarketOrders(token, characterId);
  }
}
