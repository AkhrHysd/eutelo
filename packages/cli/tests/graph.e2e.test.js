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

// ============================================================================
// E2E Tests for graph related command (DOC-GUARD-GRAPH-INTEGRATION)
// ============================================================================

test('graph related shows related documents for a given document', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'related', 'PRD-AUTH'], cwd);
    assert.equal(result.status, 0, result.stderr);
    // Should show related documents (BEH-AUTH, DSG-AUTH are children of PRD-AUTH)
    assert.match(result.stdout, /BEH-AUTH|DSG-AUTH/);
  } finally {
    cleanup(cwd);
  }
});

test('graph related --format=json outputs parseable JSON', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'related', 'PRD-AUTH', '--format=json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    const parsed = JSON.parse(result.stdout);
    assert.ok(Array.isArray(parsed.related), 'JSON output should have related array');
    assert.ok('stats' in parsed, 'JSON output should have stats field');
  } finally {
    cleanup(cwd);
  }
});

test('graph related with --depth=2 collects documents up to 2 hops', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'related', 'PRD-AUTH', '--depth=2'], cwd);
    assert.equal(result.status, 0, result.stderr);
    // Should show related documents
    assert.ok(result.stdout.includes('BEH-AUTH') || result.stdout.includes('DSG-AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('graph related with --all collects all reachable documents', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'related', 'PRD-AUTH', '--all'], cwd);
    assert.equal(result.status, 0, result.stderr);
    // Should show all related documents
    assert.ok(result.stdout.includes('BEH-AUTH') || result.stdout.includes('DSG-AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('graph related with --direction=upstream shows only parent documents', () => {
  const cwd = setupProject();
  try {
    // BEH-AUTH has PRD-AUTH as parent
    const result = runCli(['graph', 'related', 'BEH-AUTH', '--direction=upstream'], cwd);
    assert.equal(result.status, 0, result.stderr);
    // Should show parent document PRD-AUTH
    assert.match(result.stdout, /PRD-AUTH/);
  } finally {
    cleanup(cwd);
  }
});

test('graph related returns error for non-existent document', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['graph', 'related', 'NON-EXISTENT'], cwd);
    assert.notEqual(result.status, 0, 'should fail for non-existent document');
  } finally {
    cleanup(cwd);
  }
});
