import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeStructure, resolveParentPath } from '../dist/index.js';

const DOCS_ROOT = 'eutelo-docs';

function resolve(relative) {
  return `${DOCS_ROOT}/${relative}`;
}

test('StructureAnalyzer infers type and feature for PRD path', () => {
  const result = analyzeStructure(resolve('product/features/auth/PRD-AUTH.md'));
  assert.ok(result);
  assert.equal(result?.type, 'prd');
  assert.equal(result?.feature, 'auth');
  assert.ok(result?.idPattern.test('PRD-AUTH'));
});

test('StructureAnalyzer returns null for unsupported layout', () => {
  const result = analyzeStructure(resolve('random/notes.md'));
  assert.equal(result, null);
});

test('resolveParentPath builds expected document paths', () => {
  const prdPath = resolveParentPath('PRD-AUTH', DOCS_ROOT);
  assert.equal(prdPath, `${DOCS_ROOT}/product/features/auth/PRD-AUTH.md`);

  const behPath = resolveParentPath('BEH-AUTH', DOCS_ROOT);
  assert.equal(behPath, `${DOCS_ROOT}/product/features/auth/BEH-AUTH.md`);

  assert.equal(resolveParentPath('DSG-AUTH', DOCS_ROOT), `${DOCS_ROOT}/architecture/design/auth/DSG-AUTH.md`);
  assert.equal(resolveParentPath('ADR-0001', DOCS_ROOT), `${DOCS_ROOT}/architecture/adr/ADR-0001.md`);
  assert.equal(resolveParentPath('TASK-DOC-LINT', DOCS_ROOT), `${DOCS_ROOT}/tasks/TASK-DOC-LINT.md`);
  assert.equal(resolveParentPath('OPS-001', DOCS_ROOT), `${DOCS_ROOT}/ops/OPS-001.md`);
});
