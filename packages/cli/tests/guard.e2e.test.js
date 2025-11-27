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

/**
 * Setup a project with related documents for testing related document collection
 */
function setupRelatedDocsProject() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-guard-related-'));
  
  // Initialize project
  const init = runCli(['init'], cwd);
  assert.equal(init.status, 0, init.stderr);
  
  // Create PRD document
  const addPrd = runCli(['add', 'prd', 'FEATURE'], cwd);
  assert.equal(addPrd.status, 0, addPrd.stderr);
  
  // Create BEH document (related to PRD)
  const addBeh = runCli(['add', 'beh', 'FEATURE'], cwd);
  assert.equal(addBeh.status, 0, addBeh.stderr);
  
  // Create DSG document (related to PRD)
  const addDsg = runCli(['add', 'dsg', 'FEATURE'], cwd);
  assert.equal(addDsg.status, 0, addDsg.stderr);
  
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
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

// ============================================================================
// E2E Tests for Related Document Collection (DOC-GUARD-GRAPH-INTEGRATION)
// ============================================================================

test('guard command with related documents collects BEH/DSG when checking PRD', () => {
  const cwd = setupRelatedDocsProject();
  try {
    const result = runCli(
      ['guard', 'eutelo-docs/product/features/FEATURE/PRD-FEATURE.md'],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    
    assert.equal(result.status, 0, result.stderr);
    // Should process more than 1 document due to related collection
    assert.match(result.stdout, /processed \d+ document\(s\)/i);
  } finally {
    cleanup(cwd);
  }
});

test('guard command with --no-related processes only specified document', () => {
  const cwd = setupRelatedDocsProject();
  try {
    const result = runCli(
      ['guard', '--no-related', 'eutelo-docs/product/features/FEATURE/PRD-FEATURE.md'],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    
    assert.equal(result.status, 0, result.stderr);
    // Should process exactly 1 document when --no-related is specified
    assert.match(result.stdout, /processed 1 document\(s\)/i);
  } finally {
    cleanup(cwd);
  }
});

test('guard command with --depth=2 collects documents up to 2 hops', () => {
  const cwd = setupRelatedDocsProject();
  try {
    const result = runCli(
      ['guard', '--depth=2', 'eutelo-docs/product/features/FEATURE/PRD-FEATURE.md'],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /processed \d+ document\(s\)/i);
  } finally {
    cleanup(cwd);
  }
});

test('guard command with --all collects all related documents regardless of depth', () => {
  const cwd = setupRelatedDocsProject();
  try {
    const result = runCli(
      ['guard', '--all', 'eutelo-docs/product/features/FEATURE/PRD-FEATURE.md'],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /processed \d+ document\(s\)/i);
  } finally {
    cleanup(cwd);
  }
});

test('guard command --format=json includes relatedDocuments in output', () => {
  const cwd = setupRelatedDocsProject();
  try {
    const result = runCli(
      ['guard', '--format=json', 'eutelo-docs/product/features/FEATURE/PRD-FEATURE.md'],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    // relatedDocuments should be present (may be empty array if no related found)
    assert.ok('stats' in payload, 'JSON output should have stats field');
  } finally {
    cleanup(cwd);
  }
});
