import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import type { FrontmatterSchemaConfig, ScaffoldTemplateConfig, EuteloConfigResolved } from '../config/types.js';
import { DocumentTypeRegistry } from '../config/DocumentTypeRegistry.js';

type FileSystemAdapter = {
  readDir(targetPath: string): Promise<string[]>;
  stat(targetPath: string): Promise<{ isDirectory(): boolean; isFile(): boolean }>;
  readFile(targetPath: string): Promise<string>;
};

type DocumentKind = string;

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
  parents: string[];
  type?: string;
  purpose?: string;
  kind?: DocumentKind;
};

type RelationFields = { parent: string[]; related: string[] };

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

export type UnknownDocumentTypeIssue = {
  type: 'unknownDocumentType';
  documentType: string;
  path: string;
  id?: string;
  message: string;
};

export type ValidationIssue = MissingFieldIssue | InvalidNameIssue | ParentNotFoundIssue | UnknownDocumentTypeIssue;

export type ValidationReport = {
  issues: ValidationIssue[];
  warnings?: ValidationIssue[]; // 警告（exit codeに影響しない）
};

export type ValidationServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  docsRoot?: string;
  frontmatterSchemas?: FrontmatterSchemaConfig[];
  rootParentIds?: string[];
  scaffold?: Record<string, ScaffoldTemplateConfig>;
};

type NamingRule = {
  kind: DocumentKind;
  description: string;
  buildPath(doc: ScannedDocument, docsRoot: string): string | undefined;
};

const DEFAULT_ROOT_PARENT_IDS = new Set<string>();

