import { Request, Response } from 'express';
import { Service } from 'typedi';
import Controller from '../controller/Controller';
import { EsiCacheItem, genClearEsiCache, genClearEsiCacheByKey } from './EsiCacheAction';
import ActorContext from '../actor_context/ActorContext';

@Service()
export default class EsiCacheController extends Controller {

  protected initController(): void {

    /** Clears the entire cache. */
    this.appDelete(
      '/clear_cache',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        await genClearEsiCache();
        res.status(200).end();
      },
    );

    /** Clears only the assets cache for all characters linked to this account. */
    this.appDelete(
      '/clear_assets_cache',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const characters = await actorContext.genLinkedCharacters();
        await Promise.all(characters.map(async c =>
          await genClearEsiCacheByKey(
            c.characterId.toString(),
            EsiCacheItem.ASSETS,
          ),
        ));
        res.status(200).end();
      },
    );
  }
}