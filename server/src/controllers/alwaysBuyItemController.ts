import { Request, Response, Router } from 'express';
import Container from 'typedi';
import AlwaysBuyItemService from '../services/product/AlwaysBuyItemService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const alwaysBuyItemService = Container.get(AlwaysBuyItemService);

  app.get(
    '/always_buy_items',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const items = await alwaysBuyItemService.genQuery(characterId);
      res.json(items);
    },
  );

  app.post(
    '/always_buy_items_update',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const items = await alwaysBuyItemService.genUpdate(
        characterId,
        req.body.typeIds,
      );
      res.json(items);
    },
  );
};

export default controller;