import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { GuardService } from '../dist/index.js';

class StubLLMClient {
  constructor() {
    this.lastCall = null;
  }

  async generate(options) {
    this.lastCall = options;
    return { content: JSON.stringify({ issues: [], warnings: [], suggestions: [] }) };
  }
}

function writeDoc(baseDir, relativePath, frontmatterLines, body = '# Doc') {
  const target = path.join(baseDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const frontmatter = ['---', ...frontmatterLines, '---', '', body, ''].join('\n');
  fs.writeFileSync(target, frontmatter, 'utf8');
  return target;
}

function setupWorkspace(builder) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-guard-'));
  builder(cwd);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('GuardService uses the prompt defined by config when checkId is specified', async () => {
  const cwd = setupWorkspace((root) => {
    const docsRoot = path.join(root, 'docs');
    writeDoc(docsRoot, 'PRD-TEST.md', [
      'id: PRD-TEST',
      'type: prd',
      'feature: TEST',
      'purpose: Test purpose',
      'parent: ROOT'
    ]);
  });

  const defaultPromptPath = path.join(cwd, 'prompt-default.md');
  const customPromptPath = path.join(cwd, 'prompt-custom.md');
  fs.writeFileSync(defaultPromptPath, 'DEFAULT-PROMPT', 'utf8');
  fs.writeFileSync(customPromptPath, 'CUSTOM-PROMPT', 'utf8');

  const originalEndpoint = process.env.EUTELO_GUARD_API_ENDPOINT;
  const originalKey = process.env.EUTELO_GUARD_API_KEY;
  process.env.EUTELO_GUARD_API_ENDPOINT = 'http://example.com';
  process.env.EUTELO_GUARD_API_KEY = 'dummy-key';

  const llm = new StubLLMClient();
  const service = new GuardService({
    llmClient: llm,
    prompts: {
      'guard.default': { id: 'guard.default', templatePath: defaultPromptPath, model: 'default-model' },
      'guard.purpose': { id: 'guard.purpose', templatePath: customPromptPath, model: 'custom-model', temperature: 0.1 }
    }
  });

  try {
    const result = await service.run({
      documents: [path.join(cwd, 'docs/PRD-TEST.md')],
      checkId: 'guard.purpose'
    });
    assert.equal(result.error, undefined);
    assert.ok(llm.lastCall, 'LLM should be invoked');
    assert.equal(llm.lastCall.systemPrompt, 'CUSTOM-PROMPT');
    assert.equal(llm.lastCall.model, 'custom-model');
  } finally {
    process.env.EUTELO_GUARD_API_ENDPOINT = originalEndpoint;
    process.env.EUTELO_GUARD_API_KEY = originalKey;
    cleanup(cwd);
  }
});

