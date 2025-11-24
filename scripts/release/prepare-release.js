#!/usr/bin/env node

/**
 * リリース準備スクリプト
 * バージョン更新とCHANGELOG生成を支援
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../..');

/**
 * パッケージ一覧
 */
const PACKAGES = [
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
 * パッケージのpackage.jsonを読み込む
 */
function readPackageJson(packageDir) {
  const path = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  if (!existsSync(path)) {
    return null;
  }
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * パッケージのpackage.jsonを書き込む
 */
function writePackageJson(packageDir, pkg) {
  const path = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
}

/**
 * バージョンを更新
 */
function updateVersion(packageDir, newVersion) {
  const pkg = readPackageJson(packageDir);
  if (!pkg) {
    console.warn(`  ⚠ Package not found: ${packageDir}`);
    return false;
  }

  const oldVersion = pkg.version;
  pkg.version = newVersion;
  writePackageJson(packageDir, pkg);
  console.log(`  ✓ ${pkg.name}: ${oldVersion} → ${newVersion}`);
  return true;
}

/**
 * CHANGELOGエントリを生成
 */
function generateChangelogEntry(version, date, changes = {}) {
  const added = changes.added || [];
  const changed = changes.changed || [];
  const fixed = changes.fixed || [];
  const removed = changes.removed || [];

  let entry = `## [${version}] - ${date}\n\n`;

  if (added.length > 0) {
    entry += '### Added\n';
    added.forEach(item => entry += `- ${item}\n`);
    entry += '\n';
  }

  if (changed.length > 0) {
    entry += '### Changed\n';
    changed.forEach(item => entry += `- ${item}\n`);
    entry += '\n';
  }

  if (fixed.length > 0) {
    entry += '### Fixed\n';
    fixed.forEach(item => entry += `- ${item}\n`);
    entry += '\n';
  }

  if (removed.length > 0) {
    entry += '### Removed\n';
    removed.forEach(item => entry += `- ${item}\n`);
    entry += '\n';
  }

  return entry;
}

/**
 * CHANGELOGを更新
 */
function updateChangelog(packageDir, version, date, changes) {
  const changelogPath = join(ROOT_DIR, 'packages', packageDir, 'CHANGELOG.md');
  
  let content = '';
  if (existsSync(changelogPath)) {
    content = readFileSync(changelogPath, 'utf-8');
  } else {
    // CHANGELOGが存在しない場合はテンプレートを作成
    const pkg = readPackageJson(packageDir);
    content = `# 🧾 CHANGELOG\n\nこのファイルは、\`${pkg.name}\` パッケージの変更履歴を記録します。\n\n---\n\n## 変更履歴\n\n`;
  }

  // 新しいエントリを先頭に追加
  const entry = generateChangelogEntry(version, date, changes);
  const insertPos = content.indexOf('## 変更履歴');
  if (insertPos !== -1) {
    const afterHeader = content.indexOf('\n', insertPos) + 1;
    content = content.slice(0, afterHeader) + '\n' + entry + content.slice(afterHeader);
  } else {
    content += '\n' + entry;
  }

  writeFileSync(changelogPath, content, 'utf-8');
  console.log(`  ✓ CHANGELOG updated: ${changelogPath}`);
}

/**
 * メイン処理
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: node scripts/release/prepare-release.js <version> [package1] [package2] ...');
    console.error('Example: node scripts/release/prepare-release.js 0.3.0 core cli');
    console.error('Example: node scripts/release/prepare-release.js 0.3.0 (all packages)');
    process.exit(1);
  }

  const newVersion = args[0];
  const targetPackages = args.slice(1);

  // SemVer形式の検証
  const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([\w-]+))?(?:\+([\w-]+))?$/;
  if (!semverRegex.test(newVersion)) {
    console.error(`❌ Invalid SemVer format: ${newVersion}`);
    process.exit(1);
  }

  const packagesToUpdate = targetPackages.length > 0 ? targetPackages : PACKAGES;
  const today = new Date().toISOString().split('T')[0];

  console.log(`📦 Preparing release ${newVersion}...\n`);

  for (const pkgDir of packagesToUpdate) {
    const pkg = readPackageJson(pkgDir);
    if (!pkg) {
      console.warn(`⚠ Skipping ${pkgDir}: package.json not found`);
      continue;
    }

    console.log(`\n📦 ${pkg.name}:`);

    // バージョン更新
    updateVersion(pkgDir, newVersion);

    // CHANGELOG更新（空のエントリを作成）
    updateChangelog(pkgDir, newVersion, today, {
      added: [],
      changed: [],
      fixed: [],
      removed: [],
    });
  }

  console.log(`\n✓ Release preparation completed for ${newVersion}`);
  console.log('\n💡 Next steps:');
  console.log('  1. Review and update CHANGELOG entries with actual changes');
  console.log('  2. Commit changes: git add . && git commit -m "chore: prepare release v' + newVersion + '"');
  console.log('  3. Create PR and merge to main');
  console.log('  4. Create tag: git tag v' + newVersion + ' && git push origin v' + newVersion);
}

main();

