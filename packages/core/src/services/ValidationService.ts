import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';

type FileSystemAdapter = {
  readDir(targetPath: string): Promise<string[]>;
  stat(targetPath: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>;
  readFile(targetPath: string): Promise<string>;
};

type DocumentKind =
  | 'prd'
  | 'sub-prd'
  | 'behavior'
  | 'sub-behavior'
  | 'design'
  | 'sub-design'
  | 'adr'
  | 'task'
  | 'ops';

type ParsedFrontmatter = Record<string, string>;

type ScannedDocument = {
  absolutePath: string;
  relativePath: string;
  relativeToDocsRoot: string;
  fileName: string;
  id?: string;
  feature?: string;
  subfeature?: string;
  parent?: string;
  type?: string;
  purpose?: string;
  kind?: DocumentKind;
};

export type RunChecksOptions = {
  cwd: string;
};

export type MissingFieldIssue = {
  type: 'missingField';
  field: string;
  path: string;
  id?: string;
  message: string;
};

export type InvalidNameIssue = {
  type: 'invalidName';
  expectedPattern: string;
  path: string;
  id?: string;
  message: string;
};

export type ParentNotFoundIssue = {
  type: 'parentNotFound';
  parentId: string;
  path: string;
  id?: string;
  message: string;
};

export type ValidationIssue = MissingFieldIssue | InvalidNameIssue | ParentNotFoundIssue;

export type ValidationReport = {
  issues: ValidationIssue[];
};

export type ValidationServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  docsRoot?: string;
};

type NamingRule = {
  kind: DocumentKind;
  description: string;
  buildPath(doc: ScannedDocument, docsRoot: string): string | undefined;
};

const ROOT_PARENT_IDS = new Set(['PRINCIPLE-GLOBAL']);

const NAMING_RULES: NamingRule[] = [
  {
    kind: 'prd',
    description: 'product/features/{FEATURE}/PRD-{FEATURE}.md',
    buildPath: (doc, docsRoot) => {
      const id = doc.id;
      if (!id) return undefined;
      const feature = id.slice('PRD-'.length);
      if (!feature) return undefined;
      return path.join(docsRoot, 'product', 'features', feature, `${id}.md`);
    }
  },
  {
    kind: 'sub-prd',
    description: 'product/features/{FEATURE}/SUB-PRD-{SUB}.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id || !doc.feature) return undefined;
      return path.join(docsRoot, 'product', 'features', doc.feature, `${doc.id}.md`);
    }
  },
  {
    kind: 'behavior',
    description: 'product/features/{FEATURE}/BEH-{FEATURE}.md',
    buildPath: (doc, docsRoot) => {
      const id = doc.id;
      if (!id) return undefined;
      const feature = id.slice('BEH-'.length);
      if (!feature) return undefined;
      return path.join(docsRoot, 'product', 'features', feature, `${id}.md`);
    }
  },
  {
    kind: 'sub-behavior',
    description: 'product/features/{FEATURE}/BEH-{FEATURE}-{SUB}.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id || !doc.feature) return undefined;
      return path.join(docsRoot, 'product', 'features', doc.feature, `${doc.id}.md`);
    }
  },
  {
    kind: 'design',
    description: 'architecture/design/{FEATURE}/DSG-{FEATURE}.md',
    buildPath: (doc, docsRoot) => {
      const id = doc.id;
      if (!id) return undefined;
      const feature = id.slice('DSG-'.length).split('-')[0];
      if (!feature) return undefined;
      return path.join(docsRoot, 'architecture', 'design', feature, `${id}.md`);
    }
  },
  {
    kind: 'sub-design',
    description: 'architecture/design/{FEATURE}/DSG-{FEATURE}-{SUB}.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id || !doc.feature) return undefined;
      return path.join(docsRoot, 'architecture', 'design', doc.feature, `${doc.id}.md`);
    }
  },
  {
    kind: 'adr',
    description: 'architecture/adr/ADR-*.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id) return undefined;
      return path.join(docsRoot, 'architecture', 'adr', `${doc.id}.md`);
    }
  },
  {
    kind: 'task',
    description: 'tasks/TASK-*.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id) return undefined;
      return path.join(docsRoot, 'tasks', `${doc.id}.md`);
    }
  },
  {
    kind: 'ops',
    description: 'ops/OPS-*.md',
    buildPath: (doc, docsRoot) => {
      if (!doc.id) return undefined;
      return path.join(docsRoot, 'ops', `${doc.id}.md`);
    }
  }
];

