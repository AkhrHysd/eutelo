import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { RuleFileLoader } from '../dist/rule-validation/RuleFileLoader.js';
import { FileSystemAdapter } from '@eutelo/infrastructure';

test('RuleFileLoader resolves relative path from project root', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-loader-'));
  const ruleFile = path.join(cwd, 'rules', 'prd-validation.md');
  await fs.mkdir(path.join(cwd, 'rules'), { recursive: true });
  await fs.writeFile(ruleFile, '# Test Rule\n');

  const loader = new RuleFileLoader({ cwd });
  const resolved = loader.resolveRulePath('rules/prd-validation.md');

  assert.equal(resolved, ruleFile);

  await fs.rm(cwd, { recursive: true, force: true });
});

test('RuleFileLoader resolves relative path from config file', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-loader-'));
  const configFile = path.join(cwd, 'eutelo.config.json');
  const ruleFile = path.join(cwd, 'validation-rules', 'prd.md');
  await fs.mkdir(path.join(cwd, 'validation-rules'), { recursive: true });
  await fs.writeFile(ruleFile, '# Test Rule\n');
  await fs.writeFile(configFile, '{}');

  const loader = new RuleFileLoader({ cwd, configPath: configFile });
  const resolved = loader.resolveRulePath('./validation-rules/prd.md');

  assert.equal(resolved, ruleFile);

  await fs.rm(cwd, { recursive: true, force: true });
});

test('RuleFileLoader resolves absolute path', () => {
  const loader = new RuleFileLoader();
  const absolutePath = '/path/to/rules/prd-validation.md';
  const resolved = loader.resolveRulePath(absolutePath);

  assert.equal(resolved, absolutePath);
});

test('RuleFileLoader loads rule file', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-loader-'));
  const ruleFile = path.join(cwd, 'rules', 'prd-validation.md');
  const ruleContent = '# Test Rule\n\nThis is a test rule.';
  await fs.mkdir(path.join(cwd, 'rules'), { recursive: true });
  await fs.writeFile(ruleFile, ruleContent);

  const loader = new RuleFileLoader({ cwd });
  const content = await loader.loadRuleFile('rules/prd-validation.md');

  assert.equal(content, ruleContent);

  await fs.rm(cwd, { recursive: true, force: true });
});

test('RuleFileLoader throws error when rule file not found', async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'eutelo-rule-loader-'));
  const loader = new RuleFileLoader({ cwd });

  await assert.rejects(
    async () => {
      await loader.loadRuleFile('rules/nonexistent.md');
    },
    {
      message: /Rule file not found/
    }
  );

  await fs.rm(cwd, { recursive: true, force: true });
});

