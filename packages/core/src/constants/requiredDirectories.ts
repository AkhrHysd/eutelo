import path from 'node:path';
import { resolveDocsRoot } from './docsRoot.js';

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
