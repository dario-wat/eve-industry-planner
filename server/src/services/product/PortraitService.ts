import { Service } from 'typedi';
import { EvePortraitRes } from '@internal/shared';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';

@Service()
export default class PortraitService {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) { }

  public async genData(characterId: number): Promise<EvePortraitRes> {
    const portrait = await this.esiQuery.genxPortrait(characterId);
    return { px64x64: portrait.px64x64 };
  }
}