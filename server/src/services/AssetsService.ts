import { Token } from 'eve-esi-client';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';
import { Service } from 'typedi';
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
    const itemNames = await this.sequelizeQuery.genNamesFromTypeIds(
      assets.map((a) => a.type_id),
    );
    console.log('Item names count: ', itemNames.length);
    const items = await this.eveQuery.genAssetLocations(
      token,
      GlobalMemory.characterId!,
      assets.map((a) => a.item_id),
    );
    console.log(items.filter((i: any) => i.name !== 'None' && i.name !== ''));
    return {
      name: itemNames[0].name,
      // quantity: asset.quantity,
      // location_id: asset.location_id,
    };
  }
}