export class ValidationService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly docsRoot: string;

  constructor({ fileSystemAdapter, docsRoot = resolveDocsRoot() }: ValidationServiceDependencies) {
    this.fileSystemAdapter = fileSystemAdapter;
    this.docsRoot = docsRoot;
  }

  async runChecks({ cwd }: RunChecksOptions): Promise<ValidationReport> {
    if (!cwd) {
      throw new Error('cwd is required');
    }
    const docs = await this.scanDocs({ cwd });
    const issues = [
      ...this.validateFrontmatter(docs),
      ...this.validatePathAndName(docs),
      ...this.validateParentReferences(docs)
    ].sort((a, b) => {
      if (a.path === b.path) {
        return a.type.localeCompare(b.type);
      }
      return a.path.localeCompare(b.path);
    });
    return { issues };
  }

  async scanDocs({ cwd }: RunChecksOptions): Promise<ScannedDocument[]> {
    if (!cwd) {
      throw new Error('cwd is required');
    }
    const docsRootPath = path.resolve(cwd, this.docsRoot);
    const files = await this.walkDirectory(docsRootPath);
    const docs: ScannedDocument[] = [];
    for (const absolutePath of files) {
      if (!absolutePath.toLowerCase().endsWith('.md')) {
        continue;
      }
      const fileName = path.basename(absolutePath);
      const relativePath = normalizePath(path.relative(cwd, absolutePath) || fileName);
      const relativeToDocsRoot = normalizePath(path.relative(docsRootPath, absolutePath) || fileName);
      const content = await this.fileSystemAdapter.readFile(absolutePath);
      const frontmatter = parseFrontmatter(content);
      const id = normalizeField(frontmatter.id);
      const feature = normalizeField(frontmatter.feature);
      const subfeature = normalizeField(frontmatter.subfeature);
      const parent = normalizeField(frontmatter.parent);
      const type = normalizeField(frontmatter.type);
      const purpose = normalizeField(frontmatter.purpose);
      const kind = classifyDocumentKind(id ?? fileName);
      if (!kind) {
        continue;
      }
      docs.push({
        absolutePath,
        relativePath,
        relativeToDocsRoot,
        fileName,
        id,
        feature,
        subfeature,
        parent,
        type,
        purpose,
        kind
      });
    }
    return docs;
  }

  private async walkDirectory(targetPath: string): Promise<string[]> {
    const entries = await this.fileSystemAdapter.readDir(targetPath);
    entries.sort((a, b) => a.localeCompare(b));
    const files: string[] = [];
    for (const entry of entries) {
      const entryPath = path.join(targetPath, entry);
      let stat;
      try {
        stat = await this.fileSystemAdapter.stat(entryPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        files.push(...(await this.walkDirectory(entryPath)));
      } else if (stat.isFile()) {
        files.push(entryPath);
      }
    }
    return files;
  }

  private validateFrontmatter(docs: ScannedDocument[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const doc of docs) {
      const requiredFields = ['id', 'type', 'purpose'];
      const kind = doc.kind;
      if (kind && ['prd', 'sub-prd', 'behavior', 'sub-behavior', 'design', 'sub-design'].includes(kind)) {
        requiredFields.push('feature');
        requiredFields.push('parent');
      }
      const seen = new Set<string>();
      for (const field of requiredFields) {
        if (seen.has(field)) {
          continue;
        }
        seen.add(field);
        const value = (doc as Record<string, string | undefined>)[field];
        if (!value) {
          issues.push({
            type: 'missingField',
            field,
            path: doc.relativePath,
            id: doc.id,
            message: `Missing required frontmatter field "${field}".`
          });
        }
      }
    }
    return issues;
  }

  private validatePathAndName(docs: ScannedDocument[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    for (const doc of docs) {
      if (!doc.kind) continue;
      const rule = NAMING_RULES.find((candidate) => candidate.kind === doc.kind);
      if (!rule) continue;
      const expectedPath = rule.buildPath(doc, this.docsRoot);
      if (!expectedPath) continue;
      const expectedNormalized = normalizePath(expectedPath);
      if (expectedNormalized !== doc.relativePath) {
        issues.push({
          type: 'invalidName',
          expectedPattern: rule.description,
          path: doc.relativePath,
          id: doc.id,
          message: `Expected ${rule.description} but found ${doc.relativePath}.`
        });
      }
    }
    return issues;
  }

  private validateParentReferences(docs: ScannedDocument[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const knownIds = new Set<string>();
    for (const doc of docs) {
      if (doc.id) {
        knownIds.add(doc.id);
      }
    }
    for (const doc of docs) {
      const parentId = doc.parent;
      if (!parentId) {
        continue;
      }
      if (ROOT_PARENT_IDS.has(parentId)) {
        continue;
      }
      if (!knownIds.has(parentId)) {
        issues.push({
          type: 'parentNotFound',
          parentId,
          path: doc.relativePath,
          id: doc.id,
          message: `Referenced parent ${parentId} was not found.`
        });
      }
    }
    return issues;
  }
}

export function createValidationService(dependencies: ValidationServiceDependencies): ValidationService {
  return new ValidationService(dependencies);
}

function normalizeField(value?: string): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/');
}

function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }
  const block = match[1];
  const lines = block.split(/\r?\n/);
  const parsed: ParsedFrontmatter = {};
  let captureKey: string | null = null;
  let captureBuffer: string[] = [];
  for (let i = 0; i <= lines.length; i++) {
    const line = i < lines.length ? lines[i] : undefined;
    if (captureKey) {
      if (line === undefined) {
        parsed[captureKey] = captureBuffer.join('\n').trim();
        break;
      }
      if (line.trim() === '' || /^[\t ]/.test(line)) {
        captureBuffer.push(line.trim());
        continue;
      }
      parsed[captureKey] = captureBuffer.join('\n').trim();
      captureKey = null;
      captureBuffer = [];
      i--;
      continue;
    }
    if (line === undefined) {
      break;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1).trim();
    if (!key) {
      continue;
    }
    if (rawValue === '>' || rawValue === '|') {
      captureKey = key;
      captureBuffer = [];
      continue;
    }
    if (!rawValue) {
      continue;
    }
    parsed[key] = stripQuotes(rawValue);
  }
  return parsed;
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function classifyDocumentKind(source?: string): DocumentKind | undefined {
  if (!source) {
    return undefined;
  }
  const normalized = source.toUpperCase();
  if (normalized.startsWith('SUB-PRD-')) {
    return 'sub-prd';
  }
  if (normalized.startsWith('PRD-')) {
    return 'prd';
  }
  if (normalized.startsWith('BEH-')) {
    const segments = normalized.split('-');
    return segments.length >= 3 ? 'sub-behavior' : 'behavior';
  }
  if (normalized.startsWith('DSG-')) {
    const segments = normalized.split('-');
    return segments.length >= 3 ? 'sub-design' : 'design';
  }
  if (normalized.startsWith('ADR-')) {
    return 'adr';
  }
  if (normalized.startsWith('TASK-')) {
    return 'task';
  }
  if (normalized.startsWith('OPS-')) {
    return 'ops';
  }
  return undefined;
}

