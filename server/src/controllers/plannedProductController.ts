import { Request, Response, Router } from 'express';
import Container from 'typedi';
import PlannedProductService from '../services/product/PlannedProductService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const plannedProductService = Container.get(PlannedProductService);

  app.get(
    '/planned_products',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const products = await plannedProductService.genData(characterId);
      res.json(products);
    },
  );

  /*
    Input for testing:
      Kikimora 10
      Nanofiber Internal Structure II 10
      Entropic Radiation Sink II 20
      1MN Afterburner II 10
      Multispectrum Shield Hardener II 10
      Light Entropic Disintegrator II 10
      Small Core Defense Field Extender II 20
  */
  app.post(
    '/planned_products_recreate',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const products = await plannedProductService.genParseAndRecreate(
        characterId,
        req.body.text,
      );
      res.json(products);
    },
  );

  app.delete(
    '/planned_product_delete/:type_id',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      await plannedProductService.genDelete(
        characterId,
        Number(req.params.type_id),
      );
      res.status(200).end();
    },
  );

  app.post(
    '/planned_product_add',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      await plannedProductService.genAddPlannedProduct(
        characterId,
        req.body.typeName,
        req.body.quantity,
      );
      res.status(200).end();
    },
  );
};

export default controller;