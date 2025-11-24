#!/usr/bin/env node

/**
 * TypeScript references を package.json の依存関係から自動生成するスクリプト
 * composite: true を使っている場合、依存関係を references に追加する必要がある
 * このスクリプトで package.json と tsconfig.json の整合性を保つ
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

/**
 * パッケージ名からディレクトリ名を取得
 */
function getPackageDirFromName(packageName) {
  const packages = [
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

  for (const pkgDir of packages) {
    const packagePath = join(ROOT_DIR, 'packages', pkgDir, 'package.json');
    if (existsSync(packagePath)) {
      try {
        const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
        if (pkg.name === packageName) {
          return pkgDir;
        }
      } catch {
        // スキップ
      }
    }
  }
  return null;
}

/**
 * package.json から @eutelo/* 依存を取得
 */
function getEuteloDependencies(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(packagePath)) {
    return [];
  }

  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const euteloDeps = [];

    for (const [depName, depValue] of Object.entries(deps)) {
      if (depName.startsWith('@eutelo/')) {
        // file: 依存の場合のみ処理
        if (typeof depValue === 'string' && depValue.startsWith('file:')) {
          const packageDirName = getPackageDirFromName(depName);
          if (packageDirName) {
            euteloDeps.push(packageDirName);
          }
        }
      }
    }

    return euteloDeps;
  } catch {
    return [];
  }
}

/**
 * tsconfig.json の references を更新
 */
function updateTsConfigReferences(packageDir) {
  const tsconfigPath = join(ROOT_DIR, 'packages', packageDir, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    return false;
  }

  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf-8'));
    
    // composite: true でない場合はスキップ
    if (!tsconfig.compilerOptions?.composite) {
      return false;
    }

    const dependencies = getEuteloDependencies(packageDir);
    
    // 依存パッケージが composite: true を持っているか確認し、references に追加
    const references = [];
    for (const dep of dependencies) {
      const depTsconfigPath = join(ROOT_DIR, 'packages', dep, 'tsconfig.json');
      if (existsSync(depTsconfigPath)) {
        try {
          const depTsconfig = JSON.parse(readFileSync(depTsconfigPath, 'utf-8'));
          // composite: true を持っている場合のみ references に追加
          if (depTsconfig.compilerOptions?.composite) {
            references.push({ path: `../${dep}` });
          }
        } catch {
          // スキップ
        }
      }
    }

    // references が既に存在し、内容が同じ場合はスキップ
    const existingReferences = JSON.stringify((tsconfig.references || []).sort((a, b) => a.path.localeCompare(b.path)));
    const newReferences = JSON.stringify(references.sort((a, b) => a.path.localeCompare(b.path)));

    if (existingReferences === newReferences) {
      return false;
    }

    tsconfig.references = references.sort((a, b) => a.path.localeCompare(b.path));
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error updating ${packageDir}/tsconfig.json: ${error.message}`);
    return false;
  }
}

/**
 * メイン処理
 */
function main() {
  const packages = [
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

  console.log('🔄 Syncing TypeScript references from package.json dependencies...\n');

  let updated = 0;
  for (const pkgDir of packages) {
    if (updateTsConfigReferences(pkgDir)) {
      console.log(`  ✓ Updated references in ${pkgDir}/tsconfig.json`);
      updated++;
    }
  }

  if (updated === 0) {
    console.log('✓ All tsconfig.json files are up to date');
  } else {
    console.log(`\n✓ Updated ${updated} tsconfig.json file(s)`);
  }
}

main();

