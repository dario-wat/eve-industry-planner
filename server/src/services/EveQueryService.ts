import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { chunk, range, uniq, zip } from 'underscore'
import EsiQueryService from './EsiQueryService';
import { filterNullOrUndef, mapify } from '../lib/util';
import { EveAsset, EveAssetName } from '../types/EsiQuery';

@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiQueryService,
  ) { }

  // Figures out the name of either station or structure
  public async genStationName(
    token: Token,
    stationId: number,
  ): Promise<string | undefined> {
    const [structure, station] = await Promise.all([
      this.esiQuery.genStructure(token, stationId),
      this.esiQuery.genStation(token, stationId),
    ]);
    return structure?.name ?? station?.name;
  }

  public async genAllStationNames(
    token: Token,
    stationIds: number[],
  ): Promise<{ [key: number]: string | undefined }> {
    const uniqueStationIds = uniq(stationIds);
    const stationNames = await Promise.all(uniqueStationIds.map(
      async stationId => this.genStationName(token, stationId),
    ));
    return Object.fromEntries(zip(uniqueStationIds, stationNames));
  }

  /* 
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
        async page => this.esiQuery.genAssets(token, characterId, page)
      ),
    );
    return filterNullOrUndef(allAssets).flat();
  }

  /*
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

    const responses = await Promise.all(chunks.map(async ch =>
      this.esiQuery.genAssetNames(token, characterId, ch),
    ));
    return mapify(filterNullOrUndef(responses.flat()), 'item_id');
  }
}