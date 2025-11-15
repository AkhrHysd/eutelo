import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REQUIRED_DIRECTORIES, ScaffoldService } from '../dist/index.js';

class MemoryFileSystemAdapter {
  constructor({ directories = new Set(), files = new Map() } = {}) {
    this.directories = directories;
    this.files = files;
    this.created = [];
  }

  async exists(targetPath) {
    return this.directories.has(targetPath) || this.files.has(targetPath);
  }

  async mkdirp(targetPath) {
    this.created.push(targetPath);
    this.directories.add(targetPath);
  }

  async writeIfNotExists(targetPath, content) {
    if (this.files.has(targetPath)) {
      return { written: false, skipped: true };
    }
    this.files.set(targetPath, content);
    this.directories.add(path.dirname(targetPath));
    return { written: true, skipped: false };
  }

  async listDirectories(targetPath) {
    const prefix = targetPath.endsWith(path.sep) ? targetPath : `${targetPath}${path.sep}`;
    const children = new Set();
    for (const dir of this.directories) {
      if (!dir.startsWith(prefix)) {
        continue;
      }
      const remainder = dir.slice(prefix.length);
      if (!remainder) {
        continue;
      }
      const [child] = remainder.split(path.sep);
      if (child) {
        children.add(child);
      }
    }
    return Array.from(children);
  }
}

class StubTemplateService {
  constructor() {
    this.calls = [];
  }

  async render(_templateName, variables) {
    this.calls.push({ variables });
    return `rendered-${variables.FEATURE}`;
  }
}

test('computeInitPlan lists every required directory when nothing exists', async () => {
  const adapter = new MemoryFileSystemAdapter();
  const service = new ScaffoldService({ fileSystemAdapter: adapter });
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-core-unit-'));

  const plan = await service.computeInitPlan({ cwd });

  assert.equal(plan.length, REQUIRED_DIRECTORIES.length);
  for (const dir of REQUIRED_DIRECTORIES) {
    assert.ok(plan.includes(path.resolve(cwd, dir)), `plan should include ${dir}`);
  }

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('computeInitPlan skips directories that already exist', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-core-unit-'));
  const existingPath = path.resolve(cwd, 'eutelo-docs');
  const adapter = new MemoryFileSystemAdapter({ directories: new Set([existingPath]) });
  const service = new ScaffoldService({ fileSystemAdapter: adapter });

  const plan = await service.computeInitPlan({ cwd });

  assert.equal(plan.length, REQUIRED_DIRECTORIES.length - 1);
  assert.ok(!plan.includes(existingPath));

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init respects dryRun and does not call mkdirp', async () => {
  const adapter = new MemoryFileSystemAdapter();
  const service = new ScaffoldService({ fileSystemAdapter: adapter });
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-core-unit-'));

  const result = await service.init({ cwd, dryRun: true });

  assert.equal(adapter.created.length, 0);
  assert.equal(result.created.length, REQUIRED_DIRECTORIES.length);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.dryRun, true);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init creates missing directories and reports skipped ones', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-core-unit-'));
  const existingPath = path.resolve(cwd, 'eutelo-docs');
  const adapter = new MemoryFileSystemAdapter({ directories: new Set([existingPath]) });
  const service = new ScaffoldService({ fileSystemAdapter: adapter });

  const result = await service.init({ cwd, dryRun: false });

  assert.ok(result.created.length > 0);
  assert.ok(result.skipped.includes('eutelo-docs'));
  assert.equal(adapter.created.length, REQUIRED_DIRECTORIES.length - 1);
  assert.equal(result.dryRun, false);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('computeSyncPlan identifies missing PRDs for discovered features', async () => {
  const cwd = '/tmp/eutelo-sync-plan';
  const featureDir = path.join(cwd, 'eutelo-docs', 'product', 'features', 'AUTH');
  const adapter = new MemoryFileSystemAdapter({ directories: new Set([featureDir]) });
  const templateService = new StubTemplateService();
  const service = new ScaffoldService({ fileSystemAdapter: adapter, templateService });

  const plan = await service.computeSyncPlan({ cwd });

  assert.equal(plan.length, 1);
  assert.equal(plan[0].featureId, 'AUTH');
  assert.equal(
    plan[0].relativePath,
    path.join('eutelo-docs', 'product', 'features', 'AUTH', 'PRD-AUTH.md')
  );
});

test('sync writes missing PRDs when not running in check-only mode', async () => {
  const cwd = '/tmp/eutelo-sync-write';
  const featureDir = path.join(cwd, 'eutelo-docs', 'product', 'features', 'PAYMENTS');
  const adapter = new MemoryFileSystemAdapter({ directories: new Set([featureDir]) });
  const templateService = new StubTemplateService();
  const service = new ScaffoldService({ fileSystemAdapter: adapter, templateService });

  const result = await service.sync({ cwd, checkOnly: false });

  const expectedPath = path.join(
    cwd,
    'eutelo-docs',
    'product',
    'features',
    'PAYMENTS',
    'PRD-PAYMENTS.md'
  );
  assert.equal(adapter.files.get(expectedPath), 'rendered-PAYMENTS');
  assert.deepEqual(result.created, [path.relative(cwd, expectedPath)]);
});

test('sync in check-only mode reports plan without writing files', async () => {
  const cwd = '/tmp/eutelo-sync-check';
  const featureDir = path.join(cwd, 'eutelo-docs', 'product', 'features', 'DOCS');
  const adapter = new MemoryFileSystemAdapter({ directories: new Set([featureDir]) });
  const templateService = new StubTemplateService();
  const service = new ScaffoldService({ fileSystemAdapter: adapter, templateService });

  const result = await service.sync({ cwd, checkOnly: true });

  assert.equal(result.plan.length, 1);
  assert.equal(result.created.length, 0);
  assert.equal(adapter.files.size, 0);
});
