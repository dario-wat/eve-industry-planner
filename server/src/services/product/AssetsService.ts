import { Service } from 'typedi';
import { uniq } from 'underscore';
import { hoursToSeconds } from 'date-fns';
import { mapify } from '../../lib/util';
import EveQueryService from '../query/EveQueryService';
import EveSdeData from '../query/EveSdeData';
import { EsiCacheItem, EsiCacheAction } from '../foundation/EsiCacheAction';
import EsiSequelizeProvider from '../foundation/EsiSequelizeProvider';
import { EveAssetsRes } from '@internal/shared';

const SHIP_CAT = 6;

// It's important to note that this service queries all assets except
// the ones located inside ships
@Service()
export default class AssetsService {

  constructor(
    private readonly eveQuery: EveQueryService,
    private readonly sdeData: EveSdeData,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
  ) { }

  public async genData(characterId: number): Promise<EveAssetsRes> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    const assets = await EsiCacheAction.gen(
      characterId.toString(),
      EsiCacheItem.ASSETS,
      hoursToSeconds(6),
      async () => await this.eveQuery.genAllAssets(token, characterId),
    );

    const assetMap = mapify(assets, 'item_id');
    const assetsWithParent = assets.map(asset => ({
      asset,
      parent: assetMap[asset.location_id] === undefined
        ? null
        : assetMap[asset.location_id],
    }));

    // 1. Asset without parent: 
    //    either inside station, structure, pos(?), customs office(?)
    // 2. Asset with parent:
    //    inside a container, ship or container inside a ship,
    //    the last case is when the parent has its own parent
    // I want to include only items inside stations.

    // Filter out all assets whose parent doesn't exist. Those are root
    // assets whose location must be station, structure or similar.
    const rootLocationIds = uniq(assetsWithParent
      .filter(o => o.parent === null)
      .map(o => o.asset.location_id),
    );
    const stationNames =
      await this.eveQuery.genAllStationNames(token, rootLocationIds);

    return assetsWithParent
      .filter(o => !(   // NOTE, below expression is negated
        // No parent, but also not a station (pos, customs office)
        (o.parent === null && stationNames[o.asset.location_id] === undefined)
        // Has a parent, but parent is a ship (inside a ship)
        || (
          o.parent
          && this.sdeData.categoryIdFromTypeId(o.parent.type_id) === SHIP_CAT
        )
        // Has a parent (container), but parent also has a parent (ship)
        // (inside a container inside a ship)
        || (o.parent && assetMap[o.parent.location_id] !== undefined)
      ))
      .map(o => ({
        name: this.sdeData.types[o.asset.type_id]
          && this.sdeData.types[o.asset.type_id].name,
        type_id: o.asset.type_id,
        category_id: this.sdeData.categoryIdFromTypeId(o.asset.type_id),
        quantity: o.asset.quantity,
        location_id:
          (rootLocationIds.includes(o.asset.location_id) && o.asset.location_id)
          || o.parent!.location_id,
        location:
          stationNames[o.asset.location_id]
          // TODO parent should always be there
          || (o.parent && stationNames[o.parent!.location_id])!,
      }));
  }
}