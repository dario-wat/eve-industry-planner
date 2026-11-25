import { Request, Response } from 'express';
import { Service } from 'typedi';
import CharacterContextService from './CharacterContextService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class CharacterContextController extends Controller {

  constructor(
    private readonly characterContextService: CharacterContextService,
  ) {
    super();
  }

  protected initController(): void {
    /** Wallet balance, order slots, and order values per logged-in character. */
    this.appGet(
      '/character_context',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        res.json(await this.characterContextService.genSummaries(actorContext));
      },
    );
  }
}
