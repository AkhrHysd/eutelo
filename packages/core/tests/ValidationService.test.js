import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { ValidationService } from '../dist/index.js';

const fsp = fs.promises;

class RealFsAdapter {
  async readDir(targetPath) {
    try {
      return await fsp.readdir(targetPath);
    } catch (error) {
      if (error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async stat(targetPath) {
    return await fsp.stat(targetPath);
  }

  async readFile(targetPath) {
    return await fsp.readFile(targetPath, 'utf8');
  }
}

function writeDoc(baseDir, relativePath, frontmatterLines, body = '# Document') {
  const target = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const frontmatter = ['---', ...frontmatterLines, '---', '', body, ''].join('\n');
  fs.writeFileSync(target, frontmatter, 'utf8');
  return target;
}

function setupWorkspace(structureBuilder) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-validation-'));
  structureBuilder(cwd);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('ValidationService reports no issues for valid documents', async () => {
  const adapter = new RealFsAdapter();
  const service = new ValidationService({ fileSystemAdapter: adapter });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'purpose: Define authentication goals',
      'parent: PRINCIPLE-GLOBAL'
    ]);
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/SUB-PRD-LOGIN.md', [
      'id: SUB-PRD-LOGIN',
      'type: prd',
      'feature: AUTH',
      'purpose: Login improvements',
      'parent: PRD-AUTH'
    ]);
  });
  try {
    const report = await service.runChecks({ cwd });
    assert.equal(report.issues.length, 0);
  } finally {
    cleanup(cwd);
  }
});

test('ValidationService flags missing mandatory fields', async () => {
  const adapter = new RealFsAdapter();
  const service = new ValidationService({ fileSystemAdapter: adapter });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'parent: PRINCIPLE-GLOBAL'
    ]);
  });
  try {
    const report = await service.runChecks({ cwd });
    const issue = report.issues.find((entry) => entry.field === 'purpose');
    assert.ok(issue, 'missing purpose should be reported');
  } finally {
    cleanup(cwd);
  }
});

test('ValidationService detects mismatched file names', async () => {
  const adapter = new RealFsAdapter();
  const service = new ValidationService({ fileSystemAdapter: adapter });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/AUTH-PRD.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'purpose: Auth',
      'parent: PRINCIPLE-GLOBAL'
    ]);
  });
  try {
    const report = await service.runChecks({ cwd });
    const issue = report.issues.find((entry) => entry.type === 'invalidName');
    assert.ok(issue, 'invalidName issue expected');
    assert.match(issue.message, /PRD/i);
  } finally {
    cleanup(cwd);
  }
});

test('ValidationService reports missing parent references', async () => {
  const adapter = new RealFsAdapter();
  const service = new ValidationService({ fileSystemAdapter: adapter });
  const cwd = setupWorkspace((root) => {
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/PRD-AUTH.md', [
      'id: PRD-AUTH',
      'type: prd',
      'feature: AUTH',
      'purpose: Auth',
      'parent: PRINCIPLE-GLOBAL'
    ]);
    writeDoc(path.join(root, 'eutelo-docs'), 'product/features/AUTH/SUB-PRD-LOGIN.md', [
      'id: SUB-PRD-LOGIN',
      'type: prd',
      'feature: AUTH',
      'purpose: Login',
      'parent: PRD-MISSING'
    ]);
  });
  try {
    const report = await service.runChecks({ cwd });
    const issue = report.issues.find((entry) => entry.type === 'parentNotFound');
    assert.ok(issue, 'parentNotFound issue expected');
    assert.equal(issue.parentId, 'PRD-MISSING');
  } finally {
    cleanup(cwd);
  }
});
