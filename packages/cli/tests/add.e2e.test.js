import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd, env = {}) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

function setupProject(env = {}) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-add-'));
  const initResult = runCli(['init'], cwd, env);
  assert.equal(initResult.status, 0, initResult.stderr);
  return cwd;
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]+?)\n---/);
  assert.ok(match, 'expected frontmatter block');
  const lines = match[1].split('\n');
  const data = {};
  for (const line of lines) {
    if (!line.trim()) continue;
    const [key, ...rest] = line.split(':');
    data[key.trim()] = rest.join(':').trim();
  }
  return data;
}

test('eutelo add prd creates a PRD file with correct frontmatter', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['add', 'prd', 'AUTH'], cwd);
    assert.equal(result.status, 0, result.stderr);

    const target = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
    assert.ok(fs.existsSync(target), 'PRD file should exist');
    const frontmatter = readFrontmatter(target);
    assert.equal(frontmatter.id, 'PRD-AUTH');
    assert.ok(frontmatter.feature?.includes('AUTH'));
  } finally {
    cleanup(cwd);
  }
});

test('add prd refuses to overwrite existing files', () => {
  const cwd = setupProject();
  try {
    const first = runCli(['add', 'prd', 'AUTH'], cwd);
    assert.equal(first.status, 0, first.stderr);
    const target = path.join(cwd, 'eutelo-docs/product/features/AUTH/PRD-AUTH.md');
    const original = fs.readFileSync(target, 'utf8');

    const second = runCli(['add', 'prd', 'AUTH'], cwd);
    assert.notEqual(second.status, 0);
    assert.equal(fs.readFileSync(target, 'utf8'), original);
  } finally {
    cleanup(cwd);
  }
});

test('add beh/sub-prd/sub-beh generate linked documents', () => {
  const cwd = setupProject();
  try {
    runCli(['add', 'prd', 'AUTH'], cwd);
    const beh = runCli(['add', 'beh', 'AUTH'], cwd);
    assert.equal(beh.status, 0, beh.stderr);
    const behFile = path.join(cwd, 'eutelo-docs/product/features/AUTH/BEH-AUTH.md');
    const behFrontmatter = readFrontmatter(behFile);
    assert.equal(behFrontmatter.parent, 'PRD-AUTH');

    const subPrd = runCli(['add', 'sub-prd', 'AUTH', 'LOGIN'], cwd);
    assert.equal(subPrd.status, 0, subPrd.stderr);
    const subPrdFile = path.join(cwd, 'eutelo-docs/product/features/AUTH/SUB-PRD-LOGIN.md');
    const subPrdFrontmatter = readFrontmatter(subPrdFile);
    assert.equal(subPrdFrontmatter.parent, 'PRD-AUTH');

    const subBeh = runCli(['add', 'sub-beh', 'AUTH', 'LOGIN'], cwd);
    assert.equal(subBeh.status, 0, subBeh.stderr);
    const subBehFile = path.join(cwd, 'eutelo-docs/product/features/AUTH/BEH-AUTH-LOGIN.md');
    const subBehFrontmatter = readFrontmatter(subBehFile);
    assert.equal(subBehFrontmatter.parent, 'SUB-PRD-LOGIN');
  } finally {
    cleanup(cwd);
  }
});

test('add dsg/adr/task/ops cover architecture and ops documents', () => {
  const cwd = setupProject();
  try {
    runCli(['add', 'prd', 'AUTH'], cwd);
    const dsg = runCli(['add', 'dsg', 'AUTH'], cwd);
    assert.equal(dsg.status, 0, dsg.stderr);
    const dsgFile = path.join(cwd, 'eutelo-docs/architecture/design/AUTH/DSG-AUTH.md');
    assert.ok(fs.existsSync(dsgFile));

    const adrFirst = runCli(['add', 'adr', 'AUTH'], cwd);
    assert.equal(adrFirst.status, 0, adrFirst.stderr);
    const adrFirstPath = path.join(cwd, 'eutelo-docs/architecture/adr/ADR-AUTH-0001.md');
    assert.ok(fs.existsSync(adrFirstPath));

    const adrSecond = runCli(['add', 'adr', 'AUTH'], cwd);
    assert.equal(adrSecond.status, 0, adrSecond.stderr);
    const adrSecondPath = path.join(cwd, 'eutelo-docs/architecture/adr/ADR-AUTH-0002.md');
    assert.ok(fs.existsSync(adrSecondPath));

    const task = runCli(['add', 'task', 'setup-ci'], cwd);
    assert.equal(task.status, 0, task.stderr);
    const taskFile = path.join(cwd, 'eutelo-docs/tasks/TASK-setup-ci.md');
    assert.ok(fs.existsSync(taskFile));

    const ops = runCli(['add', 'ops', 'doc-scaffold-ci'], cwd);
    assert.equal(ops.status, 0, ops.stderr);
    const opsFile = path.join(cwd, 'eutelo-docs/ops/OPS-doc-scaffold-ci.md');
    assert.ok(fs.existsSync(opsFile));
  } finally {
    cleanup(cwd);
  }
});