const DEFAULT_NAMING_RULES: NamingRule[] = [
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

const DEFAULT_RELATION_FIELDS: RelationFields = { parent: ['parent'], related: ['related'] };

export class ValidationService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly docsRoot: string;
  private readonly schemaByKind: Map<string, FrontmatterSchemaConfig>;
  private readonly rootParentIds: Set<string>;
  private readonly namingRules: NamingRule[];
  private readonly relationFieldsByKind: Map<string, RelationFields>;
  private readonly documentTypeRegistry: DocumentTypeRegistry | null;

  constructor({
    fileSystemAdapter,
    docsRoot = resolveDocsRoot(),
    frontmatterSchemas,
    rootParentIds,
    scaffold
  }: ValidationServiceDependencies) {
    this.fileSystemAdapter = fileSystemAdapter;
    this.docsRoot = docsRoot;
    this.schemaByKind = buildSchemaMap(frontmatterSchemas);
    this.rootParentIds = new Set(rootParentIds && rootParentIds.length > 0 ? rootParentIds : DEFAULT_ROOT_PARENT_IDS);
    this.namingRules = scaffold ? buildNamingRulesFromScaffold(scaffold) : DEFAULT_NAMING_RULES;
    this.relationFieldsByKind = buildRelationFields(frontmatterSchemas);
    
    // Create DocumentTypeRegistry if scaffold is available
    if (scaffold && frontmatterSchemas) {
      // Build a minimal EuteloConfigResolved for DocumentTypeRegistry
      const config: EuteloConfigResolved = {
        presets: [],
        docsRoot: this.docsRoot,
        scaffold,
        frontmatter: {
          schemas: frontmatterSchemas,
          rootParentIds: rootParentIds ?? []
        },
        guard: {
          prompts: {}
        },
        sources: {
          cwd: '',
          layers: []
        }
      };
      this.documentTypeRegistry = new DocumentTypeRegistry(config);
    } else {
      this.documentTypeRegistry = null;
    }
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
    
    // Separate warnings (unknownDocumentType) from errors
    const errors = issues.filter((issue) => issue.type !== 'unknownDocumentType');
    const warnings = issues.filter((issue) => issue.type === 'unknownDocumentType');
    
    return { 
      issues: errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
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
      const type = normalizeField(frontmatter.type);
      const purpose = normalizeField(frontmatter.purpose);
      const kind = classifyDocumentKind(id ?? fileName);
      const schemaKey = normalizeDocumentKind(kind ?? type ?? '');
      const relations =
        this.relationFieldsByKind.get(schemaKey) ??
        this.relationFieldsByKind.get('*') ??
        DEFAULT_RELATION_FIELDS;
      const parents = collectRelationIds(frontmatter, relations.parent);
      const parent = parents[0];
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
        parents,
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
      const docType = doc.kind ?? doc.type ?? '';
      const schemaKey = normalizeDocumentKind(docType);
      
      // Check if document type is registered in config
      if (this.documentTypeRegistry && docType) {
        const normalizedType = docType.toLowerCase();
        if (!this.documentTypeRegistry.hasDocumentType(normalizedType)) {
          // Add warning for unknown document type
          issues.push({
            type: 'unknownDocumentType',
            documentType: docType,
            path: doc.relativePath,
            id: doc.id,
            message: `Unknown document type: ${docType}. This type is not defined in the configuration.`
          });
        }
      }
      
      const schema = this.schemaByKind.get(schemaKey) ?? this.schemaByKind.get('*');
      const requiredFields = schema ? collectRequiredFields(schema) : getDefaultRequiredFields(doc.kind);
      for (const field of requiredFields) {
        const rawValue = (doc as Record<string, unknown>)[field];
        const isMissing =
          rawValue === undefined ||
          rawValue === null ||
          (typeof rawValue === 'string' && rawValue.trim().length === 0) ||
          (Array.isArray(rawValue) && rawValue.length === 0);
        if (isMissing) {
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
      const schemaKey = normalizeDocumentKind(doc.kind ?? doc.type ?? '');
      const rule = this.namingRules.find((candidate) => candidate.kind === schemaKey);
      // TEMP DEBUG
      // console.log('DEBUG naming', { path: doc.relativePath, kind: doc.kind, schemaKey, found: rule?.kind });
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
      const parentIds = doc.parents && doc.parents.length > 0 ? doc.parents : doc.parent ? [doc.parent] : [];
      if (parentIds.length === 0) {
        continue;
      }
      for (const parentId of parentIds) {
        if (this.rootParentIds.has(parentId)) {
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

function buildSchemaMap(schemas?: FrontmatterSchemaConfig[]): Map<string, FrontmatterSchemaConfig> {
  const map = new Map<string, FrontmatterSchemaConfig>();
  if (!schemas) {
    return map;
  }
  for (const schema of schemas) {
    if (!schema?.kind) continue;
    map.set(normalizeDocumentKind(schema.kind), schema);
  }
  return map;
}

function collectRequiredFields(schema: FrontmatterSchemaConfig): string[] {
  const required: string[] = [];
  for (const [fieldName, definition] of Object.entries(schema.fields ?? {})) {
    if (definition?.required) {
      required.push(fieldName);
    }
  }
  return required.length > 0 ? required : getDefaultRequiredFields();
}

function buildRelationFields(schemas?: FrontmatterSchemaConfig[]): Map<string, RelationFields> {
  const map = new Map<string, RelationFields>();
  for (const schema of schemas ?? []) {
    const parent: string[] = [];
    const related: string[] = [];
    for (const [fieldName, definition] of Object.entries(schema.fields ?? {})) {
      if (!fieldName) continue;
      if (definition?.relation === 'parent') {
        parent.push(fieldName);
      } else if (definition?.relation === 'related') {
        related.push(fieldName);
      }
    }
    if (parent.length === 0 && related.length === 0) {
      continue;
    }
    map.set(normalizeDocumentKind(schema.kind), { parent, related });
  }
  return map;
}

function collectRelationIds(frontmatter: ParsedFrontmatter, fields: string[]): string[] {
  const values: string[] = [];
  for (const field of fields) {
    const raw = frontmatter[field];
    if (!raw) continue;
    values.push(...parseIdList(raw));
  }
  return Array.from(new Set(values));
}

function parseIdList(rawValue: string): string[] {
  if (!rawValue) return [];
  const trimmed = rawValue.trim();
  if (!trimmed) return [];
  const normalized = trimmed.replace(/'/g, '"');
  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    try {
      const parsed = JSON.parse(normalized);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => String(entry).trim()).filter(Boolean);
      }
    } catch {
      // fall through to comma parsing
    }
  }
  return normalized
    .replace(/[\[\]]/g, '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getDefaultRequiredFields(kind?: DocumentKind): string[] {
  const base = ['id', 'type', 'purpose'];
  if (kind && ['prd', 'sub-prd', 'behavior', 'sub-behavior', 'design', 'sub-design'].includes(kind)) {
    base.push('feature', 'parent');
  }
  return base;
}

function buildNamingRulesFromScaffold(scaffold: Record<string, ScaffoldTemplateConfig>): NamingRule[] {
  const byKind = new Map<string, ScaffoldTemplateConfig>();
  for (const entry of Object.values(scaffold ?? {})) {
    if (!entry?.kind || !entry.path) continue;
    const key = normalizeDocumentKind(entry.kind);
    if (!byKind.has(key)) {
      byKind.set(key, entry);
    }
  }
  const rules: NamingRule[] = [];
  for (const [kind, template] of byKind.entries()) {
    rules.push({
      kind,
      description: template.path,
      buildPath: (doc, docsRoot) => {
        const tokens = buildTokensFromDoc(doc);
        const resolved = applyTemplate(template.path, tokens);
        if (!resolved) {
          return undefined;
        }
        return normalizePath(path.join(docsRoot, resolved));
      }
    });
  }
  return rules;
}

function buildTokensFromDoc(doc: ScannedDocument): Record<string, string> {
  const tokens: Record<string, string> = {
    FEATURE: doc.feature ?? deriveFeatureFromId(doc.id),
    SUB: doc.subfeature ?? deriveSubFromId(doc.id),
    NAME: deriveNameFromId(doc.id),
    SEQUENCE: deriveSequenceFromId(doc.id)
  };
  return tokens;
}

function deriveFeatureFromId(id?: string): string {
  if (!id) return '';
  if (id.startsWith('PRD-') || id.startsWith('BEH-') || id.startsWith('DSG-') || id.startsWith('ADR-')) {
    const [, feature] = id.split('-');
    return feature ?? '';
  }
  if (id.startsWith('SUB-PRD-') || id.startsWith('SUB-BEH-')) {
    const parts = id.split('-');
    return parts.length >= 3 ? parts[2] : '';
  }
  return '';
}

function deriveSubFromId(id?: string): string {
  if (!id) return '';
  if (id.startsWith('SUB-PRD-')) {
    return id.slice('SUB-PRD-'.length);
  }
  if (id.startsWith('BEH-') && id.split('-').length >= 3) {
    return id.split('-').slice(2).join('-');
  }
  return '';
}

function deriveNameFromId(id?: string): string {
  if (!id) return '';
  const hyphenIndex = id.indexOf('-');
  if (hyphenIndex === -1) {
    return id;
  }
  return id.slice(hyphenIndex + 1);
}

function deriveSequenceFromId(id?: string): string {
  if (!id) return '';
  const match = id.match(/-(\d{2,})$/);
  return match ? match[1] : '';
}

function applyTemplate(template: string, tokens: Record<string, string>): string | null {
  if (!template) {
    return null;
  }
  let result = template;
  const placeholders = template.match(/\{[A-Z0-9_-]+\}/g) ?? [];
  for (const placeholder of placeholders) {
    const key = placeholder.slice(1, -1);
    const value = tokens[key] ?? '';
    if (!value) {
      return null;
    }
    const pattern = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(pattern, value);
  }
  return normalizeRelativePath(result);
}

function normalizeRelativePath(value: string): string {
  return value.split(/[\\/]+/).filter(Boolean).join('/');
}

function normalizeDocumentKind(value: string): string {
  if (!value) return '';
  const normalized = value.toLowerCase();
  if (normalized === 'beh') return 'behavior';
  if (normalized === 'sub-beh') return 'sub-behavior';
  if (normalized === 'dsg') return 'design';
  if (normalized === 'sub-dsg') return 'sub-design';
  return normalized;
}
