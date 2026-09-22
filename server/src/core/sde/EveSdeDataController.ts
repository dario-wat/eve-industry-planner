import { Request, Response } from 'express';
import { Service } from 'typedi';
import Controller from '../controller/Controller';
import ActorContext from '../actor_context/ActorContext';
import EveSdeData from './EveSdeData';

@Service()
export default class EveSdeDataController extends Controller {

  constructor(
    private readonly sdeData: EveSdeData,
  ) {
    super();
  }

  protected initController(): void {

    /** Published market items for the item picker. */
    this.appGet(
      '/type_ids_items',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        res.json(this.sdeData.tradeableTypes());
      },
    );
  }
}