import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  loadConfig,
  ConfigValidationError
} from '../dist/config/index.js';

function createTempDir(prefix = 'eutelo-config-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileRecursive(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content);
}

function writeJsonConfig(cwd, config) {
  writeFileRecursive(path.join(cwd, 'eutelo.config.json'), JSON.stringify(config, null, 2));
}

test('loadConfig resolves TypeScript config with scaffold/frontmatter/guard', async () => {
  const cwd = createTempDir();
  try {
    const configPath = path.join(cwd, 'eutelo.config.ts');
    writeFileRecursive(
      configPath,
      [
        'export default {',
        '  presets: [],',
        '  scaffold: {',
        "    'feature.prd': {",
        "      id: 'feature.prd',",
        "      kind: 'prd',",
        "      path: 'docs/product/features/{FEATURE}/PRD-{FEATURE}.md',",
        "      template: '_template-prd.md'",
        '    }',
        '  },',
        '  frontmatter: {',
        '    schemas: [',
        '      {',
        "        kind: 'prd',",
        '        fields: {',
        "          id: { type: 'string', required: true },",
        "          type: { type: 'string' }",
        '        }',
        '      }',
        '    ]',
        '  },',
        '  guard: {',
        '    prompts: {',
        "      purpose: { id: 'purpose', templatePath: 'guard/purpose.md', model: 'gpt-4o' }",
        '    }',
        '  }',
        '};'
      ].join('\n')
    );

    const resolved = await loadConfig({ cwd });

    assert.ok(resolved.scaffold['feature.prd']);
    assert.equal(
      resolved.scaffold['feature.prd'].path,
      'docs/product/features/{FEATURE}/PRD-{FEATURE}.md'
    );
    assert.equal(resolved.frontmatter.schemas.length, 1);
    assert.equal(resolved.frontmatter.schemas[0].kind, 'prd');
    assert.ok(resolved.guard.prompts.purpose);
    assert.equal(resolved.sources.configPath, configPath);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig merges presets in correct order', async () => {
  const cwd = createTempDir('eutelo-config-preset-');
  try {
    // preset base
    writeFileRecursive(
      path.join(cwd, 'node_modules', '@example', 'preset-base', 'index.js'),
      [
        'module.exports.euteloPreset = {',
        "  scaffold: {",
        "    'feature.prd': {",
        "      id: 'feature.prd',",
        "      kind: 'prd',",
        "      path: 'docs/prd/base.md',",
        "      template: 'base-template.md'",
        '    }',
        '  }',
        '};'
      ].join('\n')
    );

    // preset alpha (depends on base)
    writeFileRecursive(
      path.join(cwd, 'node_modules', '@example', 'preset-alpha', 'index.js'),
      [
        'module.exports.euteloPreset = {',
        "  presets: ['@example/preset-base'],",
        "  scaffold: {",
        "    'feature.prd': {",
        "      id: 'feature.prd',",
        "      kind: 'prd',",
        "      path: 'docs/prd/alpha.md',",
        "      template: 'alpha-template.md'",
        '    }',
        '  }',
        '};'
      ].join('\n')
    );

    // preset beta
    writeFileRecursive(
      path.join(cwd, 'node_modules', '@example', 'preset-beta', 'index.js'),
      [
        'module.exports.euteloPreset = {',
        "  scaffold: {",
        "    'feature.prd': {",
        "      id: 'feature.prd',",
        "      kind: 'prd',",
        "      path: 'docs/prd/beta.md',",
        "      template: 'beta-template.md'",
        '    }',
        '  },',
        '  guard: {',
        '    prompts: {',
        "      purpose: { id: 'purpose', templatePath: 'guard/beta.md' }",
        '    }',
        '  }',
        '};'
      ].join('\n')
    );

    writeFileRecursive(
      path.join(cwd, 'eutelo.config.json'),
      JSON.stringify(
        {
          presets: ['@example/preset-alpha', '@example/preset-beta'],
          scaffold: {
            'feature.prd': {
              id: 'feature.prd',
              kind: 'prd',
              path: 'docs/prd/local.md',
              template: 'local-template.md'
            }
          },
          guard: {
            prompts: {
              purpose: {
                id: 'purpose',
                templatePath: 'guard/local.md',
                model: 'gpt-local'
              }
            }
          }
        },
        null,
        2
      )
    );

    const resolved = await loadConfig({ cwd });

    assert.deepEqual(resolved.presets, [
      '@example/preset-base',
      '@example/preset-alpha',
      '@example/preset-beta'
    ]);
    assert.equal(resolved.scaffold['feature.prd'].template, 'local-template.md');
    assert.equal(resolved.guard.prompts.purpose.templatePath, 'guard/local.md');
    assert.equal(resolved.guard.prompts.purpose.model, 'gpt-local');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig reports validation issues for invalid yaml', async () => {
  const cwd = createTempDir('eutelo-config-yaml-');
  try {
    writeFileRecursive(
      path.join(cwd, 'eutelo.config.yaml'),
      [
        'frontmatter:',
        '  schemas:',
        '    - kind: prd',
        '      fields:',
        '        title:',
        '          type: invalid',
        '          required: "yes"'
      ].join('\n')
    );

    await assert.rejects(() => loadConfig({ cwd }), ConfigValidationError);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig falls back to default docsRoot when not specified', async () => {
  const cwd = createTempDir('eutelo-config-default-root-');
  try {
    const resolved = await loadConfig({ cwd });
    assert.equal(resolved.docsRoot, 'eutelo-docs');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig honors docsRoot defined in config file', async () => {
  const cwd = createTempDir('eutelo-config-custom-root-');
  try {
    writeJsonConfig(cwd, {
      docsRoot: 'custom-docs'
    });
    const resolved = await loadConfig({ cwd });
    assert.equal(resolved.docsRoot, 'custom-docs');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
