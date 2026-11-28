import { Request, Response } from 'express';
import { Service } from 'typedi';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';
import TradeService from './TradeService';

@Service()
export default class TradeController extends Controller {

  constructor(
    private readonly tradeService: TradeService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/trade_fee_rates',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        res.json(await this.tradeService.genxFeeRates(actorContext));
      },
    );

    this.appGet(
      '/trade_book/:typeId',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const typeId = Number(req.params.typeId);
        if (!Number.isInteger(typeId) || typeId <= 0) {
          res.status(400).send('typeId must be a positive integer');
          return;
        }
        res.json(await this.tradeService.genxBook(actorContext, typeId));
      },
    );
  }
}
