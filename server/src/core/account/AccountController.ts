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
        const selectedIds = new Set(
          (await actorContext.genSelectedCharacters()).map((c) => c.characterId),
        );

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
            selected: selectedIds.has(character.characterId),
          };
        };

        const output = await Promise.all(characters.map(genData));
        res.json(output);
      },
    );

    /** Sets which linked characters the data views include. */
    this.appPost(
      '/selected_characters',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const ids: unknown = req.body.characterIds;
        if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) {
          res.status(400).send('characterIds must be an array of character IDs.');
          return;
        }
        const linkedIds = (await actorContext.genLinkedCharacters()).map((c) => c.characterId);
        const selectedIds = linkedIds.filter((id) => ids.includes(id));
        if (selectedIds.length === 0) {
          res.status(400).send('Select at least one linked character.');
          return;
        }
        // Null means all, so characters linked later are selected too.
        req.session.selectedCharacterIds =
          selectedIds.length === linkedIds.length ? null : selectedIds;
        res.status(200).end();
      },
    );
  }
}
