import { Request, Response } from 'express';
import { Service } from 'typedi';
import ActorContext from '../../core/actor_context/ActorContext';
import Controller from '../../core/controller/Controller';
import LambdaJobService from './LambdaJobService';

@Service()
export default class LambdaJobController extends Controller {
  constructor(
    private readonly lambdaJobService: LambdaJobService,
  ) {
    super();
  }

  protected initController(): void {
    /** Last 10 stored runs for each configured Lambda. */
    this.appGet(
      '/lambda_jobs',
      async (_req: Request, res: Response, _actorContext: ActorContext) => {
        try {
          const jobs = await this.lambdaJobService.genJobs();
          res.json(jobs);
        } catch (error) {
          console.error(error);
          res.status(500).json({ error: 'Could not load jobs.' });
        }
      },
    );
  }
}
