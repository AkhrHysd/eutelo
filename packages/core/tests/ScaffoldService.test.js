import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { REQUIRED_DIRECTORIES, ScaffoldService } from '../dist/index.js';

class MemoryFileSystemAdapter {
  constructor(existing = new Set()) {
    this.existing = existing;
    this.created = [];
  }

  async exists(targetPath) {
    return this.existing.has(targetPath);
  }

  async mkdirp(targetPath) {
    this.created.push(targetPath);
    this.existing.add(targetPath);
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
  const adapter = new MemoryFileSystemAdapter(new Set([existingPath]));
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
  const adapter = new MemoryFileSystemAdapter(new Set([existingPath]));
  const service = new ScaffoldService({ fileSystemAdapter: adapter });

  const result = await service.init({ cwd, dryRun: false });

  assert.ok(result.created.length > 0);
  assert.ok(result.skipped.includes('eutelo-docs'));
  assert.equal(adapter.created.length, REQUIRED_DIRECTORIES.length - 1);
  assert.equal(result.dryRun, false);

  fs.rmSync(cwd, { recursive: true, force: true });
});
