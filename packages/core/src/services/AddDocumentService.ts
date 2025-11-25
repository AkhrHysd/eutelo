import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import type { ScaffoldTemplateConfig } from '../config/types.js';
import type { TemplateService } from './TemplateService.js';

const ADR_SEQUENCE_PAD = 4;
const PLACEHOLDER_PATTERN = /\{([A-Z0-9_-]+)\}/g;

export type DocumentType = string;

type FileSystemAdapter = {
  exists(targetPath: string): Promise<boolean>;
  mkdirp(targetPath: string): Promise<unknown>;
  writeIfNotExists(targetPath: string, content: string): Promise<{ written: boolean; skipped: boolean }>;
  readDir(targetPath: string): Promise<string[]>;
};

export type AddDocumentServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  templateService: TemplateService;
  scaffold: Record<string, ScaffoldTemplateConfig>;
  clock?: () => Date;
  docsRoot?: string;
};

export type ResolveOutputPathOptions = {
  cwd: string;
  type?: DocumentType;
  scaffoldId?: string;
  feature?: string;
  sub?: string;
  name?: string;
  sequence?: string;
};

export type AddDocumentOptions = {
  cwd: string;
  type?: DocumentType;
  scaffoldId?: string;
  feature?: string;
  sub?: string;
  name?: string;
  dryRun?: boolean;
};

export type AddDocumentResult = {
  id: string;
  absolutePath: string;
  relativePath: string;
  dryRun: boolean;
};

