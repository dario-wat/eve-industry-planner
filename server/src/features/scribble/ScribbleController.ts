import { Request, Response } from 'express';
import ActorContext from '../../core/actor_context/ActorContext';
import { Scribble } from './Scribble';
import { Service } from 'typedi';
import Controller from '../../core/controller/Controller';

@Service()
export default class ScribbleController extends Controller {

  protected initController(): void {
    /** Returns a list of all scribbles owned by the logged in account. */
    this.appGet(
      '/scribbles',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const account = await actorContext.genxAccount();
        const scribbles = await account.getScribbles();
        res.json(scribbles);
      },
    );

    /** Edits the scribble text. */
    this.appPost(
      '/edit_scribble/:id',
      async (req: Request, res: Response, _actorContext: ActorContext) => {
        const scribbleId = req.params.id;
        await Scribble.update(
          { text: req.body.text },
          { where: { id: scribbleId } },
        );
        const scribble = (await Scribble.findByPk(scribbleId))!;
        res.json(scribble);
      },
    );

    /** Creates a new scribble. */
    this.appPost(
      '/create_scribble',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const account = await actorContext.genxAccount();
        const scribble = await Scribble.create({
          accountId: account.id,
          name: req.body.name,
          text: req.body.text,
        });
        res.json(scribble);
      },
    );

    /** Deletes an existing scribble. */
    this.appDelete(
      '/delete_scribble/:id',
      async (req: Request, res: Response, _actorContext: ActorContext) => {
        await Scribble.destroy({
          where: {
            id: req.params.id,
          },
        });
        res.status(200).end();
      },
    );
  }
}