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

  private async genAssetStation(assets: EveAsset[], itemCatMap: any) {
    const assetMap = mapify(assets, 'item_id');
    // console.log(assetMap);
    const genOne = (a: any) => {
      const parent = assetMap[a.location_id];
      if (parent) {
        return parent;
      }
      return a;
    };
    // console.log(itemCatMap);
    const shipItems = assets.map(a => {
      const parent = genOne(a);
      // return parent.item_id;
      const parentCat = itemCatMap[parent.type_id]?.cat_id;
      return parentCat;
      // return parentCat === AssetsService.SHIP_CAT;
    });
    console.log(shipItems);
  }

  // TODO finish this
  public async getData(token: Token, assets: EveAsset[]) {
    console.log('Assets count: ', assets.length);
    const items = await this.sequelizeQuery.genEveTypes(
      assets.map(a => a.type_id),
    );
    const groupIds = Object.entries(items).map((a: any[]) => a[1].group_id);
    const groups = await this.sequelizeQuery.genEveGroups(groupIds);
    // console.log(groups);

    // const categoryIds = Object.entries(groups).map((a: any[]) => a[1].category_id);


    const itemCat = Object.entries(items).map(
      (i: any[]) => ({ item_id: i[0], cat_id: groups[i[1].group_id].category_id }),
    );
    const itemCatMap = mapify(itemCat, 'item_id');
    // console.log(itemCatMap);
    await this.genAssetStation(assets, itemCatMap);

    const assetNames = await this.eveQuery.genAllAssetNames(
      token,
      GlobalMemory.characterId!,
      assets.map(a => a.item_id),
    );

    const uniqueLocationIds = [...new Set(assets.map(a => a.location_id))];
    const stationNames =
      await this.eveQuery.genAllStationNames(token, uniqueLocationIds);
    return assets.map(a => ({
      name: items[a.type_id].name,
      quantity: a.quantity,
      location: assetNames[a.item_id]?.name,
      // below is when it's inside a ship, container, or something similar
      location2: assetNames[a.location_id]?.name,
      // below never exists
      location3: stationNames[a.item_id],
      // below is when it's straight up in station or structure
      location4: stationNames[a.location_id],
      type_id: a.type_id,
      location_id: a.location_id,
      item_id: a.item_id,
    }));


    /*
    Examples
    
    Need to filter out certain type_ids (station, ship and so on)
    or do something special with these.
    Actually, I should filter our group ids, maybe even category ids
    
    Container:
    {
        "name": "Station Container",
        "quantity": 1,
        "location": "Contractable",
        "location4": "O-ZXUV - Shadow Ultimatum Prime",
        "type_id": 17366,
        "location_id": 1038502060900,
        "item_id": 1039723674706
    },
    
    Inside the container:
    {
        "name": "Small Ancillary Current Router I",
        "quantity": 7,
        "location": "None",
        "location2": "Contractable",
        "type_id": 31358,
        "location_id": 1039723674706,
        "item_id": 1039485984059
    },
    */
  }
}