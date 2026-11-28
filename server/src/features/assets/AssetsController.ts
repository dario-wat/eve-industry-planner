import { Request, Response } from 'express';
import { Service } from 'typedi';
import AssetsService from './AssetsService';
import Controller from '../../core/controller/Controller';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class AssetsController extends Controller {

  constructor(
    private readonly assetsService: AssetsService,
  ) {
    super();
  }

  protected initController(): void {

    this.appGet(
      '/assets',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.assetsService.genDataForAssetPage(actorContext);
        res.json(output);
      },
    );

    this.appGet(
      '/assets_locations',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.assetsService.genAssetLocations(actorContext);
        res.json(output);
      },
    );
  }
}
