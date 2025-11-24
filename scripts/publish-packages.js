#!/usr/bin/env node

/**
 * パッケージを公開するスクリプト
 * 既に公開済みのバージョンはスキップします
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * パッケージが既に公開されているか確認
 */
function isPackagePublished(packageName, version) {
  try {
    const result = execSync(`npm view ${packageName}@${version} version`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return result.trim() === version;
  } catch (error) {
    return false;
  }
}

/**
 * パッケージ名のマッピング（ディレクトリ名からパッケージ名へ）
 */
const PACKAGE_NAME_MAP = {
  'eslint-plugin-docs': '@eutelo/eslint-plugin-docs',
};

/**
 * パッケージを公開
 */
function publishPackage(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const fullPackageName = pkg.name;
  const version = pkg.version;

  console.log(`\n📦 Checking ${fullPackageName}@${version}...`);

  if (isPackagePublished(fullPackageName, version)) {
    console.log(`  ✓ Already published: ${fullPackageName}@${version}`);
    return { published: false, reason: 'already_published' };
  }

  try {
    console.log(`  → Publishing ${fullPackageName}@${version}...`);
    const result = execSync(`npm publish -w ${fullPackageName}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: ROOT_DIR,
    });
    console.log(result);
    console.log(`  ✓ Successfully published: ${fullPackageName}@${version}`);
    return { published: true };
  } catch (error) {
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || '';
    // 403エラー（既に公開済み）の場合はスキップ
    if (errorOutput.includes('403') || 
        errorOutput.includes('cannot publish over') ||
        errorOutput.includes('previously published versions')) {
      console.log(`  ⚠ Skipped (already published): ${fullPackageName}@${version}`);
      return { published: false, reason: 'already_published' };
    }
    // エラー出力を表示
    if (error.stdout) console.error(error.stdout.toString());
    if (error.stderr) console.error(error.stderr.toString());
    console.error(`  ✗ Failed to publish ${fullPackageName}: ${error.message}`);
    return { published: false, reason: 'error', error };
  }
}

/**
 * メイン処理
 */
function main() {
  const packages = process.argv.slice(2);

  if (packages.length === 0) {
    console.error('Usage: node publish-packages.js <package1> [package2] ...');
    console.error('Example: node publish-packages.js core infrastructure distribution');
    process.exit(1);
  }

  console.log('🚀 Starting package publication...\n');

  const results = packages.map(pkg => {
    const result = publishPackage(pkg);
    return { package: pkg, ...result };
  });

  const published = results.filter(r => r.published).length;
  const skipped = results.filter(r => r.reason === 'already_published').length;
  const failed = results.filter(r => r.reason === 'error').length;

  console.log(`\n📊 Summary:`);
  console.log(`  Published: ${published}`);
  console.log(`  Skipped (already published): ${skipped}`);
  console.log(`  Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();

