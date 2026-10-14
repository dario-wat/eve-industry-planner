/*
 * Builds build/lambda.zip for every handler under server/src/lambda.
 * shared and eve-sso are copied in as real directories. Lambda will not
 * follow the links npm creates for file: dependencies.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  realpathSync,
  rmSync,
  statSync,
} from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const stage = path.join(root, 'build', 'lambda-stage');
const stageServer = path.join(stage, 'server');
const zipPath = path.join(root, 'build', 'lambda.zip');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyPublishedPackage(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(path.join(from, 'package.json'), path.join(to, 'package.json'));
  cpSync(path.join(from, 'dist'), path.join(to, 'dist'), { recursive: true });
}

function isRedirect(linkPath) {
  const real = realpathSync.native(linkPath);
  return real.toLowerCase() !== path.resolve(linkPath).toLowerCase();
}

function replaceLinkWithCopy(linkPath) {
  const real = realpathSync.native(linkPath);
  if (process.platform === 'win32') {
    execFileSync('cmd', ['/c', 'rmdir', linkPath], { stdio: 'inherit' });
  } else {
    rmSync(linkPath, { force: true });
  }
  cpSync(real, linkPath, { recursive: true, dereference: true });
}

const handlerJs = path.join(root, 'server', 'dist', 'lambda', 'ping.js');
if (!existsSync(handlerJs)) {
  console.error('Missing server/dist. Run npm run lambda-compile first.');
  process.exit(1);
}

console.log('Staging production dependencies...');
rmSync(stage, { recursive: true, force: true });
copyPublishedPackage(path.join(root, 'shared'), path.join(stage, 'shared'));
copyPublishedPackage(
  path.join(root, 'packages', 'eve-sso'),
  path.join(stage, 'packages', 'eve-sso'),
);
mkdirSync(stageServer, { recursive: true });
cpSync(path.join(root, 'server', 'package.json'), path.join(stageServer, 'package.json'));
cpSync(path.join(root, 'server', 'package-lock.json'), path.join(stageServer, 'package-lock.json'));
cpSync(path.join(root, 'server', 'patches'), path.join(stageServer, 'patches'), {
  recursive: true,
});

const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js');
run(process.execPath, [npmCli, 'ci', '--prefix', stageServer]);
run(process.execPath, [npmCli, 'prune', '--omit=dev', '--prefix', stageServer]);
run(process.execPath, [
  npmCli, 'install', '--omit=dev', '--prefix', path.join(stage, 'packages', 'eve-sso'),
]);
cpSync(path.join(root, 'server', 'dist'), path.join(stageServer, 'dist'), { recursive: true });

for (const linkPath of [
  path.join(stageServer, 'node_modules', 'eve-sso'),
  path.join(stageServer, 'node_modules', '@internal', 'shared'),
]) {
  if (isRedirect(linkPath)) {
    console.log(`Copying ${path.basename(linkPath)} into the zip`);
    replaceLinkWithCopy(linkPath);
  }
}

console.log('Checking that the ping handler loads...');
run(process.execPath, [
  '--no-require-module',
  '-e',
  "const m = require('./dist/lambda/ping.js'); if (typeof m.handler !== 'function') process.exit(1);",
], { cwd: stageServer });

console.log('Zipping...');
rmSync(zipPath, { force: true });
run('tar', ['-a', '-c', '-f', zipPath, 'dist', 'node_modules'], { cwd: stageServer });

const zipMb = statSync(zipPath).size / (1024 * 1024);
console.log(`Wrote ${zipPath} (${zipMb.toFixed(1)} MB)`);
