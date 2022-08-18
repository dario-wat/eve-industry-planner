import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { zip } from 'underscore'
import EsiQueryService from './EsiQueryService';
import { chunkify, mapify } from '../lib/util';

@Service()
export default class EveQueryService {

  constructor(
    private readonly esiQuery: EsiQueryService,
  ) { }

  // Figures out the name of either station or structure
  public async genStationName(token: Token, stationId: number) {
    const [structure, station] = await Promise.all([
      this.esiQuery.genStructure(token, stationId),
      this.esiQuery.genStation(token, stationId),
    ]);
    return structure?.name ?? station?.name;
  }

  public async genAllStationNames(token: Token, stationIds: number[]) {
    const uniqueStationIds = [...new Set(stationIds)];
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
  ) {
    const pageCount = 5;
    const allAssets = await Promise.all(
      [...Array(pageCount).keys()].map(
        async page => this.esiQuery.genAssets(token, characterId, page + 1)
      ),
    );
    return allAssets.filter(arr => arr !== null).flat();
  }

  /*
    Similer to genAssetNames, but it will instead do multiple
    requests to query all assets.
    Mapped response:
    {
      { '360052160': 'I do shit' },
      { '945371609': '[B] Originals' },
      { '962104165': '[B] Copies' },
      { '1086967686': "Daki Razarac's Zephyr" },
      { '1702215246': 'Pac-Man' },
    }
  */
  public async genAllAssetNames(
    token: Token,
    characterId: number,
    itemIds: number[],  // unlimited element count
  ) {
    const chunkSize = 1000;
    const uniqueItemIds = [...new Set(itemIds)];

    const chunks = chunkify(uniqueItemIds, chunkSize);

    const responses = await Promise.all(chunks.map(async (chunk) =>
      this.esiQuery.genAssetNames(token, characterId, chunk),
    ));
    return mapify(responses.flat(), 'item_id');
  }
}