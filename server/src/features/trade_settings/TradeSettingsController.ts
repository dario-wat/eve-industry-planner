import { Request, Response } from 'express';
import { Service } from 'typedi';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';
import TradeSettingsService, { isTradeLocation } from './TradeSettingsService';

@Service()
export default class TradeSettingsController extends Controller {

  constructor(
    private readonly tradeSettingsService: TradeSettingsService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/trade_settings',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        res.json(await this.tradeSettingsService.genxSettings(actorContext));
      },
    );

    this.appPost(
      '/trade_settings',
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const { buyLocationId, sellLocationId } = req.body ?? {};
        if (!isTradeLocation(buyLocationId) || !isTradeLocation(sellLocationId)) {
          res.status(400).send('buyLocationId and sellLocationId must be trade locations');
          return;
        }
        await this.tradeSettingsService.genxSave(actorContext, { buyLocationId, sellLocationId });
        res.json(await this.tradeSettingsService.genxSettings(actorContext));
      },
    );
  }
}
