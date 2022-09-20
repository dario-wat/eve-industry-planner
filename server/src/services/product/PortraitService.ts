import { Service } from 'typedi';
import { EvePortraitRes } from '@internal/shared';
import EsiSequelizeProvider from '../foundation/EsiSequelizeProvider';
import EsiQueryService from '../query/EsiQueryService';

@Service()
export default class PortraitService {

  constructor(
    private readonly esiQuery: EsiQueryService,
    private readonly esiSequelizeProvider: EsiSequelizeProvider,
  ) { }

  public async genData(characterId: number): Promise<EvePortraitRes> {
    const token = await this.esiSequelizeProvider.genxToken(characterId);
    const portrait = await this.esiQuery.genxPortrait(token, characterId);
    return { px64x64: portrait.px64x64 };
  }
}