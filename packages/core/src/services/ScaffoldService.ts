import path from 'node:path';
import { resolveDocsRoot } from '../constants/docsRoot.js';
import { buildRequiredDirectories, REQUIRED_DIRECTORIES } from '../constants/requiredDirectories.js';
import type { TemplateService } from './TemplateService.js';
import type { DocumentType } from './AddDocumentService.js';

type FileSystemAdapter = {
  exists(targetPath: string): Promise<boolean>;
  mkdirp(targetPath: string): Promise<unknown>;
  writeIfNotExists(targetPath: string, content: string): Promise<{ written: boolean; skipped: boolean }>;
  listDirectories(targetPath: string): Promise<string[]>;
};

type Logger = {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
};

const noopLogger: Logger = {
  info() {},
  warn() {},
  error() {}
};

export type ComputeInitPlanOptions = {
  cwd: string;
};

export type InitOptions = ComputeInitPlanOptions & {
  dryRun?: boolean;
};

export type InitResult = {
  created: string[];
  skipped: string[];
  dryRun: boolean;
  total: number;
};

export type SyncPlanEntry = {
  type: DocumentType;
  featureId: string;
  featureDir: string;
  absolutePath: string;
  relativePath: string;
};

export type SyncOptions = {
  cwd: string;
  checkOnly?: boolean;
};

export type SyncResult = {
  plan: SyncPlanEntry[];
  created: string[];
  checkOnly: boolean;
};

export type ScaffoldServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  logger?: Logger;
  templateService?: TemplateService;
  docsRoot?: string;
  clock?: () => Date;
};

export class ScaffoldService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly logger: Logger;
  private readonly templateService?: TemplateService;
  private readonly docsRoot: string;
  private readonly requiredDirectories: readonly string[];
  private readonly clock: () => Date;

  constructor({
    fileSystemAdapter,
    logger = noopLogger,
    templateService,
    docsRoot = resolveDocsRoot(),
    clock = () => new Date()
  }: ScaffoldServiceDependencies) {
    if (!fileSystemAdapter) {
      throw new Error('fileSystemAdapter is required');
    }
    this.fileSystemAdapter = fileSystemAdapter;
    this.logger = logger;
    this.templateService = templateService;
    this.docsRoot = docsRoot;
    this.requiredDirectories = buildRequiredDirectories(docsRoot);
    this.clock = clock;
  }

  async computeInitPlan({ cwd }: ComputeInitPlanOptions): Promise<string[]> {
    if (!cwd) {
      throw new Error('cwd is required');
    }

    const requiredEntries = this.requiredDirectories.map((relativePath) => ({
      relativePath,
      absolutePath: path.resolve(cwd, relativePath)
    }));

    const entriesWithStatus: Array<{ absolutePath: string; exists: boolean }> = [];
    for (const entry of requiredEntries) {
      // sequential check keeps implementation simple and readable
      const exists = await this.fileSystemAdapter.exists(entry.absolutePath);
      entriesWithStatus.push({
        absolutePath: entry.absolutePath,
        exists
      });
    }

    return entriesWithStatus.filter((entry) => !entry.exists).map((entry) => entry.absolutePath);
  }

  async init({ cwd, dryRun = false }: InitOptions): Promise<InitResult> {
    if (!cwd) {
      throw new Error('cwd is required');
    }

    const plan = await this.computeInitPlan({ cwd });

    if (!dryRun) {
      for (const target of plan) {
        await this.fileSystemAdapter.mkdirp(target);
      }
    }

    const absoluteRequiredPaths = this.requiredDirectories.map((relativePath) =>
      path.resolve(cwd, relativePath)
    );
    const skipped = absoluteRequiredPaths.filter((target) => !plan.includes(target));

    return {
      created: plan.map((target) => path.relative(cwd, target) || '.'),
      skipped: skipped.map((target) => path.relative(cwd, target) || '.'),
      dryRun,
      total: this.requiredDirectories.length
    };
  }

  async computeSyncPlan({ cwd }: ComputeInitPlanOptions): Promise<SyncPlanEntry[]> {
    if (!cwd) {
      throw new Error('cwd is required');
    }

    const features = await this.discoverFeatureDirectories(cwd);
    const plan: SyncPlanEntry[] = [];
    for (const feature of features) {
      const relativePath = path.join(
        this.docsRoot,
        'product',
        'features',
        feature.directoryName,
        `PRD-${feature.featureId}.md`
      );
      const absolutePath = path.resolve(cwd, relativePath);
      const exists = await this.fileSystemAdapter.exists(absolutePath);
      if (!exists) {
        plan.push({
          type: 'prd',
          featureId: feature.featureId,
          featureDir: feature.directoryName,
          absolutePath,
          relativePath: path.relative(cwd, absolutePath) || '.'
        });
      }
    }

    return plan.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  }

  async sync({ cwd, checkOnly = false }: SyncOptions): Promise<SyncResult> {
    if (!this.templateService) {
      throw new Error('templateService is required to run sync');
    }
    if (!cwd) {
      throw new Error('cwd is required');
    }

    const plan = await this.computeSyncPlan({ cwd });
    const created: string[] = [];

    if (!checkOnly) {
      const timestamp = this.clock().toISOString().slice(0, 10);
      for (const entry of plan) {
        const rendered = await this.templateService.render('_template-prd.md', {
          FEATURE: entry.featureId,
          SUB: '',
          DATE: timestamp,
          ID: `PRD-${entry.featureId}`,
          PARENT: 'PRINCIPLE-GLOBAL'
        });
        const result = await this.fileSystemAdapter.writeIfNotExists(entry.absolutePath, rendered);
        if (!result.written) {
          this.logger.warn?.(`Skipped writing existing file: ${entry.relativePath}`);
        } else {
          created.push(entry.relativePath);
        }
      }
    }

    return { plan, created, checkOnly };
  }

  private async discoverFeatureDirectories(cwd: string): Promise<FeatureDirectory[]> {
    const featuresDir = path.resolve(cwd, this.docsRoot, 'product', 'features');
    const designDir = path.resolve(cwd, this.docsRoot, 'architecture', 'design');
    const contexts = new Map<string, FeatureDirectory>();

    const addFeature = (dirName: string) => {
      const featureId = normalizeFeatureIdentifier(dirName);
      if (!contexts.has(featureId)) {
        contexts.set(featureId, { featureId, directoryName: dirName });
      }
    };

    const featureDirectories = await this.fileSystemAdapter.listDirectories(featuresDir);
    for (const dir of featureDirectories) {
      addFeature(dir);
    }

    const designDirectories = await this.fileSystemAdapter.listDirectories(designDir);
    for (const dir of designDirectories) {
      if (!contexts.has(normalizeFeatureIdentifier(dir))) {
        addFeature(dir);
      }
    }

    return Array.from(contexts.values());
  }
}

type FeatureDirectory = {
  featureId: string;
  directoryName: string;
};

function normalizeFeatureIdentifier(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  return normalized.replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '-').replace(/-+/g, '-').toUpperCase();
}

export function createScaffoldService(dependencies: ScaffoldServiceDependencies): ScaffoldService {
  return new ScaffoldService(dependencies);
}
