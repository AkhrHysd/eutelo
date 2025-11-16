#!/usr/bin/env node

/**
 * 公開用に依存関係を変換するスクリプト
 * file: プロトコルをバージョン番号に変換、またはその逆を行う
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * パッケージのバージョンを取得
 */
function getPackageVersion(packageName) {
  const packagePath = join(ROOT_DIR, 'packages', packageName, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return pkg.version;
  } catch (error) {
    console.warn(`Warning: Could not read version for ${packageName}: ${error.message}`);
    return null;
  }
}

/**
 * file:パスから実際のパッケージ名を取得
 */
function getPackageNameFromPath(filePath) {
  const packagePath = join(ROOT_DIR, 'packages', filePath.replace('../', ''), 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    return pkg.name;
  } catch (error) {
    return null;
  }
}

/**
 * パッケージ名からfile:パスを逆引き（ローカル開発用）
 */
function getFilePathFromPackageName(packageName) {
  const packages = ['core', 'infrastructure', 'distribution', 'biome-doc-lint', 'eslint-plugin-docs', 'commander'];
  for (const pkgDir of packages) {
    const packagePath = join(ROOT_DIR, 'packages', pkgDir, 'package.json');
    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
      if (pkg.name === packageName) {
        return `../${pkgDir}`;
      }
    } catch (error) {
      // スキップ
    }
  }
  return null;
}

/**
 * 依存関係を変換
 * @param {string} mode - 'publish' (file: -> version) または 'local' (version -> file:)
 */
function convertDependencies(packagePath, mode) {
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  let modified = false;

  const convertDeps = (deps) => {
    if (!deps) return;
    for (const [depName, depValue] of Object.entries(deps)) {
      if (mode === 'publish') {
        // file: をバージョン番号に変換
        if (typeof depValue === 'string' && depValue.startsWith('file:')) {
          const filePath = depValue.replace('file:', '');
          // file:パスから実際のパッケージ名を取得
          const actualPackageName = getPackageNameFromPath(filePath);
          
          // 依存関係の名前と実際のパッケージ名が一致する場合のみ変換
          if (actualPackageName && actualPackageName === depName) {
            const packageDir = filePath.replace('../', '');
            const version = getPackageVersion(packageDir);
            if (version) {
              deps[depName] = `^${version}`;
              modified = true;
              console.log(`  ✓ ${depName}: file:${filePath} -> ^${version}`);
            }
          }
        }
      } else if (mode === 'local') {
        // バージョン番号を file: に変換（該当するパッケージのみ）
        if (typeof depValue === 'string' && depValue.startsWith('^')) {
          // パッケージ名からfile:パスを逆引き
          const filePath = getFilePathFromPackageName(depName);
          if (filePath) {
            deps[depName] = `file:${filePath}`;
            modified = true;
            console.log(`  ✓ ${depName}: ${depValue} -> file:${filePath}`);
          }
        }
      }
    }
  };

  convertDeps(pkg.dependencies);
  convertDeps(pkg.devDependencies);
  convertDeps(pkg.peerDependencies);

  if (modified) {
    writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    return true;
  }
  return false;
}

/**
 * メイン処理
 */
function main() {
  const mode = process.argv[2] || 'publish';
  
  if (mode !== 'publish' && mode !== 'local') {
    console.error('Usage: node convert-deps-for-publish.js [publish|local]');
    console.error('  publish: Convert file: dependencies to version numbers');
    console.error('  local:   Convert version numbers back to file: dependencies');
    process.exit(1);
  }

  console.log(`Converting dependencies for ${mode === 'publish' ? 'publishing' : 'local development'}...\n`);

  // コマンドライン引数でパッケージを指定可能（例: node script.js publish cli）
  const targetPackages = process.argv.slice(3);
  const packages = targetPackages.length > 0 
    ? targetPackages 
    : [
        'cli',
        'biome-doc-lint',
        'eslint-plugin-docs',
      ];

  let totalModified = 0;

  for (const pkgName of packages) {
    const packagePath = join(ROOT_DIR, 'packages', pkgName, 'package.json');
    console.log(`Processing ${pkgName}...`);
    
    try {
      if (convertDependencies(packagePath, mode)) {
        totalModified++;
      } else {
        console.log(`  (no changes needed)`);
      }
    } catch (error) {
      console.error(`  ✗ Error processing ${pkgName}: ${error.message}`);
    }
  }

  console.log(`\n${totalModified} package(s) modified.`);
}

main();

