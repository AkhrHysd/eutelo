import path from 'node:path';
import { parseMarkdown } from './frontmatter.js';
import type { GuardDocumentType, LoadedDocument } from './types.js';

type FileSystemAdapter = {
  readFile(targetPath: string): Promise<string>;
  stat?(targetPath: string): Promise<{ isFile(): boolean }>;
};

export type LoadDocumentsOptions = {
  cwd: string;
  paths: string[];
};

export type DocumentLoaderDependencies = {
  fileSystemAdapter: FileSystemAdapter;
};

const FEATURE_REQUIRED_TYPES: GuardDocumentType[] = ['prd', 'sub-prd', 'beh', 'sub-beh', 'dsg', 'sub-dsg', 'adr'];
const PURPOSE_REQUIRED_TYPES: GuardDocumentType[] = ['prd', 'sub-prd', 'beh', 'sub-beh', 'dsg', 'sub-dsg'];
const PARENT_REQUIRED_TYPES: GuardDocumentType[] = ['prd', 'sub-prd', 'beh', 'sub-beh', 'dsg', 'sub-dsg'];

export class DocumentLoaderError extends Error {
  constructor(
    readonly reason: 'not-found' | 'invalid-frontmatter' | 'missing-field' | 'unsupported-type',
    message: string,
    readonly context?: { path?: string; field?: string }
  ) {
    super(message);
    this.name = 'DocumentLoaderError';
  }
}

export class DocumentLoader {
  private readonly fileSystemAdapter: FileSystemAdapter;

  constructor({ fileSystemAdapter }: DocumentLoaderDependencies) {
    this.fileSystemAdapter = fileSystemAdapter;
  }

  async loadDocuments({ cwd, paths }: LoadDocumentsOptions): Promise<LoadedDocument[]> {
    if (!cwd) {
      throw new Error('cwd is required to load documents.');
    }
    const uniquePaths = Array.from(new Set((paths ?? []).map((entry) => entry.trim()).filter(Boolean)));
    const loaded: LoadedDocument[] = [];
    for (const relativePath of uniquePaths) {
      const absolutePath = path.resolve(cwd, relativePath);
      let content: string;
      try {
        content = await this.fileSystemAdapter.readFile(absolutePath);
      } catch (error) {
        throw new DocumentLoaderError('not-found', `Document not found: ${relativePath}`, { path: relativePath });
      }
      let parsed;
      try {
        parsed = parseMarkdown(content);
      } catch (error) {
        throw new DocumentLoaderError(
          'invalid-frontmatter',
          `Document ${relativePath} is missing or has invalid frontmatter.`,
          { path: relativePath }
        );
      }
      const frontmatter = normalizeFrontmatter(parsed.frontmatter);
      const id = frontmatter.id;
      if (!id) {
        throw new DocumentLoaderError('missing-field', `Document ${relativePath} is missing required field "id".`, {
          path: relativePath,
          field: 'id'
        });
      }
      const documentType = inferDocumentType(frontmatter.type, absolutePath);
      validateDocumentFields(relativePath, documentType, frontmatter);
      loaded.push({
        path: normalizePath(path.relative(cwd, absolutePath) || relativePath),
        absolutePath,
        id,
        parent: frontmatter.parent,
        feature: frontmatter.feature,
        purpose: frontmatter.purpose,
        type: documentType,
        content: parsed.body,
        frontmatter
      });
    }
    return loaded;
  }
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function normalizeFrontmatter(frontmatter: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(frontmatter ?? {})) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      continue;
    }
    normalized[key] = trimmed;
  }
  return normalized;
}

function inferDocumentType(explicitType: string | undefined, absolutePath: string): GuardDocumentType {
  const normalizedExplicit = normalizeType(explicitType);
  if (normalizedExplicit) {
    return normalizedExplicit;
  }
  const fileName = path.basename(absolutePath).toUpperCase();
  if (fileName.startsWith('SUB-PRD-')) {
    return 'sub-prd';
  }
  if (fileName.startsWith('PRD-')) {
    return 'prd';
  }
  if (fileName.startsWith('BEH-')) {
    return fileName.split('-').length >= 3 ? 'sub-beh' : 'beh';
  }
  if (fileName.startsWith('SUB-BEH-')) {
    return 'sub-beh';
  }
  if (fileName.startsWith('DSG-')) {
    return fileName.split('-').length >= 3 ? 'sub-dsg' : 'dsg';
  }
  if (fileName.startsWith('ADR-')) {
    return 'adr';
  }
  if (fileName.startsWith('TASK-')) {
    return 'task';
  }
  if (fileName.startsWith('OPS-')) {
    return 'ops';
  }
  throw new DocumentLoaderError('unsupported-type', `Unable to infer document type for ${absolutePath}`);
}

function validateDocumentFields(
  pathLabel: string,
  type: GuardDocumentType,
  frontmatter: Record<string, string>
): void {
  const missing: string[] = [];
  if (!frontmatter.id) {
    missing.push('id');
  }
  const requiresFeature = FEATURE_REQUIRED_TYPES.includes(type);
  if (requiresFeature && !frontmatter.feature) {
    missing.push('feature');
  }
  const requiresPurpose = PURPOSE_REQUIRED_TYPES.includes(type);
  if (requiresPurpose && !frontmatter.purpose) {
    missing.push('purpose');
  }
  const requiresParent = PARENT_REQUIRED_TYPES.includes(type);
  if (requiresParent && !frontmatter.parent) {
    missing.push('parent');
  }
  if (missing.length > 0) {
    throw new DocumentLoaderError(
      'missing-field',
      `Document ${pathLabel} is missing required frontmatter field(s): ${missing.join(', ')}.`,
      { path: pathLabel, field: missing[0] }
    );
  }
}

function normalizeType(value?: string): GuardDocumentType | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (
    normalized === 'prd' ||
    normalized === 'sub-prd' ||
    normalized === 'beh' ||
    normalized === 'sub-beh' ||
    normalized === 'dsg' ||
    normalized === 'sub-dsg' ||
    normalized === 'adr' ||
    normalized === 'task' ||
    normalized === 'ops'
  ) {
    return normalized;
  }
  return undefined;
}

export function createDocumentLoader(dependencies: DocumentLoaderDependencies): DocumentLoader {
  return new DocumentLoader(dependencies);
}
