import { Request, Response } from 'express';
import Controller from '../../core/controller/Controller';
import { Service } from 'typedi';
import IndustryJobService from './IndustryJobService';
import ActorContext from '../../core/actor_context/ActorContext';

@Service()
export default class IndustryJobController extends Controller {

  constructor(
    private readonly industryJobService: IndustryJobService,
  ) {
    super();
  }

  protected initController(): void {
    /** Returns data for the Industry Jobs page. */
    this.appGet(
      '/industry_jobs',
      async (_req: Request, res: Response, actorContext: ActorContext) => {
        const output = await this.industryJobService.genActiveJobsData(
          actorContext,
        );
        res.json(output);
      },
    );
  }
}