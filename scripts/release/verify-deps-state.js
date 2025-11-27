#!/usr/bin/env node

/**
 * 依存関係の状態を検証するスクリプト
 * package.json が file: 依存か semver 依存かを確認
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

const PACKAGES = [
  'cli',
  'biome-doc-lint',
  'eslint-plugin-docs',
];

function checkDependencies(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  const issues = [];
  for (const [depName, depValue] of Object.entries(deps)) {
    if (depName.startsWith('@eutelo/')) {
      if (typeof depValue === 'string' && depValue.startsWith('^')) {
        issues.push({
          package: pkg.name,
          dependency: depName,
          value: depValue,
          issue: 'semver_format_in_repo',
        });
      } else if (typeof depValue === 'string' && depValue.startsWith('file:')) {
        // OK
      } else {
        issues.push({
          package: pkg.name,
          dependency: depName,
          value: depValue,
          issue: 'unknown_format',
        });
      }
    }
  }

  return {
    package: pkg.name,
    issues,
  };
}

function main() {
  console.log('🔍 Verifying dependency state in package.json files...\n');

  const allIssues = [];
  for (const pkgDir of PACKAGES) {
    const result = checkDependencies(pkgDir);
    if (result && result.issues.length > 0) {
      allIssues.push(...result.issues);
      console.log(`❌ ${result.package}:`);
      for (const issue of result.issues) {
        console.log(`   - ${issue.dependency}: ${issue.value} (${issue.issue})`);
      }
    } else if (result) {
      console.log(`✓ ${result.package}: All dependencies are in file: format`);
    }
  }

  if (allIssues.length > 0) {
    console.log(`\n⚠️  Found ${allIssues.length} issue(s)`);
    console.log('\n💡 Solution: Run the following command to fix:');
    console.log('   node scripts/convert-deps-for-publish.js local');
    process.exit(1);
  } else {
    console.log('\n✓ All dependencies are correctly in file: format');
    process.exit(0);
  }
}

main();



