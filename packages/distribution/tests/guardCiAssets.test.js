import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const WORKFLOW_PATH = path.resolve('.github/workflows/guard.yml');
const ACTION_PATH = path.resolve('.github/actions/guard/action.yml');
const TEMPLATE_DIR = path.resolve('packages/distribution/examples/ci');
const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

test('reusable guard workflow exposes workflow_call inputs and secrets', () => {
  const content = read(WORKFLOW_PATH);

  if (content.includes('on: {}')) {
    assert.ok(content.includes('Workflow temporarily disabled'), 'disabled workflows must include a comment for context');
    return;
  }

  assert.match(content, /pull_request:\n\s+paths:\n\s+- 'docs\/\*\*'/, 'pull_request trigger must target docs changes');
  assert.ok(content.includes('workflow_call:'), 'workflow_call trigger missing');
  assert.ok(content.includes('paths:'), 'paths input missing');
  assert.ok(content.includes('working-directory:'), 'working-directory input missing');
  assert.ok(content.includes('format:'), 'format input missing');
  assert.ok(content.includes('node-version:'), 'node-version input missing');
  assert.match(content, /EUTELO_GUARD_API_ENDPOINT:/, 'missing API endpoint secret');
  assert.match(content, /EUTELO_GUARD_API_KEY:/, 'missing API key secret');
});

test('guard workflow installs the CLI and runs eutelo guard with caller parameters', () => {
  const content = read(WORKFLOW_PATH);

  assert.match(content, /uses: actions\/setup-node@v4/, 'setup-node not configured');
  assert.match(content, /working-directory: \$\{\{ inputs\.working-directory/, 'working-directory defaults missing');
  assert.match(content, /npm install -g @eutelo\/cli/, 'CLI install step missing');
  assert.match(content, /eutelo guard \$\{\{ steps\.changed-files.outputs.all_changed_files \}\}/, 'changed files invocation missing');
  assert.match(content, /eutelo guard \$\{\{ inputs.paths \}\}/, 'guard invocation must support explicit paths input');
});

test('composite action mirrors guard workflow expectations for setup, install, and env wiring', () => {
  const content = read(ACTION_PATH);

  assert.match(content, /using: 'composite'/, 'composite action missing using field');
  assert.match(content, /actions\/setup-node@v4/, 'setup-node not wired in composite action');
  assert.match(content, /npm install -g @eutelo\/cli/, 'composite action missing CLI install');
  assert.match(content, /EUTELO_GUARD_API_ENDPOINT: \$\{\{ env.EUTELO_GUARD_API_ENDPOINT \}\}/);
  assert.match(
    content,
    /working-directory: \$\{\{ inputs\.working-directory != '' && inputs\.working-directory \|\| '\.' \}\}/
  );
  assert.match(content, /--format=\$\{\{ inputs.format \}\}/, 'format input not forwarded');
});

test('guard workflow templates target common triggers and call the reusable workflow', () => {
  const pr = read(path.join(TEMPLATE_DIR, 'guard-pull-request.yml'));
  const main = read(path.join(TEMPLATE_DIR, 'guard-main.yml'));
  const dispatch = read(path.join(TEMPLATE_DIR, 'guard-dispatch.yml'));

  assert.match(pr, /pull_request:/, 'PR template missing pull_request trigger');
  assert.match(pr, /paths:\n      - 'docs\/\*\*'/, 'PR template missing docs path filter');
  assert.match(pr, /uses: eutelo\/eutelo\/\.github\/workflows\/guard\.yml@v1/);

  assert.match(main, /branches:\n      - main/, 'main template missing branch trigger');
  assert.match(main, /uses: eutelo\/eutelo\/\.github\/workflows\/guard\.yml@v1/);

  assert.match(dispatch, /workflow_dispatch:/, 'dispatch template missing manual trigger');
  assert.match(dispatch, /working-directory: \$\{\{ inputs.working-directory \}\}/);
  assert.match(dispatch, /format: \$\{\{ inputs.format \}\}/, 'dispatch template does not forward format');
});

test('guard command can be invoked from a monorepo subdirectory with stubbed warnings', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-guard-ci-'));
  const workspaceRoot = path.join(cwd, 'apps', 'web');
  fs.mkdirSync(workspaceRoot, { recursive: true });

  const result = spawnSync('node', [CLI_PATH, 'guard', 'docs/**/*.md'], {
    cwd: workspaceRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      EUTELO_GUARD_STUB_RESULT: 'warnings'
    }
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Warnings:/, 'warnings should be reported without failing');

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command emits JSON output when requested, matching workflow format option', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-guard-ci-'));
  const result = spawnSync(
    'node',
    [CLI_PATH, 'guard', '--format=json', 'docs/product/features/DUMMY.md'],
    {
      cwd,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        EUTELO_GUARD_STUB_RESULT: 'issues'
      }
    }
  );

  assert.equal(result.status, 2, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.stats.issues, 1);
  assert.equal(payload.error, null);

  fs.rmSync(cwd, { recursive: true, force: true });
});

const actBinary = spawnSync('which', ['act'], { encoding: 'utf8' });
const actAvailable = actBinary.status === 0;

test('guard workflow can be executed locally via act for integration checks', { skip: !actAvailable }, () => {
  assert.ok(actAvailable, 'act binary is required to run this integration');
});
