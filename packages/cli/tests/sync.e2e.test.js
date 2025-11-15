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
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-sync-'));
  const init = runCli(['init'], cwd, env);
  assert.equal(init.status, 0, init.stderr);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function ensureFeatureArtifacts(cwd, feature = 'AUTH') {
  const beh = runCli(['add', 'beh', feature], cwd);
  assert.equal(beh.status, 0, beh.stderr);
  const dsg = runCli(['add', 'dsg', feature], cwd);
  assert.equal(dsg.status, 0, dsg.stderr);
}

test('eutelo sync generates missing PRDs without touching existing files', () => {
  const cwd = setupProject();
  try {
    ensureFeatureArtifacts(cwd, 'AUTH');
    const behPath = path.join(cwd, 'eutelo-docs/product/features/AUTH/BEH-AUTH.md');
    const dsgPath = path.join(cwd, 'eutelo-docs/architecture/design/AUTH/DSG-AUTH.md');
    const behContent = fs.readFileSync(behPath, 'utf8');
    const dsgContent = fs.readFileSync(dsgPath, 'utf8');

    const result = runCli(['sync'], cwd);

    assert.equal(result.status, 0, result.stderr);
    const prdPath = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
    assert.ok(fs.existsSync(prdPath), 'PRD file should be created by sync');
    assert.equal(fs.readFileSync(behPath, 'utf8'), behContent);
    assert.equal(fs.readFileSync(dsgPath, 'utf8'), dsgContent);
  } finally {
    cleanup(cwd);
  }
});

test('sync is a no-op when all documents exist', () => {
  const cwd = setupProject();
  try {
    ensureFeatureArtifacts(cwd, 'AUTH');
    const createPrd = runCli(['add', 'prd', 'AUTH'], cwd);
    assert.equal(createPrd.status, 0, createPrd.stderr);
    const prdPath = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
    const before = fs.readFileSync(prdPath, 'utf8');

    const result = runCli(['sync'], cwd);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No changes/);
    assert.equal(fs.readFileSync(prdPath, 'utf8'), before);
  } finally {
    cleanup(cwd);
  }
});

test('sync --check-only reports missing files without writing', () => {
  const cwd = setupProject();
  try {
    ensureFeatureArtifacts(cwd, 'AUTH');
    const prdPath = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');

    const result = runCli(['sync', '--check-only'], cwd);

    assert.equal(result.status, 1);
    assert.match(result.stdout, /Missing documents/);
    assert.ok(!fs.existsSync(prdPath));
  } finally {
    cleanup(cwd);
  }
});

test('sync never overwrites an existing PRD file', () => {
  const cwd = setupProject();
  try {
    ensureFeatureArtifacts(cwd, 'AUTH');
    const prdPath = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
    fs.mkdirSync(path.dirname(prdPath), { recursive: true });
    fs.writeFileSync(prdPath, 'custom content');

    const result = runCli(['sync'], cwd);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No changes/);
    assert.equal(fs.readFileSync(prdPath, 'utf8'), 'custom content');
  } finally {
    cleanup(cwd);
  }
});
