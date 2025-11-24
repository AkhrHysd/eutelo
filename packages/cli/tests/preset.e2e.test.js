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

function setupProject(prefix = 'eutelo-cli-preset-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function cleanup(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

test('config inspect fails when preset cannot be resolved', () => {
  const cwd = setupProject();
  try {
    const configPath = path.join(cwd, 'eutelo.config.json');
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          presets: ['@example/missing-preset']
        },
        null,
        2
      )
    );

    const result = runCli(['config', 'inspect', '--config', 'eutelo.config.json'], cwd);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Unable to resolve preset/);
  } finally {
    cleanup(cwd);
  }
});
