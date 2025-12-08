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

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('CLI works with project-local config that has no presets (generic migration)', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-migration-generic-'));
  try {
    const templatesDir = path.join(cwd, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });
    fs.writeFileSync(
      path.join(templatesDir, 'prd.md'),
      ['---', 'id: {ID}', 'type: prd', 'feature: {FEATURE}', 'purpose: custom', 'parent: {PARENT}', '---', '', '# Body', ''].join(
        '\n'
      )
    );
    fs.writeFileSync(path.join(cwd, 'guard-prompt.md'), 'PROMPT', 'utf8');

    const config = {
      docsRoot: 'docs',
      scaffold: {
        'document.prd': {
          id: 'document.prd',
          kind: 'prd',
          path: 'prd/{FEATURE}/PRD-{FEATURE}.md',
          template: './templates/prd.md',
          variables: {
            ID: 'PRD-{FEATURE}',
            PARENT: 'ROOT-LOCAL'
          }
        }
      },
      frontmatter: {
        schemas: [
          {
            kind: 'prd',
            fields: {
              id: { type: 'string', required: true },
              type: { type: 'string', required: true },
              feature: { type: 'string', required: true },
              purpose: { type: 'string', required: true },
              parent: { type: 'string', required: true }
            }
          }
        ],
        rootParentIds: ['ROOT-LOCAL']
      },
      guard: {
        prompts: {
          'guard.default': {
            id: 'guard.default',
            templatePath: './guard-prompt.md'
          }
        }
      }
    };
    fs.writeFileSync(path.join(cwd, 'eutelo.config.json'), JSON.stringify(config, null, 2));

    const addResult = runCli(['add', 'prd', 'GENERIC', '--config', 'eutelo.config.json'], cwd);
    assert.equal(addResult.status, 0, addResult.stderr);
    const prdPath = path.join(cwd, 'docs', 'prd', 'GENERIC', 'PRD-GENERIC.md');
    assert.ok(fs.existsSync(prdPath));

    const alignResult = runCli(
      ['align', '--format=json', '--config', 'eutelo.config.json', prdPath],
      cwd,
      { EUTELO_GUARD_STUB_RESULT: 'success' }
    );
    assert.equal(alignResult.status, 0, alignResult.stderr);
    const payload = JSON.parse(alignResult.stdout);
    assert.equal(payload.error, null);
  } finally {
    cleanup(cwd);
  }
});

test('align fails clearly when config has no guard prompts (preset missing)', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-migration-no-preset-'));
  try {
    const docPath = path.join(cwd, 'docs', 'PRD-NO-PRESET.md');
    fs.mkdirSync(path.dirname(docPath), { recursive: true });
    fs.writeFileSync(
      docPath,
      ['---', 'id: PRD-NO-PRESET', 'type: prd', 'feature: NONE', 'purpose: test', 'parent: ROOT', '---', '', '# Body', ''].join(
        '\n'
      )
    );
    fs.writeFileSync(path.join(cwd, 'eutelo.config.json'), JSON.stringify({ guard: {}, scaffold: {} }, null, 2));

    const result = runCli(['align', '--format=json', '--config', 'eutelo.config.json', docPath], cwd, {
      NODE_ENV: 'test'
    });
    assert.notEqual(result.status, 0, 'align should fail when prompts are missing');
    const payload = JSON.parse(result.stdout);
    assert.match(payload.summary, /environment variables are missing/i);
    assert.equal(payload.error.type, 'configuration');
  } finally {
    cleanup(cwd);
  }
});
