import { Service } from 'typedi';
import { chunk, range, uniq, zip } from 'underscore'
import { hoursToSeconds } from 'date-fns';
import { mapify } from '../../lib/util';
import { EveAsset, EveName } from '../../types/EsiQuery';
import EveSdeData from '../../core/sde/EveSdeData';
import { EsiCacheItem, genQueryEsiCache } from '../../core/esi_cache/EsiCacheAction';
import { filterNullOrUndef } from '@internal/shared';
import EsiSequelizeProvider from '../../core/esi/EsiSequelizeProvider';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';

// TODO(EIP-16) swallowing exceptions here
@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
  ) { }

  public async genStationName(
    characterId: number,
    stationId: number,
  ): Promise<string | null> {
    const sdeStation = this.sdeData.stations[stationId];
    if (sdeStation) {
      return sdeStation.name;
    }

    return await genQueryEsiCache(
      stationId.toString(),
      EsiCacheItem.STRUCTURE,
      hoursToSeconds(24),
      async () => {
        const structure = await this.esiQuery.genStructure(
          characterId,
          stationId,
        );
        return structure?.name ?? null;
      },
    );
  }

  public async genAllStationNames(
    characterId: number,
    stationIds: number[],
  ): Promise<{ [key: number]: string | null }> {
    const uniqueStationIds = uniq(stationIds);
    const stationNames = await Promise.all(uniqueStationIds.map(
      stationId => this.genStationName(characterId, stationId),
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
  public async genAllAssets(characterId: number): Promise<EveAsset[]> {
    const pageCount = 5;
    const allAssets = await Promise.all(
      range(1, pageCount + 1).map(
        page => this.esiQuery.genAssets(characterId, page),
      ),
    );
    return filterNullOrUndef(allAssets).flat();
  }

  public async genAllNames(
    characterId: number,
    ids: number[],
  ): Promise<{ [key: number]: EveName }> {
    const chunkSize = 1000;
    const uniqueIds = uniq(ids).filter(id => id !== 0);
    const chunks = chunk(uniqueIds, chunkSize);

    const responses = await Promise.all(chunks.map(
      ch => this.esiQuery.genxNames(characterId, ch),
    ));
    return mapify(filterNullOrUndef(responses.flat()), 'id');
  }
}