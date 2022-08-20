import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import { uniq } from 'underscore';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { mapify } from '../lib/util';
import EveQueryService from './EveQueryService';
import SequelizeQueryService from './SequelizeQueryService';
import { EveAsset } from '../types/EsiQuery';

@Service()
export default class AssetsService {

  private static readonly SHIP_CAT = 6;

  constructor(
    private readonly sequelizeQuery: SequelizeQueryService,
    private readonly eveQuery: EveQueryService,
  ) { }

  // TODO finish this
  // TODO use assetNames to figure out container and ship names
  public async getData(token: Token, assets: EveAsset[]) {
    console.log('Assets count: ', assets.length);

    const typeIds = assets.map(a => a.type_id);
    const types = await this.sequelizeQuery.genEveTypes(typeIds);

    const groupIds = Object.values(types).map(t => t.group_id);
    const groups = await this.sequelizeQuery.genEveGroups(groupIds);

    const categoryIds = Object.values(groups).map(g => g.category_id);

    const typeCategory = Object.entries(types).map(
      (t: any[]) => ({
        item_id: t[0],
        category_id: groups[t[1].group_id].category_id
      }),
    );
    const typeCategoryMap = mapify(typeCategory, 'item_id');

    // ******************
    const assetMap = mapify(assets, 'item_id');
    // const parents = assets.map(asset => {
    //   const parent = assetMap[asset.location_id] ?? asset;
    //   return parent;
    // });
    // *******************

    const assetNames = await this.eveQuery.genAllAssetNames(
      token,
      GlobalMemory.characterId!,
      assets.map(a => a.item_id),
    );

    const uniqueLocationIds = uniq(assets.map(a => a.location_id));
    const stationNames =
      await this.eveQuery.genAllStationNames(token, uniqueLocationIds);

    const output = assets.map(asset => ({
      name: types[asset.type_id].name,
      quantity: asset.quantity,
      container_name: assetNames[asset.item_id]?.name,
      location: stationNames[asset.location_id],
      location_id: asset.location_id,
      item_id: asset.item_id,
      location_flag: asset.location_flag,
      location_type: asset.location_type,
      category_id: typeCategoryMap[asset.type_id].category_id,
      parent: assetMap[asset.location_id],
    }));
    return output.filter(a =>
      a.parent
        ? typeCategoryMap[a.parent.type_id].category_id !== AssetsService.SHIP_CAT
        : true
    );
    // return output;
  }
}