import path from 'node:path';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import type {
  DocumentScanResult,
  DocumentScanError,
  DocumentKind,
  ScannedDocument
} from './types.js';

type FileSystemReader = {
  exists?(targetPath: string): Promise<boolean>;
  readDir(targetPath: string): Promise<string[]>;
  stat(targetPath: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>;
  readFile(targetPath: string): Promise<string>;
};

export type DocumentScannerDependencies = {
  fileSystemAdapter?: FileSystemReader;
  docsRoot?: string;
};

const DOCUMENT_NAME_PATTERN =
  /(PRD|SUB-PRD|BEH|SUB-BEH|DSG|ADR|TASK|TSK|OPS|OPS-|ADR|PRINCIPLE)-[A-Z0-9-]+\.md$/i;

const DEFAULT_ALLOWED_FIELDS = [
  'id',
  'type',
  'feature',
  'title',
  'purpose',
  'status',
  'version',
  'parent',
  'owners',
  'tags',
  'last_updated',
  'related',
  'references',
  'links',
  'due',
  'estimate',
  'related_prd',
  'related_beh',
  'scope'
];

export class DocumentScanner {
  private readonly fs: FileSystemReader;
  private readonly docsRoot: string;
  private readonly parser: FrontmatterParser;

  constructor({ fileSystemAdapter, docsRoot = resolveDocsRoot() }: DocumentScannerDependencies = {}) {
    this.fs = fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.docsRoot = docsRoot;
    this.parser = new FrontmatterParser({ allowedFields: DEFAULT_ALLOWED_FIELDS });
  }

  async scan({ cwd }: { cwd: string }): Promise<DocumentScanResult> {
    const absoluteRoot = path.resolve(cwd, this.docsRoot);
    if (typeof this.fs.exists === 'function') {
      const exists = await this.fs.exists(absoluteRoot);
      if (!exists) {
        throw new Error(`Docs root not found at ${absoluteRoot}`);
      }
    }

    const files = await this.collectMarkdownFiles(absoluteRoot);
    const documents: ScannedDocument[] = [];
    const errors: DocumentScanError[] = [];

    for (const filePath of files) {
      try {
        const document = await this.parseDocument(absoluteRoot, filePath);
        if (document) {
          documents.push(document);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ path: filePath, message });
      }
    }

    return { documents, errors };
  }

  private async collectMarkdownFiles(root: string): Promise<string[]> {
    const resolved: string[] = [];
    await this.walk(root, resolved);
    return resolved;
  }

  private async walk(current: string, bucket: string[]): Promise<void> {
    const entries = await this.fs.readDir(current);
    for (const entry of entries) {
      const absolute = path.join(current, entry);
      const stat = await this.fs.stat(absolute);
      if (stat.isDirectory()) {
        await this.walk(absolute, bucket);
        continue;
      }

      if (!stat.isFile()) {
        continue;
      }

      if (!DOCUMENT_NAME_PATTERN.test(entry)) {
        continue;
      }

      bucket.push(absolute);
    }
  }

  private async parseDocument(root: string, absolutePath: string): Promise<ScannedDocument | null> {
    const content = await this.fs.readFile(absolutePath);
    const { frontmatter, issues } = this.parser.parse(content);
    if (!frontmatter || !frontmatter.id) {
      throw new Error('Document must declare an id in frontmatter.');
    }

    const normalizedPath = normalizePath(path.relative(root, absolutePath));
    const type = normalizeDocumentType(frontmatter.type, normalizedPath);
    const parentIds = parseIdList(frontmatter.parent);
    const relatedIds = parseIdList(frontmatter.related);
    const tags = parseIdList(frontmatter.tags);
    const owners = parseIdList(frontmatter.owners);
    const mentionIds = extractMentions(removeFrontmatter(content));

    return {
      id: frontmatter.id,
      type,
      feature: frontmatter.feature,
      title: frontmatter.title,
      status: frontmatter.status,
      parentIds,
      relatedIds,
      mentionIds,
      tags,
      owners,
      lastUpdated: frontmatter.last_updated,
      path: normalizedPath,
      warnings: issues.map((issue) => issue.message),
      absolutePath
    };
  }
}

function normalizePath(target: string): string {
  return target.split(path.sep).join('/');
}

function normalizeDocumentType(value: string | undefined, relativePath: string): DocumentKind {
  const normalized = value?.toLowerCase();
  if (normalized) {
    if (normalized === 'behavior') return 'beh';
    if (normalized === 'doc') return 'unknown';
    return (normalized as DocumentKind) ?? 'unknown';
  }

  if (relativePath.includes('SUB-PRD')) return 'sub-prd';
  if (relativePath.includes('/PRD-')) return 'prd';
  if (relativePath.includes('SUB-BEH')) return 'sub-beh';
  if (relativePath.includes('/BEH-')) return 'beh';
  if (relativePath.includes('/DSG-')) return 'dsg';
  if (relativePath.includes('/ADR-')) return 'adr';
  if (relativePath.includes('/TASK-') || relativePath.includes('/TSK-')) return 'task';
  if (relativePath.includes('/OPS-')) return 'ops';
  return 'unknown';
}

function parseIdList(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }
  const normalized = trimmed.replace(/'/g, '"');
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((value) => String(value).trim()).filter(Boolean);
      }
    } catch {
      // Fallback to comma parsing below
    }
  }
  return trimmed
    .replace(/[\[\]]/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function removeFrontmatter(content: string): string {
  const match = content.match(/^---[\s\S]+?---\s*/);
  if (!match) {
    return content;
  }
  return content.slice(match[0].length);
}

const MENTION_PATTERN = /\b(?:PRD|BEH|DSG|ADR|TASK|TSK|OPS|SUB-PRD|SUB-BEH)-[A-Z0-9-]+\b/g;

function extractMentions(body: string): string[] {
  const matches = body.match(MENTION_PATTERN);
  if (!matches) {
    return [];
  }
  return Array.from(new Set(matches));
}
