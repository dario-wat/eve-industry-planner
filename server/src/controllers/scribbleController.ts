import { Router, Request, Response } from 'express';
import ScribbleService from '../services/ScribbleService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  app.get(
    '/scribbles',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const output = await ScribbleService.genAll(characterId);
      res.json(output);
    },
  );

  app.post(
    '/create_scribble',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const output = await ScribbleService.genRecreate(
        characterId,
        req.body.name,
        req.body.text,
      );
      res.json(output);
    },
  );
};

export default controller;