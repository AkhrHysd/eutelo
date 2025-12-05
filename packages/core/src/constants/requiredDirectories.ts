import path from 'node:path';
import { resolveDocsRoot } from './docsRoot.js';
import type { NormalizedDirectoryStructure, DynamicPathOptions } from '../config/types.js';

const RELATIVE_STRUCTURE: readonly string[][] = [
  [],
  ['product'],
  ['product', 'features'],
  ['architecture'],
  ['architecture', 'design'],
  ['architecture', 'adr'],
  ['tasks'],
  ['ops']
];

export function buildRequiredDirectories(docsRoot: string = resolveDocsRoot()): readonly string[] {
  return RELATIVE_STRUCTURE.map((segments) => path.join(docsRoot, ...segments));
}

export const REQUIRED_DIRECTORIES = buildRequiredDirectories();

/**
 * パスに動的セグメント（変数）が含まれているかどうかを判定する
 */
export function hasDynamicSegments(dirPath: string): boolean {
  return /\{[A-Z0-9_-]+\}/.test(dirPath);
}

/**
 * パスから変数名を抽出する
 */
export function extractVariables(dirPath: string): string[] {
  const matches = dirPath.matchAll(/\{([A-Z0-9_-]+)\}/g);
  const variables: string[] = [];
  for (const match of matches) {
    if (match[1]) {
      variables.push(match[1]);
    }
  }
  return [...new Set(variables)]; // 重複を除去
}

/**
 * 動的パスをプレースホルダーパスに変換する
 */
export function convertDynamicPathToPlaceholder(
  dirPath: string,
  options: DynamicPathOptions = {}
): string {
  const prefix = options.placeholderPrefix ?? '__';
  const suffix = options.placeholderSuffix ?? '__';
  
  return dirPath.replace(/\{([A-Z0-9_-]+)\}/g, (match, variable) => {
    return `${prefix}${variable}${suffix}`;
  });
}

/**
 * 設定ファイルからディレクトリ構造を構築する
 */
export function buildRequiredDirectoriesFromConfig(
  docsRoot: string,
  structure: NormalizedDirectoryStructure,
  options: DynamicPathOptions = {}
): readonly string[] {
  const directories = new Set<string>();

  // ルートディレクトリを追加
  directories.add(docsRoot);

  // 各ディレクトリパスを追加
  for (const dirPath of Object.keys(structure)) {
    let processedPath = dirPath;

    // 動的パスの処理
    if (hasDynamicSegments(dirPath)) {
      if (options.createPlaceholders === false) {
        continue; // 動的パスをスキップ
      }
      // デフォルトでプレースホルダーを作成
      processedPath = convertDynamicPathToPlaceholder(dirPath, options);
    }

    const absolutePath = path.isAbsolute(processedPath)
      ? processedPath
      : path.join(docsRoot, processedPath);
    directories.add(absolutePath);
  }

  return Array.from(directories).sort();
}
