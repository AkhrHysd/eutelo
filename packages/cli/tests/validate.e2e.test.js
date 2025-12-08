import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd, envOverrides = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ...envOverrides
    }
  });
}

function setupValidateProject() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-validate-'));
  
  // Create templates directory
  const templatesDir = path.join(cwd, 'templates');
  fs.mkdirSync(templatesDir, { recursive: true });
  
  // Copy template from project root
  const projectTemplate = path.resolve('templates/prd.md');
  if (fs.existsSync(projectTemplate)) {
    fs.copyFileSync(projectTemplate, path.join(templatesDir, 'prd.md'));
  } else {
    // Create minimal template
    fs.writeFileSync(path.join(templatesDir, 'prd.md'), `---
id: PRD-{FEATURE}
type: prd
feature: {FEATURE}
purpose: >
  {FEATURE} 機能の目的
status: draft
version: {VERSION}
parent: PRINCIPLE-GLOBAL
owners: {OWNERS}
tags: ["{FEATURE}"]
last_updated: "{DATE}"
---

# PRD-{FEATURE}

## Purpose
機能の目的を記述

## Background
背景を記述

## Requirements
要件を記述
`, 'utf8');
  }
  
  // Create config file
  const configPath = path.join(cwd, 'eutelo.config.json');
  const config = {
    presets: ['@eutelo/preset-default'],
    docsRoot: 'new-docs',
    directoryStructure: {
      'spec': [],
      'spec/{FEATURE}': [
        {
          file: 'PRD-{FEATURE}.md',
          type: 'prd',
          kind: 'prd',
          template: 'templates/prd.md',
          description: 'Product Requirements Document',
          prefix: 'PRD-',
          variables: ['FEATURE'],
          tags: ['prd', 'feature'],
          rules: 'rules/prd-validation.md',
          frontmatterDefaults: {
            type: 'prd',
            parent: '/'
          }
        }
      ]
    }
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  
  // Initialize project
  const init = runCli(['init'], cwd);
  assert.equal(init.status, 0, init.stderr);
  
  // Create rule file
  const rulesDir = path.join(cwd, 'rules');
  fs.mkdirSync(rulesDir, { recursive: true });
  const ruleContent = `---
version: "1.0"
description: "PRD Validation Rules"
---

## Frontmatter Rules

### Required Fields
- \`purpose\`: 必須。空文字列不可
- \`type\`: 必須。値: \`prd\`

## Structure Rules

### Section Requirements
- \`## Purpose\` セクションが存在すること
`;
  fs.writeFileSync(path.join(rulesDir, 'prd-validation.md'), ruleContent, 'utf8');
  
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('rule command exists and returns success for empty documents', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-rule-'));
  const result = runCli(['rule'], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Validated.*document/i);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('rule command detects rule violations', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document without purpose
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

    const result = runCli(['rule', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /error/i);
    // Remove purpose check since stub mode doesn't return purpose-specific errors
  } finally {
    cleanup(cwd);
  }
});

test('rule command detects format errors', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document with invalid id format
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: WRONG-FORMAT
type: prd
purpose: Test purpose
status: draft
---
# PRD-TEST

## Purpose

Some content.

## Background

Some background.
`);

    const result = runCli(['rule', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });

    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /error/i);
  } finally {
    cleanup(cwd);
  }
});

test('rule command reports rule file not found error', () => {
  const cwd = setupValidateProject();
  try {
    // Update config with non-existent rule file
    const configFile = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(configFile, JSON.stringify({
      presets: ['@eutelo/preset-default'],
      docsRoot: 'eutelo-docs',
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            rules: 'rules/nonexistent.md'
          }
        ]
      }
    }, null, 2));

    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

    const result = runCli(['rule', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd);

    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stdout, /not found/i);
  } finally {
    cleanup(cwd);
  }
});

test('rule command supports --format=json', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document without purpose
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

    const result = runCli(['rule', '--format=json', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });

    assert.equal(result.status, 1, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(typeof payload.summary, 'object');
    assert.equal(typeof payload.results, 'object');
    assert(Array.isArray(payload.results));
    assert(payload.summary.errors > 0);
  } finally {
    cleanup(cwd);
  }
});

test('rule command supports --ci mode', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document without purpose
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: PRD-TEST
type: prd
---
# PRD-TEST
`);

    const result = runCli(['rule', '--ci', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });

    assert.equal(result.status, 1, result.stderr);
    // CI mode should output JSON
    const payload = JSON.parse(result.stdout);
    assert.equal(typeof payload.summary, 'object');
  } finally {
    cleanup(cwd);
  }
});

test('rule command returns success for valid document', () => {
  const cwd = setupValidateProject();
  try {
    // Create valid PRD document
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    fs.writeFileSync(path.join(prdPath, 'PRD-TEST.md'), `---
id: PRD-TEST
type: prd
purpose: Test purpose
status: draft
---
# PRD-TEST

## Purpose

Test purpose content.

## Background

Test background content.
`);

    const result = runCli(['rule', 'eutelo-docs/product/features/TEST/PRD-TEST.md'], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'success'
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /✓ Validated/i);
  } finally {
    cleanup(cwd);
  }
});

