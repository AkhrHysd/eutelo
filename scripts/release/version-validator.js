#!/usr/bin/env node

/**
 * バージョン整合性検証モジュール
 * SemVer 形式の検証と依存パッケージ間のバージョン整合を確認
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

/**
 * SemVer 形式の正規表現
 */
const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)(?:-([\w-]+))?(?:\+([\w-]+))?$/;

/**
 * SemVer 形式を検証
 */
export function validateSemVer(version) {
  return SEMVER_REGEX.test(version);
}

/**
 * パッケージのバージョンを取得
 */
function getPackageVersion(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return null;
  }
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return pkg.version;
  } catch {
    return null;
  }
}

/**
 * パッケージ名を取得
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
 * 内部依存のバージョンを取得
 */
function getInternalDependencies(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return [];
  }
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    const internalDeps = [];
    for (const [depName, depVersion] of Object.entries(deps)) {
      if (depName.startsWith('@eutelo/')) {
        internalDeps.push({ name: depName, version: depVersion });
      }
    }
    return internalDeps;
  } catch {
    return [];
  }
}

/**
 * CHANGELOG のバージョンを取得（簡易版）
 */
function getChangelogVersion(packageDir) {
  const changelogPath = join(ROOT_DIR, 'packages', packageDir, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    return null;
  }
  try {
    const content = readFileSync(changelogPath, 'utf-8');
    // ## [X.Y.Z] 形式を検索
    const match = content.match(/^##\s+\[?(\d+\.\d+\.\d+)\]?/m);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * バージョン整合性を検証
 */
export function validateVersionConsistency() {
  const packages = [
    'core',
    'infrastructure',
    'distribution',
    'preset-default',
    'commander',
    'cli',
    'eutelo',
  ];

  const results = {
    valid: true,
    errors: [],
    warnings: [],
    packages: {},
  };

  // 各パッケージのバージョンを収集
  const packageVersions = new Map();
  for (const pkgDir of packages) {
    const version = getPackageVersion(pkgDir);
    const name = getPackageName(pkgDir);
    if (version && name) {
      packageVersions.set(name, { dir: pkgDir, version });
      
      // SemVer 形式の検証
      if (!validateSemVer(version)) {
        results.valid = false;
        results.errors.push(`${name}: Invalid SemVer format: ${version}`);
      }

      // CHANGELOG との一致確認
      const changelogVersion = getChangelogVersion(pkgDir);
      if (changelogVersion && changelogVersion !== version) {
        results.warnings.push(`${name}: CHANGELOG version (${changelogVersion}) doesn't match package.json version (${version})`);
      }

      results.packages[name] = {
        dir: pkgDir,
        version,
        changelogVersion,
        semverValid: validateSemVer(version),
      };
    }
  }

  // 内部依存のバージョン整合性を確認
  for (const pkgDir of packages) {
    const name = getPackageName(pkgDir);
    if (!name) continue;

    const internalDeps = getInternalDependencies(pkgDir);
    for (const dep of internalDeps) {
      const depPkgInfo = packageVersions.get(dep.name);
      if (depPkgInfo) {
        // workspace:* は公開時に file: に変換されるため、警告のみ
        if (dep.version === 'workspace:*' || dep.version.startsWith('workspace:')) {
          results.warnings.push(
            `${name}: uses ${dep.name}@${dep.version} (will be converted to file: during publish)`
          );
          continue;
        }

        // file: 依存は公開時に semver に変換されるため、スキップ
        if (dep.version.startsWith('file:')) {
          continue;
        }

        // バージョン範囲の検証
        const depVersion = dep.version.trim();
        
        // ^X.Y.Z 形式の場合、実際のバージョンが範囲内かチェック
        if (depVersion.startsWith('^')) {
          const rangeVersion = depVersion.substring(1);
          const [rangeMajor, rangeMinor, rangePatch] = rangeVersion.split('.').map(Number);
          const [actualMajor, actualMinor, actualPatch] = depPkgInfo.version.split('.').map(Number);
          
          // ^X.Y.Z は X.Y.Z 以上、X+1.0.0 未満を許可
          const isCompatible = 
            actualMajor === rangeMajor &&
            (actualMinor > rangeMinor || (actualMinor === rangeMinor && actualPatch >= rangePatch));
          
          if (!isCompatible && actualMajor === rangeMajor) {
            // 同じメジャーバージョン内で互換性がない場合のみ警告
            results.warnings.push(
              `${name}: depends on ${dep.name}@${dep.version}, but actual version is ${depPkgInfo.version} (may need update)`
            );
          }
        } else if (depVersion.startsWith('~')) {
          // ~X.Y.Z 形式も同様にチェック（簡易版）
          const rangeVersion = depVersion.substring(1);
          if (rangeVersion !== depPkgInfo.version && !depPkgInfo.version.startsWith(rangeVersion.split('.')[0] + '.' + rangeVersion.split('.')[1])) {
            results.warnings.push(
              `${name}: depends on ${dep.name}@${dep.version}, but actual version is ${depPkgInfo.version}`
            );
          }
        } else {
          // 完全一致の場合のみチェック
          if (depVersion !== depPkgInfo.version) {
            results.warnings.push(
              `${name}: depends on ${dep.name}@${dep.version}, but actual version is ${depPkgInfo.version}`
            );
          }
        }
      }
    }
  }

  return results;
}

/**
 * メイン処理（CLI実行時）
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const results = validateVersionConsistency();
  
  console.log('📋 Version Consistency Validation\n');
  
  if (results.errors.length > 0) {
    console.error('❌ Errors:');
    for (const err of results.errors) {
      console.error(`  - ${err}`);
    }
  }
  
  if (results.warnings.length > 0) {
    console.warn('⚠️  Warnings:');
    for (const warn of results.warnings) {
      console.warn(`  - ${warn}`);
    }
  }
  
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('✓ All packages have valid SemVer versions');
    console.log('\nPackage versions:');
    for (const [name, info] of Object.entries(results.packages)) {
      console.log(`  ${name}: ${info.version}`);
    }
  }
  
  process.exit(results.valid ? 0 : 1);
}

