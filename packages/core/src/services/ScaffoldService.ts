import path from 'node:path';
import { REQUIRED_DIRECTORIES } from '../constants/requiredDirectories.js';

type FileSystemAdapter = {
  exists(targetPath: string): Promise<boolean>;
  mkdirp(targetPath: string): Promise<unknown>;
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

export type ScaffoldServiceDependencies = {
  fileSystemAdapter: FileSystemAdapter;
  logger?: Logger;
};

export class ScaffoldService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly logger: Logger;

  constructor({ fileSystemAdapter, logger = noopLogger }: ScaffoldServiceDependencies) {
    if (!fileSystemAdapter) {
      throw new Error('fileSystemAdapter is required');
    }
    this.fileSystemAdapter = fileSystemAdapter;
    this.logger = logger;
  }

  async computeInitPlan({ cwd }: ComputeInitPlanOptions): Promise<string[]> {
    if (!cwd) {
      throw new Error('cwd is required');
    }

    const requiredEntries = REQUIRED_DIRECTORIES.map((relativePath) => ({
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

    const absoluteRequiredPaths = REQUIRED_DIRECTORIES.map((relativePath) =>
      path.resolve(cwd, relativePath)
    );
    const skipped = absoluteRequiredPaths.filter((target) => !plan.includes(target));

    return {
      created: plan.map((target) => path.relative(cwd, target) || '.'),
      skipped: skipped.map((target) => path.relative(cwd, target) || '.'),
      dryRun,
      total: REQUIRED_DIRECTORIES.length
    };
  }
}

export function createScaffoldService({ fileSystemAdapter, logger }: ScaffoldServiceDependencies): ScaffoldService {
  return new ScaffoldService({ fileSystemAdapter, logger });
}
