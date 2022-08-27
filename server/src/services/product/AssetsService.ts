import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { uniq } from 'underscore';
import { mapify } from '../../lib/util';
import EveQueryService from '../query/EveQueryService';
import { EveAsset } from '../../types/EsiQuery';
import { EveSdeQuery } from '../../lib/EveSdeQuery';
import { EveAssetsRes } from '../../../../src/types/types';

const SHIP_CAT = 6;

// It's important to note that this service queries all assets except
// the ones located inside ships
//
// TODO(EIP-14)
// This works when the number of stations/structures is small. The problem
// is that genStationName throws a lot of errors and the app gets error
// limited on ESI server. This needs to be fixed.
@Service()
export default class AssetsService {

  constructor(
    private readonly eveQuery: EveQueryService,
  ) { }

  // TODO(EIP-13) Assets should be cached
  public async getData(
    token: Token,
    assets: EveAsset[],
  ): Promise<EveAssetsRes> {
    // 1. Mapping data preparation

    // TODO(EIP-15) use sequelize join to combine the two below
    const typeIds = assets.map(a => a.type_id);
    const types = await EveSdeQuery.genEveTypes(typeIds);

    const groupIds = Object.values(types).map(t => t.group_id);
    const groups = await EveSdeQuery.genEveGroups(groupIds);

    const typeCategory = Object.entries(types).map(
      t => ({
        item_id: t[0],
        category_id: groups[t[1].group_id].category_id
      }),
    );
    const typeCategoryMap = mapify(typeCategory, 'item_id');

    // 2. Filtering down

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
        || (o.parent && typeCategoryMap[o.parent.type_id].category_id === SHIP_CAT)
        // Has a parent (container), but parent also has a parent (ship)
        // (inside a container inside a ship)
        || (o.parent && assetMap[o.parent.location_id] !== undefined)
      ))
      .map(o => ({
        name: types[o.asset.type_id] && types[o.asset.type_id].name,
        type_id: o.asset.type_id,
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