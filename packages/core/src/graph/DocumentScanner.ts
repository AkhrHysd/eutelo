import path from 'node:path';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import type { ScaffoldTemplateConfig, FrontmatterSchemaConfig } from '../config/types.js';
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
  allowedFields?: string[];
  scaffold?: Record<string, ScaffoldTemplateConfig>;
  frontmatterSchemas?: FrontmatterSchemaConfig[];
};

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
const DEFAULT_PATH_MATCHERS: PathMatcher[] = [
  { kind: 'prd', regex: /^product\/features\/[^/]+\/PRD-[^/]+\.md$/i },
  { kind: 'sub-prd', regex: /^product\/features\/[^/]+\/SUB-PRD-[^/]+\.md$/i },
  { kind: 'beh', regex: /^product\/features\/[^/]+\/BEH-[^/]+\.md$/i },
  { kind: 'sub-beh', regex: /^product\/features\/[^/]+\/BEH-[^/]+-[^/]+\.md$/i },
  { kind: 'dsg', regex: /^architecture\/design\/[^/]+\/DSG-[^/]+\.md$/i },
  { kind: 'sub-design', regex: /^architecture\/design\/[^/]+\/DSG-[^/]+-[^/]+\.md$/i },
  { kind: 'adr', regex: /^architecture\/adr\/ADR-[^/]+\.md$/i },
  { kind: 'task', regex: /^tasks\/TASK-[^/]+\.md$/i },
  { kind: 'ops', regex: /^ops\/OPS-[^/]+\.md$/i }
];

const DEFAULT_MENTION_PATTERN = /\b(?:PRD|SUB-PRD|BEH|SUB-BEH|DSG|ADR|TASK|TSK|OPS)-[A-Z0-9-]+\b/g;

type PathMatcher = { kind: DocumentKind; regex: RegExp };

export class DocumentScanner {
  private readonly fs: FileSystemReader;
  private readonly docsRoot: string;
  private readonly parser: FrontmatterParser;
  private readonly pathMatchers: PathMatcher[];
  private readonly mentionPattern: RegExp;

  constructor({
    fileSystemAdapter,
    docsRoot = resolveDocsRoot(),
    allowedFields,
    scaffold,
    frontmatterSchemas
  }: DocumentScannerDependencies = {}) {
    this.fs = fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.docsRoot = docsRoot;
    const dynamicAllowed = buildAllowedFields(allowedFields, frontmatterSchemas);
    this.parser = new FrontmatterParser({ allowedFields: dynamicAllowed });
    this.pathMatchers = buildPathMatchers(scaffold) ?? DEFAULT_PATH_MATCHERS;
    this.mentionPattern = buildMentionPattern(scaffold) ?? DEFAULT_MENTION_PATTERN;
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
    await this.walk(root, resolved, root);
    return resolved;
  }

  private async walk(current: string, bucket: string[], root: string): Promise<void> {
    const entries = await this.fs.readDir(current);
    for (const entry of entries) {
      const absolute = path.join(current, entry);
      const stat = await this.fs.stat(absolute);
      if (stat.isDirectory()) {
        await this.walk(absolute, bucket, root);
        continue;
      }

      if (!stat.isFile()) {
        continue;
      }

      if (!entry.toLowerCase().endsWith('.md')) {
        continue;
      }

      const relative = normalizePath(path.relative(root, absolute));
      if (this.pathMatchers.length === 0 || this.pathMatchers.some((matcher) => matcher.regex.test(relative))) {
        bucket.push(absolute);
      }
    }
  }

  private async parseDocument(root: string, absolutePath: string): Promise<ScannedDocument | null> {
    const content = await this.fs.readFile(absolutePath);
    const { frontmatter, issues } = this.parser.parse(content);
    if (!frontmatter || !frontmatter.id) {
      throw new Error('Document must declare an id in frontmatter.');
    }

    const normalizedPath = normalizePath(path.relative(root, absolutePath));
    const type = normalizeDocumentType(frontmatter.type, normalizedPath, this.pathMatchers);
    const parentIds = parseIdList(frontmatter.parent);
    const relatedIds = parseIdList(frontmatter.related);
    const tags = parseIdList(frontmatter.tags);
    const owners = parseIdList(frontmatter.owners);
    const mentionIds = extractMentions(removeFrontmatter(content), this.mentionPattern);

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

function normalizeDocumentType(
  value: string | undefined,
  relativePath: string,
  matchers: PathMatcher[]
): DocumentKind {
  const matched = matchers.find((matcher) => matcher.regex.test(relativePath));
  if (matched) {
    return matched.kind;
  }
  const normalized = value?.trim();
  if (normalized) {
    return normalized.toLowerCase();
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

function extractMentions(body: string, pattern: RegExp): string[] {
  const matches = body.match(pattern);
  if (!matches) {
    return [];
  }
  return Array.from(new Set(matches));
}

function buildAllowedFields(
  explicit?: string[],
  schemas?: FrontmatterSchemaConfig[]
): string[] {
  if (explicit && explicit.length > 0) {
    return Array.from(new Set(explicit));
  }
  const fields = new Set<string>(DEFAULT_ALLOWED_FIELDS);
  for (const schema of schemas ?? []) {
    for (const field of Object.keys(schema.fields ?? {})) {
      if (field) {
        fields.add(field);
      }
    }
  }
  return Array.from(fields);
}

function buildPathMatchers(scaffold?: Record<string, ScaffoldTemplateConfig>): PathMatcher[] | null {
  if (!scaffold || Object.keys(scaffold).length === 0) {
    return null;
  }
  const matchers: PathMatcher[] = [];
  for (const entry of Object.values(scaffold)) {
    if (!entry?.kind || !entry.path) {
      continue;
    }
    const regex = templateToRegex(entry.path);
    matchers.push({ kind: entry.kind.toLowerCase(), regex });
  }
  return matchers.length > 0 ? matchers : null;
}

function templateToRegex(template: string): RegExp {
  let pattern = '';
  let lastIndex = 0;
  const placeholder = /\{[A-Z0-9_-]+\}/gi;
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(template)) !== null) {
    if (match.index > lastIndex) {
      pattern += escapeRegExp(template.slice(lastIndex, match.index));
    }
    pattern += '[^/]+';
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    pattern += escapeRegExp(template.slice(lastIndex));
  }
  return new RegExp(`^${pattern}$`, 'i');
}

function buildMentionPattern(scaffold?: Record<string, ScaffoldTemplateConfig>): RegExp | null {
  if (!scaffold) {
    return null;
  }
  const patterns: string[] = [];
  for (const entry of Object.values(scaffold)) {
    const template = entry?.variables?.ID;
    if (!template) continue;
    patterns.push(convertTemplateToIdPattern(template));
  }
  if (patterns.length === 0) {
    return null;
  }
  return new RegExp(`\\b(?:${patterns.join('|')})\\b`, 'g');
}

function convertTemplateToIdPattern(template: string): string {
  let pattern = '';
  let lastIndex = 0;
  const placeholder = /\{[A-Z0-9_-]+\}/gi;
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(template)) !== null) {
    if (match.index > lastIndex) {
      pattern += escapeRegExp(template.slice(lastIndex, match.index));
    }
    pattern += '[A-Z0-9-]+';
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    pattern += escapeRegExp(template.slice(lastIndex));
  }
  return pattern;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
