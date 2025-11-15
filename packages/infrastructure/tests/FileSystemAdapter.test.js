import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { FileSystemAdapter } from '../dist/index.js';

test('mkdirp creates nested directories on disk', async () => {
  const adapter = new FileSystemAdapter();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-fs-integration-'));
  const nestedPath = path.join(cwd, 'a/b/c');

  const result = await adapter.mkdirp(nestedPath);

  assert.equal(result, nestedPath);
  assert.ok(fs.existsSync(nestedPath));

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('writeIfNotExists does not overwrite existing files', async () => {
  const adapter = new FileSystemAdapter();
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-fs-integration-'));
  const filePath = path.join(cwd, 'existing/file.txt');

  await adapter.writeIfNotExists(filePath, 'initial');
  const secondAttempt = await adapter.writeIfNotExists(filePath, 'changed');

  assert.deepEqual(secondAttempt, { written: false, skipped: true });
  assert.equal(fs.readFileSync(filePath, 'utf8'), 'initial');

  fs.rmSync(cwd, { recursive: true, force: true });
});
