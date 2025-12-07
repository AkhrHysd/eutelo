/**
 * RuleValidationService - Main service for document rule validation
 */

import path from 'node:path';
import type { FileSystemAdapter } from '@eutelo/infrastructure';
import { FileSystemAdapter as DefaultFileSystemAdapter } from '@eutelo/infrastructure';
import { FrontmatterParser } from '../doc-lint/frontmatter-parser.js';
import { RuleFileLoader } from './RuleFileLoader.js';
import { RuleParser } from './RuleParser.js';
import { DocumentValidator } from './DocumentValidator.js';
import type {
  RuleValidationServiceDependencies,
  RunValidationOptions,
  ValidationRunResult,
  RuleValidationResult,
  ValidationRunError
} from './types.js';

export class RuleValidationService {
  private readonly fileSystemAdapter: FileSystemAdapter;
  private readonly cwd: string;
  private readonly docsRoot: string;
  private readonly config?: RuleValidationServiceDependencies['config'];
  private readonly ruleFileLoader: RuleFileLoader;
  private readonly ruleParser: RuleParser;
  private readonly documentValidator: DocumentValidator;
  private readonly frontmatterParser: FrontmatterParser;

  constructor(deps: RuleValidationServiceDependencies = {}) {
    this.fileSystemAdapter = deps.fileSystemAdapter ?? new DefaultFileSystemAdapter();
    this.cwd = deps.cwd ?? process.cwd();
    this.docsRoot = deps.docsRoot ?? 'eutelo-docs';
    this.config = deps.config;

    // Find config file path for RuleFileLoader
    const configPath = this.findConfigPath();
    this.ruleFileLoader = new RuleFileLoader({
      fileSystemAdapter: this.fileSystemAdapter,
      cwd: this.cwd,
      configPath
    });
    this.ruleParser = new RuleParser();
    this.documentValidator = new DocumentValidator();
    this.frontmatterParser = new FrontmatterParser({
      requiredFields: [],
      allowedFields: [] // Allow all fields
    });
  }

  async runValidation(options: RunValidationOptions): Promise<ValidationRunResult> {
    const { documents } = options;

    // Handle empty documents
    if (documents.length === 0) {
      return {
        summary: {
          total: 0,
          errors: 0,
          warnings: 0
        },
        results: []
      };
    }

    const results: RuleValidationResult[] = [];
    let totalErrors = 0;
    let totalWarnings = 0;

    // Process each document
    let systemError: ValidationRunError | undefined;
    for (const docPath of documents) {
      try {
        const result = await this.validateDocument(docPath);
        results.push(result);
        
        const errors = result.issues.filter(i => i.severity === 'error').length;
        const warnings = result.issues.filter(i => i.severity === 'warning').length;
        totalErrors += errors;
        totalWarnings += warnings;
      } catch (error) {
        // If document validation fails with system error (e.g., rule file not found)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.includes('Rule file not found') || errorMessage.includes('not found')) {
          systemError = {
            type: 'file-not-found',
            message: errorMessage,
            file: docPath
          };
          // Don't add to results, return error immediately
          break;
        }
        // Other errors are treated as validation errors
        results.push({
          file: docPath,
          issues: [{
            severity: 'error',
            rule: 'System',
            message: `Failed to validate document: ${errorMessage}`,
            file: docPath
          }]
        });
        totalErrors += 1;
      }
    }

    return {
      summary: {
        total: documents.length,
        errors: totalErrors,
        warnings: totalWarnings
      },
      results,
      error: systemError
    };
  }

  private async validateDocument(docPath: string): Promise<RuleValidationResult> {
    // Load document content
    const resolvedPath = path.isAbsolute(docPath) 
      ? docPath 
      : path.resolve(this.cwd, docPath);
    
    let content: string;
    try {
      content = await this.fileSystemAdapter.readFile(resolvedPath);
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT') {
        return {
          file: docPath,
          issues: [{
            severity: 'error',
            rule: 'System',
            message: `Document not found: ${resolvedPath}`,
            file: docPath
          }]
        };
      }
      throw error;
    }

    // Determine document kind from frontmatter or path
    const { frontmatter } = this.frontmatterParser.parse(content);
    const kind = frontmatter?.kind || frontmatter?.type || this.inferKindFromPath(docPath);

    // Find rule file for this kind
    const rulePath = this.findRuleFileForKind(kind);
    if (!rulePath) {
      // No rule file specified for this kind, skip validation
      return {
        file: docPath,
        issues: []
      };
    }

    // Load and parse rule file
    let ruleContent: string;
    try {
      ruleContent = await this.ruleFileLoader.loadRuleFile(rulePath);
    } catch (error) {
      const err = error as { code?: string };
      if (err?.code === 'ENOENT' || error instanceof Error && error.message.includes('not found')) {
        // Rule file not found is a system error, not a validation error
        // Return empty result and let the service handle it as a system error
        throw new Error(`Rule file not found: ${rulePath}`);
      }
      throw error;
    }

    const parseResult = this.ruleParser.parse(ruleContent);
    if (parseResult.issues.length > 0) {
      // Rule file has syntax errors
      const syntaxErrors = parseResult.issues.filter(i => i.severity === 'error');
      return {
        file: docPath,
        issues: syntaxErrors.map(issue => ({
          severity: issue.severity,
          rule: 'Rule File Syntax',
          message: `Syntax error in rule file: ${issue.message}`,
          file: docPath,
          line: issue.line,
          column: issue.column
        }))
      };
    }

    // Validate document against rules
    const validationResult = this.documentValidator.validate(
      { path: docPath, content },
      parseResult.rule
    );

    return validationResult;
  }

  private findRuleFileForKind(kind: string | undefined): string | null {
    if (!kind || !this.config?.directoryStructure) {
      return null;
    }

    // Search through directoryStructure for matching kind
    for (const [dirPath, fileDefs] of Object.entries(this.config.directoryStructure)) {
      for (const fileDef of fileDefs) {
        if (fileDef.kind === kind && fileDef.rules) {
          return fileDef.rules;
        }
      }
    }

    return null;
  }

  private inferKindFromPath(filePath: string): string | undefined {
    const fileName = path.basename(filePath);
    
    // Try to infer from filename prefix
    if (fileName.startsWith('PRD-')) return 'prd';
    if (fileName.startsWith('BEH-')) return 'beh';
    if (fileName.startsWith('DSG-')) return 'dsg';
    if (fileName.startsWith('ADR-')) return 'adr';
    if (fileName.startsWith('TASK-')) return 'task';
    if (fileName.startsWith('OPS-')) return 'ops';
    
    return undefined;
  }

  private findConfigPath(): string | undefined {
    // Try to find config file in cwd
    const possibleConfigFiles = [
      'eutelo.config.json',
      'eutelo.config.js',
      'eutelo.config.mjs',
      'eutelo.config.ts'
    ];

    // This is a simplified implementation
    // In practice, we might want to use the config resolution logic
    return undefined;
  }
}

export function createRuleValidationService(
  deps: RuleValidationServiceDependencies = {}
): RuleValidationService {
  return new RuleValidationService(deps);
}

