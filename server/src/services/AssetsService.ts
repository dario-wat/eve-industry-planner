import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { countBy, identity, uniq } from 'underscore';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { filterNullOrUndef, mapify } from '../lib/util';
import EveQueryService from './EveQueryService';
import SequelizeQueryService from './SequelizeQueryService';
import { EveAsset } from '../types/EsiQuery';
import EsiQueryService from './EsiQueryService';

// It's important to note that this service queries all assets except
// the ones located inside ships
//
// TODO(EIP-14)
// This works when the number of stations/structures is small. The problem
// is that genStationName throws a lot of errors and the app gets error
// limited on ESI server. This needs to be fixed.
@Service()
export default class AssetsService {

  private static readonly SHIP_CAT = 6;

  constructor(
    private readonly sequelizeQuery: SequelizeQueryService,
    private readonly eveQuery: EveQueryService,
    private readonly esiQuery: EsiQueryService,
  ) { }

  // TODO(EIP-13) Assets should be cached
  public async getData(token: Token, assets: EveAsset[]) {
    console.log('Assets count: ', assets.length);

    // TODO use sequelize join to combine the two below
    const typeIds = assets.map(a => a.type_id);
    const types = await this.sequelizeQuery.genEveTypes(typeIds);

    const groupIds = Object.values(types).map(t => t.group_id);
    const groups = await this.sequelizeQuery.genEveGroups(groupIds);


    const typeCategory = Object.entries(types).map(
      (t: any[]) => ({
        item_id: t[0],
        category_id: groups[t[1].group_id].category_id
      }),
    );
    const typeCategoryMap = mapify(typeCategory, 'item_id');

    const assetMap = mapify(assets, 'item_id');

    const assetNames = await this.eveQuery.genAllAssetNames(
      token,
      GlobalMemory.characterId!,
      assets.map(a => a.item_id),
    );

    // const uniqueLocationIds = uniq(assets.map(a => a.location_id));
    // console.log(uniqueLocationIds.length);
    // const stationNames =
    //   await this.eveQuery.genAllStationNames(token, uniqueLocationIds);
    // console.log(stationNames);
    // const structureNames = await Promise.all(uniqueLocationIds.map(l =>
    //   this.esiQuery.genxStation(token, l),
    // )).catch(async e => console.log(await e.json()));
    // console.log(filterNullOrUndef(structureNames));
    // console.log(countBy(assets.map(a => a.location_type), identity))
    // console.log(countBy(assets.map(a => a.location_flag), identity))

    const assetsWithParent = assets.map(asset => ({
      name: types[asset.type_id].name,
      quantity: asset.quantity,
      container_name: assetNames[asset.item_id]?.name,
      // location: stationNames[asset.location_id],
      location_id: asset.location_id,
      item_id: asset.item_id,
      location_flag: asset.location_flag,
      location_type: asset.location_type,
      category_id: typeCategoryMap[asset.type_id].category_id,
      parent: assetMap[asset.location_id],
    }));

    const uniqueLocationIds =
      uniq(assetsWithParent.filter(a => a.parent === undefined).map(a => a.location_id));
    console.log(uniqueLocationIds.length);
    const stationNames =
      await this.eveQuery.genAllStationNames(token, uniqueLocationIds);
    console.log(stationNames);
    const nonShipAssets = assetsWithParent.filter(a =>
      a.parent
        ? typeCategoryMap[a.parent.type_id].category_id !== AssetsService.SHIP_CAT
        : true
    );
    return nonShipAssets.map(asset => ({
      name: asset.name,
      quantity: asset.quantity,
      location_id: asset.location_id,
      location_flag: asset.location_flag,
      // location1: asset.location,
      location2: (asset.parent ? stationNames[asset.parent.location_id] : 'None'),
    }));
  }
}