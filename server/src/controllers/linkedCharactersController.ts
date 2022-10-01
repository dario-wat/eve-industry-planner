import { Router, Request, Response } from 'express';
import { CharacterCluster } from '../models/CharacterCluster';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  app.get(
    '/linked_characters',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const output = await CharacterCluster.genLinkedCharacters(characterId);
      res.json(output);
    },
  );
};

export default controller;