import assert from 'node:assert/strict';
import test from 'node:test';
import { RuleEngine } from '../dist/index.js';

const DOCS_ROOT = '/repo/eutelo-docs';

function createEngine(fileExists = async () => true) {
  return new RuleEngine({ docsRoot: DOCS_ROOT, fileExists });
}

test('RuleEngine flags id format mismatches based on path expectations', async () => {
  const engine = createEngine();
  const { issues } = await engine.lint({
    content: ['---', 'id: WRONG', 'type: prd', 'feature: auth', 'purpose: test', 'parent: PRD-ROOT', '---', '# Title'].join('\n'),
    filePath: `${DOCS_ROOT}/product/features/auth/PRD-AUTH.md`
  });

  assert.ok(issues.some((issue) => issue.ruleId === 'id-format-invalid'));
});

test('RuleEngine detects type mismatches based on folder layout', async () => {
  const engine = createEngine();
  const { issues } = await engine.lint({
    content: ['---', 'id: PRD-AUTH', 'type: behavior', 'feature: auth', 'purpose: test', 'parent: PRD-ROOT', '---', '# Title'].join('\n'),
    filePath: `${DOCS_ROOT}/product/features/auth/PRD-AUTH.md`
  });

  assert.ok(issues.some((issue) => issue.ruleId === 'type-mismatch-path'));
});

test('RuleEngine reports missing parent documents', async () => {
  const engine = createEngine(async () => false);
  const { issues } = await engine.lint({
    content: ['---', 'id: BEH-AUTH', 'type: behavior', 'feature: auth', 'purpose: test', 'parent: PRD-UNKNOWN', '---', '# Title'].join('\n'),
    filePath: `${DOCS_ROOT}/product/features/auth/BEH-AUTH.md`
  });

  const parentIssue = issues.find((issue) => issue.ruleId === 'parent-not-found');
  assert.ok(parentIssue);
  assert.equal(parentIssue?.field, 'parent');
});

test('RuleEngine enforces an H1 heading as the first body element', async () => {
  const engine = createEngine();
  const { issues } = await engine.lint({
    content: ['---', 'id: PRD-AUTH', 'type: prd', 'feature: auth', 'purpose: test', 'parent: PRD-ROOT', '---', '## Subtitle'].join('\n'),
    filePath: `${DOCS_ROOT}/product/features/auth/PRD-AUTH.md`
  });

  assert.ok(issues.some((issue) => issue.ruleId === 'missing-h1-heading'));
});