test('add custom document type from config works', () => {
  const cwd = setupProject();
  try {
    // Create custom template first
    const templateDir = path.join(cwd, 'templates');
    fs.mkdirSync(templateDir, { recursive: true });
    const templateContent = `---
id: {ID}
type: custom
feature: {FEATURE}
---

# Custom Document: {FEATURE}
`;
    fs.writeFileSync(path.join(templateDir, '_template-custom.md'), templateContent, 'utf8');

    // Create custom config with custom document type
    const configPath = path.join(cwd, 'eutelo.config.ts');
    const configContent = `export default {
      scaffold: {
        'document.custom': {
          id: 'document.custom',
          kind: 'custom',
          path: 'custom/{FEATURE}/CUSTOM-{FEATURE}.md',
          template: './templates/_template-custom.md',
          variables: {
            ID: 'CUSTOM-{FEATURE}'
          }
        }
      },
      frontmatter: {
        schemas: [
          {
            kind: 'custom',
            fields: {
              id: { type: 'string', required: true },
              type: { type: 'string', required: true },
              feature: { type: 'string', required: true }
            }
          }
        ]
      }
    };`;
    fs.writeFileSync(configPath, configContent, 'utf8');

    // Run custom command
    const result = runCli(['add', 'custom', 'TEST'], cwd);
    assert.equal(result.status, 0, result.stderr);

    const target = path.join(cwd, 'eutelo-docs/custom/TEST/CUSTOM-TEST.md');
    assert.ok(fs.existsSync(target), 'Custom document file should exist');
    const frontmatter = readFrontmatter(target);
    assert.equal(frontmatter.id, 'CUSTOM-TEST');
    assert.equal(frontmatter.type, 'custom');
  } finally {
    cleanup(cwd);
  }
});

test('add unknown document type reports error with available types', () => {
  const cwd = setupProject();
  try {
    const result = runCli(['add', 'unknown-type', 'TEST'], cwd);
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes('Document type'), 'Should mention document type');
    assert.ok(result.stderr.includes('Available types'), 'Should list available types');
  } finally {
    cleanup(cwd);
  }
});

test('add reports missing templates when template root lacks files', () => {
  const cwd = setupProject();
  try {
    // Create a config with a scaffold entry pointing to a non-existent template
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          presets: [],
          scaffold: {
            'custom.doc': {
              id: 'custom.doc',
              kind: 'custom',
              path: 'docs/{FEATURE}/CUSTOM-{FEATURE}.md',
              template: 'nonexistent-template.md'
            }
          }
        },
        null,
        2
      )
    );
    const result = runCli(['add', 'custom', 'AUTH', '--config', configPath], cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /template/i);
  } finally {
    cleanup(cwd);
  }
});

test('add commands honor EUTELO_DOCS_ROOT override', () => {
  const env = { EUTELO_DOCS_ROOT: 'custom-docs' };
  const cwd = setupProject(env);
  try {
    const result = runCli(['add', 'prd', 'AUTH'], cwd, env);
    assert.equal(result.status, 0, result.stderr);
    const target = path.join(cwd, 'custom-docs', 'product', 'features', 'AUTH', 'PRD-AUTH.md');
    assert.ok(fs.existsSync(target));
  } finally {
    cleanup(cwd);
  }
});

test('add commands use project-local config templates and docsRoot', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-add-config-'));
  try {
    const templatesDir = path.join(cwd, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    const templatePath = path.join(templatesDir, '_custom-prd.md');
    fs.writeFileSync(
      templatePath,
      ['---', 'id: {ID}', 'parent: {PARENT}', 'feature: {FEATURE}', 'purpose: custom', '---', '', '# Body', ''].join('\n'),
      'utf8'
    );

    const config = {
      docsRoot: 'custom-docs-config',
      scaffold: {
        'document.prd': {
          id: 'document.prd',
          kind: 'prd',
          path: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
          template: './templates/_custom-prd.md',
          variables: {
            ID: 'PRD-{FEATURE}',
            PARENT: 'ROOT-LOCAL'
          }
        }
      }
    };
    fs.writeFileSync(path.join(cwd, 'eutelo.config.json'), JSON.stringify(config, null, 2));

    const result = runCli(['add', 'prd', 'AUTH', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);

    const target = path.join(cwd, 'custom-docs-config', 'product', 'features', 'AUTH', 'PRD-AUTH.md');
    assert.ok(fs.existsSync(target), 'PRD should be created under custom docs root');
    const frontmatter = readFrontmatter(target);
    assert.equal(frontmatter.parent, 'ROOT-LOCAL');
    assert.equal(frontmatter.purpose, 'custom');
  } finally {
    cleanup(cwd);
  }
});
