import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const CLI_PATH = path.resolve('packages/cli/bin/eutelo.js');

function runCli(args, cwd) {
  return spawnSync('node', [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: process.env
  });
}

function setupTempProject(prefix = 'eutelo-cli-config-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function writeJsonConfig(cwd, config) {
  fs.writeFileSync(path.join(cwd, 'eutelo.config.json'), JSON.stringify(config, null, 2));
}

test('config inspect prints scaffold entries and guard prompts in text mode', () => {
  const cwd = setupTempProject();
  try {
    writeJsonConfig(cwd, {
      scaffold: {
        'feature.prd': {
          id: 'feature.prd',
          kind: 'prd',
          path: 'docs/product/features/{FEATURE}/PRD-{FEATURE}.md',
          template: '_template-prd.md'
        }
      },
      frontmatter: {
        schemas: [
          {
            kind: 'prd',
            fields: {
              id: { type: 'string', required: true }
            }
          }
        ]
      },
      guard: {
        prompts: {
          purpose: {
            id: 'purpose',
            templatePath: 'guard/purpose.md',
            model: 'gpt-4o-mini'
          }
        }
      }
    });

    const result = runCli(['config', 'inspect', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Config file:/);
    assert.match(result.stdout, /feature\.prd/);
    assert.match(result.stdout, /guard\/purpose\.md/);
  } finally {
    cleanup(cwd);
  }
});

test('config inspect supports --format json for machine-readable output', () => {
  const cwd = setupTempProject('eutelo-cli-config-json-');
  try {
    writeJsonConfig(cwd, {
      scaffold: {
        'feature.beh': {
          id: 'feature.beh',
          kind: 'beh',
          path: 'docs/{FEATURE}/BEH-{FEATURE}.md',
          template: '_template-beh.md'
        }
      }
    });

    const result = runCli(
      ['config', 'inspect', '--config', 'eutelo.config.json', '--format', 'json'],
      cwd
    );
    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.scaffold['feature.beh'].template, '_template-beh.md');
  } finally {
    cleanup(cwd);
  }
});

test('config inspect reports validation errors', () => {
  const cwd = setupTempProject('eutelo-cli-config-error-');
  try {
    writeJsonConfig(cwd, {
      frontmatter: {
        schemas: [
          {
            kind: 'prd',
            fields: {
              title: { type: 'invalid' }
            }
          }
        ]
      }
    });

    const result = runCli(['config', 'inspect', '--config', 'eutelo.config.json'], cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unsupported frontmatter field type/);
  } finally {
    cleanup(cwd);
  }
});
