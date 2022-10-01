import { Router, Request, Response } from 'express';
import Container from 'typedi';
import LinkedCharactersService from '../services/product/LinkedCharactersService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const linkedCharactersService = Container.get(LinkedCharactersService);

  app.get(
    '/linked_characters',
    async (req: Request, res: Response) => {
      const characterId = req.session.characterId!;
      const output = await linkedCharactersService.genLinkedCharacters(
        characterId,
      );
      res.json(output);
    },
  );
};

export default controller;