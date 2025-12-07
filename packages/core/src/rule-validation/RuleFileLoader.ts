/**
 * RuleFileLoader - Loads and resolves rule files
 */

import path from 'node:path';
import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';

export type RuleFileLoaderOptions = {
  fileSystemAdapter?: FileSystemAdapter;
  cwd?: string;
  configPath?: string;
};

export class RuleFileLoader {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly cwd: string;
  private readonly configPath?: string;

  constructor(options: RuleFileLoaderOptions = {}) {
    this.fileSystemAdapter = options.fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.cwd = options.cwd ?? process.cwd();
    this.configPath = options.configPath;
  }

  /**
   * Resolve rule file path
   * Priority:
   * 1. Absolute path
   * 2. Relative to config file (if starts with ./)
   * 3. Relative to project root
   */
  resolveRulePath(rulePath: string): string {
    // 1. Absolute path
    if (path.isAbsolute(rulePath)) {
      return rulePath;
    }

    // 2. Relative to config file (if starts with ./)
    if (rulePath.startsWith('./')) {
      if (this.configPath) {
        return path.resolve(path.dirname(this.configPath), rulePath);
      }
      // If no config path, treat as relative to cwd
      return path.resolve(this.cwd, rulePath);
    }

    // 3. Relative to project root
    return path.resolve(this.cwd, rulePath);
  }

  /**
   * Load rule file content
   */
  async loadRuleFile(rulePath: string): Promise<string> {
    const resolvedPath = this.resolveRulePath(rulePath);
    
    try {
      const content = await this.fileSystemAdapter.readFile(resolvedPath);
      return content;
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT') {
        throw new Error(`Rule file not found: ${resolvedPath}`);
      }
      throw error;
    }
  }
}