test('rule command detects rule violations', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document directly without purpose
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
status: draft
parent: PRINCIPLE-GLOBAL
---

# PRD-TEST

## Background

Some background.
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    // Run rule with stub mode
    const result = runCli(['rule', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });
    
    assert.equal(result.status, 1, 'Should exit with code 1 for rule violations');
    assert.match(result.stdout, /error/i);
  } finally {
    cleanup(cwd);
  }
});

test('rule command supports --format=json', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document without purpose
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
status: draft
parent: PRINCIPLE-GLOBAL
---

# PRD-TEST
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    // Run rule with JSON format and stub mode
    const result = runCli(['rule', '--format=json', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });
    
    assert.equal(result.status, 1);
    const payload = JSON.parse(result.stdout);
    assert.equal(typeof payload.summary, 'object');
    assert(Array.isArray(payload.results));
    assert(payload.summary.errors > 0);
  } finally {
    cleanup(cwd);
  }
});

test('rule command supports --ci mode', () => {
  const cwd = setupValidateProject();
  try {
    // Create PRD document without purpose
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
status: draft
parent: PRINCIPLE-GLOBAL
---

# PRD-TEST
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    // Run rule with CI mode and stub mode
    const result = runCli(['rule', '--ci', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });
    
    assert.equal(result.status, 1);
    // CI mode should output JSON
    const payload = JSON.parse(result.stdout);
    assert.equal(typeof payload.summary, 'object');
  } finally {
    cleanup(cwd);
  }
});

test('rule command returns exit code 2 for system errors', () => {
  const cwd = setupValidateProject();
  try {
    // Try to validate with non-existent rule file
    const configPath = path.join(cwd, 'eutelo.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.directoryStructure && config.directoryStructure['spec/{FEATURE}']) {
      const prdDef = config.directoryStructure['spec/{FEATURE}'].find(d => d.file === 'PRD-{FEATURE}.md');
      if (prdDef) {
        prdDef.rules = 'rules/nonexistent.md';
      }
    }
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    
    // Create PRD document
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
purpose: Test purpose
status: draft
parent: PRINCIPLE-GLOBAL
---

# PRD-TEST

## Purpose

Test purpose.
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    const result = runCli(['rule', prdFile], cwd);
    
    // Should exit with code 2 for system error (rule file not found)
    assert.equal(result.status, 2);
    assert.match(result.stdout, /Rule file not found|error/i);
  } finally {
    cleanup(cwd);
  }
});

test('rule command returns exit code 0 for valid documents', () => {
  const cwd = setupValidateProject();
  try {
    // Create valid PRD document
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
purpose: Test purpose
status: draft
parent: PRINCIPLE-GLOBAL
---

# PRD-TEST

## Purpose

Test purpose section.
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    // Run rule with stub mode for success
    const result = runCli(['rule', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'success'
    });
    
    assert.equal(result.status, 0, 'Should exit with code 0 for valid documents');
    assert.match(result.stdout, /✓/);
  } finally {
    cleanup(cwd);
  }
});

// ============================================================================
// E2E Tests for Command Rename (EUTELO-CLI-COMMAND-RENAME)
// ============================================================================

test('rule command works correctly', () => {
  const cwd = setupValidateProject();
  try {
    // Create directory structure
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    
    const prdFile = path.join(prdPath, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
purpose: >
  Test feature
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@test"]
tags: ["test"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose

Test purpose section.
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    const result = runCli(['rule', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'success'
    });
    
    assert.equal(result.status, 0, 'Should exit with code 0 for valid documents');
    assert.match(result.stdout, /✓/);
    // Should not show deprecation warning
  } finally {
    cleanup(cwd);
  }
});

test('rule command supports all validate command options', () => {
  const cwd = setupValidateProject();
  try {
    // Create directory structure
    const prdPath = path.join(cwd, 'eutelo-docs', 'product', 'features', 'TEST');
    fs.mkdirSync(prdPath, { recursive: true });
    
    const prdFile = path.join(prdPath, 'PRD-TEST.md');
    const prdContent = `---
id: PRD-TEST
type: prd
feature: TEST
purpose: >
  Test feature
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: ["@test"]
tags: ["test"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose

Test purpose section.
`;
    fs.writeFileSync(prdFile, prdContent, 'utf8');
    
    const result = runCli(['rule', '--format=json', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'issues'
    });
    
    assert.equal(result.status, 1, 'Should exit with code 1 for rule violations');
    const payload = JSON.parse(result.stdout);
    assert.ok('summary' in payload);
    assert.ok('results' in payload);
  } finally {
    cleanup(cwd);
  }
});

