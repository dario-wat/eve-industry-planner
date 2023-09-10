import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../actor_context/ActorContext';
import Controller from '../controller/Controller';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import EsiTokenlessQueryService from '../query/EsiTokenlessQueryService';

@Service()
export default class AccountController extends Controller {

  constructor(
    private readonly esiQuery: EsiTokenlessQueryService,
  ) {
    super();
  }

  protected initController(): void {
    /**
     * Returns data for linked characters. This includes the character ID, name
     * and portrait.
     */
    this.appGet(
      '/linked_characters',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const characters = await actorContext.genLinkedCharacters();

        const genData = async (character: EsiCharacter) => {
          const portrait = await this.esiQuery.genxPortrait(character.characterId);
          return {
            characterId: character.characterId,
            characterName: character.characterName,
            portrait: portrait.px64x64,
          };
        };

        const output = await Promise.all(characters.map(genData));
        res.json(output);
      },
    );
  }
}