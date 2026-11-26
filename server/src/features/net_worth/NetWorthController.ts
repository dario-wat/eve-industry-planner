import { Request, Response } from 'express';
import { Service } from 'typedi';
import NetWorthService from './NetWorthService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class NetWorthController extends Controller {

  constructor(
    private readonly netWorthService: NetWorthService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/net_worth_history',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        res.json(await this.netWorthService.genHistory(actorContext));
      },
    );
  }
}
