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

test('eutelo init creates required directories in a new project', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const result = runCli(['init'], cwd);

  assert.equal(result.status, 0, result.stderr);
  const expectedDirs = [
    'eutelo-docs',
    'eutelo-docs/product/features',
    'eutelo-docs/architecture/design',
    'eutelo-docs/architecture/adr',
    'eutelo-docs/tasks',
    'eutelo-docs/ops'
  ];
  for (const dir of expectedDirs) {
    assert.ok(fs.existsSync(path.join(cwd, dir)), `expected ${dir} to exist`);
  }

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init does not overwrite existing files and logs skips', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const existingDir = path.join(cwd, 'eutelo-docs/product/features');
  fs.mkdirSync(existingDir, { recursive: true });
  const readmePath = path.join(existingDir, 'README.md');
  fs.writeFileSync(readmePath, 'original content');

  const result = runCli(['init'], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(readmePath, 'utf8'), 'original content');
  assert.match(result.stdout, /Skipped/);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init --dry-run reports plan without touching disk', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));

  const result = runCli(['init', '--dry-run'], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dry run/);
  assert.match(result.stdout, /eutelo-docs/);
  assert.ok(!fs.existsSync(path.join(cwd, 'eutelo-docs')));

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init respects EUTELO_DOCS_ROOT override', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const customRoot = 'custom-docs';

  const result = runCli(['init'], cwd, { EUTELO_DOCS_ROOT: customRoot });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(cwd, customRoot)), 'custom root should exist');
  assert.ok(
    fs.existsSync(path.join(cwd, customRoot, 'architecture/adr')),
    'custom root should include adr directory'
  );

  fs.rmSync(cwd, { recursive: true, force: true });
});
