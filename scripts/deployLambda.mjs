/*
 * Uploads build/lambda.zip to the functions in server/lambda.functions.json.
 * Pass a function name to update just that one.
 * update-function-configuration omits environment variables, so DATABASE_* stays.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(
  path.join(root, 'server', 'lambda.functions.json'),
  'utf8',
));
const zipPath = path.join(root, 'build', 'lambda.zip');

if (!existsSync(zipPath)) {
  console.error('Missing build/lambda.zip. Run npm run lambda-package first.');
  process.exit(1);
}

const requested = process.argv[2];
let functions = config.functions;
if (requested) {
  functions = functions.filter((fn) => fn.name === requested);
  if (functions.length === 0) {
    console.error(`No function named ${requested}.`);
    for (const fn of config.functions) {
      console.error(`  ${fn.name}`);
    }
    process.exit(1);
  }
}

function aws(args, capture = false) {
  return spawnSync('aws', ['--no-cli-pager', ...args], {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

function awsOk(args) {
  const result = aws(args);
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const identity = aws(
  ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'],
  true,
);
if (identity.status !== 0) {
  process.stderr.write(identity.stderr ?? '');
  process.exit(identity.status ?? 1);
}
const roleArn = `arn:aws:iam::${identity.stdout.trim()}:role/${config.roleName}`;
const zipArg = `fileb://${zipPath.replaceAll('\\', '/')}`;

function functionExists(name) {
  const result = aws([
    'lambda', 'get-function',
    '--region', config.region,
    '--function-name', name,
    '--query', 'Configuration.FunctionName',
    '--output', 'text',
  ], true);
  if (result.status === 0) {
    return true;
  }
  const err = result.stderr ?? '';
  if (err.includes('ResourceNotFoundException')) {
    return false;
  }
  process.stderr.write(err);
  process.exit(result.status ?? 1);
}

const summaryQuery = [
  '--query', '{name:FunctionName,lastModified:LastModified}',
  '--output', 'json',
];

for (const fn of functions) {
  const regionArgs = ['--region', config.region, '--function-name', fn.name];
  if (!functionExists(fn.name)) {
    console.log(`Creating ${fn.name}`);
    awsOk([
      'lambda', 'create-function',
      ...regionArgs,
      '--runtime', config.runtime,
      '--handler', fn.handler,
      '--role', roleArn,
      '--zip-file', zipArg,
      '--timeout', String(fn.timeout),
      '--memory-size', String(fn.memory),
      ...summaryQuery,
    ]);
    awsOk(['lambda', 'wait', 'function-active', ...regionArgs]);
    continue;
  }

  console.log(`Updating ${fn.name}`);
  awsOk(['lambda', 'update-function-code', ...regionArgs, '--zip-file', zipArg, ...summaryQuery]);
  awsOk(['lambda', 'wait', 'function-updated', ...regionArgs]);
  awsOk([
    'lambda', 'update-function-configuration',
    ...regionArgs,
    '--runtime', config.runtime,
    '--handler', fn.handler,
    '--timeout', String(fn.timeout),
    '--memory-size', String(fn.memory),
    ...summaryQuery,
  ]);
  awsOk(['lambda', 'wait', 'function-updated', ...regionArgs]);
}

console.log('Deployed.');
