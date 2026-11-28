import { Request, Response } from 'express';
import Controller from '../../core/controller/Controller';
import { Service } from 'typedi';
import WalletService from './WalletService';
import ActorContext from '../../core/actor_context/ActorContext';
import { optionalTypeId } from '../../lib/requestParams';

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
      async (req: Request, res: Response, actorContext: ActorContext) => {
        const typeId = optionalTypeId(req.query.typeId);
        if (typeId === undefined) {
          res.status(400).send('typeId must be a positive integer');
          return;
        }
        const output = await this.walletService.genWalletTransactionsForPage(
          actorContext,
          typeId,
        );
        res.json(output);
      },
    );

    this.appGet(
      '/fees_and_taxes',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.walletService.genFeesAndTaxesForPage(
          actorContext,
        );
        res.json(output);
      },
    );
  }
}