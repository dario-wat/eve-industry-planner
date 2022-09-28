import { Router, Request, Response } from 'express';
import { EsiCacheAction } from '../services/foundation/EsiCacheAction';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  route.delete('/clear_cache', async (req: Request, res: Response) => {
    await EsiCacheAction.genClearCache();
    res.status(200).end();
  });
};

export default controller;