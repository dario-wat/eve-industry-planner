import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { chunk, range, uniq, zip } from 'underscore'
import { hoursToSeconds } from 'date-fns';
import EsiQueryService from './EsiQueryService';
import { mapify } from '../../lib/util';
import { EveAsset, EveAssetName, EveName } from '../../types/EsiQuery';
import EveSdeData from './EveSdeData';
import { EsiCacheItem, EsiCacheAction } from '../foundation/EsiCacheAction';
import { filterNullOrUndef } from '@internal/shared';

// TODO(EIP-16) swallowing exceptions here
@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly sdeData: EveSdeData,
  ) { }

  public async genStationName(
    token: Token,
    stationId: number,
  ): Promise<string | null> {
    const sdeStation = this.sdeData.stations[stationId];
    if (sdeStation) {
      return sdeStation.name;
    }

    return await EsiCacheAction.gen(
      stationId.toString(),
      EsiCacheItem.STRUCTURE,
      hoursToSeconds(24),
      async () => {
        const structure = await this.esiQuery.genStructure(token, stationId);
        return structure?.name ?? null;
      },
    );
  }

  public async genAllStationNames(
    token: Token,
    stationIds: number[],
  ): Promise<{ [key: number]: string | null }> {
    const uniqueStationIds = uniq(stationIds);
    const stationNames = await Promise.all(uniqueStationIds.map(
      stationId => this.genStationName(token, stationId),
    ));
    return Object.fromEntries(zip(uniqueStationIds, stationNames));
  }

  /* 
    TODO(EIP-16) this can throw exceptions
    
    Similar to genxAssets and genAssets, but instead it will look for multiple
    pages (page count is hardcoded for now) and combine all the results.
    This function does multiple requests.
    Returns the same type as genAssets.
  */
  public async genAllAssets(
    token: Token,
    characterId: number,
  ): Promise<EveAsset[]> {
    const pageCount = 5;
    const allAssets = await Promise.all(
      range(1, pageCount + 1).map(
        page => this.esiQuery.genAssets(token, characterId, page)
      ),
    );
    return filterNullOrUndef(allAssets).flat();
  }

  /*
    TODO(EIP-16) this can throw exceptions

    Similer to genAssetNames, but it will instead do multiple
    requests to query all assets.
  */
  public async genAllAssetNames(
    token: Token,
    characterId: number,
    itemIds: number[],  // unlimited element count
  ): Promise<{ [key: number]: EveAssetName }> {
    const chunkSize = 1000;
    const chunks = chunk(uniq(itemIds), chunkSize);

    const responses = await Promise.all(chunks.map(
      ch => this.esiQuery.genAssetNames(token, characterId, ch),
    ));
    return mapify(filterNullOrUndef(responses.flat()), 'item_id');
  }

  public async genAllNames(
    token: Token,
    ids: number[],
  ): Promise<{ [key: number]: EveName }> {
    const chunkSize = 1000;
    const uniqueIds = uniq(ids).filter(id => id !== 0);
    const chunks = chunk(uniqueIds, chunkSize);

    const responses = await Promise.all(chunks.map(
      ch => this.esiQuery.genxNames(token, ch),
    ));
    return mapify(filterNullOrUndef(responses.flat()), 'id');
  }
}