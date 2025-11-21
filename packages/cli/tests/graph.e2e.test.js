import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: process.env
  });
}

function setupProject() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-graph-cli-'));
  const init = runCli(['init'], cwd);
  assert.equal(init.status, 0, init.stderr);
  const addPrd = runCli(['add', 'prd', 'AUTH'], cwd);
  assert.equal(addPrd.status, 0, addPrd.stderr);
  const addBeh = runCli(['add', 'beh', 'AUTH'], cwd);
  assert.equal(addBeh.status, 0, addBeh.stderr);
  const addDsg = runCli(['add', 'dsg', 'AUTH'], cwd);
  assert.equal(addDsg.status, 0, addDsg.stderr);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('graph build --format=json outputs serialized graph', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'build', '--format=json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.ok(Array.isArray(parsed.nodes));
    assert.ok(parsed.nodes.some((node) => node.id === 'PRD-AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('graph show lists parents and children', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'show', 'PRD-AUTH'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Parents:\s*\(none\)/);
    assert.match(result.stdout, /Children:[\s\S]*BEH-AUTH/);
  } finally {
    cleanup(cwd);
  }
});

test('graph impact surfaces hop distances', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'impact', 'PRD-AUTH'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /hop=1 \[must-review\] BEH-AUTH/);
  } finally {
    cleanup(cwd);
  }
});
