import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd, env = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

function setupProject(env = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-lint-'));
  const initResult = runCli(['init'], cwd, env);
  assert.equal(initResult.status, 0, initResult.stderr);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function bootstrapDocs(cwd) {
  assert.equal(runCli(['add', 'prd', 'AUTH'], cwd).status, 0);
}

test('lint reports issues and exits non-zero', () => {
  const cwd = setupProject();
  try {
    bootstrapDocs(cwd);
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'AUTH', 'PRD-AUTH.md');
    const updated = fs.readFileSync(prdPath, 'utf8').replace(/^# /m, '## ');
    fs.writeFileSync(prdPath, updated, 'utf8');

    const result = runCli(['lint'], cwd);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stdout, /H1 heading/i);
  } finally {
    cleanup(cwd);
  }
});

test('lint supports JSON output', () => {
  const cwd = setupProject();
  try {
    bootstrapDocs(cwd);
    const result = runCli(['lint', '--format=json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.ok(Array.isArray(payload.results));
  } finally {
    cleanup(cwd);
  }
});
