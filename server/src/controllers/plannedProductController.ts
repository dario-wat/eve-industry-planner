import { Request, Response, Router } from 'express';
import { PlannedProductUtil } from '../services/PlannedProductUtil';
import GlobalMemory from '../lib/GlobalMemory_DO_NOT_USE';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  // TODO(EIP-2) this is a temporary solution
  // until I get a database running
  const getCharacterId = () => GlobalMemory.characterId as number;

  app.get(
    '/planned_products',
    async (req: Request, res: Response) => {
      const characterId = getCharacterId();
      const products =
        await PlannedProductUtil.genPlannedProducts(characterId);
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
      const characterId = getCharacterId();
      const products = await PlannedProductUtil.genParseAndRecreate(
        characterId,
        req.body.text,
      );
      res.json(products);
    },
  );
};

export default controller;