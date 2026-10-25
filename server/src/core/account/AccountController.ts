import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../actor_context/ActorContext';
import Controller from '../controller/Controller';
import { EsiCharacter } from '../esi/models/EsiCharacter';
import EsiQueryService from '../esi/EsiQueryService';
import { genNullOnEsiError } from '../../lib/eveUtil';

@Service()
export default class AccountController extends Controller {

  constructor(
    private readonly esiQuery: EsiQueryService,
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
          const portrait = await genNullOnEsiError(
            () => this.esiQuery.genxPortrait(character.characterId),
          );
          const isLoggedIn = await character.isLoggedIn();
          return {
            characterId: character.characterId,
            characterName: character.characterName,
            portrait: portrait?.px128x128,
            tokenExpired: !isLoggedIn,
          };
        };

        const output = await Promise.all(characters.map(genData));
        res.json(output);
      },
    );
  }
}