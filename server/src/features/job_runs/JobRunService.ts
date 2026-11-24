import { Service } from 'typedi';
import { col, fn } from 'sequelize';
import { JobRunRes, JobsRes } from '@internal/shared';
import { JobRun } from '../../core/job/JobRun';
import { JOB_SCHEDULES } from '../../core/job/jobSchedules';

const RUNS_PER_JOB = 10;

@Service()
export default class JobRunService {
  public async genxJobs(): Promise<JobsRes> {
    const recorded = await JobRun.findAll({
      attributes: [[fn('DISTINCT', col('job_name')), 'job_name']],
      raw: true,
    });
    const scheduledNames = JOB_SCHEDULES.map(job => job.jobName);
    const unscheduledNames = recorded
      .map(row => row.job_name)
      .filter(name => !scheduledNames.includes(name))
      .sort();

    const jobs = [
      ...JOB_SCHEDULES,
      ...unscheduledNames.map(jobName => ({ jobName, schedule: null })),
    ];
    return await Promise.all(jobs.map(async job => ({
      jobName: job.jobName,
      schedule: job.schedule,
      runs: await this.genxRecentRuns(job.jobName),
    })));
  }

  private async genxRecentRuns(jobName: string): Promise<JobRunRes[]> {
    const runs = await JobRun.findAll({
      where: { job_name: jobName },
      order: [['started_at', 'DESC']],
      limit: RUNS_PER_JOB,
    });
    return runs.map(run => ({
      id: run.id,
      status: run.status,
      startedAt: run.started_at.toISOString(),
      finishedAt: run.finished_at?.toISOString() ?? null,
      elapsedMs: run.elapsed_ms,
      peakRssMb: run.peak_rss_mb,
      error: run.error,
      summary: run.summary as Record<string, unknown> | null,
    }));
  }
}
