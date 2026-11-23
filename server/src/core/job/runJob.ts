import { JobRun, JobRunStatus } from './JobRun';

/** Thrown by a job that finished with partial results, so the summary is still stored. */
export class JobFailure extends Error {
  constructor(message: string, readonly summary: object) {
    super(message);
  }
}

/**
 * Runs one job and records it in app_job_runs. The row is created as `running`
 * first, so a job that gets killed stays visible.
 */
export async function genxRunJob<T extends object>(
  jobName: string,
  run: () => Promise<T>,
): Promise<T> {
  const startedAt = new Date();
  const jobRun = await JobRun.create({
    job_name: jobName,
    status: 'running',
    started_at: startedAt,
  });

  try {
    const summary = await run();
    await genFinishRun(jobRun, startedAt, 'success', summary, null);
    return summary;
  } catch (error) {
    const summary = error instanceof JobFailure ? error.summary : null;
    await genFinishRun(jobRun, startedAt, 'failure', summary, errorText(error));
    throw error;
  }
}

async function genFinishRun(
  jobRun: JobRun,
  startedAt: Date,
  status: JobRunStatus,
  summary: object | null,
  error: string | null,
): Promise<void> {
  const finishedAt = new Date();
  try {
    await jobRun.update({
      status,
      finished_at: finishedAt,
      elapsed_ms: finishedAt.getTime() - startedAt.getTime(),
      peak_rss_mb: Math.round(process.resourceUsage().maxRSS / 1024),
      error,
      summary,
    });
  } catch (updateError) {
    console.error('Failed to record job run', updateError);
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }
  return String(error);
}
