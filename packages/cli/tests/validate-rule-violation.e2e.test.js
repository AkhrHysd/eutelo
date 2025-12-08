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

test('rule detects rule violations', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-validate-'));
  
  try {
    // Initialize project
    const init = runCli(['init'], cwd);
    assert.equal(init.status, 0, init.stderr);

    // Create rule file
    const rulesDir = path.join(cwd, 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const ruleFile = path.join(rulesDir, 'prd-validation.md');
    fs.writeFileSync(ruleFile, `---
version: "1.0"
description: "PRD Validation Rules"
---

## Frontmatter Rules

### Required Fields
- \`purpose\`: 必須。空文字列不可
- \`type\`: 必須。値: \`prd\`
`);

    // Create or update config to include rules
    const configFile = path.join(cwd, 'eutelo.config.json');
    let config;
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } else {
      config = {
        presets: ['@eutelo/preset-default'],
        docsRoot: 'new-docs',
        directoryStructure: {}
      };
    }
    // Ensure directoryStructure exists
    if (!config.directoryStructure) {
      config.directoryStructure = {};
    }
    if (!config.directoryStructure['spec/{FEATURE}']) {
      config.directoryStructure['spec/{FEATURE}'] = [
        {
          file: 'PRD-{FEATURE}.md',
          kind: 'prd',
          type: 'prd',
          template: 'templates/prd.md',
          prefix: 'PRD-',
          variables: ['FEATURE'],
          tags: ['prd', 'feature'],
          frontmatterDefaults: {
            type: 'prd',
            parent: '/'
          }
        }
      ];
    }
    const prdDef = config.directoryStructure['spec/{FEATURE}'].find((d) => d.kind === 'prd');
    if (prdDef) {
      prdDef.rules = 'rules/prd-validation.md';
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    // Create templates directory and PRD template
    const templatesDir = path.join(cwd, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'prd.md'), `---
id: PRD-{FEATURE}
type: prd
feature: {FEATURE}
title: {FEATURE} 機能 PRD
purpose: Test purpose
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["{FEATURE}"]
last_updated: "2025-01-27"
---

# PRD-{FEATURE}

## Purpose
Test purpose
`);

    // Create PRD document manually instead of using add command
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    fs.writeFileSync(prdFile, `---
id: PRD-TEST
type: prd
feature: TEST
title: TEST 機能 PRD
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["TEST"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose
Test purpose
`);

    // Run validate
    const result = runCli(['rule', prdFile], cwd);

    // Should detect the violation
    assert(result.stdout.includes('purpose') || result.stdout.includes('必須') || result.stdout.includes('error'), 
      `Expected purpose error, got: ${result.stdout}`);
    
    // Exit code should be 1 (rule violation)
    assert.equal(result.status, 1, `Expected exit code 1, got ${result.status}. stdout: ${result.stdout}, stderr: ${result.stderr}`);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('rule returns success for valid documents', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-validate-'));
  
  try {
    // Initialize project
    const init = runCli(['init'], cwd);
    assert.equal(init.status, 0, init.stderr);

    // Create rule file
    const rulesDir = path.join(cwd, 'rules');
    fs.mkdirSync(rulesDir, { recursive: true });
    const ruleFile = path.join(rulesDir, 'prd-validation.md');
    fs.writeFileSync(ruleFile, `---
version: "1.0"
description: "PRD Validation Rules"
---

## Frontmatter Rules

### Required Fields
- \`purpose\`: 必須。空文字列不可
`);

    // Create or update config to include rules
    const configFile = path.join(cwd, 'eutelo.config.json');
    let config;
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } else {
      config = {
        presets: ['@eutelo/preset-default'],
        docsRoot: 'new-docs',
        directoryStructure: {}
      };
    }
    // Ensure directoryStructure exists
    if (!config.directoryStructure) {
      config.directoryStructure = {};
    }
    if (!config.directoryStructure['spec/{FEATURE}']) {
      config.directoryStructure['spec/{FEATURE}'] = [
        {
          file: 'PRD-{FEATURE}.md',
          kind: 'prd',
          type: 'prd',
          template: 'templates/prd.md',
          prefix: 'PRD-',
          variables: ['FEATURE'],
          tags: ['prd', 'feature'],
          frontmatterDefaults: {
            type: 'prd',
            parent: '/'
          }
        }
      ];
    }
    const prdDef = config.directoryStructure['spec/{FEATURE}'].find((d) => d.kind === 'prd');
    if (prdDef) {
      prdDef.rules = 'rules/prd-validation.md';
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    // Create templates directory and PRD template
    const templatesDir = path.join(cwd, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(path.join(templatesDir, 'prd.md'), `---
id: PRD-{FEATURE}
type: prd
feature: {FEATURE}
title: {FEATURE} 機能 PRD
purpose: Test purpose
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["{FEATURE}"]
last_updated: "2025-01-27"
---

# PRD-{FEATURE}

## Purpose
Test purpose
`);

    // Create PRD document manually with purpose
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    fs.writeFileSync(prdFile, `---
id: PRD-TEST
type: prd
feature: TEST
title: TEST 機能 PRD
purpose: Test purpose
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["TEST"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose
Test purpose
`);

    // Run rule with stub mode
    const result = runCli(['rule', prdFile], cwd, {
      EUTELO_VALIDATE_STUB_RESULT: 'success'
    });

    // Should pass validation
    assert(result.stdout.includes('Validated') || result.stdout.includes('✓'), 
      `Expected success message, got: ${result.stdout}`);
    
    // Exit code should be 0 (success)
    assert.equal(result.status, 0, `Expected exit code 0, got ${result.status}. stdout: ${result.stdout}, stderr: ${result.stderr}`);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('rule handles missing rule file gracefully', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-validate-'));
  
  try {
    // Initialize project
    const init = runCli(['init'], cwd);
    assert.equal(init.status, 0, init.stderr);

    // Create or update config to reference non-existent rule file
    const configFile = path.join(cwd, 'eutelo.config.json');
    let config;
    if (fs.existsSync(configFile)) {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } else {
      config = {
        presets: ['@eutelo/preset-default'],
        docsRoot: 'new-docs',
        directoryStructure: {}
      };
    }
    if (!config.directoryStructure) {
      config.directoryStructure = {};
    }
    if (!config.directoryStructure['spec/{FEATURE}']) {
      config.directoryStructure['spec/{FEATURE}'] = [
        {
          file: 'PRD-{FEATURE}.md',
          kind: 'prd',
          type: 'prd',
          template: 'templates/prd.md',
          prefix: 'PRD-',
          variables: ['FEATURE'],
          tags: ['prd', 'feature'],
          frontmatterDefaults: {
            type: 'prd',
            parent: '/'
          }
        }
      ];
    }
    const prdDef = config.directoryStructure['spec/{FEATURE}'].find((d) => d.kind === 'prd');
    if (prdDef) {
      prdDef.rules = 'rules/nonexistent.md';
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    // Create PRD document manually
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    fs.writeFileSync(prdFile, `---
id: PRD-TEST
type: prd
feature: TEST
title: TEST 機能 PRD
purpose: Test purpose
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["TEST"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose
Test purpose
`);

    // Run validate
    const result = runCli(['rule', prdFile], cwd);

    // Should report rule file not found
    assert(result.stdout.includes('not found') || result.stdout.includes('Rule file'), 
      `Expected rule file error, got: ${result.stdout}`);
    
    // Exit code should be 2 (system error)
    assert.equal(result.status, 2, `Expected exit code 2, got ${result.status}. stdout: ${result.stdout}, stderr: ${result.stderr}`);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('rule supports --format=json', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-validate-'));
  
  try {
    // Initialize project
    const init = runCli(['init'], cwd);
    assert.equal(init.status, 0, init.stderr);

    // Create PRD document manually
    const docsDir = path.join(cwd, 'new-docs', 'spec', 'TEST');
    fs.mkdirSync(docsDir, { recursive: true });
    const prdFile = path.join(docsDir, 'PRD-TEST.md');
    fs.writeFileSync(prdFile, `---
id: PRD-TEST
type: prd
feature: TEST
title: TEST 機能 PRD
purpose: Test purpose
status: draft
version: 0.1
parent: PRINCIPLE-GLOBAL
owners: []
tags: ["TEST"]
last_updated: "2025-01-27"
---

# PRD-TEST

## Purpose
Test purpose
`);

    // Run validate with JSON format
    const result = runCli(['rule', '--format', 'json', prdFile], cwd);

    // Should output valid JSON
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(result.stdout);
    } catch (e) {
      assert.fail(`Expected valid JSON, got: ${result.stdout}`);
    }

    assert(jsonOutput.summary !== undefined);
    assert(Array.isArray(jsonOutput.results));
    
    // Exit code should be 0 (no rules specified, so no violations)
    assert.equal(result.status, 0, `Expected exit code 0, got ${result.status}. stdout: ${result.stdout}, stderr: ${result.stderr}`);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
