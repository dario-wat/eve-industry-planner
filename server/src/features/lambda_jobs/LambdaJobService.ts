import { LambdaJobRunRes, LambdaJobsRes } from '@internal/shared';
import { readFileSync } from 'fs';
import path from 'path';
import { Service } from 'typedi';
import { LambdaJobRun } from './LambdaJobRun';

const RUN_LIMIT = 10;

type FunctionsFile = {
  region: string;
  functions: { name: string; label: string; schedule?: string }[];
};

@Service()
export default class LambdaJobService {
  /** Last 10 stored runs for every function in lambda.functions.json. */
  public async genJobs(): Promise<LambdaJobsRes> {
    const config = this.readConfig();
    const jobs: LambdaJobsRes = [];

    for (const fn of config.functions) {
      const rows = await LambdaJobRun.findAll({
        where: { function_name: fn.name },
        order: [['ran_at', 'DESC'], ['id', 'DESC']],
        limit: RUN_LIMIT,
      });
      jobs.push({
        name: fn.name,
        label: fn.label,
        scheduleLabel: fn.schedule ?? 'Not scheduled',
        consoleUrl: lambdaConsoleUrl(config.region, fn.name),
        runs: rows.map(toRun),
      });
    }

    return jobs;
  }

  private readConfig(): FunctionsFile {
    const filePath = path.join(__dirname, '../../../lambda.functions.json');
    return JSON.parse(readFileSync(filePath, 'utf8')) as FunctionsFile;
  }
}

function toRun(row: LambdaJobRun): LambdaJobRunRes {
  return {
    id: row.id,
    time: new Date(row.ran_at).toISOString(),
    ok: Boolean(row.ok),
    durationMs: row.duration_ms,
    errorMessage: errorMessage(Boolean(row.ok), row.result),
  };
}

function errorMessage(ok: boolean, result: string | null): string | null {
  if (ok || result === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(result) as { errorMessage?: unknown };
    if (typeof parsed.errorMessage === 'string' && parsed.errorMessage.length > 0) {
      return parsed.errorMessage;
    }
  } catch {
    return result;
  }
  return result;
}

function lambdaConsoleUrl(region: string, functionName: string): string {
  return `https://${region}.console.aws.amazon.com/lambda/home?region=${region}#/functions/${functionName}`;
}
