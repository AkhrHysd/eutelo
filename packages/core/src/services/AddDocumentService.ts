import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import type { TemplateService } from './TemplateService.js';

const ADR_SEQUENCE_PAD = 4;

export type DocumentType =
  | 'prd'
  | 'beh'
  | 'sub-prd'
  | 'sub-beh'
  | 'dsg'
  | 'adr'
  | 'task'
  | 'ops';

type FileSystemAdapter = {
  exists(targetPath: string): Promise<boolean>;
  mkdirp(targetPath: string): Promise<unknown>;
  writeIfNotExists(targetPath: string, content: string): Promise<{ written: boolean; skipped: boolean }>;
  readDir(targetPath: string): Promise<string[]>;
};

export type AddDocumentServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  templateService: TemplateService;
  clock?: () => Date;
  docsRoot?: string;
};

export type ResolveOutputPathOptions = {
  cwd: string;
  type: DocumentType;
  feature?: string;
  sub?: string;
  name?: string;
  sequence?: string;
};

export type AddDocumentOptions = {
  cwd: string;
  type: DocumentType;
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

type DocumentDefinitionContext = {
  feature?: string;
  featureId?: string;
  sub?: string;
  subId?: string;
  name?: string;
  nameSlug?: string;
  sequence?: string;
};

type DocumentDefinition = {
  template: string;
  requiresFeature?: boolean;
  requiresSub?: boolean;
  requiresName?: boolean;
  resolveRelativePath(docsRoot: string, context: Required<DocumentDefinitionContext>): string;
  buildId(context: Required<DocumentDefinitionContext>): string;
  buildParentId?(context: Required<DocumentDefinitionContext>): string | undefined;
};

const DOCUMENT_DEFINITIONS: Record<DocumentType, DocumentDefinition> = {
  prd: {
    template: '_template-prd.md',
    requiresFeature: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'product', 'features', ctx.featureId!, `PRD-${ctx.featureId}.md`),
    buildId: (ctx) => `PRD-${ctx.featureId}`,
    buildParentId: () => 'PRINCIPLE-GLOBAL'
  },
  beh: {
    template: '_template-beh.md',
    requiresFeature: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'product', 'features', ctx.featureId!, `BEH-${ctx.featureId}.md`),
    buildId: (ctx) => `BEH-${ctx.featureId}`,
    buildParentId: (ctx) => `PRD-${ctx.featureId}`
  },
  'sub-prd': {
    template: '_template-sub-prd.md',
    requiresFeature: true,
    requiresSub: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'product', 'features', ctx.featureId!, `SUB-PRD-${ctx.subId}.md`),
    buildId: (ctx) => `SUB-PRD-${ctx.subId}`,
    buildParentId: (ctx) => `PRD-${ctx.featureId}`
  },
  'sub-beh': {
    template: '_template-sub-beh.md',
    requiresFeature: true,
    requiresSub: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'product', 'features', ctx.featureId!, `BEH-${ctx.featureId}-${ctx.subId}.md`),
    buildId: (ctx) => `BEH-${ctx.featureId}-${ctx.subId}`,
    buildParentId: (ctx) => `SUB-PRD-${ctx.subId}`
  },
  dsg: {
    template: '_template-dsg.md',
    requiresFeature: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'architecture', 'design', ctx.featureId!, `DSG-${ctx.featureId}.md`),
    buildId: (ctx) => `DSG-${ctx.featureId}`,
    buildParentId: (ctx) => `PRD-${ctx.featureId}`
  },
  adr: {
    template: '_template-adr.md',
    requiresFeature: true,
    resolveRelativePath: (docsRoot, ctx) =>
      path.join(docsRoot, 'architecture', 'adr', `ADR-${ctx.featureId}-${ctx.sequence}.md`),
    buildId: (ctx) => `ADR-${ctx.featureId}-${ctx.sequence}`,
    buildParentId: (ctx) => `PRD-${ctx.featureId}`
  },
  task: {
    template: '_template-task.md',
    requiresName: true,
    resolveRelativePath: (docsRoot, ctx) => path.join(docsRoot, 'tasks', `TASK-${ctx.nameSlug}.md`),
    buildId: (ctx) => `TASK-${ctx.nameSlug}`,
    buildParentId: () => undefined
  },
  ops: {
    template: '_template-ops.md',
    requiresName: true,
    resolveRelativePath: (docsRoot, ctx) => path.join(docsRoot, 'ops', `OPS-${ctx.nameSlug}.md`),
    buildId: (ctx) => `OPS-${ctx.nameSlug}`,
    buildParentId: () => undefined
  }
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

  constructor({
    fileSystemAdapter,
    templateService,
    clock = () => new Date(),
    docsRoot = resolveDocsRoot()
  }: AddDocumentServiceDependencies) {
    this.fileSystemAdapter = fileSystemAdapter;
    this.templateService = templateService;
    this.clock = clock;
    this.docsRoot = docsRoot;
  }

  resolveOutputPath(options: ResolveOutputPathOptions): string {
    const { cwd, type } = options;
    const definition = DOCUMENT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unsupported document type: ${type}`);
    }
    const context = this.buildContext({
      definition,
      feature: options.feature,
      sub: options.sub,
      name: options.name,
      sequence: options.sequence ?? '0001'
    });
    const relative = definition.resolveRelativePath(this.docsRoot, context as Required<DocumentDefinitionContext>);
    return path.resolve(cwd, relative);
  }

  async addDocument({ cwd, type, feature, sub, name, dryRun = false }: AddDocumentOptions): Promise<AddDocumentResult> {
    const definition = DOCUMENT_DEFINITIONS[type];
    if (!definition) {
      throw new Error(`Unsupported document type: ${type}`);
    }

    const sequence =
      type === 'adr'
        ? await this.computeNextAdrSequence(path.resolve(cwd, path.join(this.docsRoot, 'architecture', 'adr')), feature)
        : undefined;
    const context = this.buildContext({ definition, feature, sub, name, sequence });
    const relativePath = definition.resolveRelativePath(this.docsRoot, context as Required<DocumentDefinitionContext>);
    const absolutePath = path.resolve(cwd, relativePath);
    const id = definition.buildId(context as Required<DocumentDefinitionContext>);
    const parent = definition.buildParentId?.(context as Required<DocumentDefinitionContext>) ?? '';
    const replacements = {
      FEATURE: context.featureId ?? context.nameSlug ?? '',
      SUB: context.subId ?? '',
      DATE: formatDate(this.clock()),
      ID: id,
      PARENT: parent
    };
    const rendered = await this.templateService.render(definition.template, replacements);

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
    definition: DocumentDefinition;
    feature?: string;
    sub?: string;
    name?: string;
    sequence?: string;
  }): DocumentDefinitionContext {
    const context: DocumentDefinitionContext = {};
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

  private async computeNextAdrSequence(adrDir: string, feature?: string): Promise<string> {
    const { featureId } = normalizeFeature(feature);
    let entries: string[] = [];
    try {
      entries = await this.fileSystemAdapter.readDir(adrDir);
    } catch {
      entries = [];
    }
    const pattern = new RegExp(`^ADR-${featureId}-(\\d{${ADR_SEQUENCE_PAD}})\\.md$`);
    let max = 0;
    for (const entry of entries) {
      const match = entry.match(pattern);
      if (match) {
        const value = Number.parseInt(match[1], 10);
        if (value > max) {
          max = value;
        }
      }
    }
    return String(max + 1).padStart(ADR_SEQUENCE_PAD, '0');
  }
}

export function createAddDocumentService(deps: AddDocumentServiceDependencies): AddDocumentService {
  return new AddDocumentService(deps);
}
