import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { PromptBuilder } from '../dist/guard/PromptBuilder.js';

test('PromptBuilder uses template file from guard prompts', async () => {
  const builder = new PromptBuilder();
  const templatePath = path.resolve('packages/preset-default/prompts/guard-system.md');
  const documents = [
    {
      path: 'docs/product/features/AUTH/PRD-AUTH.md',
      type: 'prd',
      id: 'PRD-AUTH',
      parent: 'PRINCIPLE-GLOBAL',
      feature: 'AUTH',
      purpose: 'Auth purpose',
      content: '# PRD-AUTH'
    }
  ];

  const { systemPrompt, userPrompt } = await builder.buildPrompt({
    documents,
    promptConfig: { id: 'guard.default', templatePath }
  });

  assert.ok(systemPrompt.includes('documentation consistency checker'));
  assert.match(userPrompt, /PRD-AUTH/);
});
