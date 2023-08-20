import { Router, Request, Response } from 'express';
import Container from 'typedi';
import AccountService from '../core/account/AccountService';

const route = Router();

const controller = (app: Router) => {
  app.use('/', route);

  const accountService = Container.get(AccountService);

  app.get(
    '/linked_characters',
    async (req: Request, res: Response) => {
      // const characterId = req.session.characterId!;
      const output = await accountService.genLinkedCharacters(
        res.locals.actorContext,
      );
      res.json(output);
    },
  );
};

export default controller;