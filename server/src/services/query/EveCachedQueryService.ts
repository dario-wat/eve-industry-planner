import { hoursToSeconds } from 'date-fns';
import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { EveAsset } from 'types/EsiQuery';
import { EsiCacheItem, EsiCacheUtil } from '../foundation/EsiCacheUtil';
import EveQueryService from './EveQueryService';

@Service()
export default class EveCachedQueryService {

  constructor(
    private readonly eveQuery: EveQueryService,
  ) { }

  public async genAllAssets(
    token: Token,
    characterId: number,
  ): Promise<EveAsset[]> {
    const item = EsiCacheItem.ASSETS;
    const interval = hoursToSeconds(6);

    const cachedData = await EsiCacheUtil.genQuery(characterId, item);
    if (cachedData !== null) {
      return JSON.parse(cachedData);
    }

    const data = await this.eveQuery.genAllAssets(token, characterId);
    // TODO this doesn't have to be blocking so maybe I should remove await
    await EsiCacheUtil.genAdd(
      characterId,
      item,
      interval,
      JSON.stringify(data),
    );

    return data;
  }
}