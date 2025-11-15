import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function writeDoc(baseDir, relativePath, frontmatterLines, body = '# Document Body') {
  const target = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = ['---', ...frontmatterLines, '---', '', body, ''].join('\n');
  fs.writeFileSync(target, content, 'utf8');
  return relativePath;
}

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

function createGuardDoc(cwd) {
  return writeDoc(
    cwd,
    'docs/product/features/DOCS/PRD-DOCS.md',
    [
      'id: PRD-DOCS',
      'type: prd',
      'feature: DOCS',
      'purpose: Validate docs',
      'parent: PRINCIPLE-GLOBAL'
    ],
    '# Guard Test Body'
  );
}

test('guard command reports stubbed success output', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const docPath = createGuardDoc(cwd);
  const result = runCli(['guard', docPath], cwd, {
    EUTELO_GUARD_STUB_RESULT: 'success'
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Stubbed guard evaluation/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command reports configuration errors when API key is missing', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const docPath = createGuardDoc(cwd);
  const result = runCli(['guard', docPath], cwd);

  assert.equal(result.status, 3, result.stderr);
  assert.match(result.stdout, /LLM API key is not configured/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command supports --format=json for structured output', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const docPath = createGuardDoc(cwd);
  const result = runCli(
    ['guard', '--format=json', '--fail-on-error', docPath],
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
  const docPath = createGuardDoc(cwd);

  const warnOnly = runCli(
    ['guard', '--warn-only', docPath],
    cwd,
    { EUTELO_GUARD_STUB_RESULT: 'issues' }
  );
  assert.equal(warnOnly.status, 0, warnOnly.stderr);
  assert.match(warnOnly.stdout, /Issues:/);

  const connectionFailure = runCli(['guard', docPath], cwd, {
    EUTELO_GUARD_STUB_RESULT: 'connection-error'
  });
  assert.equal(connectionFailure.status, 3, connectionFailure.stderr);
  assert.match(connectionFailure.stdout, /LLM connection failed/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('guard command rejects unsupported --format values before invoking the service', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-guard-'));
  const docPath = createGuardDoc(cwd);
  const result = runCli(
    ['guard', '--format=unknown', docPath],
    cwd,
    {
      EUTELO_GUARD_STUB_RESULT: 'success'
    }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid --format value: unknown/);

  fs.rmSync(cwd, { recursive: true, force: true });
});
