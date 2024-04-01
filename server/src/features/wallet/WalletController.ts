import { Request, Response } from 'express';
import Controller from '../../core/controller/Controller';
import { Service } from 'typedi';
import WalletService from './WalletService';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class WalletController extends Controller {

  constructor(
    private readonly walletService: WalletService,
  ) {
    super();
  }

  protected initController(): void {

    this.appGet(
      '/wallet_transactions',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.walletService.genWalletTransactionsForPage(
          actorContext,
        );
        res.json(output);
      },
    );

    this.appGet(
      '/broker_fees',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.walletService.genBrokerFeesForPage(
          actorContext,
        );
        res.json(output);
      },
    );
  }
}