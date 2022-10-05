import { Router, Request, Response } from 'express';
import { EsiCacheAction, EsiCacheItem } from '../services/foundation/EsiCacheAction';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  app.delete('/clear_cache', async (req: Request, res: Response) => {
    await EsiCacheAction.genClearCache();
    res.status(200).end();
  });

  app.delete(
    '/clear_assets_cache',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      await EsiCacheAction.genClearCacheByKey(
        characterId.toString(),
        EsiCacheItem.ASSETS,
      );
      res.status(200).end();
    },
  );
};

export default controller;