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
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-check-'));
  const initResult = runCli(['init'], cwd, env);
  assert.equal(initResult.status, 0, initResult.stderr);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function bootstrapDocs(cwd) {
  assert.equal(runCli(['add', 'prd', 'AUTH'], cwd).status, 0);
  assert.equal(runCli(['add', 'sub-prd', 'AUTH', 'LOGIN'], cwd).status, 0);
  assert.equal(runCli(['add', 'sub-beh', 'AUTH', 'LOGIN'], cwd).status, 0);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

test('eutelo check reports success and supports JSON output', () => {
  const cwd = setupProject();
  try {
    bootstrapDocs(cwd);

    const textResult = runCli(['check'], cwd);
    assert.equal(textResult.status, 0, textResult.stderr);
    assert.match(textResult.stdout, /No issues/i);

    const jsonResult = runCli(['check', '--format=json'], cwd);
    assert.equal(jsonResult.status, 0, jsonResult.stderr);
    const parsed = JSON.parse(jsonResult.stdout);
    assert.ok(Array.isArray(parsed.issues));
    assert.equal(parsed.issues.length, 0);
  } finally {
    cleanup(cwd);
  }
});

test('check fails when a required frontmatter field is missing', () => {
  const cwd = setupProject();
  try {
    runCli(['add', 'prd', 'AUTH'], cwd);
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'AUTH', 'PRD-AUTH.md');
    const content = readFile(prdPath);
    const updated = content.replace(/purpose:[\s\S]*?\n(status:[^\n]*\n)/, '$1');
    writeFile(prdPath, updated);

    const result = runCli(['check', '--format=json'], cwd);
    assert.equal(result.status, 2, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.issues[0].field, 'purpose');
  } finally {
    cleanup(cwd);
  }
});

test('check detects invalid naming patterns based on document type', () => {
  const cwd = setupProject();
  try {
    runCli(['add', 'prd', 'AUTH'], cwd);
    const dir = path.join(cwd, 'eutelo-docs', 'product', 'features', 'AUTH');
    fs.renameSync(path.join(dir, 'PRD-AUTH.md'), path.join(dir, 'AUTH-PRD.md'));

    const result = runCli(['check', '--format=json'], cwd);
    assert.equal(result.status, 2, result.stdout);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.issues[0].type, 'invalidName');
    assert.match(payload.issues[0].message, /PRD/i);
  } finally {
    cleanup(cwd);
  }
});

test('check reports parent references that point to missing IDs', () => {
  const cwd = setupProject();
  try {
    runCli(['add', 'prd', 'AUTH'], cwd);
    runCli(['add', 'sub-prd', 'AUTH', 'LOGIN'], cwd);
    const subPrdPath = path.join(
      cwd,
      'eutelo-docs',
      'product',
      'features',
      'AUTH',
      'SUB-PRD-LOGIN.md'
    );
    const updated = readFile(subPrdPath).replace(/parent: .*\n/, 'parent: PRD-NOT-EXIST\n');
    writeFile(subPrdPath, updated);

    const result = runCli(['check', '--format=json'], cwd);
    assert.equal(result.status, 2, result.stdout);
    const payload = JSON.parse(result.stdout);
    const issue = payload.issues.find((entry) => entry.type === 'parentNotFound');
    assert.ok(issue, 'expected parentNotFound issue');
    assert.equal(issue.parentId, 'PRD-NOT-EXIST');
  } finally {
    cleanup(cwd);
  }
});
