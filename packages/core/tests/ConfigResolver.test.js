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
    const prdSchema = resolved.frontmatter.schemas.find((schema) => schema.kind === 'prd');
    assert.ok(prdSchema);
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
      '@eutelo/preset-default',
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

test('loadConfig default preset exposes guard prompts and root parents', async () => {
  const resolved = await loadConfig({ cwd: process.cwd() });
  assert.ok(resolved.guard.prompts['guard.default']);
  assert.ok(resolved.guard.prompts['guard.default'].templatePath.endsWith('guard-system.md'));
  assert.ok(Array.isArray(resolved.frontmatter.rootParentIds));
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

// directoryStructure tests
test('loadConfig normalizes directoryStructure array format to map format', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: [
        [],
        ['product'],
        ['product', 'features']
      ]
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    assert.ok('eutelo-docs' in resolved.directoryStructure);
    assert.ok('product' in resolved.directoryStructure);
    assert.ok('product/features' in resolved.directoryStructure);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig accepts directoryStructure map format', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-map-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            template: 'templates/prd.md',
            description: 'PRD document'
          }
        ],
        'architecture/design/{FEATURE}': [
          {
            file: 'DSG-{FEATURE}.md',
            template: 'templates/dsg.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    assert.ok('product/features/{FEATURE}' in resolved.directoryStructure);
    assert.ok('architecture/design/{FEATURE}' in resolved.directoryStructure);
    assert.equal(resolved.directoryStructure['product/features/{FEATURE}'].length, 1);
    assert.equal(resolved.directoryStructure['product/features/{FEATURE}'][0].file, 'PRD-{FEATURE}.md');
    assert.equal(resolved.directoryStructure['product/features/{FEATURE}'][0].template, 'templates/prd.md');
    assert.equal(resolved.directoryStructure['product/features/{FEATURE}'][0].description, 'PRD document');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig rejects empty directoryStructure', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-empty-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: []
    });
    await assert.rejects(() => loadConfig({ cwd }), ConfigValidationError);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig rejects invalid directoryStructure array entry', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-invalid-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: [
        'product'  // should be ['product']
      ]
    });
    await assert.rejects(() => loadConfig({ cwd }), ConfigValidationError);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig rejects directoryStructure map with missing file property', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-no-file-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            template: 'templates/prd.md'
            // missing 'file' property
          }
        ]
      }
    });
    await assert.rejects(() => loadConfig({ cwd }), ConfigValidationError);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig accepts directoryStructure with dynamic paths', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-dynamic-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [],
        'architecture/design/{FEATURE}/{SUB}': []
      }
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    assert.ok('product/features/{FEATURE}' in resolved.directoryStructure);
    assert.ok('architecture/design/{FEATURE}/{SUB}' in resolved.directoryStructure);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig accepts directoryStructure with file definitions containing variables', async () => {
  const cwd = createTempDir('eutelo-config-dir-structure-vars-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            variables: ['FEATURE']
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    const files = resolved.directoryStructure['product/features/{FEATURE}'];
    assert.equal(files.length, 1);
    assert.deepEqual(files[0].variables, ['FEATURE']);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

// Phase 1: DirectoryFileDefinition extended fields tests
test('DirectoryFileDefinition accepts kind field', async () => {
  const cwd = createTempDir('eutelo-config-dir-kind-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            template: 'templates/prd.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    const files = resolved.directoryStructure['product/features/{FEATURE}'];
    assert.equal(files[0].kind, 'prd');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('DirectoryFileDefinition accepts frontmatterDefaults field', async () => {
  const cwd = createTempDir('eutelo-config-dir-frontmatter-');
  try {
    writeJsonConfig(cwd, {
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            template: 'templates/prd.md',
            frontmatterDefaults: {
              type: 'prd',
              parent: '/'
            }
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    assert.ok(resolved.directoryStructure);
    const files = resolved.directoryStructure['product/features/{FEATURE}'];
    assert.deepEqual(files[0].frontmatterDefaults, { type: 'prd', parent: '/' });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

// Phase 2: directoryStructure to scaffold conversion tests
test('loadConfig converts directoryStructure to scaffold entries', async () => {
  const cwd = createTempDir('eutelo-config-dir-to-scaffold-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            template: 'templates/prd.md',
            frontmatterDefaults: {
              type: 'prd',
              parent: '/'
            }
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    // scaffold should contain entries derived from directoryStructure
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const prdEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'prd');
    assert.ok(prdEntry, 'Should have scaffold entry with kind=prd');
    assert.equal(resolved.scaffold[prdEntry].path, 'product/features/{FEATURE}/PRD-{FEATURE}.md');
    assert.equal(resolved.scaffold[prdEntry].template, 'templates/prd.md');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig infers kind from prefix when kind is not specified', async () => {
  const cwd = createTempDir('eutelo-config-dir-infer-prefix-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            prefix: 'PRD-',
            template: 'templates/prd.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const prdEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'prd');
    assert.ok(prdEntry, 'Should infer kind=prd from prefix PRD-');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig infers kind from filename when prefix is not specified', async () => {
  const cwd = createTempDir('eutelo-config-dir-infer-filename-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'BEH-{FEATURE}.md',
            template: 'templates/beh.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const behEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'beh');
    assert.ok(behEntry, 'Should infer kind=beh from filename BEH-{FEATURE}.md');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig directoryStructure scaffold entries have correct frontmatterDefaults', async () => {
  const cwd = createTempDir('eutelo-config-dir-frontmatter-scaffold-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            template: 'templates/prd.md',
            frontmatterDefaults: {
              type: 'prd',
              parent: '/'
            }
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const prdEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'prd');
    assert.ok(prdEntry);
    assert.deepEqual(resolved.scaffold[prdEntry].frontmatterDefaults, { type: 'prd', parent: '/' });
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig directoryStructure scaffold does not override explicit scaffold', async () => {
  const cwd = createTempDir('eutelo-config-dir-explicit-scaffold-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',
            template: 'templates/prd-from-dir.md'
          }
        ]
      },
      scaffold: {
        'explicit.prd': {
          id: 'explicit.prd',
          kind: 'prd',
          path: 'docs/prd/{FEATURE}/PRD-{FEATURE}.md',
          template: 'templates/prd-explicit.md'
        }
      }
    });
    const resolved = await loadConfig({ cwd });
    // explicit scaffold should be preserved
    assert.ok(resolved.scaffold['explicit.prd']);
    assert.equal(resolved.scaffold['explicit.prd'].template, 'templates/prd-explicit.md');
    // directoryStructure derived entry should also exist
    const dirScaffoldKeys = Object.keys(resolved.scaffold).filter(k => k !== 'explicit.prd');
    assert.ok(dirScaffoldKeys.length > 0, 'Should have directoryStructure derived scaffold entries');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig directoryStructure accepts type field for command name', async () => {
  const cwd = createTempDir('eutelo-config-dir-type-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            type: 'my-prd',  // カスタムコマンド名
            kind: 'prd',     // ドキュメント種別
            template: 'templates/prd.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    // type が kind として使用される
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const myPrdEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'my-prd');
    assert.ok(myPrdEntry, 'Should have scaffold entry with kind=my-prd (from type field)');
    assert.equal(resolved.scaffold[myPrdEntry].kind, 'my-prd');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('loadConfig directoryStructure uses kind when type is not specified', async () => {
  const cwd = createTempDir('eutelo-config-dir-kind-fallback-');
  try {
    writeJsonConfig(cwd, {
      presets: [],
      directoryStructure: {
        'product/features/{FEATURE}': [
          {
            file: 'PRD-{FEATURE}.md',
            kind: 'prd',  // type がない場合は kind を使用
            template: 'templates/prd.md'
          }
        ]
      }
    });
    const resolved = await loadConfig({ cwd });
    const scaffoldKeys = Object.keys(resolved.scaffold);
    const prdEntry = scaffoldKeys.find(k => resolved.scaffold[k].kind === 'prd');
    assert.ok(prdEntry, 'Should have scaffold entry with kind=prd (from kind field)');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
