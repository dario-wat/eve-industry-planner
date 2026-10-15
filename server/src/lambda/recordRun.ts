/*
 * Stores each Lambda invocation in lambda_job_runs. The handler's return
 * value or error is kept as JSON. A failed insert is logged and does not
 * change what the handler returns or throws.
 */
import { LambdaJobRun } from '../features/lambda_jobs/LambdaJobRun';

type LambdaContext = {
  functionName: string;
};

type RunRow = {
  functionName: string;
  ranAt: Date;
  ok: boolean;
  durationMs: number;
  result: unknown;
};

export function recordRun<T>(
  run: () => Promise<T>,
): (event: unknown, context: LambdaContext) => Promise<T> {
  return async (_event, context) => {
    const started = Date.now();
    try {
      const result = await run();
      await genInsertRun({
        functionName: context.functionName,
        ranAt: new Date(started),
        ok: true,
        durationMs: Date.now() - started,
        result,
      });
      return result;
    } catch (error) {
      await genInsertRun({
        functionName: context.functionName,
        ranAt: new Date(started),
        ok: false,
        durationMs: Date.now() - started,
        result: { errorMessage: errorMessage(error) },
      });
      throw error;
    }
  };
}

async function genInsertRun(row: RunRow): Promise<void> {
  if (LambdaJobRun.sequelize === undefined || row.functionName.length === 0) {
    return;
  }
  try {
    await LambdaJobRun.create({
      function_name: row.functionName,
      ran_at: row.ranAt,
      ok: row.ok,
      duration_ms: row.durationMs,
      result: JSON.stringify(row.result),
    });
  } catch (error) {
    console.error(error);
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message.split('\n')[0];
  }
  return String(error);
}
