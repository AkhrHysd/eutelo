#!/usr/bin/env node

/**
 * リリースフロー実行スクリプト
 * 順序付き公開、依存関係置換、リリースノート生成などを統合
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validateVersionConsistency } from './version-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

/**
 * 公開順序定義
 */
const PUBLISH_ORDER = [
  'core',
  'infrastructure',
  'distribution',
  'preset-default',
  'commander',
  'cli',
  'eutelo',
  'biome-doc-lint',
  'eslint-plugin-docs',
];

/**
 * パッケージ名のマッピング（ディレクトリ名からパッケージ名へ）
 */
function getPackageName(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return pkg.name;
  } catch {
    return null;
  }
}

/**
 * プレフライトチェック
 */
function runPreflightChecks() {
  console.log('🔍 Running preflight checks...\n');
  
  try {
    // package-lock.jsonを削除して再生成（file:依存の状態で確実に）
    console.log('  → Installing dependencies with file: protocol...');
    try {
      execSync('rm -f package-lock.json', { cwd: ROOT_DIR, stdio: 'pipe' });
    } catch {
      // 無視
    }
    // npm installで依存関係をインストール（package-lock.jsonも生成される）
    // これにより、file:依存のパッケージが実際にインストールされ、TypeScriptが解決できるようになる
    execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
    
    console.log('\n  → npm run build...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    
    console.log('\n  → npm test...');
    execSync('npm test', { cwd: ROOT_DIR, stdio: 'inherit' });
    
    console.log('\n  → npx eutelo guard --ci --json --fail-on-error...');
    execSync('npx eutelo guard --ci --json --fail-on-error', { 
      cwd: ROOT_DIR, 
      stdio: 'inherit' 
    });
    
    console.log('\n✓ Preflight checks passed\n');
    return true;
  } catch {
    console.error('\n✗ Preflight checks failed');
    return false;
  }
}

/**
 * 依存関係を置換（file: → semver）
 */
function convertDependenciesForPublish() {
  console.log('🔄 Converting dependencies for publish...\n');
  try {
    execSync('node scripts/convert-deps-for-publish.js publish', {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log('✓ Dependencies converted\n');
    return true;
  } catch {
    console.error('✗ Failed to convert dependencies');
    return false;
  }
}

/**
 * 依存関係を復元（semver → file:）
 */
function restoreDependencies() {
  try {
    execSync('node scripts/convert-deps-for-publish.js local', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });
    return true;
  } catch {
    // エラーは無視（既にローカル状態の可能性がある）
    return false;
  }
}

/**
 * パッケージを公開
 */
function publishPackage(packageDir, distTag = 'latest', dryRun = false) {
  const packageName = getPackageName(packageDir);
  if (!packageName) {
    console.error(`✗ Package not found: ${packageDir}`);
    return { success: false, error: 'package_not_found' };
  }

  console.log(`\n📦 Publishing ${packageName}...`);

  try {
    if (dryRun) {
      console.log('  → Running npm pack (dry-run)...');
      execSync(`npm pack --dry-run`, {
        cwd: join(ROOT_DIR, 'packages', packageDir),
        stdio: 'inherit',
      });
      return { success: true, dryRun: true };
    } else {
      console.log(`  → Publishing with tag: ${distTag}...`);
      try {
        // stderr をキャプチャして、stdout は継承（表示）
        execSync(
          `npm publish --provenance --access public --tag ${distTag}`,
          {
            cwd: join(ROOT_DIR, 'packages', packageDir),
            stdio: ['inherit', 'inherit', 'pipe'],
            encoding: 'utf-8',
          }
        );
        console.log(`  ✓ Successfully published: ${packageName}`);
        return { success: true };
      } catch (publishError) {
        // execSync のエラーから stderr を取得
        const stderr = publishError.stderr?.toString() || '';
        const stdout = publishError.stdout?.toString() || '';
        const errorMessage = publishError.message || '';
        const fullError = stderr || stdout || errorMessage;
        
        // エラー出力を表示
        if (stderr) {
          console.error(stderr);
        }
        
        // 403エラー（既に公開済み）の場合はスキップ
        if (
          fullError.includes('403') ||
          fullError.includes('cannot publish over') ||
          fullError.includes('previously published versions') ||
          fullError.includes('You cannot publish over')
        ) {
          console.log(`  ⚠ Skipped (already published): ${packageName}`);
          return { success: true, skipped: true };
        }
        
        console.error(`  ✗ Failed to publish ${packageName}`);
        console.error(`  Error details: ${fullError}`);
        throw publishError; // 再スローして外側の catch で処理
      }
    }
  } catch (error) {
    // 外側の catch は dry-run の場合やその他のエラー用
    const errorOutput = error.stdout?.toString() || error.stderr?.toString() || error.message || '';
    const fullError = errorOutput || error.message || 'Unknown error';
    
    console.error(`  ✗ Failed to publish ${packageName}`);
    console.error(`  Error details: ${fullError}`);
    return { success: false, error: fullError };
  }
}

/**
 * 順序付き公開
 */
function publishPackagesInOrder(distTag = 'latest', dryRun = false) {
  console.log('🚀 Starting ordered package publication...\n');
  
  const results = [];
  let shouldStop = false;

  for (const pkgDir of PUBLISH_ORDER) {
    if (shouldStop) {
      console.log(`\n⚠ Skipping remaining packages due to previous failure`);
      results.push({ package: pkgDir, skipped: true, reason: 'previous_failure' });
      continue;
    }

    const result = publishPackage(pkgDir, distTag, dryRun);
    results.push({ package: pkgDir, ...result });

    if (!result.success && !result.skipped) {
      shouldStop = true;
      console.error(`\n✗ Publication stopped due to failure in ${pkgDir}`);
    }
  }

  return results;
}

/**
 * ポスト検証: npm view でバージョン確認
 */
function verifyPublishedVersion(packageName, version, distTag = 'latest') {
  try {
    const result = execSync(`npm view ${packageName}@${distTag} version`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const publishedVersion = result.trim();
    if (publishedVersion === version) {
      console.log(`  ✓ ${packageName}@${distTag} is ${version}`);
      return true;
    } else {
      console.warn(`  ⚠ ${packageName}@${distTag} is ${publishedVersion}, expected ${version}`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ Failed to verify ${packageName}: ${error.message}`);
    return false;
  }
}

/**
 * ポスト検証: npm install でインストール確認
 */
function verifyInstallation(packageName, distTag = 'latest') {
  const testDir = join(ROOT_DIR, '.release-test');
  try {
    // 一時ディレクトリを作成
    execSync(`mkdir -p ${testDir}`, { stdio: 'pipe' });
    
    // package.json を作成
    const testPackageJson = {
      name: 'release-test',
      version: '1.0.0',
      dependencies: {
        [packageName]: distTag === 'latest' ? 'latest' : `${distTag}`,
      },
    };
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify(testPackageJson, null, 2)
    );
    
    // 既存の package-lock.json を削除（警告を避けるため）
    try {
      execSync('rm -f package-lock.json', { cwd: testDir, stdio: 'pipe' });
    } catch {
      // 無視
    }
    
    // npm install を実行
    console.log(`  → Installing ${packageName}@${distTag}...`);
    execSync('npm install', {
      cwd: testDir,
      stdio: 'inherit',
    });
    
    console.log(`  ✓ Successfully installed ${packageName}@${distTag}`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to install ${packageName}: ${error.message}`);
    return false;
  } finally {
    // クリーンアップ
    try {
      execSync(`rm -rf ${testDir}`, { stdio: 'pipe' });
    } catch {
      // 無視
    }
  }
}

/**
 * ポスト検証を実行
 */
function runPostVerification(distTag = 'latest', dryRun = false) {
  if (dryRun) {
    console.log('\n⏭ Skipping post-verification (dry-run mode)');
    return true;
  }

  console.log('\n🔍 Running post-verification...\n');

  const verificationResults = [];
  
  // 主要パッケージの検証
  const keyPackages = ['@eutelo/cli', '@eutelo/eutelo'];
  
  for (const packageName of keyPackages) {
    // バージョン確認
    const packageDir = PUBLISH_ORDER.find(dir => {
      const name = getPackageName(dir);
      return name === packageName;
    });
    
    if (packageDir) {
      const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
      if (existsSync(packagePath)) {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
        const versionVerified = verifyPublishedVersion(packageName, pkg.version, distTag);
        verificationResults.push({ package: packageName, versionVerified });
      }
    }
    
    // インストール確認
    const installVerified = verifyInstallation(packageName, distTag);
    verificationResults.push({ package: packageName, installVerified });
  }

  const allPassed = verificationResults.every(r => r.versionVerified !== false && r.installVerified !== false);
  
  if (allPassed) {
    console.log('\n✓ Post-verification passed');
  } else {
    console.warn('\n⚠ Some post-verification checks failed');
  }
  
  return allPassed;
}

/**
 * 監査証跡を記録
 */
function recordAuditLog(publishResults, distTag, dryRun) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    commitSha: process.env.GITHUB_SHA || 'unknown',
    workflowRun: process.env.GITHUB_RUN_ID || 'unknown',
    workflowUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : 'unknown',
    distTag,
    dryRun,
    packages: publishResults.map(r => ({
      package: r.package,
      packageName: getPackageName(r.package),
      success: r.success,
      skipped: r.skipped || false,
      error: r.error || null,
    })),
  };

  const logPath = join(ROOT_DIR, `release-${Date.now()}.json`);
  writeFileSync(logPath, JSON.stringify(auditLog, null, 2));
  console.log(`\n📝 Audit log saved to: ${logPath}`);
  
  return auditLog;
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const distTag = args.find(arg => arg.startsWith('--tag='))?.split('=')[1] || 'latest';
  const skipPreflight = args.includes('--skip-preflight');

  console.log('🎯 Eutelo Release Flow\n');
  console.log(`  Dry-run: ${dryRun}`);
  console.log(`  Dist-tag: ${distTag}`);
  console.log(`  Skip preflight: ${skipPreflight}\n`);

  // バージョン整合性検証
  console.log('📋 Validating version consistency...\n');
  const versionResults = validateVersionConsistency();
  if (!versionResults.valid) {
    console.error('❌ Version validation failed');
    for (const err of versionResults.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  if (versionResults.warnings.length > 0) {
    console.warn('⚠️  Version warnings:');
    for (const warn of versionResults.warnings) {
      console.warn(`  - ${warn}`);
    }
  }
  console.log('✓ Version validation passed\n');

  // 依存関係をローカル（file:）に確実に戻す（プレフライトチェック前）
  console.log('🔄 Ensuring dependencies are in local mode for preflight checks...\n');
  if (!restoreDependencies()) {
    console.warn('⚠️  Failed to restore dependencies, but continuing...');
  }

  // TypeScript references を package.json の依存関係から自動生成
  console.log('🔄 Syncing TypeScript references from package.json...\n');
  try {
    execSync('node scripts/sync-tsconfig-references.js', {
      cwd: ROOT_DIR,
      stdio: 'pipe',
    });
  } catch {
    console.warn('⚠️  Failed to sync TypeScript references, but continuing...');
  }

  // プレフライトチェック（file:依存の状態で実行）
  if (!skipPreflight) {
    if (!runPreflightChecks()) {
      process.exit(1);
    }
  }

  // 依存関係置換（公開用に semver に変換）
  if (!convertDependenciesForPublish()) {
    process.exit(1);
  }

  // 順序付き公開
  const publishResults = publishPackagesInOrder(distTag, dryRun);

  // 依存関係復元
  if (!dryRun) {
    restoreDependencies();
  }

  // 監査証跡を記録
  // 監査証跡を記録
  recordAuditLog(publishResults, distTag, dryRun);

  // ポスト検証
  if (!dryRun) {
    runPostVerification(distTag, dryRun);
  }

  // 結果サマリー
  console.log('\n📊 Publication Summary:');
  const successful = publishResults.filter(r => r.success && !r.skipped);
  const failed = publishResults.filter(r => !r.success && !r.skipped);
  const skipped = publishResults.filter(r => r.skipped);
  
  console.log(`  Successful: ${successful.length}`);
  if (successful.length > 0) {
    successful.forEach(r => {
      const packageName = getPackageName(r.package);
      console.log(`    ✓ ${packageName || r.package}`);
    });
  }
  
  console.log(`  Skipped: ${skipped.length}`);
  if (skipped.length > 0) {
    skipped.forEach(r => {
      const packageName = getPackageName(r.package);
      console.log(`    ⚠ ${packageName || r.package} (${r.reason || 'already published'})`);
    });
  }
  
  console.log(`  Failed: ${failed.length}`);
  if (failed.length > 0) {
    failed.forEach(r => {
      const packageName = getPackageName(r.package);
      console.log(`    ✗ ${packageName || r.package}`);
      if (r.error) {
        console.log(`      Error: ${r.error}`);
      }
    });
  }

  if (failed.length > 0) {
    console.error('\n✗ Some packages failed to publish');
    console.error('\n💡 Rollback instructions:');
    console.error('  1. Check which packages were successfully published');
    console.error('  2. If needed, deprecate published versions: npm deprecate <package>@<version> "<reason>"');
    console.error('  3. Fix the issue and re-run the release flow');
    process.exit(1);
  }

  console.log('\n✓ Release flow completed successfully');
}

main();

