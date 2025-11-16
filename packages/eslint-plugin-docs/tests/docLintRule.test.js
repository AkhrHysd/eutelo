import assert from 'node:assert/strict';
import test from 'node:test';
import plugin from '../dist/index.js';

test('recommended config registers the doc-lint rule', () => {
  assert.ok(plugin.configs.recommended.plugins['eutelo-docs']);
  assert.equal(plugin.configs.recommended.rules['eutelo-docs/doc-lint'], 'error');
});

test('doc-lint rule reports frontmatter violations', async () => {
  const rule = plugin.rules['doc-lint'];
  const reports = [];
  const context = {
    report: (descriptor) => reports.push(descriptor),
    getSourceCode: () => ({
      text: ['# Intro', '', '---', 'id: ADR-TEST', 'type: adr', 'feature: DOC', '---'].join('\n')
    }),
    getFilename: () => '/repo/eutelo-docs/architecture/adr/ADR-TEST.md'
  };
  const listeners = rule.create(context);
  await listeners.Program?.({});

  assert.ok(reports.some((entry) => entry.message.includes('Frontmatter must start at the first line')));
});
