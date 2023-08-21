import { Router, Request, Response } from 'express';
import ActorContext from '../../core/actor_context/ActorContext';
import { Scribble } from './Scribble';

const route = Router();

// TODO migrate 
const controller = (app: Router) => {
  app.use('/', route);

  app.get(
    '/scribbles',
    async (_req: Request, res: Response) => {
      const actorContext: ActorContext = res.locals.actorContext;
      const account = await actorContext.genxAccount();
      const scribbles = await account.getScribbles();
      res.json(scribbles);
    },
  );

  app.post(
    '/edit_scribble/:id',
    async (req: Request, res: Response) => {
      const scribbleId = req.params.id;
      await Scribble.update(
        { text: req.body.text },
        { where: { id: scribbleId } },
      );
      const scribble = (await Scribble.findByPk(scribbleId))!;
      res.json(scribble);
    },
  );

  app.post(
    '/create_scribble',
    async (req: Request, res: Response) => {
      const actorContext: ActorContext = res.locals.actorContext;
      const account = await actorContext.genxAccount();
      const scribble = await Scribble.create({
        accountId: account.id,
        name: req.body.name,
        text: req.body.text,
      });
      res.json(scribble);
    },
  );

  app.delete(
    '/delete_scribble/:id',
    async (req: Request, res: Response) => {
      await Scribble.destroy({
        where: {
          id: req.params.id,
        },
      });
      res.status(200).end();
    },
  );
};

export default controller;