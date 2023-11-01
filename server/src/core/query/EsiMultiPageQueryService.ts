import { EveAsset, EveContract } from 'types/EsiQuery';
import { EsiCharacter } from '../../core/esi/models/EsiCharacter';
import { Service } from 'typedi';
import { range } from 'lodash';
import EsiTokenlessQueryService from './EsiTokenlessQueryService';

/** 
 * Service class specifically for ESI queries that contain multiple pages
 * of results.
 */
@Service()
export default class EsiMultiPageQueryService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  /* 
    Similar to genxAssets and genAssets, but instead it will look for multiple
    pages (page count is hardcoded for now) and combine all the results.
    This function does multiple requests.
    Returns the same type as genAssets.
  */
  public async genxAllAssets(character: EsiCharacter): Promise<EveAsset[]> {
    const firstPageAssets = await this.esiQuery.genxAssets(character.characterId, 1);
    const remainingAssets = await Promise.all(
      range(2, firstPageAssets.pages + 1).map(
        page => this.esiQuery.genxAssets(character.characterId, page),
      ),
    );
    return [firstPageAssets, ...remainingAssets].map(({ data }) => data).flat();
  }

  public async genxAllContracts(character: EsiCharacter): Promise<EveContract[]> {
    const firstPageContracts = await this.esiQuery.genxContracts(character.characterId, 1);
    const remainingContracts = await Promise.all(
      range(2, firstPageContracts.pages + 1).map(
        page => this.esiQuery.genxContracts(character.characterId, page),
      ),
    );
    return [firstPageContracts, ...remainingContracts].map(({ data }) => data).flat();
  }
}