import { Token } from 'eve-esi-client';
import { Service } from 'typedi';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import EveQueryService from './EveQueryService';
import SequelizeQueryService from './SequelizeQueryService';

@Service()
export default class AssetsService {

  constructor(
    private readonly sequelizeQuery: SequelizeQueryService,
    private readonly eveQuery: EveQueryService,
  ) { }

  // TODO finish this
  public async getData(token: Token, assets: any[]) {
    console.log('Assets count: ', assets.length);
    const itemNames = await this.sequelizeQuery.genTypeIds(
      assets.map(a => a.type_id),
    );
    const groupIds = Object.entries(itemNames).map((a: any[]) => a[1].group_id);
    // const groupIds = await this.sequelizeQuery.genGroupIds(
    //   itemNames.map((i: any) => i.group_id),
    // );
    // console.log(groupIds);
    // console.log('Item names count: ', itemNames);
    const assetNames = await this.eveQuery.genAllAssetNames(
      token,
      GlobalMemory.characterId!,
      assets.map(a => a.item_id),
    );
    // console.log(assetNames);
    const uniqueLocationIds = [...new Set(assets.map(a => a.location_id))];
    // const uniqeItemIds = [...new Set(assets.map(a => a.item_id))];
    const stationNames =
      await this.eveQuery.genAllStationNames(token, uniqueLocationIds);
    // console.log(stationNames);
    return assets.map(a => ({
      name: itemNames[a.type_id],
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