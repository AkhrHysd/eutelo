import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const WORKFLOW_PATH = path.resolve('.github/workflows/guard.yml');

function readWorkflow() {
  return fs.readFileSync(WORKFLOW_PATH, 'utf8');
}

test('guard workflow installs project deps and runs guard via CLI adapter', () => {
  const content = readWorkflow();
  assert.match(content, /npm ci/, 'workflow should install project dependencies');
  assert.match(content, /npx\s+eutelo guard/, 'workflow should call eutelo guard via npx');
  assert.ok(
    !/npm install -g @eutelo\/cli/.test(content),
    'workflow should not rely on global CLI install'
  );
});
