import { Request, Response } from 'express';
import { Service } from 'typedi';
import JobRunService from './JobRunService';
import Controller from '../../core/controller/Controller';

@Service()
export default class JobRunController extends Controller {

  constructor(
    private readonly jobRunService: JobRunService,
  ) {
    super();
  }

  protected initController(): void {
    /** Scheduled and recorded jobs with their latest runs. */
    this.appGet(
      '/jobs',
      async (_req: Request, res: Response) => {
        res.json(await this.jobRunService.genxJobs());
      },
    );
  }
}
