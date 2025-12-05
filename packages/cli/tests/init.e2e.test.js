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

test('eutelo init creates required directories in a new project', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const result = runCli(['init'], cwd);

  assert.equal(result.status, 0, result.stderr);
  const expectedDirs = [
    'eutelo-docs',
    'eutelo-docs/product/features',
    'eutelo-docs/architecture/design',
    'eutelo-docs/architecture/adr',
    'eutelo-docs/tasks',
    'eutelo-docs/ops'
  ];
  for (const dir of expectedDirs) {
    assert.ok(fs.existsSync(path.join(cwd, dir)), `expected ${dir} to exist`);
  }

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init does not overwrite existing files and logs skips', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const existingDir = path.join(cwd, 'eutelo-docs/product/features');
  fs.mkdirSync(existingDir, { recursive: true });
  const readmePath = path.join(existingDir, 'README.md');
  fs.writeFileSync(readmePath, 'original content');

  const result = runCli(['init'], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(readmePath, 'utf8'), 'original content');
  assert.match(result.stdout, /Skipped/);

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init --dry-run reports plan without touching disk', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));

  const result = runCli(['init', '--dry-run'], cwd);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Dry run/);
  assert.match(result.stdout, /eutelo-docs/);
  assert.ok(!fs.existsSync(path.join(cwd, 'eutelo-docs')));

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init respects EUTELO_DOCS_ROOT override', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  const customRoot = 'custom-docs';

  const result = runCli(['init'], cwd, { EUTELO_DOCS_ROOT: customRoot });

  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(cwd, customRoot)), 'custom root should exist');
  assert.ok(
    fs.existsSync(path.join(cwd, customRoot, 'architecture/adr')),
    'custom root should include adr directory'
  );

  fs.rmSync(cwd, { recursive: true, force: true });
});

test('init uses docsRoot from config file when provided', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'custom-root'
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'custom-root')), 'custom docsRoot should be created');
    assert.ok(
      fs.existsSync(path.join(cwd, 'custom-root', 'architecture/adr')),
      'custom docsRoot should include nested structure'
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('init uses custom directoryStructure from config file', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-dir-structure-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'my-docs',
          directoryStructure: {
            'custom': [],
            'custom/subdir': [],
            'another': []
          }
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'my-docs')), 'docsRoot should be created');
    assert.ok(fs.existsSync(path.join(cwd, 'my-docs/custom')), 'custom dir should be created');
    assert.ok(fs.existsSync(path.join(cwd, 'my-docs/custom/subdir')), 'custom/subdir should be created');
    assert.ok(fs.existsSync(path.join(cwd, 'my-docs/another')), 'another dir should be created');
    // Default structure should NOT exist
    assert.ok(!fs.existsSync(path.join(cwd, 'my-docs/product')), 'default product dir should not exist');
    assert.ok(!fs.existsSync(path.join(cwd, 'my-docs/architecture')), 'default architecture dir should not exist');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('init creates placeholder directories for dynamic paths', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-dynamic-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'docs',
          directoryStructure: {
            'product': [],
            'product/features/{FEATURE}': []
          }
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'docs/product')), 'product dir should be created');
    assert.ok(
      fs.existsSync(path.join(cwd, 'docs/product/features/__FEATURE__')),
      'placeholder __FEATURE__ dir should be created'
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('init --skip-dynamic-paths skips dynamic path directories', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-skip-dynamic-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'docs',
          directoryStructure: {
            'product': [],
            'product/features/{FEATURE}': []
          }
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json', '--skip-dynamic-paths'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'docs/product')), 'product dir should be created');
    assert.ok(
      !fs.existsSync(path.join(cwd, 'docs/product/features/__FEATURE__')),
      'placeholder dir should NOT be created with --skip-dynamic-paths'
    );
    assert.ok(
      !fs.existsSync(path.join(cwd, 'docs/product/features/{FEATURE}')),
      'dynamic path dir should NOT be created'
    );
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('init with array format directoryStructure works', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-array-format-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'docs',
          directoryStructure: [
            [],
            ['mydir'],
            ['mydir', 'subdir']
          ]
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json'], cwd);
    assert.equal(result.status, 0, result.stderr);
    assert.ok(fs.existsSync(path.join(cwd, 'docs')), 'docsRoot should be created');
    assert.ok(fs.existsSync(path.join(cwd, 'docs/mydir')), 'mydir should be created');
    assert.ok(fs.existsSync(path.join(cwd, 'docs/mydir/subdir')), 'mydir/subdir should be created');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});

test('init with invalid directoryStructure shows error message', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'eutelo-cli-e2e-invalid-dir-structure-'));
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          docsRoot: 'docs',
          directoryStructure: []  // Empty array is invalid
        },
        null,
        2
      )
    );

    const result = runCli(['init', '--config', 'eutelo.config.json'], cwd);
    assert.notEqual(result.status, 0, 'should fail with invalid config');
    assert.match(result.stderr, /directoryStructure/i, 'error message should mention directoryStructure');
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
