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
    const assetMap = mapify(assets, 'item_id');
    const assetsWithParent = assets.map(asset => ({
      asset,
      parent: assetMap[asset.location_id],
    }));

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

    // Filter out all assets whose parent doesn't exist. Those are root
    // assets whose location must be station/structure or similar.
    const rootLocationIds = uniq(assetsWithParent
      .filter(o => o.parent === undefined)
      .map(o => o.asset.location_id),
    );
    const stationNames =
      await this.eveQuery.genAllStationNames(token, rootLocationIds);

    // We don't care about items inside ships (fits, cargo, drones, ...)
    const nonShipAssets = assetsWithParent.filter(o =>
      o.parent
        ? typeCategoryMap[o.parent.type_id].category_id !== SHIP_CAT
        : true
    );

    // First check if the item is in the root location. If not then
    // check the parent
    const getLocationId = (o: any) =>
      (rootLocationIds.includes(o.asset.location_id) && o.asset.location_id)
      || (rootLocationIds.includes(o.parent.location_id) && o.parent.location_id)
      || null;
    return nonShipAssets.map(o => ({
      name: types[o.asset.type_id] && types[o.asset.type_id].name,
      type_id: o.asset.type_id,
      quantity: o.asset.quantity,
      location_id: getLocationId(o),
      location: getLocationId(o) && stationNames[getLocationId(o)],
    }));
  }
}