export class FileAlreadyExistsError extends Error {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File already exists: ${filePath}`);
    this.name = 'FileAlreadyExistsError';
    this.filePath = filePath;
  }
}

export class DocumentTypeNotFoundError extends Error {
  readonly documentType: string;
  readonly availableTypes: string[];

  constructor(documentType: string, availableTypes: string[]) {
    const typesList = availableTypes.length > 0 ? availableTypes.join(', ') : '(none)';
    super(`Document type '${documentType}' not found. Available types: ${typesList}`);
    this.name = 'DocumentTypeNotFoundError';
    this.documentType = documentType;
    this.availableTypes = availableTypes;
  }
}

type DocumentBlueprint = {
  id: string;
  kind: DocumentType;
  scaffold: ScaffoldTemplateConfig;
  requiresFeature: boolean;
  requiresSub: boolean;
  requiresName: boolean;
  usesSequence: boolean;
};

type DocumentContext = {
  feature?: string;
  featureId?: string;
  sub?: string;
  subId?: string;
  name?: string;
  nameSlug?: string;
  sequence?: string;
};

function normalizeFeature(value?: string): { feature: string; featureId: string } {
  if (!value) {
    throw new Error('feature is required');
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('feature is required');
  }
  const featureId = normalized.replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase();
  return { feature: featureId, featureId };
}

function normalizeSub(value?: string): { sub: string; subId: string } {
  if (!value) {
    throw new Error('sub is required');
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('sub is required');
  }
  const subId = normalized.replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase();
  return { sub: subId, subId };
}

function normalizeName(value?: string): { name: string; nameSlug: string } {
  if (!value) {
    throw new Error('name is required');
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error('name is required');
  }
  const slug = normalized
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
  return { name: slug, nameSlug: slug };
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class AddDocumentService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly templateService: TemplateService;
  private readonly clock: () => Date;
  private readonly docsRoot: string;
  private readonly blueprintsById: Map<string, DocumentBlueprint>;
  private readonly blueprintsByKind: Map<string, DocumentBlueprint>;

  constructor({
    fileSystemAdapter,
    templateService,
    scaffold,
    clock = () => new Date(),
    docsRoot = resolveDocsRoot()
  }: AddDocumentServiceDependencies) {
    this.fileSystemAdapter = fileSystemAdapter;
    this.templateService = templateService;
    this.clock = clock;
    this.docsRoot = docsRoot;
    const { byId, byKind } = buildDocumentBlueprints(scaffold);
    this.blueprintsById = byId;
    this.blueprintsByKind = byKind;
  }

  resolveOutputPath(options: ResolveOutputPathOptions): string {
    const { cwd, type, scaffoldId } = options;
    const blueprint = this.getBlueprint({ type, scaffoldId });
    const context = this.buildContext({
      definition: blueprint,
      feature: options.feature,
      sub: options.sub,
      name: options.name,
      sequence: options.sequence
    });
    const tokens = this.buildTokenMap(context, blueprint, { includeDate: false });
    const relativeDocPath = applyPlaceholders(blueprint.scaffold.path, tokens);
    const relative = path.join(this.docsRoot, normalizeRelativeDocPath(relativeDocPath));
    return path.resolve(cwd, relative);
  }

  async addDocument({
    cwd,
    type,
    scaffoldId,
    feature,
    sub,
    name,
    dryRun = false
  }: AddDocumentOptions): Promise<AddDocumentResult> {
    const blueprint = this.getBlueprint({ type, scaffoldId });
    const context = this.buildContext({ definition: blueprint, feature, sub, name });
    const baseTokens = this.buildTokenMap(context, blueprint, { includeDate: false });
    let sequence: string | undefined;

    if (blueprint.usesSequence) {
      sequence = await this.computeNextSequence({
        cwd,
        blueprint,
        tokens: baseTokens
      });
      context.sequence = sequence;
    }

    const tokens = this.buildTokenMap(context, blueprint, { includeDate: true });
    const id = this.resolveId(blueprint, tokens);
    tokens.ID = id;
    
    // frontmatterDefaults.parent が設定されている場合はそれを優先、そうでなければ variables.PARENT を使用
    if (blueprint.scaffold.frontmatterDefaults?.parent) {
      tokens.PARENT = applyPlaceholders(blueprint.scaffold.frontmatterDefaults.parent, tokens);
    } else {
      const parent = this.resolveParent(blueprint, tokens);
      tokens.PARENT = parent;
    }

    const relativeDocPath = applyPlaceholders(blueprint.scaffold.path, tokens);
    const relativePath = path.join(this.docsRoot, normalizeRelativeDocPath(relativeDocPath));
    const absolutePath = path.resolve(cwd, relativePath);
    const rendered = await this.templateService.render(blueprint.scaffold.template, tokens);

    if (dryRun) {
      return { id, absolutePath, relativePath, dryRun: true };
    }

    const writeResult = await this.fileSystemAdapter.writeIfNotExists(absolutePath, rendered);
    if (writeResult.skipped) {
      throw new FileAlreadyExistsError(absolutePath);
    }

    return { id, absolutePath, relativePath, dryRun: false };
  }

  private buildContext({
    definition,
    feature,
    sub,
    name,
    sequence
  }: {
    definition: DocumentBlueprint;
    feature?: string;
    sub?: string;
    name?: string;
    sequence?: string;
  }): DocumentContext {
    const context: DocumentContext = {};
    if (definition.requiresFeature) {
      Object.assign(context, normalizeFeature(feature));
    }
    if (definition.requiresSub) {
      Object.assign(context, normalizeSub(sub));
    }
    if (definition.requiresName) {
      Object.assign(context, normalizeName(name));
    }
    if (sequence) {
      context.sequence = sequence;
    }
    return context;
  }

  private buildTokenMap(
    context: DocumentContext,
    blueprint: DocumentBlueprint,
    { includeDate }: { includeDate: boolean }
  ): Record<string, string> {
    const tokens: Record<string, string> = {
      FEATURE: context.featureId ?? '',
      SUB: context.subId ?? '',
      NAME: context.nameSlug ?? '',
      SEQUENCE: context.sequence ?? ''
    };
    if (includeDate) {
      tokens.DATE = formatDate(this.clock());
    }
    
    // frontmatterDefaults から type を取得してトークンに追加
    if (blueprint.scaffold.frontmatterDefaults?.type) {
      tokens.TYPE = applyPlaceholders(blueprint.scaffold.frontmatterDefaults.type, tokens);
    }
    
    return tokens;
  }

  private async computeNextSequence({
    cwd,
    blueprint,
    tokens
  }: {
    cwd: string;
    blueprint: DocumentBlueprint;
    tokens: Record<string, string>;
  }): Promise<string> {
    const docsRootPath = path.resolve(cwd, this.docsRoot);
    const tokensWithoutSequence = { ...tokens, SEQUENCE: '' };
    const relativeDirPattern = path.posix.dirname(blueprint.scaffold.path);
    const resolvedDirRelative = applyPlaceholders(relativeDirPattern, tokensWithoutSequence);
    const dirPath = path.resolve(docsRootPath, normalizeRelativeDocPath(resolvedDirRelative));

    let entries: string[] = [];
    try {
      entries = await this.fileSystemAdapter.readDir(dirPath);
    } catch {
      entries = [];
    }

    const filePattern = path.posix.basename(blueprint.scaffold.path);
    const regex = buildFilePatternRegex(filePattern, tokensWithoutSequence, ADR_SEQUENCE_PAD);
    let max = 0;
    for (const entry of entries) {
      const match = entry.match(regex);
      if (match) {
        const value = Number.parseInt(match[1], 10);
        if (value > max) {
          max = value;
        }
      }
    }
    return String(max + 1).padStart(ADR_SEQUENCE_PAD, '0');
  }

  private resolveId(blueprint: DocumentBlueprint, tokens: Record<string, string>): string {
    const idPattern = blueprint.scaffold.variables?.ID;
    if (!idPattern) {
      throw new Error(`Scaffold template "${blueprint.scaffold.id}" is missing ID variable definition`);
    }
    const resolved = applyPlaceholders(idPattern, tokens);
    if (!resolved) {
      throw new Error(`Failed to resolve document ID for scaffold "${blueprint.scaffold.id}"`);
    }
    return resolved;
  }

  private resolveParent(blueprint: DocumentBlueprint, tokens: Record<string, string>): string {
    const parentPattern = blueprint.scaffold.variables?.PARENT;
    if (!parentPattern) {
      return '';
    }
    return applyPlaceholders(parentPattern, tokens);
  }

  private getBlueprint({ type, scaffoldId }: { type?: DocumentType; scaffoldId?: string }): DocumentBlueprint {
    // scaffoldId が指定されている場合は id で検索
    if (scaffoldId) {
      const byId = this.blueprintsById.get(scaffoldId);
      if (byId) {
        return byId;
      }
      // scaffoldId が見つからない場合
      const availableTypes = Array.from(this.blueprintsByKind.keys()).sort();
      throw new DocumentTypeNotFoundError(`scaffold:${scaffoldId}`, availableTypes);
    }

    // type が指定されている場合は kind で検索
    if (type) {
      const normalizedType = type.toLowerCase();
      // まず id として検索（後方互換性のため）
      const byId = this.blueprintsById.get(type);
      if (byId) {
        return byId;
      }
      // kind で検索
      const byKind = this.blueprintsByKind.get(normalizedType);
      if (byKind) {
        return byKind;
      }
      // type が見つからない場合
      const availableTypes = Array.from(this.blueprintsByKind.keys()).sort();
      throw new DocumentTypeNotFoundError(type, availableTypes);
    }

    // type も scaffoldId も指定されていない場合
    const availableTypes = Array.from(this.blueprintsByKind.keys()).sort();
    throw new DocumentTypeNotFoundError('unknown', availableTypes);
  }
}

export function createAddDocumentService(deps: AddDocumentServiceDependencies): AddDocumentService {
  return new AddDocumentService(deps);
}

function buildDocumentBlueprints(
  scaffold: Record<string, ScaffoldTemplateConfig>
): { byId: Map<string, DocumentBlueprint>; byKind: Map<string, DocumentBlueprint> } {
  if (!scaffold || Object.keys(scaffold).length === 0) {
    throw new Error('scaffold configuration is required');
  }
  const byId = new Map<string, DocumentBlueprint>();
  const byKind = new Map<string, DocumentBlueprint>();
  for (const entry of Object.values(scaffold)) {
    if (!entry?.id || !entry.kind) {
      throw new Error('scaffold entries must define id and kind');
    }
    const requiresFeature = usesPlaceholder(entry, 'FEATURE');
    const requiresSub = usesPlaceholder(entry, 'SUB');
    const requiresName = usesPlaceholder(entry, 'NAME');
    const usesSequence = usesPlaceholder(entry, 'SEQUENCE');
    const blueprint: DocumentBlueprint = {
      id: entry.id,
      kind: entry.kind.toLowerCase(),
      scaffold: entry,
      requiresFeature,
      requiresSub,
      requiresName,
      usesSequence
    };
    byId.set(entry.id, blueprint);
    if (!byKind.has(blueprint.kind)) {
      byKind.set(blueprint.kind, blueprint);
    }
  }
  return { byId, byKind };
}

function usesPlaceholder(config: ScaffoldTemplateConfig, placeholder: string): boolean {
  const token = `{${placeholder}}`;
  if (config.path.includes(token)) {
    return true;
  }
  if (config.template.includes(token)) {
    return true;
  }
  for (const value of Object.values(config.variables ?? {})) {
    if (typeof value === 'string' && value.includes(token)) {
      return true;
    }
  }
  return false;
}

function applyPlaceholders(template: string, tokens: Record<string, string>): string {
  return template.replace(PLACEHOLDER_PATTERN, (_, key: string) => tokens[key] ?? '');
}

function normalizeRelativeDocPath(relativePath: string): string {
  if (!relativePath) {
    return '';
  }
  const segments = relativePath.split(/[\\/]+/).filter((segment) => segment.length > 0);
  if (segments.length === 0) {
    return '';
  }
  return path.join(...segments);
}

function buildFilePatternRegex(
  pattern: string,
  tokens: Record<string, string>,
  sequencePad: number
): RegExp {
  let source = '';
  let lastIndex = 0;
  PLACEHOLDER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PLACEHOLDER_PATTERN.exec(pattern)) !== null) {
    if (match.index > lastIndex) {
      source += escapeRegExp(pattern.slice(lastIndex, match.index));
    }
    const placeholder = match[1];
    if (placeholder === 'SEQUENCE') {
      source += `(\\d{${sequencePad}})`;
    } else {
      source += escapeRegExp(tokens[placeholder] ?? '');
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < pattern.length) {
    source += escapeRegExp(pattern.slice(lastIndex));
  }
  return new RegExp(`^${source}$`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
