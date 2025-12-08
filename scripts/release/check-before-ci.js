#!/usr/bin/env node

/**
 * CI実行前の最終チェックスクリプト
 * リリースフローが正常に動作するか事前に検証
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

const PACKAGES_WITH_DEPS = [
  'core',
  'cli',
  'preset-default',
  'eutelo',
];

function checkPackageDependencies(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return { package: packageDir, errors: [`package.json not found`] };
  }

  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const errors = [];
  const warnings = [];

  for (const [depName, depValue] of Object.entries(deps)) {
    if (depName.startsWith('@eutelo/')) {
      // file:依存であることを確認
      if (typeof depValue !== 'string' || !depValue.startsWith('file:')) {
        errors.push(`${depName}: Expected "file:..." but got "${depValue}"`);
      }
    }
  }

  return { package: pkg.name, errors, warnings };
}

function main() {
  console.log('🔍 Pre-CI Check: Verifying package.json dependencies...\n');

  const allErrors = [];
  const allWarnings = [];

  for (const pkgDir of PACKAGES_WITH_DEPS) {
    const result = checkPackageDependencies(pkgDir);
    if (result.errors.length > 0) {
      allErrors.push(...result.errors.map(err => `${result.package}: ${err}`));
      console.error(`❌ ${result.package}:`);
      result.errors.forEach(err => console.error(`   - ${err}`));
    } else {
      console.log(`✓ ${result.package}: All @eutelo/* dependencies are in file: format`);
    }
    if (result.warnings.length > 0) {
      allWarnings.push(...result.warnings.map(warn => `${result.package}: ${warn}`));
    }
  }

  console.log('');

  if (allErrors.length > 0) {
    console.error(`❌ Found ${allErrors.length} error(s):`);
    allErrors.forEach(err => console.error(`   - ${err}`));
    console.error('\n💡 Fix: Run the following command:');
    console.error('   node scripts/convert-deps-for-publish.js local');
    process.exit(1);
  }

  if (allWarnings.length > 0) {
    console.warn(`⚠️  Found ${allWarnings.length} warning(s):`);
    allWarnings.forEach(warn => console.warn(`   - ${warn}`));
  }

  console.log('✓ All checks passed! Ready for CI.');
  process.exit(0);
}

main();

