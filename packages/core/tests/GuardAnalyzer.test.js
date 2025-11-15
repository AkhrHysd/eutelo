import assert from 'node:assert/strict';
import test from 'node:test';
import { Analyzer } from '../dist/index.js';

test('Analyzer parses JSON payloads into findings', () => {
  const analyzer = new Analyzer();
  const result = analyzer.analyze(
    JSON.stringify({
      summary: 'Conflicts found',
      issues: [{ id: 'ISSUE-1', message: 'Purpose conflict', document: 'PRD-AUTH.md' }],
      warnings: [],
      suggestions: [{ id: 'SUG-1', message: 'Add coverage' }]
    })
  );

  assert.equal(result.summary, 'Conflicts found');
  assert.equal(result.issues.length, 1);
  assert.equal(result.suggestions.length, 1);
});

test('Analyzer falls back to section parsing when JSON is unavailable', () => {
  const analyzer = new Analyzer();
  const response = `
Summary: Potential conflicts
Issues:
- PRD-AUTH.md: Purpose mismatch
Warnings:
- BEH-AUTH: Missing scope
`;
  const result = analyzer.analyze(response);
  assert.equal(result.issues.length, 1);
  assert.equal(result.warnings.length, 1);
});
