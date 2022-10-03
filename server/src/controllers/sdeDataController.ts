import { Router, Request, Response } from 'express';
import Container from 'typedi';
import EveSdeData from '../services/query/EveSdeData';
import { ITEM_CATEGORY_IDS } from '../const/Categories';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const sdeData = Container.get<EveSdeData>(typeof EveSdeData);

  /*
  * Use for autocomplete in planned products. We only care about
  * items that can be built.
  */
  route.get('/type_ids_items', (req: Request, res: Response) => {
    const itemTypeIds = Object.values(sdeData.types).filter(t => {
      const categoryId = sdeData.categoryIdFromTypeId(t.id);
      return categoryId !== undefined && ITEM_CATEGORY_IDS.includes(categoryId);
    });
    res.json(itemTypeIds);
  });
};

export default controller;