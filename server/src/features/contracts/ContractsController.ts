import { Request, Response } from 'express';
import { Service } from 'typedi';
import ContractsService from './ContractsService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class ContractsController extends Controller {

  constructor(
    private readonly contractsService: ContractsService,
  ) {
    super();
  }

  protected initController(): void {
    this.appGet(
      '/contracts',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.contractsService.genDataForPage(actorContext);
        res.json(output);
      },
    );
  }
}
