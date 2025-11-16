import assert from 'node:assert/strict';
import test from 'node:test';
import { FrontmatterParser } from '../dist/index.js';

test('parses frontmatter at the top of the document', () => {
  const parser = new FrontmatterParser();
  const result = parser.parse(
    ['---', 'id: PRD-AUTH', 'type: prd', 'feature: AUTH', 'purpose: Auth docs', 'parent: PRINCIPLE-GLOBAL', '---', '# Title'].join('\n')
  );

  assert.ok(result.frontmatter);
  assert.equal(result.frontmatter?.id, 'PRD-AUTH');
  assert.equal(result.frontmatter?.type, 'prd');
  assert.equal(result.frontmatter?.feature, 'AUTH');
  assert.equal(result.frontmatter?.purpose, 'Auth docs');
  assert.equal(result.frontmatter?.parent, 'PRINCIPLE-GLOBAL');
  assert.equal(result.issues.length, 0);
});

test('returns an error when frontmatter is not at the top', () => {
  const parser = new FrontmatterParser();
  const result = parser.parse(
    ['# Intro', '', '---', 'id: PRD-LATE', 'type: prd', 'feature: LATE', 'purpose: misplaced', 'parent: PRINCIPLE-GLOBAL', '---'].join('\n')
  );

  const topIssue = result.issues.find((issue) => issue.ruleId === 'frontmatter-not-at-top');
  assert.ok(topIssue);
  assert.equal(topIssue.severity, 'error');
});

test('reports missing required fields', () => {
  const parser = new FrontmatterParser();
  const result = parser.parse(['---', 'id: PRD-MISSING', 'type: prd', 'feature: MISS', '---', '', '# Body'].join('\n'));

  const missingFields = result.issues
    .filter((issue) => issue.ruleId === 'missing-required-field')
    .map((issue) => issue.field)
    .sort();
  assert.deepEqual(missingFields, ['parent', 'purpose']);
});

test('warns about unknown fields', () => {
  const parser = new FrontmatterParser();
  const result = parser.parse(
    [
      '---',
      'id: PRD-WARN',
      'type: prd',
      'feature: WARN',
      'purpose: Check unknown',
      'parent: PRINCIPLE-GLOBAL',
      'ownerName: Alice',
      '---'
    ].join('\n')
  );

  const unknown = result.issues.find((issue) => issue.ruleId === 'unknown-field');
  assert.ok(unknown);
  assert.equal(unknown?.field, 'ownerName');
  assert.equal(unknown?.severity, 'warning');
});
