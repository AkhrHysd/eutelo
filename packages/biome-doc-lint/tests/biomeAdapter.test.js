import assert from 'node:assert/strict';
import test from 'node:test';
import { createBiomeDocLintPlugin, createDocLintDiagnostics, recommended } from '../dist/index.js';

test('recommended config exposes doc-lint defaults', () => {
  assert.equal(recommended.name, '@eutelo/biome-doc-lint/recommended');
  assert.equal(recommended.rules['doc-lint'], 'error');
});

test('biome adapter converts parser issues to diagnostics', async () => {
  const diagnostics = await createDocLintDiagnostics(['---', 'id: ADR', '---', '', '# Body'].join('\n'));
  assert.ok(diagnostics.some((diagnostic) => diagnostic.message.includes('Missing required field')));
});

test('plugin wrapper delegates to the adapter', async () => {
  const plugin = createBiomeDocLintPlugin();
  const results = await plugin.analyzeText('# no frontmatter', 'eutelo-docs/product/features/auth/PRD-AUTH.md');

  assert.ok(results.some((entry) => entry.message.includes('Frontmatter block is required')));
});
