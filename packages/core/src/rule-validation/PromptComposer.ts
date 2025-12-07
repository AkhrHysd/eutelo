/**
 * PromptComposer - Composes prompts for LLM-based validation
 */

import path from 'node:path';
import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';

export type PromptComposerOptions = {
  fileSystemAdapter?: FileSystemAdapter;
  cwd?: string;
  configPath?: string;
};

export class PromptComposer {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly cwd: string;
  private readonly configPath?: string;

  constructor(options: PromptComposerOptions = {}) {
    this.fileSystemAdapter = options.fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.cwd = options.cwd ?? process.cwd();
    this.configPath = options.configPath;
  }

  /**
   * Compose validation prompt from multiple sources
   */
  async composePrompt(options: {
    commonPromptPath?: string;
    euteloRulesPath?: string;
    userRulesContent: string;
    documentContent: string;
    documentPath: string;
  }): Promise<string> {
    const parts: string[] = [];

    // 1. Common prompt (if provided)
    if (options.commonPromptPath) {
      try {
        const commonPrompt = await this.loadPromptFile(options.commonPromptPath);
        parts.push(commonPrompt);
      } catch (error) {
        // If common prompt not found, continue without it
        // This allows flexibility in prompt configuration
      }
    }

    // 2. Eutelo standard rules (if provided)
    if (options.euteloRulesPath) {
      try {
        const euteloRules = await this.loadPromptFile(options.euteloRulesPath);
        parts.push('---');
        parts.push(euteloRules);
      } catch (error) {
        // If Eutelo rules not found, continue without it
      }
    }

    // 3. User-defined rules
    parts.push('---');
    parts.push(options.userRulesContent);

    // 4. Document content
    parts.push('---');
    parts.push('## Document to Validate');
    parts.push('');
    parts.push(`**File:** ${options.documentPath}`);
    parts.push('');
    parts.push(options.documentContent);

    // 5. Validation task instruction
    parts.push('---');
    parts.push('## Validation Task');
    parts.push('');
    parts.push('Please validate the above document against all the rules defined above.');
    parts.push('Respond in JSON format with the following structure:');
    parts.push('```json');
    parts.push('{');
    parts.push('  "issues": [');
    parts.push('    {');
    parts.push('      "id": "RULE-ID",');
    parts.push('      "message": "Error message",');
    parts.push('      "rule": "Rule name",');
    parts.push('      "hint": "Optional hint"');
    parts.push('    }');
    parts.push('  ],');
    parts.push('  "warnings": [');
    parts.push('    {');
    parts.push('      "id": "WARNING-ID",');
    parts.push('      "message": "Warning message"');
    parts.push('    }');
    parts.push('  ],');
    parts.push('  "suggestions": []');
    parts.push('}');
    parts.push('```');
    parts.push('');
    parts.push('If no issues are found, return an empty array for "issues".');
    parts.push('Each issue should have severity "error" and include a clear message.');

    return parts.join('\n');
  }

  /**
   * Resolve prompt file path
   * Priority:
   * 1. Absolute path
   * 2. Relative to config file (if starts with ./)
   * 3. Relative to project root
   * 4. Preset package (future extension)
   */
  private resolvePromptPath(promptPath: string): string {
    // 1. Absolute path
    if (path.isAbsolute(promptPath)) {
      return promptPath;
    }

    // 2. Relative to config file (if starts with ./)
    if (promptPath.startsWith('./')) {
      if (this.configPath) {
        return path.resolve(path.dirname(this.configPath), promptPath);
      }
      // If no config path, treat as relative to cwd
      return path.resolve(this.cwd, promptPath);
    }

    // 3. Relative to project root
    return path.resolve(this.cwd, promptPath);
  }

  /**
   * Load prompt file content
   */
  private async loadPromptFile(promptPath: string): Promise<string> {
    const resolvedPath = this.resolvePromptPath(promptPath);
    
    try {
      const content = await this.fileSystemAdapter.readFile(resolvedPath);
      return content;
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT') {
        throw new Error(`Prompt file not found: ${resolvedPath}`);
      }
      throw error;
    }
  }

  /**
   * Get default prompt file paths
   */
  getDefaultPromptPaths(): {
    commonPromptPath?: string;
    euteloRulesPath?: string;
  } {
    // Try to find prompts in common locations
    const commonLocations = [
      'prompts/rule-validation/common.md',
      'prompts/common.md'
    ];

    const euteloRulesLocations = [
      'prompts/rule-validation/eutelo-rules.md',
      'prompts/eutelo-rules.md'
    ];

    // For now, return undefined (will be resolved when loading)
    // In the future, we can check if files exist and return paths
    return {
      commonPromptPath: commonLocations[0],
      euteloRulesPath: euteloRulesLocations[0]
    };
  }
}

