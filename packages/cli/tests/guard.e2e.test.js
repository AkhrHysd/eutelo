import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd, envOverrides = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...envOverrides
    }
  });
}

test('guard command reports the processed document count in its summary', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const result = runCli(['guard', 'docs/product/features/DUMMY.md'], cwd, {
    EUTELO_GUARD_STUB_RESULT: 'success'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /processed 1 document\(s\)/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command reports configuration requirements when not set up', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const result = runCli(['guard', 'docs/product/features/DUMMY.md'], cwd);

  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /environment variables are missing/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command supports --format=json for structured output', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const result = runCli(
    ['guard', '--format=json', '--fail-on-error', 'docs/product/features/DUMMY.md'],
    cwd,
    { EUTELO_GUARD_STUB_RESULT: 'issues' }
  );

  assert.equal(result.status, 2, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.stats.issues, 1);
  assert.equal(payload.error, null);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command maps warn-only and connection errors to exit codes', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));

  const warnOnly = runCli(
    ['guard', '--warn-only', 'docs/product/features/DUMMY.md'],
    cwd,
    { EUTELO_GUARD_STUB_RESULT: 'issues' }
  );
  assert.equal(warnOnly.status, 0, warnOnly.stderr);
  assert.match(warnOnly.stdout, /Issues:/);

  const connectionFailure = runCli(['guard', 'docs/product/features/DUMMY.md'], cwd, {
    EUTELO_GUARD_STUB_RESULT: 'connection-error'
  });
  assert.equal(connectionFailure.status, 3, connectionFailure.stderr);
  assert.match(connectionFailure.stdout, /failed to reach/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command rejects unsupported --format values before invoking the service', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const result = runCli(
    ['guard', '--format=unknown', 'docs/product/features/DUMMY.md'],
    cwd,
    {
      EUTELO_GUARD_STUB_RESULT: 'success'
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid --format value: unknown/);

  fs.rmSync(cwd, { recursive: true, force: true });
});
