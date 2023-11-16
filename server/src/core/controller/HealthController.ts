import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../actor_context/ActorContext';
import Controller from './Controller';

@Service()
export default class HealthController extends Controller {

  protected initController(): void {
    this.appGet(
      '/healthz',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        res.json({ status: 'I am ALIVE!' });
      },
    );
  }
}