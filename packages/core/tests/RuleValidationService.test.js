import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createRuleValidationService } from '../dist/rule-validation/RuleValidationService.js';
import { FileSystemAdapter } from '@eutelo/infrastructure';
import { loadConfig } from '../dist/config/index.js';

test('RuleValidationService validates documents with rules', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-validation-'));
  
  // Create rule file
  const rulesDir = path.join(cwd, 'rules');
  await fs.mkdir(rulesDir, { recursive: true });
  const ruleFile = path.join(rulesDir, 'prd-validation.md');
  await fs.writeFile(ruleFile, `---
version: "1.0"
description: "PRD Validation Rules"
---

## Frontmatter Rules

### Required Fields
- \`purpose\`: 必須。空文字列不可
`);

  // Create config file
  const configFile = path.join(cwd, 'eutelo.config.json');
  await fs.writeFile(configFile, JSON.stringify({
    docsRoot: 'docs',
    directoryStructure: {
      'spec/{FEATURE}': [
        {
          file: 'PRD-{FEATURE}.md',
          kind: 'prd',
          rules: 'rules/prd-validation.md'
        }
      ]
    }
  }, null, 2));

  // Create document without purpose
  const docsDir = path.join(cwd, 'docs', 'spec', 'TEST');
  await fs.mkdir(docsDir, { recursive: true });
  const docFile = path.join(docsDir, 'PRD-TEST.md');
  await fs.writeFile(docFile, `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

  // Load config
  const config = await loadConfig({ cwd, configFile });

  // Create service
  const service = createRuleValidationService({
    fileSystemAdapter: new FileSystemAdapter(),
    cwd,
    docsRoot: 'docs',
    config
  });

  // Run validation with stub mode
  const originalStub = process.env.EUTELO_VALIDATE_STUB_RESULT;
  process.env.EUTELO_VALIDATE_STUB_RESULT = 'issues';
  const result = await service.runValidation({
    documents: [docFile]
  });
  if (originalStub) {
    process.env.EUTELO_VALIDATE_STUB_RESULT = originalStub;
  } else {
    delete process.env.EUTELO_VALIDATE_STUB_RESULT;
  }

  assert.equal(result.summary.total, 1);
  assert(result.results.length > 0, `Expected results, got: ${JSON.stringify(result.results)}`);
  
  // Check if validation found issues
  const firstResult = result.results[0];
  assert(firstResult.issues.length > 0, `Expected issues, got: ${JSON.stringify(firstResult.issues)}`);
  
  // Check for purpose-related error (either in message, rule name, or hint)
  const hasPurposeError = firstResult.issues.some(issue => 
    issue.severity === 'error' && 
    (issue.rule.includes('purpose') || 
     issue.message.includes('purpose') || 
     issue.hint?.includes('purpose') ||
     issue.message.includes('必須') ||
     issue.message.includes('missing'))
  );
  assert(hasPurposeError, `Expected purpose error, got: ${JSON.stringify(firstResult.issues)}`);

  await fs.rm(cwd, { recursive: true, force: true });
});

test('RuleValidationService returns empty result for documents without rules', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-validation-'));
  
  // Create config file without rules
  const configFile = path.join(cwd, 'eutelo.config.json');
  await fs.writeFile(configFile, JSON.stringify({
    docsRoot: 'docs',
    directoryStructure: {
      'spec/{FEATURE}': [
        {
          file: 'PRD-{FEATURE}.md',
          kind: 'prd'
          // No rules field
        }
      ]
    }
  }, null, 2));

  // Create document
  const docsDir = path.join(cwd, 'docs', 'spec', 'TEST');
  await fs.mkdir(docsDir, { recursive: true });
  const docFile = path.join(docsDir, 'PRD-TEST.md');
  await fs.writeFile(docFile, `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

  // Load config
  const config = await loadConfig({ cwd, configFile });

  // Create service
  const service = createRuleValidationService({
    fileSystemAdapter: new FileSystemAdapter(),
    cwd,
    docsRoot: 'docs',
    config
  });

  // Run validation
  const result = await service.runValidation({
    documents: [docFile]
  });

  assert.equal(result.summary.total, 1);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.results[0].issues.length, 0);

  await fs.rm(cwd, { recursive: true, force: true });
});

test('RuleValidationService handles empty documents list', async () => {
  const service = createRuleValidationService();
  const result = await service.runValidation({
    documents: []
  });

  assert.equal(result.summary.total, 0);
  assert.equal(result.summary.errors, 0);
  assert.equal(result.results.length, 0);
});

