#!/usr/bin/env node

/**
 * パッケージが正しく公開されるか検証するスクリプト
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

function verifyPackage(packageDir) {
  const packagePath = join(ROOT_DIR, 'packages', packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  const packageName = pkg.name;

  console.log(`\n📦 Verifying ${packageName}...\n`);

  // binフィールドの確認
  if (pkg.bin) {
    console.log('✓ bin field found:');
    for (const [cmd, path] of Object.entries(pkg.bin)) {
      const fullPath = join(ROOT_DIR, 'packages', packageDir, path);
      const exists = existsSync(fullPath);
      console.log(`  ${cmd} -> ${path} ${exists ? '✓' : '✗ (not found)'}`);
      
      if (exists) {
        const content = readFileSync(fullPath, 'utf-8');
        const hasShebang = content.startsWith('#!/usr/bin/env node');
        console.log(`    Shebang: ${hasShebang ? '✓' : '✗ (missing)'}`);
      }
    }
  }

  // filesフィールドの確認
  if (pkg.files) {
    console.log('\n✓ files field:');
    for (const file of pkg.files) {
      const fullPath = join(ROOT_DIR, 'packages', packageDir, file);
      const exists = existsSync(fullPath) || existsSync(fullPath.replace(/\/$/, ''));
      console.log(`  ${file} ${exists ? '✓' : '✗ (not found)'}`);
    }
  }

  // npm packで確認
  console.log('\n📦 Running npm pack --dry-run...');
  try {
    // まず通常の出力で確認
    const result = execSync(`npm pack --dry-run 2>&1`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: join(ROOT_DIR, 'packages', packageDir),
    });
    
    // 出力を解析 - npm notice行からファイルリストを抽出
    const lines = result.split('\n');
    const allFiles = [];
    let inTarballContents = false;
    
    for (const line of lines) {
      // Tarball Contentsセクションの開始を検出
      if (line.includes('Tarball Contents')) {
        inTarballContents = true;
        continue;
      }
      // Tarball Detailsセクションの開始で終了
      if (line.includes('Tarball Details')) {
        break;
      }
      // Tarball Contentsセクション内のファイル行を抽出
      if (inTarballContents && line.includes('npm notice')) {
        // "npm notice 74B bin/eutelo.js" のような形式からファイル名を抽出
        const match = line.match(/npm notice\s+[\d.]+[kmg]?B\s+(.+)/i);
        if (match) {
          const file = match[1].trim();
          if (file && !file.includes('===') && !file.includes('Tarball')) {
            allFiles.push(file);
          }
        }
      }
    }
    
    console.log('\nPackage contents (' + allFiles.length + ' files):');
    if (allFiles.length > 0) {
      allFiles.forEach(file => {
        console.log(`  ${file}`);
      });
    } else {
      console.log('  (No files found in output)');
    }
    
    // binファイルが含まれているか確認
    const hasBinFile = allFiles.some(file => 
      file.includes('bin/eutelo.js') || 
      file.includes('bin\\eutelo.js') ||
      file === 'bin/eutelo.js' ||
      file.endsWith('bin/eutelo.js')
    );
    
    console.log(`\n  bin/eutelo.js included: ${hasBinFile ? '✓' : '✗'}`);
    
    if (!hasBinFile) {
      console.log('\n⚠ Warning: bin/eutelo.js is not included in the package!');
      console.log('\n💡 According to npm documentation:');
      console.log('  When "files" field is specified, npm ONLY includes those files.');
      console.log('  The "bin" field does NOT automatically include files.');
      console.log('  Current files field:', JSON.stringify(pkg.files, null, 2));
      console.log('\n  Make sure "bin/eutelo.js" is explicitly listed in the "files" field.');
    } else {
      console.log('\n✓ Package structure looks good!');
    }
  } catch (error) {
    console.error(`  ✗ Error running npm pack: ${error.message}`);
    if (error.stdout) console.error('STDOUT:', error.stdout.toString());
    if (error.stderr) console.error('STDERR:', error.stderr.toString());
  }
}

const packageDir = process.argv[2] || 'cli';
verifyPackage(packageDir);

